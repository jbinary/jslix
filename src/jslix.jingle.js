"use strict";
(function(){

    var jslix = window.jslix;
    var fields = jslix.fields;

    jslix.jingle = {
        stanzas: {},
        _name: 'jslix.jingle'
    }
    var jingle = jslix.jingle;

    // Payload description stanzas
    jingle.stanzas.payload = jslix.Element({
        element_name: 'payload-type',
        id: new fields.StringAttr('id', true),
        name: new fields.StringAttr('name', true),
        clockrate: new fields.IntegerAttr('clockrate', false),
        channels: new fields.IntegerAttr('channels', false)
    });

    jingle.stanzas.description = jslix.Element({
        xmlns: 'urn:xmpp:jingle:apps:rtp:1',
        element_name: 'description',
        media: new fields.StringAttr('media', true), // TODO: validate this
        payloads: new fields.ElementNode(jingle.stanzas.payload, true, true)
    });

    // Transport description stanzas
    jingle.stanzas.candidate = jslix.Element({
        element_name: 'candidate',
        component: new fields.IntegerAttr('component', true),
        foundation: new fields.IntegerAttr('foundation', true),
        generation: new fields.IntegerAttr('generation', true),
        id: new fields.StringAttr('id', true),
        ip: new fields.StringAttr('ip', true), // TODO: validate?
        network: new fields.IntegerAttr('network', false),
        priority: new fields.IntegerAttr('priority', true),
        protocol: new fields.StringAttr('protocol', true),
        type: new fields.StringAttr('type', false),

        clean_protocol: function(value) {
            if (value != 'udp') {
                throw('not-acceptable');
            }
            return value;
        }
    });
    jingle.stanzas.ice_transport = jslix.Element({
        element_name: 'transport',
        xmlns: 'urn:xmpp:jingle:transports:ice-udp:1',
        pwd: new fields.StringAttr('pwd', true),
        ufrag: new fields.StringAttr('ufrag', true),
        candidates: new fields.ElementNode(jingle.stanzas.candidate, true, true)
    });

    // Encryption
    jingle.stanzas.crypto = jslix.Element({
        element_name: 'crypto',
        'crypto-suite': new fields.StringAttr('crypto-suite'),
        'key-params': new fields.StringAttr('key-params'),
        'session-params': new fields.StringAttr('session-params'),
        'tag': new fields.StringAttr('tag')
    });

    jingle.stanzas.encryption = jslix.Element({
        element_name: 'encryption',
        required: new fields.IntegerAttr('required', false),
        crypto: new fields.ElementNode(jingle.stanzas.crypto, true, true)
    });

    // Content description
    jingle.stanzas.content = jslix.Element({
        element_name: 'content',
        creator: new fields.StringAttr('creator', true),
        name: new fields.StringAttr('name', true),
        description: new fields.ElementNode(jingle.stanzas.description),
        transport: new fields.ElementNode(jingle.stanzas.ice_transport),
        encryption: new fields.ElementNode(jingle.stanzas.encryption)
    });

    // The main element
    jingle.stanzas.jingle = jslix.Element({
        element_name: 'jingle',
        xmlns: 'urn:xmpp:jingle:1',
        action: new fields.StringAttr('action', true),
        initiator: new fields.JIDAttr('initiator'),
        sid: new fields.StringAttr('sid', true),
        contents: new fields.ElementNode(jingle.stanzas.content, true, true)
    }, [jslix.stanzas.QueryStanza]);


// The code was adapted from
// https://github.com/mweibel/sdpToJingle/blob/master/sdptojingle.js
// Author: Michael Weibel <michael.weibel+xmpp@gmail.com>
jingle.webrtc = (function(stanzas) {
    // most of the constants are from libjingle webrtcsdp.cc
    var LINE_PREFIXES = {
            VERSION: "v",
            ORIGIN: "o",
            SESSION_NAME: "s",
            SESSION_INFO: "i",
            SESSION_URI: "u",
            SESSION_EMAIL: "e",
            SESSION_PHONE: "p",
            SESSION_CONNECTION: "c",
            SESSION_BANDWIDTH: "b",
            TIMING: "t",
            REPEAT_TIMES: "r",
            TIME_ZONE: "z",
            ENCRYPTION_KEY: "k",
            MEDIA: "m",
            ATTRIBUTES: "a"
        },
        LINE_PREFIX_LEN = 2,
        ATTRIBUTES = {
            GROUP: "group",
            MID: "mid",
            MID_AUDIO: "mid:audio",
            MID_VIDEO: "mid:audio",
            RTCP_MUX: "rtcp-muc",
            SSRC: "ssrc",
            CNAME: "cname",
            MSLABEL: "mslabel",
            LABEL: "label",
            CRYPTO: "crypto",
            CANDIDATE: "candidate",
            CANDIDATE_TYP: "typ",
            CANDIDATE_NAME: "name",
            CANDIDATE_NETWORK_NAME: "network_name",
            CANDIDATE_USERNAME: "username",
            CANDIDATE_PASSWORD: "password",
            CANDIDATE_GENERATION: "generation",
            RTPMAP: "rtpmap"
        },
        CANDIDATES = {
            HOST: "host",
            SRFLX: "srflx",
            RELAX: "relay"
        },
        DELIMITER = " ",
        KEY_DELIMITER = ":",
        PAYLOAD_DELIMITER = "/",
        LINE_BREAK = "\r\n",
        SDP_PREFIX_LEN = 3,
        // TODO: Remove hardcoding. This is copied from libjingle webrtcsdp.cc
        HARDCODED_SDP = "v=0\\r\\no=- 0 0 IN IP4 127.0.0.1\\r\\ns=\\r\\nc=IN IP4 0.0.0.0\\r\\nt=0 0",
        
        _parseMessageInJSON = function(msg) {
            // Strip SDP-prefix and parse it as JSON
            return JSON.parse(msg.substring(SDP_PREFIX_LEN));
        },
        _splitSdpMessage = function(msg) {
            return msg.split(LINE_BREAK);
        },
        _splitLine = function(line) {
            var keyAndParams = line.split("=");
            if (keyAndParams.length <= 1) {
                return {};
            }
            return {
                key: keyAndParams[0],
                params: keyAndParams[1].split(DELIMITER)
            }
        },
        _parseLine = function(description, state, line) {
            var keyAndParams = _splitLine(line);
            
            switch(keyAndParams.key) {
                case LINE_PREFIXES.ATTRIBUTES:
                    _parseAttributes(description[state], keyAndParams.params);
                    break;
                case LINE_PREFIXES.MEDIA:
                    state = _parseStateFromMedia(keyAndParams.params);
                    _parseMedia(description[state], keyAndParams.params);
                    break;
            }
            return state;
        },
        _parseStateFromMedia = function(params) {
            return params[0];
        },
        _parseMedia = function(media, params) {
            media.profile = params[2];
        },
        _parseAttributes = function(attrs, params) {
            var key = params[0].split(KEY_DELIMITER);
            switch(key[0]) {
                case ATTRIBUTES.CANDIDATE:
                    _parseCandidates(attrs.candidates, key, params);
                    break;
                case ATTRIBUTES.CRYPTO:
                    _parseCrypto(attrs['crypto'], key, params);
                    break;
                case ATTRIBUTES.RTPMAP:
                    _parseRtpMap(attrs.rtpmap, key, params);
                    break;
                case ATTRIBUTES.SSRC:
                    // ssrc is only a string, but split ssrc: first
                    attrs.ssrc = params.join(" ").substring(5);
                    break;
            }
            
            return attrs;
        },
        _parseCandidates = function(candidates, key, params) {
            candidates.push({
                component: params[1],
                foundation: key[1],
                protocol: params[2],
                priority: params[3],
                ip: params[4],
                port: params[5],
                type: params[7],
                name: params[9],
                network: params[11],
                ufrag: params[13],
                pwd: params[15],
                generation: params[17]
            });
        },
        _parseCrypto = function(crypto, key, params) {
            crypto.push({
                'crypto-suite': params[1],
                'key-params': params[2],
                'session-params': params[3],
                'tag': key[1]
            });
        },
        _parseRtpMap = function(rtpmap, key, params) {
            var nameAndRate = params[1].split(PAYLOAD_DELIMITER)
            rtpmap.push({
                'id': key[1],
                'name': nameAndRate[0],
                'clockrate': nameAndRate[1]
            });
        },
        _generateJingleFromDescription = function(description) {
            return {
                video: _generateMediaContent("video", description.video),
                audio: _generateMediaContent("audio", description.audio)
            };
        },
        _generateMediaContent = function(name, media) {
            var content = stanzas.content.create({
                creator: 'initiator',
                name: name});
            var i = 0, len = 0;
           
            var description = stanzas.description.create({
                media: name,
                payloads: [],
                candidates: []
            }); 
            if (media.ssrc.length) {
                description.ssrc = media.ssrc;
            }
            _serializeProperties(stanzas.payload,
                                 media.rtpmap,
                                 description.payloads);
            
            if (media.crypto.length) {
                var encryption = stanzas.encryption.create({
                    required: '1',
                    crypto: []
                });
                _serializeProperties(stanzas.crypto,
                                     media['crypto'],
                                     encryption.crypto);
                content.encryption = encryption;
            }
          
            var transport = stanzas.ice_transport.create({
                candidates: []
            });
            _serializeProperties(stanzas.candidate,
                                 media.candidates,
                                 transport.candidates);

            content.description = description;
            content.transport = transport;
            return content;
        },
        _serializeProperties = function(tag, properties, append_to) {
            var i = 0, len = 0, property, attr;
            for(i = 0, len = properties.length; i < len; i++) {
                property = properties[i];
                var t = tag.create();
                for(attr in property) {
                    if (property.hasOwnProperty(attr)) {
                        t[attr] = property[attr];
                    }
                }
                append_to[append_to.length] = t;
            }
        },
        _generateEmptyDescription = function() {
            return {
                "audio": {
                    candidates: [],
                    crypto: [],
                    rtpmap: [],
                    ssrc: "",
                    profile: ""
                },
                "video": {
                    candidates: [],
                    crypto: [],
                    rtpmap: [],
                    ssrc: "",
                    profile: ""
                }
            };
        },
        _parseStanza = function(description, stanza) {
            if (stanza.payloads)
                for (var i=0; i<stanza.payloads.length; i++) {
                    description.rtpmap.push(_unserializeAttributes(stanza.payloads[i]));
                }
            if (stanza.encryption) {
                for (var ii=0; ii < stanza.encryption.crypto.length; ii++) {
                    description.crypto.push(_unserializeAttributes(
                                            stanza.encryption.crypto[ii]));
                }
            }
            if (stanza.candidates) {
                for (var i=0; i<stanza.candidates.length; i++) {
                    description.candidates.push(
                                _unserializeAttributes(stanza.candidates[i]));
                }
            }
        },
        _unserializeAttributes = function(element) {
            var res = {},
                attr;
            for(var k in element) {
                res[k] = element[k];
            }
            return res;
        },
        _generateSdpFromDescription = function(description) {
            var sdp = HARDCODED_SDP;
            for(var media in description) {
                if(description.hasOwnProperty(media)) {
                    sdp += _generateMediaSdp(media, description[media]);
                }
            }
            return sdp + "\\r\\n";
        },
        _generateMediaSdp = function(media, description) {
            // TODO: Remove hardcoded values like "1" which is the mediaport placeholder
            var m = "\\r\\nm=" + media + " 1 " + description.profile,
                rtpmapStr = "a=mid:" + media + "\\r\\na=rtcp-mux",
                cryptoStr = "",
                candidateStr = "",
                ssrcStr = "";
            for (var i = 0, len = description.candidates.length; i < len; i++) {
                var candidate = description.candidates[i],
                    attrs = [
                        candidate.component, 
                        candidate.protocol, 
                        candidate.priority,
                        candidate.ip,
                        candidate.port,
                        // TODO: Remove hardcoded values
                        "typ",
                        candidate.type,
                        "name",
                        candidate.name,
                        "network_name",
                        candidate.network,
                        "username",
                        candidate.ufrag,
                        "password",
                        candidate.pwd,
                        "generation",
                        candidate.generation
                    ];
                candidateStr += "a=candidate:" + candidate.foundation 
                    + " " + attrs.join(" ") + "\\r\\n";
            }
            for (var i = 0, len = description.crypto.length; i < len; i++) {
                var crypto = description.crypto[i];
                cryptoStr += "\\r\\na=crypto:" + crypto.tag + " " + crypto['crypto-suite'] +
                    " " + crypto['key-params'] + " ";
                if(crypto['session-params'].length) {
                    cryptoStr += crypto['session-params'];
                }
            }
            rtpmapStr += cryptoStr;
            for (var i = 0, len = description.rtpmap.length; i < len; i++) {
                var type = description.rtpmap[i];
                m += " " + type.id;
                rtpmapStr += "\\r\\na=rtpmap:" + type.id + " " + type.name + "/" + type.clockrate;
            }
            if(description.ssrc) {
                ssrcStr += "a=ssrc:" + description.ssrc;
            }

            return m + "\\r\\n" + candidateStr + rtpmapStr + "\\r\\n" + ssrcStr;
        };
    
    return {
        createJingleStanza: function(sdpMsg) {
            sdpMsg = _parseMessageInJSON(sdpMsg);
            
            var description = _generateEmptyDescription(),
                state = null,
                sdp = _splitSdpMessage(sdpMsg.sdp),
                sessionId = sdpMsg.offererSessionId,
                seq = sdpMsg.seq,
                tieBreaker = sdpMsg.tieBreaker;
            
            for(var i = 0, len = sdp.length; i < len; i++) {
                state = _parseLine(description, state, sdp[i]);
            }
            return _generateJingleFromDescription(description);
        },
        parseJingleStanza: function(stanza) {
            var child,
                media = null,
                description = _generateEmptyDescription(),
                hasSdpMessage = Boolean(stanza.contents);
            if (hasSdpMessage) {
                for (var i=0; i<stanza.contents.length; i++) {
                    var jingled = stanza.contents[i].description;
                    media = jingled.media;
                    //description[media].profile = jingled.profile;
                    description[media].ssrc = jingled.ssrc;
                    // fall through, parseStanza needs to be done for both tags
                    _parseStanza(description[media], stanza.contents[i]);
                    _parseStanza(description[media], jingled);
                    _parseStanza(description[media], stanza.contents[i].transport);
                }
            }
            console.log(hasSdpMessage);
            if (!hasSdpMessage) {
                return null;
            }
            return _generateSdpFromDescription(description);
        }
    };
}(jslix.jingle.stanzas));


// XXX
var localStream = null;
var onUserMediaSuccess = function(stream) {
    localStream = stream;
};
var onUserMediaError = function(error) {
};
var state = {};

navigator.webkitGetUserMedia("audio", onUserMediaSuccess, onUserMediaError);

var initiate = jslix.Element({
    clean_action: function(value) {
        if (value == 'session-initiate') return value;
        throw new jslix.exceptions.WrongElement('Not a session initiate');
    },
    setHandler: function(stanza, top) {
        console.log(jingle.webrtc.parseJingleStanza(stanza));
        throw('feature-not-implemented');
        pc = new webkitPeerConnection("STUN stun.l.google.com:19302",
                                              onSignalingMessage);
    }
}, [jingle.stanzas.jingle]);
jslix.dispatcher.addHandler(initiate, state);
})();
