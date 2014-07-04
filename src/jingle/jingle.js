"use strict";
define(['jslix/fields', 'jslix/stanzas', 'jslix/exceptions',
        'jslix/jingle/sdp', 'jslix/jingle/signals', 'jslix/jingle/session',
        'jslix/jingle/stanzas', 'jslix/jingle/errors', 'jslix/errors',
        'jslix/jid'],
    function(fields, stanzas, exceptions, SDP, signals, JingleSession,
             jingle_stanzas, errors, jslix_errors, JID) {

    SDP = SDP.SDP;
    var plugin = function(dispatcher, options) {
        this.connection = null;
        this.sessions = {};
        this.jid2session = {};
        this.ice_config = options.ice_config || {iceServers: []};
        this.pc_constraints = options.pc_constraints || {};
        this.media_constraints = options.media_constraints || {'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true }
            // MozDontOfferDataChannel = true when this is firefox
        };
        this.localStream = null;
        this.dispatcher = dispatcher;
        this.disco = options.disco_plugin;
    }

    var jingle = plugin.prototype;
    jingle._name = 'jslix.Jingle';

    jingle.init = function() {
        if (this.disco) {
            var features = [
                'urn:xmpp:jingle:1',
                'urn:xmpp:jingle:apps:rtp:1',
                'urn:xmpp:jingle:transports:ice-udp:1',
                'urn:xmpp:jingle:apps:rtp:audio',
                'urn:xmpp:jingle:apps:rtp:video',
                'urn:ietf:rfc:5761'
            ], self=this;
            $.each(features, function() {
                self.disco.registerFeature(this);
            });
        }
        var handler = stanzas.Element({
            setHandler: function(stanza, top) {
                console.log('on jingle ' + stanza.action);
                var sess = this.sessions[stanza.sid];
                if (stanza.action != 'session-initiate' &&
                    (!sess || (top.from.bare() != sess.peerjid.bare()))) {
                    throw new errors.UnknownSessionError();
                } else if (stanza.action == 'session-initiate' && sess) {
                    throw new jslix_errors.ServiceUnavailableError();
                }
                switch (stanza.action) {
                case 'session-initiate':
                    sess = new JingleSession(top.to, stanza.sid, this.dispatcher);
                    // configure session
                    if (this.localStream) {
                        sess.localStreams.push(this.localStream);
                    }
                    sess.media_constraints = this.media_constraints;
                    sess.pc_constraints = this.pc_constraints;
                    sess.ice_config = this.ice_config;

                    sess.initiate(top.from, false);
                    // FIXME: setRemoteDescription should only be done when this call is to be accepted
                    sess.setRemoteDescription(stanza, 'offer');

                    this.sessions[sess.sid] = sess;
                    this.jid2session[sess.peerjid] = sess;

                    // the callback should either .sendAnswer and .accept
                    // or .sendTerminate
                    signals.call.incoming.dispatch(sess.sid);
                    break;
                case 'session-accept':
                    sess.setRemoteDescription(stanza, 'answer');
                    sess.accept();
                    signals.call.accepted.dispatch(sess.sid);
                    break;
                case 'session-terminate':
                    console.log('terminating...');
                    sess.terminate();
                    this.terminate(sess.sid);
                    break;
                case 'transport-info':
                    sess.addIceCandidate(stanza.contents);
                    break;
                case 'session-info':
                    // XXX: stanzas
                    if (stanza.ringing) {
                        signals.info.ringing.dispatch(sess.sid);
                    } else if (stanza.mute) {
                        var affected = stanza.mute.name;
                        signals.info.mute.dispatch(sess.sid, affected);
                    } else if (stanza.unmute) {
                        var affected = stanza.unmute.name;
                        signals.info.unmute.dispatch(sess.sid, affected);
                    }
                    break;
                default:
                    console.warn('jingle action not implemented', action);
                    throw new jslix_errors.BadRequestError('unknown action');
                }
                // send ack
                return stanza.makeResult();
            }
        }, [jingle_stanzas.JingleQuery]);
        this.dispatcher.addHandler(handler, this);
    }

    jingle.initiate = function(peerjid, myjid) {
        if (myjid === undefined) {
            myjid = this.dispatcher.myjid;
        }
        var sess = new JingleSession(myjid,
                                     Math.random().toString(36).substr(2, 12), // random string
                                     this.dispatcher);
        // configure session
        if (this.localStream) {
            sess.localStreams.push(this.localStream);
        }
        sess.media_constraints = this.media_constraints;
        sess.pc_constraints = this.pc_constraints;
        sess.ice_config = this.ice_config;

        sess.initiate(new JID(peerjid), true);
        this.sessions[sess.sid] = sess;
        this.jid2session[sess.peerjid] = sess;
        sess.sendOffer();
        return sess;
    }

    jingle._terminate_session = function(sid, reason, text) {
        if(this.sessions[sid].state != 'ended'){
            this.sessions[sid].sendTerminate(reason||(!this.sessions[sid].active())?'cancel':null, text);
            this.sessions[sid].terminate();
        }
        delete this.jid2session[this.sessions[sid].peerjid];
        delete this.sessions[sid];
    }

    jingle.terminate = function(sid, reason, text) {
        if (!sid) {
            for (sid in this.sessions) {
                this._terminate_session(sid, reason, text);
            }
        } else if (this.sessions.hasOwnProperty(sid)) {
            this._terminate_session(sid, reason, text);
        }
    }

    jingle.terminateByJid = function(jid) {
        if (this.jid2session.hasOwnProperty(jid)) {
            var sess = this.jid2session[jid];
            if (sess) {
                sess.terminate();
                console.log('peer went away silently', jid);
                delete this.sessions[sess.sid];
                delete this.jid2session[jid];
                signals.call.terminated.dispatch(sess.sid, 'gone');
            }
        }
    }

    return plugin;
});
