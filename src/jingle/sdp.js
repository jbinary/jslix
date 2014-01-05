"use strict";
/*
 * SDP parsing and building tool
 * adapted from https://github.com/ESTOS/strophe.jingle
 *
 */
define([], function() {
    // SDP STUFF
    var SDP = function(sdp) {
        this.media = sdp.split('\r\nm=');
        for (var i = 1; i < this.media.length; i++) {
            this.media[i] = 'm=' + this.media[i];
            if (i != this.media.length - 1) {
                this.media[i] += '\r\n';
            }
        }
        this.session = this.media.shift() + '\r\n';
        this.raw = this.session + '\r\n' + this.media.join('');
    }

    // remove iSAC and CN from SDP
    SDP.prototype.mangle = function() {
        var i, j, mline, lines, rtpmap, newdesc;
        for (i = 0; i < this.media.length; i++) {
            lines = this.media[i].split('\r\n');
            lines.pop(); // remove empty last element
            mline = SDPUtil.parse_mline(lines.shift());
            if (mline.media != 'audio')
                continue;
            newdesc = '';
            mline.fmt.length = 0;
            for (j = 0; j < lines.length; j++) {
                if (lines[j].substr(0, 9) == 'a=rtpmap:') {
                    rtpmap = SDPUtil.parse_rtpmap(lines[j]);
                    if (rtpmap.name == 'CN' || rtpmap.name == 'ISAC')
                        continue;
                    mline.fmt.push(rtpmap.id);
                    newdesc += lines[j] + '\r\n';
                } else {
                    newdesc += lines[j] + '\r\n';
                }
            }
            this.media[i] = SDPUtil.build_mline(mline) + '\r\n';
            this.media[i] += newdesc;
        }
        this.raw = this.session + this.media.join('');
    };

    // add content's to a jingle element
    SDP.prototype.toJingle = function(thecreator) {
        var i, j, k, mline, ssrc, rtpmap, tmp, lines,
            bundle = [],
            query = {
                contents: []
            };
        if (SDPUtil.find_line(this.session, 'a=group:')) {
            lines = SDPUtil.find_lines(this.session, 'a=group:');
            query.groups = [];
            for (i = 0; i < lines.length; i++) {
                tmp = lines[i].split(' ');
                var group = {semantics: tmp.shift().substr(8), contents: []};
                for (j = 0; j < tmp.length; j++) {
                    group.contents.push({name: tmp[j]});
                }
                query.groups.push(group);
            }
        }
        for (i = 0; i < this.media.length; i++) {
            mline = SDPUtil.parse_mline(this.media[i].split('\r\n')[0]);
            if (!(mline.media == 'audio' || mline.media == 'video')) {
                continue;
            }
            if (SDPUtil.find_line(this.media[i], 'a=ssrc:')) {
                ssrc = SDPUtil.find_line(this.media[i], 'a=ssrc:').substring(7).split(' ')[0]; // take the first
            } else {
                ssrc = false;
            }

            var content = {creator: thecreator,
                           name: mline.media};
            query.contents.push(content);
            if (SDPUtil.find_line(this.media[i], 'a=mid:')) {
                // prefer identifier from a=mid if present
                var mid = SDPUtil.parse_mid(SDPUtil.find_line(this.media[i], 'a=mid:'));
                content.name = mid;
            }
            if (SDPUtil.find_line(this.media[i], 'a=rtpmap:').length) {
                var description = {
                    medit: mline.media,
                    payloads: []
                };
                if (ssrc) {
                    description.ssrc = ssrc;
                    description.sources = [];
                    var sources = {},
                        get_source = function(ssrc) {
                            if (!(ssrc in sources)) {
                                sources[ssrc] = {parameters: [], ssrc: ssrc};
                                description.sources.push(sources[ssrc]);
                            }
                            return sources[ssrc];
                        };
                    get_source(ssrc);
                    // FIXME: group by ssrc
                    $.each(SDPUtil.find_lines(this.media[i], 'a=ssrc:'), function() {
                        var idx = this.indexOf(' '),
                            linessrc = this.substr(0, idx).substr(7),
                            kv = this.substr(idx+1),
                            source = get_source(linessrc);
                        if (kv.indexOf(':') == -1) {
                            source.parameters.push({ name: kv });
                        } else {
                            source.parameters.push({
                                name: kv.split(':', 2)[0],
                                value: kv.split(':', 2)[1]
                            });
                        }
                    });
                }
                content.description = description;
                for (j = 0; j < mline.fmt.length; j++) {
                    rtpmap = SDPUtil.find_line(this.media[i], 'a=rtpmap:' + mline.fmt[j]);
                    var payload = SDPUtil.parse_rtpmap(rtpmap);
                    description.payloads.push(payload);
                    // put any 'a=fmtp:' + mline.fmt[j] lines into <param name=foo value=bar/>
                    if (SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j])) {
                        tmp = SDPUtil.parse_fmtp(SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j]));
                        var parameters = [];
                        payload.parameters = parameters;
                        for (k = 0; k < tmp.length; k++) {
                            parameters.push(tmp[k]);
                        }
                    }
                    this.RtcpFbToJingle(i, payload, mline.fmt[j]); // XEP-0293 -- map a=rtcp-fb
                }
                if (SDPUtil.find_line(this.media[i], 'a=crypto:', this.session)) {
                    description.encryption = {
                       required: 1,
                       crypto: []
                    }
                    $.each(SDPUtil.find_lines(this.media[i], 'a=crypto:', this.session), function() {
                        description.encryption.crypto.push(
                            SDPUtil.parse_crypto(this)
                        );
                    });
                }

                if (SDPUtil.find_line(this.media[i], 'a=rtcp-mux')) {
                    description['rtcp-mux'] = true;
                }

                // XEP-0293 -- map a=rtcp-fb:*
                this.RtcpFbToJingle(i, description, '*');

                // XEP-0294
                if (SDPUtil.find_line(this.media[i], 'a=extmap:')) {
                    var headers = [];
                    lines = SDPUtil.find_lines(this.media[i], 'a=extmap:');
                    for (j = 0; j < lines.length; j++) {
                        tmp = SDPUtil.parse_extmap(lines[j]);
                        var senders = undefined;
                        var header = {
                            uri: tmp.uri,
                            id: tmp.value
                        };
                        if (tmp.hasOwnProperty('direction')) {
                            switch (tmp.direction) {
                            case 'sendonly':
                                senders = 'responder';
                            case 'recvonly':
                                senders = 'initiator';
                            case 'sendrecv':
                                senders = 'both';
                            case 'inactive':
                                senders = 'none';
                            }
                        }
                        header.senders = senders;
                        headers.push(header);
                    }
                    description['rtp-headers'] = headers;
                }
            }

            this.TransportToJingle(i, content);

            var senders = undefined;
            if (SDPUtil.find_line(this.media[i], 'a=sendrecv', this.session)) {
                senders = 'both';
            } else if (SDPUtil.find_line(this.media[i], 'a=sendonly', this.session)) {
                senders = 'initiator';
            } else if (SDPUtil.find_line(this.media[i], 'a=recvonly', this.session)) {
                senders = 'responder';
            } else if (SDPUtil.find_line(this.media[i], 'a=inactive', this.session)) {
                senders = 'none';
            }
            if (mline.port == '0') {
                // estos hack to reject an m-line
                senders = 'rejected';
            }
            content.senders = senders;
        }
        return query;
    };

    SDP.prototype.TransportToJingle = function(mediaindex, content) {
        var line = this.media[mediaindex], tmp, setup, self=this, lines;
        content.transport = SDPUtil.iceparams(line, this.session);
        content.transport.candidates = [];
        content.transport.fingerprints = [];
        // XEP-0320
        $.each(SDPUtil.find_lines(line, 'a=fingerprint:', this.session),
        function() {
            tmp = SDPUtil.parse_fingerprint(this);
            tmp.required = true;
            setup = SDPUtil.find_line(line, 'a=setup:', self.session);
            if (setup) {
                tmp.setup = setup.substr(8);
            }
            content.transport.fingerprints.push(tmp);
        });

        // XEP-0176
        if (content.transport.ufrag) {
            if (SDPUtil.find_line(line, 'a=candidate:', this.session)) { // add any a=candidate lines
                lines = SDPUtil.find_lines(line, 'a=candidate:') || SDPUtil.find_lines(this.session, 'a=candidate');
                for (var j = 0; j < lines.length; j++) {
                    tmp = SDPUtil.candidateToJingle(lines[j]);
                    content.transport.candidates.push(tmp);
                }
            }
        }
    }

    SDP.prototype.RtcpFbToJingle = function(mediaindex, elem, payloadtype) { // XEP-0293
        var lines = SDPUtil.find_lines(this.media[mediaindex], 'a=rtcp-fb:' + payloadtype);
        for (var i = 0; i < lines.length; i++) {
            var tmp = SDPUtil.parse_rtcpfb(lines[i]);
            if (tmp.type == 'trr-int') {
                elem['rtcp-fb-trr-int'] = {value: tmp.params[0]};
            } else {
                elem['rtcp-fb'] = {type: tmp.type};
                if (tmp.params.length > 0) {
                    elem['rtcp-fb']['subtype'] = tmp.params[0];
                }
            }
        }
    };

    SDP.prototype.RtcpFbFromJingle = function(elem, payloadtype) { // XEP-0293
        var media = '';
        var tmp = elem['rtcp-fb-trr-int'];
        if (tmp) {
            media += 'a=rtcp-fb:' + '*' + ' ' + 'trr-int' + ' ';
            if (tmp.value) {
                media += tmp.attr('value');
            } else {
                media += '0';
            }
            media += '\r\n';
        }
        tmp = elem['rtcp-fb'];
        if (tmp) {
            media += 'a=rtcp-fb:' + payloadtype + ' ' + tmp.type;
            if (tmp.subtype) {
                media += ' ' + tmp.subtype;
            }
            media += '\r\n';
        };
        return media;
    };

    // construct an SDP from a jingle stanza
    SDP.prototype.fromJingle = function(stanza) {
        var self = this;
        this.raw = 'v=0\r\n' +
            'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
            's=-\r\n' +
            't=0 0\r\n';
        // http://tools.ietf.org/html/draft-ietf-mmusic-sdp-bundle-negotiation-04#section-8
        if (stanza.groups && stanza.groups.length) {
            var groups = stanza.groups;
        } else {
            // for backward compability, to be removed soon
            // assume all contents are in the same bundle group, can be improved upon later
            var groups = [{
                semantics: 'BUNDLE',
                contents: stanza.contents.filter(function(content) {
                    // Do not include contents without rtcp-mux in the bundle
                    return !!content.description.rtcp_mux;
                }).map(function(content) {
                    return {name: content.name};
                })
            }];
            // remove empty groups
            groups = groups.filter(function(group) {
                return group.contents.length;
            });
        }
        $.each(groups, function() {
            var contents = this.contents.map(function(content) {
                return content.name;
            });
            if (this.semantics && contents.length) {
                self.raw += 'a=group:' + this.semantics + ' ' + contents.join(' ') + '\r\n';
            }
        });

        this.session = this.raw;
        for (var i = 0; i < stanza.contents.length; i++) {
            var m = self.jingle2media(stanza.contents[i]);
            self.media.push(m);
        };

        this.raw = this.session + this.media.join('');
    };

    // translate a jingle content element into an an SDP media part
    SDP.prototype.jingle2media = function(content) {
        var media = '',
            description = content.description,
            ssrc = description.ssrc,
            self = this,
            tmp;

        tmp = { media: content.name };
        tmp.port = '1';
        if (content.senders == 'rejected') {
            // estos hack to reject an m-line
            tmp.port = '0';
        }
        if (description.encryption || content.transport.fingerprints.length) {
            tmp.proto = 'RTP/SAVPF';
        } else {
            tmp.proto = 'RTP/AVPF';
        }
        tmp.fmt = description.payloads.map(function(payload) {return payload.id});
        media += SDPUtil.build_mline(tmp) + '\r\n';
        media += 'c=IN IP4 0.0.0.0\r\n';
        media += 'a=rtcp:1 IN IP4 0.0.0.0\r\n';
        if (content.transport) {
            if (content.transport.ufrag) {
                media += SDPUtil.build_iceufrag(content.transport.ufrag) + '\r\n';
            }
            if (content.transport.pwd) {
                media += 'a=ice-pwd:' + content.transport.pwd + '\r\n';
            }
            $.each(content.transport.fingerprints, function() {
                media += 'a=fingerprint:' + this.hash;
                media += ' ' + this.fingerprint;
                media += '\r\n';
                if (this.setup) {
                    media += 'a=setup:' + this.setup + '\r\n';
                }
            });
        }
        switch (content.senders) {
        case 'initiator':
            media += 'a=sendonly\r\n';
            break;
        case 'responder':
            media += 'a=recvonly\r\n';
            break;
        case 'none':
            media += 'a=inactive\r\n';
            break;
        case 'both':
        default:
            media += 'a=sendrecv\r\n';
            break;
        }
        media += 'a=mid:' + content.name + '\r\n';

        // <description><rtcp-mux/></description>
        // see http://code.google.com/p/libjingle/issues/detail?id=309 -- no spec though
        // and http://mail.jabber.org/pipermail/jingle/2011-December/001761.html
        if (description['rtcp-mux']) {
            media += 'a=rtcp-mux\r\n';
        }

        if (description.encryption) {
            tmp = description.encryption.crypto;
            $.each(tmp, function() {
                media += 'a=crypto:' + this.tag;
                media += ' ' + this['crypto-suite'];
                media += ' ' + this['key-params'];
                if (this['session-params']) {
                    media += ' ' + this['session-params'];
                }
                media += '\r\n';
            });
        }
        $.each(description.payloads, function() {
            media += SDPUtil.build_rtpmap(this) + '\r\n';
            if (this.parameters && this.parameters.length) {
                media += 'a=fmtp:' + this.id + ' ';
                media += this.parameters.map(function(par) {
                    return (par.name ? par.name + '=' : '') + par.value;
                }).join(';');
                media += '\r\n';
            }
            // xep-0293
            media += self.RtcpFbFromJingle(this, this.id);
        });

        // xep-0293
        media += self.RtcpFbFromJingle(description, '*');

        // xep-0294
        $.each(description['rtp-headers'] || [], function() {
            media += 'a=extmap:' + this.id + ' ' + this.uri + '\r\n';
        });

        $.each(content.transport.candidates, function() {
            media += SDPUtil.candidateFromJingle(this);
        });

        $.each(description.sources, function() {
            var ssrc = this.ssrc;
            $.each(this.parameters, function() {
                media += 'a=ssrc:' + ssrc + ' ' + this.name;
                if (this.value && this.value.length)
                    media += ':' + this.value;
                media += '\r\n';
            });
        });
        return media;
    };

    var SDPUtil = {
        iceparams: function(mediadesc, sessiondesc) {
            var data = {};
            if (SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc) &&
                SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc)) {
                data.ufrag = SDPUtil.parse_iceufrag(SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc));
                data.pwd = SDPUtil.parse_icepwd(SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc));
            }
            return data;
        },
        parse_iceufrag: function(line) {
            return line.substring(12);
        },
        build_iceufrag: function(frag) {
            return 'a=ice-ufrag:' + frag;
        },
        parse_icepwd: function(line) {
            return line.substring(10);
        },
        parse_mid: function(line) {
            return line.substring(6);
        },
        parse_mline: function(line) {
            var parts = line.substring(2).split(' '),
            data = {};
            data.media = parts.shift();
            data.port = parts.shift();
            data.proto = parts.shift();
            if (parts[parts.length - 1] == '') { // trailing whitespace
                parts.pop();
            }
            data.fmt = parts;
            return data;
        },
        build_mline: function(mline) {
            return 'm=' + mline.media + ' ' + mline.port + ' ' + mline.proto + ' ' + mline.fmt.join(' ');
        },
        parse_rtpmap: function(line) {
            var parts = line.substring(9).split(' '),
                data = {};
            data.id = parts.shift();
            parts = parts[0].split('/');
            data.name = parts.shift();
            data.clockrate = parts.shift();
            data.channels = parts.length ? parts.shift() : '1';
            return data;
        },
        build_rtpmap: function(el) {
            var line = 'a=rtpmap:' + el.id + ' ' + el.name + '/' + el.clockrate;
            if (el.channels && el.channels != '1') {
                line += '/' + el.channels;
            }
            return line;
        },
        parse_crypto: function(line) {
            var parts = line.substring(9).split(' '),
            data = {};
            data.tag = parts.shift();
            data['crypto-suite'] = parts.shift();
            data['key-params'] = parts.shift();
            if (parts.length) {
                data['session-params'] = parts.join(' ');
            }
            return data;
        },
        parse_fingerprint: function(line) { // RFC 4572
            var parts = line.substring(14).split(' '),
            data = {};
            data.hash = parts.shift();
            data.fingerprint = parts.shift();
            // TODO assert that fingerprint satisfies 2UHEX *(":" 2UHEX) ?
            return data;
        },
        parse_fmtp: function(line) {
            var parts = line.split(' '),
                i, key, value,
                data = [];
            parts.shift();
            parts = parts.join(' ').split(';');
            for (i = 0; i < parts.length; i++) {
                key = parts[i].split('=')[0];
                while (key.length && key[0] == ' ') {
                    key = key.substring(1);
                }
                value = parts[i].split('=')[1];
                if (key && value) {
                    data.push({name: key, value: value});
                } else if (key) {
                    // rfc 4733 (DTMF) style stuff
                    data.push({name: '', value: key});
                }
            }
            return data;
        },
        parse_rtcpfb: function(line) {
            var parts = line.substr(10).split(' ');
            var data = {};
            data.pt = parts.shift();
            data.type = parts.shift();
            data.params = parts;
            return data;
        },
        parse_extmap: function(line) {
            var parts = line.substr(9).split(' ');
            var data = {};
            data.value = parts.shift();
            if (data.value.indexOf('/') != -1) {
                data.direction = data.value.substr(data.value.indexOf('/') + 1);
                data.value = data.value.substr(0, data.value.indexOf('/'));
            } else {
                data.direction = 'both';
            }
            data.uri = parts.shift();
            data.params = parts;
            return data;
        },
        find_line: function() {
            return SDPUtil.find_lines.apply(undefined, arguments)[0] || false;
        },
        find_lines: function(haystack, needle, sessionpart) {
            var lines = haystack.split('\r\n'),
                needles = new Array();
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].substring(0, needle.length) == needle)
                    needles.push(lines[i]);
            }
            if (needles.length || !sessionpart) {
                return needles;
            }
            // search session part
            lines = sessionpart.split('\r\n');
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].substring(0, needle.length) == needle) {
                    needles.push(lines[i]);
                }
            }
            return needles;
        },
        candidateToJingle: function(line) {
            // a=candidate:2979166662 1 udp 2113937151 192.168.2.100 57698 typ host generation 0
            //      <candidate component=... foundation=... generation=... id=... ip=... network=... port=... priority=... protocol=... type=.../>
            if (line.substring(0, 12) != 'a=candidate:') {
                console.log('parseCandidate called with a line that is not a candidate line');
                console.log(line);
                return null;
            }
            if (line.substring(line.length - 2) == '\r\n') // chomp it
                line = line.substring(0, line.length - 2);
            var candidate = {},
                elems = line.split(' '),
                i;
            if (elems[6] != 'typ') {
                console.log('did not find typ in the right place');
                console.log(line);
                return null;
            }
            candidate.foundation = elems[0].substring(12);
            candidate.component = elems[1];
            candidate.protocol = elems[2].toLowerCase();
            candidate.priority = elems[3];
            candidate.ip = elems[4];
            candidate.port = elems[5];
            // elems[6] => "typ"
            candidate.type = elems[7];
            candidate.generation = '0'; // for default
            for (i = 8; i < elems.length; i += 2) {
                switch (elems[i]) {
                case 'raddr':
                    candidate['rel-addr'] = elems[i + 1];
                    break;
                case 'rport':
                    candidate['rel-port'] = elems[i + 1];
                    break;
                case 'generation':
                    candidate.generation = elems[i + 1];
                    break;
                default: // TODO
                    console.log('not translating "' + elems[i] + '" = "' + elems[i + 1] + '"');
                }
            }
            candidate.network = '1';
            candidate.id = Math.random().toString(36).substr(2, 10); // not applicable to SDP -- FIXME: should be unique, not just random
            return candidate;
        },
        candidateFromJingle: function(cand) {
            var line = 'a=candidate:';
            line += cand.foundation;
            line += ' ';
            line += cand.component;
            line += ' ';
            line += cand.protocol; //.toUpperCase(); // chrome M23 doesn't like this
            line += ' ';
            line += cand.priority;
            line += ' ';
            line += cand.ip;
            line += ' ';
            line += cand.port;
            line += ' ';
            line += 'typ';
            line += ' ' + cand.type;
            line += ' ';
            switch (cand.type) {
            case 'srflx':
            case 'prflx':
            case 'relay':
                if (cand['rel-addr'] && cand['rel-port']) {
                    line += 'raddr';
                    line += ' ';
                    line += cand['rel-addr'];
                    line += ' ';
                    line += 'rport';
                    line += ' ';
                    line += cand['rel-port'];
                    line += ' ';
                }
                break;
            }
            line += 'generation';
            line += ' ';
            line += cand['generation'] || '0';
            return line + '\r\n';
        }
    };
    return {
        SDP: SDP,
        SDPUtil: SDPUtil
    }
});
