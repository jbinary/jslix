"use strict";
/*
 * Jingle session management
 * adapted from https://github.com/ESTOS/strophe.jingle
 *
 */
define(['jslix/jingle/sdp', 'jslix/jingle/signals', 'jslix/jingle/stanzas'], function(SDP, signals, stanzas) {
    var JingleQuery = stanzas.JingleQuery;
    var SDPUtil = SDP.SDPUtil;
    SDP = SDP.SDP;
    function JingleSession(me, sid, dispatcher) {
        this.me = me;
        this.sid = sid;
        this.dispatcher = dispatcher;
        this.initiator = null;
        this.responder = null;
        this.isInitiator = null;
        this.peerjid = null;
        this.state = null;
        this.peerconnection = null;
        this.remoteStream = null;
        this.localSDP = null;
        this.remoteSDP = null;
        this.localStreams = [];
        this.remoteStreams = [];
        this.relayedStreams = [];
        this.startTime = null;
        this.stopTime = null;
        this.media_constraints = null;
        this.pc_constraints = null;
        this.ice_config = {};
        this.drip_container = [];

        this.usetrickle = true;
        this.usepranswer = false; // early transport warmup -- mind you, this might fail. depends on webrtc issue 1718
        this.usedrip = true; // dripping is sending trickle candidates at once

        this.hadstuncandidate = false;
        this.hadturncandidate = false;
        this.lasticecandidate = false;

        this.reason = null;
    }

    JingleSession.prototype.initiate = function(peerjid, isInitiator) {
        var obj = this;
        if (this.state != null) {
            // TODO: use jslix logging (everywhere :))
            console.error('attempt to initiate on session ' + this.sid +
                      'in state ' + this.state);
            return;
        }
        this.isInitiator = isInitiator;
        this.state = 'pending';
        this.initiator = isInitiator ? this.me : peerjid;
        this.responder = !isInitiator ? this.me : peerjid;
        this.peerjid = peerjid;
        console.log('create PeerConnection ' + JSON.stringify(this.ice_config));
        try {
            this.peerconnection = new RTCPeerconnection(this.ice_config,
                                                         this.pc_constraints);
            console.log('Created RTCPeerConnnection');
        } catch (e) {
            console.error('Failed to create PeerConnection, exception: ',
                          e.message);
            console.error(e);
            return;
        }
        this.hadstuncandidate = false;
        this.hadturncandidate = false;
        this.lasticecandidate = false;
        this.peerconnection.onicecandidate = function(event) {
            obj.sendIceCandidate(event.candidate);
        };
        this.peerconnection.onaddstream = function(event) {
            obj.remoteStream = event.stream;
            obj.remoteStreams.push(event.stream);
            signals.remote_stream.added.dispatch(event, obj.sid);
        };
        this.peerconnection.onremovestream = function(event) {
            obj.remoteStream = null;
            // FIXME: remove from this.remoteStreams
            signals.remote_stream.removed.dispatch(event, obj.sid);
        };
        this.peerconnection.onsignalingstatechange = function(event) {
            if (!(obj && obj.peerconnection)) return;
            console.log('signallingstate ', obj.peerconnection.signalingState, event);
        };
        this.peerconnection.oniceconnectionstatechange = function(event) {
            if (!(obj && obj.peerconnection)) return;
            console.log('iceconnectionstatechange', obj.peerconnection.iceConnectionState, event);
            switch (obj.peerconnection.iceConnectionState) {
            case 'connected':
                this.startTime = new Date();
                break;
            case 'disconnected':
                this.stopTime = new Date();
                break;
            }
            signals.ice.state_change.dispatch(obj.sid, obj);
        };
        // add any local and relayed stream
        this.localStreams.forEach(function(stream) {
            obj.peerconnection.addStream(stream);
        });
        this.relayedStreams.forEach(function(stream) {
            obj.peerconnection.addStream(stream);
        });
    };

    JingleSession.prototype.accept = function() {
        this.state = 'active';

        var pranswer = this.peerconnection.localDescription;
        if (!pranswer || pranswer.type != 'pranswer') {
            return;
        }
        console.log('going from pranswer to answer');
        if (this.usetrickle) {
            // remove candidates already sent from session-accept
            var lines = SDPUtil.find_lines(pranswer.sdp, 'a=candidate:');
            for (var i = 0; i < lines.length; i++) {
                pranswer.sdp = pranswer.sdp.replace(lines[i] + '\r\n', '');
            }
        }
        while (SDPUtil.find_line(pranswer.sdp, 'a=inactive')) {
            // FIXME: change any inactive to sendrecv or whatever they were originally
            pranswer.sdp = pranswer.sdp.replace('a=inactive', 'a=sendrecv');
        }
        var prsdp = new SDP(pranswer.sdp);
        var accept = JingleQuery.create(
            prsdp.toJingle(accept,
                        this.initiator == this.me ? 'initiator' : 'responder')
        );
        accept.action = 'session-accept';
        accept.initiator = this.initiator;
        accept.responder = this.responder;
        accept.sid = this.sid;
        var iq = IQStanza.create({to: this.peerjid,
                 type: 'set'});
        iq.link(accept);
        this.dispether.send(accept).done(
           function() { console.log('session accept ack'); }).fail(
           function() { console.error('session accept error'); })

        var sdp = this.peerconnection.localDescription.sdp;
        while (SDPUtil.find_line(sdp, 'a=inactive')) {
            // FIXME: change any inactive to sendrecv or whatever they were originally
            sdp = sdp.replace('a=inactive', 'a=sendrecv');
        }
        this.peerconnection.setLocalDescription(new RTCSessionDescription({type: 'answer', sdp: sdp}),
            function() {
                console.log('setLocalDescription success');
            }, function(e) {
                console.error('setLocalDescription failed', e);
        });
    };

    JingleSession.prototype.terminate = function(reason) {
        this.state = 'ended';
        this.reason = reason;
        this.peerconnection.close();
    };

    JingleSession.prototype.active = function() {
        return this.state == 'active';
    };

    JingleSession.prototype.sendIceCandidate = function(candidate) {
        var ob = this;
        if (candidate && !this.lasticecandidate) {
            var ice = SDPUtil.iceparams(this.localSDP.media[candidate.sdpMLineIndex], this.localSDP.session),
                jcand = SDPUtil.candidateToJingle(candidate.candidate);
            if (!(ice && jcand)) {
                console.error('failed to get ice && jcand');
                return;
            }

            if (jcand.type === 'srflx') {
                this.hadstuncandidate = true;
            } else if (jcand.type === 'relay') {
                this.hadturncandidate = true;
            }
            console.log(event.candidate, jcand);

            var send_info = function(candidates) {
                // map to transport-info
                var cand = JingleQuery.create({
                    parent: {
                        to: ob.peerjid, type: 'set'
                    },
                    action: 'transport-info',
                    initiator: ob.initiator,
                    sid: ob.sid,
                    contents: []
                });
                for (var mid = 0; mid < ob.localSDP.media.length; mid++) {
                    var cands = candidates.filter(function(el) { return el.sdpMLineIndex == mid; });
                    if (cands.length) {
                        var content = {
                            creator: ob.initiator == ob.me ? 'initiator' : 'responder',
                            name: cands[0].sdpMid,
                            transport: SDPUtil.iceparams(ob.localSDP.media[mid], ob.localSDP.session)
                        };
                        cand.contents.push(content);
                        content.transport.candidates = [];
                        for (var i=0; i < cands.length; i++) {
                            content.transport.candidates.push(
                                SDPUtil.candidateToJingle(cands[i].candidate));
                        }
                        if (SDPUtil.find_line(ob.localSDP.media[mid], 'a=fingerprint:', ob.localSDP.session)) {
                            var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(ob.localSDP.media[mid], 'a=fingerprint:', ob.localSDP.session));
                            tmp.required = true;
                            content.transport.fingerprint = tmp;
                        }
                    }
                }
                ob.dispatcher.send(cand).done(function() {
                    console.log('transport info ack');
                }).fail(function(failure) {
                    console.error('transport info error');
                    signals.error.dispatch(ob.sid, failure, 'offer');
                });
            }

            if (this.usetrickle) {
                if (this.usedrip) {
                    if (this.drip_container.length == 0) {
                        console.warn(new Date().getTime(), 'start dripping');
                        window.setTimeout(function() {
                            console.warn('dripping');
                            if (ob.drip_container.length == 0) return;
                            send_info(ob.drip_container);
                            ob.drip_container = [];
                        }, 10);
                    }
                    this.drip_container.push(event.candidate);
                    return;
                }
                send_info([event.candidate]);
            }
        } else {
            console.log('sendIceCandidate: last candidate.');
            if (!this.usetrickle) {
                console.log('should send full offer now...');
                this.localSDP = new SDP(this.peerconnection.localDescription.sdp);
                var init = this.localSDP.toJingle(this.initiator == this.me ? 'initiator' : 'responder');
                init.action = this.peerconnection.localDescription.type == 'offer' ? 'session-initiate' : 'session-accept';
                init.initiator = this.initiator;
                init.sid = this.sid;
                init.parent = {to: this.peerjid, type: 'set'};
                init = JingleQuery.create(init);
                this.dispether.send(init).done(function() {
                    console.log('session initiate ack');
                }).fail(function(failure) {
                    console.error('session initiate error');
                    ob.state = 'error';
                    ob.peerconnection.close();
                    signals.error.dispatch(ob.sid, failure, 'offer');
                });
            }
            this.lasticecandidate = true;
            console.log('Have we encountered any srflx candidates? ' + this.hadstuncandidate);
            console.log('Have we encountered any relay candidates? ' + this.hadturncandidate);

            if (!(this.hadstuncandidate || this.hadturncandidate) && this.peerconnection.signalingState != 'closed') {
                signals.ice.no_stun_candidates.dispatch(this.sid);
            }
        }
    };

    JingleSession.prototype.sendOffer = function() {
        console.log('sendOffer...');
        var ob = this;
        this.peerconnection.createOffer(function(sdp) {
                ob.createdOffer(sdp);
            },
            function(e) {
                console.error('createOffer failed', e);
            },
            this.media_constraints
        );
    };

    JingleSession.prototype.createdOffer = function(sdp) {
        console.log('createdOffer', sdp);
        var ob = this;
        this.localSDP = new SDP(sdp.sdp);
        this.localSDP.mangle();
        if (this.usetrickle) {
            var init = this._genSession('session-initiate');
            this.dispatcher.send(init).done(function() {
                console.log('offer initiate ack');
            }).fail(function(failure) {
                ob.state = 'error';
                ob.peerconnection.close();
                console.error('offer initiate error');
                signals.error.dispatch(ob.sid, failure, 'offer');
            });
        }
        this._setLocalDescription(sdp);
    }

    JingleSession.prototype._genSession = function(action) {
        var stanza = this.localSDP.toJingle(
            this.initiator == this.me ? 'initiator' : 'responder');
        stanza.sid = this.sid;
        stanza.initiator = this.initiator;
        stanza.action = action;
        // TODO: think about from 
        stanza.parent = {to: this.peerjid, type: 'set'};
        stanza = JingleQuery.create(stanza);
        return stanza;
    }

    JingleSession.prototype._setLocalDescription = function(sdp) {
        sdp.sdp = this.localSDP.raw;
        this.peerconnection.setLocalDescription(sdp, function() {
            console.log('setLocalDescription success');
        }, function(e) {
            console.error('setLocalDescription failed', e);
        });
        var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
        for (var i = 0; i < cands.length; i++) {
            var cand = SDPUtil.candidateToJingle(cands[i]);
            if (cand.type == 'srflx') {
                this.hadstuncandidate = true;
            } else if (cand.type == 'relay') {
                this.hadturncandidate = true;
            }
        }
    };

    JingleSession.prototype.setRemoteDescription = function(elem, desctype) {
        console.log('setting remote description... ', desctype);
        this.remoteSDP = new SDP('');
        this.remoteSDP.fromJingle(elem);
        if (this.peerconnection.remoteDescription != null) {
            console.log('setRemoteDescription when remote description is not null, should be pranswer', this.peerconnection.remoteDescription);
            if (this.peerconnection.remoteDescription.type == 'pranswer') {
                var pranswer = new SDP(this.peerconnection.remoteDescription.sdp);
                for (var i = 0; i < pranswer.media.length; i++) {
                    // make sure we have ice ufrag and pwd
                    if (!SDPUtil.find_line(this.remoteSDP.media[i], 'a=ice-ufrag:', this.remoteSDP.session)) {
                        if (SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session)) {
                            this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session) + '\r\n';
                        } else {
                            console.warn('no ice ufrag?');
                        }
                        if (SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session)) {
                            this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session) + '\r\n';
                        } else {
                            console.warn('no ice pwd?');
                        }
                    }
                    // copy over candidates
                    var lines = SDPUtil.find_lines(pranswer.media[i], 'a=candidate:');
                    for (var j = 0; j < lines.length; j++) {
                        this.remoteSDP.media[i] += lines[j] + '\r\n';
                    }
                }
                this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');
            }
        }
        var remotedesc = new RTCSessionDescription({type: desctype, sdp: this.remoteSDP.raw});
        
        this.peerconnection.setRemoteDescription(remotedesc, function(){
            console.log('setRemoteDescription success');
        }, function(e){
            console.error('setRemoteDescription error', e);
        });
    };

    JingleSession.prototype.addIceCandidate = function(contents) {
        var obj = this;
        if (this.peerconnection.signalingState == 'closed') {
            return;
        }
        if (!this.peerconnection.remoteDescription && this.peerconnection.signalingState == 'have-local-offer') {
            console.log('trickle ice candidate arriving before session accept...');
            // create a PRANSWER for setRemoteDescription
            if (!this.remoteSDP) {
                var cobbled = 'v=0\r\n' +
                    'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
                    's=-\r\n' +
                    't=0 0\r\n';
                // first, take some things from the local description
                for (i = 0; i < this.localSDP.media.length; i++) {
                    cobbled += SDPUtil.find_line(this.localSDP.media[i], 'm=') + '\r\n';
                    cobbled += SDPUtil.find_lines(this.localSDP.media[i], 'a=rtpmap:').join('\r\n') + '\r\n';
                    if (SDPUtil.find_line(this.localSDP.media[i], 'a=mid:')) {
                        cobbled += SDPUtil.find_line(this.localSDP.media[i], 'a=mid:') + '\r\n';
                    }
                    cobbled += 'a=inactive\r\n';
                }
                this.remoteSDP = new SDP(cobbled);
            }
            // then add things like ice and dtls from remote candidate
            $.each(contents, function() {
                for (var i = 0; i < obj.remoteSDP.media.length; i++) {
                    if (SDPUtil.find_line(obj.remoteSDP.media[i], 'a=mid:' + this.name) ||
                            obj.remoteSDP.media[i].indexOf('m=' + this.name) == 0) {
                        if (!SDPUtil.find_line(obj.remoteSDP.media[i], 'a=ice-ufrag:')) {
                            var tmp = this.transport;
                            obj.remoteSDP.media[i] += 'a=ice-ufrag:' + tmp.ufrag + '\r\n';
                            obj.remoteSDP.media[i] += 'a=ice-pwd:' + tmp.pwd + '\r\n';
                            tmp = tmp.fingerprint;
                            if (tmp) {
                                obj.remoteSDP.media[i] += 'a=fingerprint:' + tmp.hash + ' ' + tmp.fingerprint + '\r\n';
                            } else {
                                console.log('no dtls fingerprint (webrtc issue #1718?)');
                                obj.remoteSDP.media[i] += 'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD\r\n';
                            }
                            break;
                        }
                    }
                }
            });
            this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');

            // we need a complete SDP with ice-ufrag/ice-pwd in all parts
            // this makes the assumption that the PRANSWER is constructed such that the ice-ufrag is in all mediaparts
            // but it could be in the session part as well. since the code above constructs this sdp this can't happen however
            var iscomplete = this.remoteSDP.media.filter(function(mediapart) {
                return SDPUtil.find_line(mediapart, 'a=ice-ufrag:');
            }).length == this.remoteSDP.media.length;

            if (iscomplete) {
                console.log('setting pranswer');
                try {
                    this.peerconnection.setRemoteDescription(new RTCSessionDescription({type: 'pranswer', sdp: this.remoteSDP.raw }));
                } catch (e) {
                    console.error('setting pranswer failed', e);
                }
            } else {
                console.log('not yet setting pranswer');
            }
        }
        // operate on each content element
        $.each(contents, function() {
            // would love to deactivate this, but firefox still requires it
            var idx = -1;
            var i;
            for (i = 0; i < obj.remoteSDP.media.length; i++) {
                if (SDPUtil.find_line(obj.remoteSDP.media[i], 'a=mid:' + this.name) ||
                    obj.remoteSDP.media[i].indexOf('m=' + this.name) == 0) {
                    idx = i;
                    break;
                }
            }
            if (idx == -1) { // fall back to localdescription
                for (i = 0; i < obj.localSDP.media.length; i++) {
                    if (SDPUtil.find_line(obj.localSDP.media[i], 'a=mid:' + this.name) ||
                        obj.localSDP.media[i].indexOf('m=' + this.name) == 0) {
                        idx = i;
                        break;
                    }
                }
            }
            var name = this.name;
            // TODO: check ice-pwd and ice-ufrag?
            $.each(this.transport.candidates, function() {
                var line, candidate;
                line = SDPUtil.candidateFromJingle(this);
                candidate = new RTCIceCandidate({sdpMLineIndex: idx,
                                                sdpMid: name,
                                                candidate: line});
                console.log(candidate);
                try {
                    obj.peerconnection.addIceCandidate(candidate);
                } catch (e) {
                    console.error('addIceCandidate failed', e.toString(), line);
                }
            });
        });
    };

    JingleSession.prototype.sendAnswer = function(provisional) {
        console.log('createAnswer', provisional);
        var ob = this;
        this.peerconnection.createAnswer(
            function(sdp) {
                ob.createdAnswer(sdp, provisional);
            },
            function(e) {
                console.error('createAnswer failed', e);
            },
            this.media_constraints
        );
    };

    JingleSession.prototype.createdAnswer = function(sdp, provisional) {
        console.log('createAnswer callback');
        console.log(sdp);
        this.localSDP = new SDP(sdp.sdp);
        // FIXME: why exactly do we need this? doesn't work without it
        this.localSDP.mangle();
        this.usepranswer = provisional == true;
        if (this.usetrickle) {
            if (!this.usepranswer) {
                var accept = this._genSession('session-accept');
                this.dispatcher.send(accept).done(function() {
                   console.log('session accept ack'); }).fail(function() {
                   console.error('session accept error'); })
            } else {
                sdp.type = 'pranswer';
                for (i = 0; i < this.localSDP.media.length; i++) {
                    this.localSDP.media[i] = this.localSDP.media[i].replace('a=sendrecv\r\n', 'a=inactive\r\n');
                }
                this.localSDP.raw = this.localSDP.session + '\r\n' + this.localSDP.media.join('');
            }
        }
        this._setLocalDescription(sdp);
    };

    JingleSession.prototype.sendTerminate = function(reason, text) {
        var obj = this;
        var term = JingleQuery.create({
            action: 'session-terminate',
            initiator: this.initiator,
            sid: this.sid,
            reason: {
                condition: reason || 'success',
                text: text
            },
            parent: {
                // TODO: from? think deeper about "from."
                to: this.peerjid,
                type: 'set'
            }
        });

        this.dispatcher.send(term).done(function() {
           console.log('terminate ack');
           obj.peerconnection.close();
           obj.peerconnection = null;
           obj.terminate();
        }).fail(function() {
           console.log('terminate error');
        });
    };

    /*JingleSession.prototype.sendMute = function(muted, content) {
        var info = $iq({to: this.peerjid,
                 type: 'set'})
            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
               action: 'session-info',
               initiator: this.initiator,
               sid: this.sid });
        info.c(muted ? 'mute' : 'unmute', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
        info.attrs({'creator': this.me == this.initiator ? 'creator' : 'responder'});
        if (content) {
            info.attrs({'name': content});
        }
        this.connection.send(info);
    };*/

    /*JingleSession.prototype.sendRinging = function() {
        var info = $iq({to: this.peerjid,
                 type: 'set'})
            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
               action: 'session-info',
               initiator: this.initiator,
               sid: this.sid });
        info.c('ringing', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
        this.connection.send(info);
    };*/
    return JingleSession;
});
