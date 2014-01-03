"use strict";
define(['jslix/fields', 'jslix/stanzas', 'jslix/exceptions',
        'jslix/jingle/sdp', 'jslix/jingle/signals', 'jslix/jingle/session',
        'jslix/jingle/stanzas', 'jslix/jingle/errors', 'jslix/errors'],
    function(fields, stanzas, exceptions, SDP, signals, JingleSession,
             jingle_stanzas, errors, jslix_errors) {

    SDP = SDP.SDP;
    var plugin = function(dispatcher, options) {
        // TODO: process options correctly
        this.connection = null;
        this.sessions = {};
        this.jid2session = {};
        this.ice_config = {iceServers: []};
        this.pc_constraints = {};
        this.media_constraints = {'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true }
            // MozDontOfferDataChannel = true when this is firefox
        };
        this.localStream = null;
        this.MULTIPARTY = false;
        this.AUTOACCEPT = true;
        this.PRANSWER = false;
        this.dispatcher = dispatcher;
    }

    var jingle = plugin.prototype;
    jingle._name = 'jslix.Jingle';

    jingle.init = function() {
        // TODO: disco
        var handler = stanzas.Element({
            setHandler: function(stanza, top) {
                if (stanza.action != 'session-initiate' &&
                    !(stanza.sid in this.sessions)) {
                    throw new errors.UnknownSessionError();
                }
                console.log('on jingle ' + stanza.action);
                var sess = this.sessions[stanza.sid];
                switch (stanza.action) {
                case 'session-initiate':
                    if (this.MULTIPARTY || Object.keys(this.sessions).length == 0) {
                        sess = new JingleSession(top.to, stanza.sid, this.dispatcher);
                        // configure session
                        sess.localStream = this.localStream;
                        sess.media_constraints = this.media_constraints;
                        sess.pc_constraints = this.pc_constraints;
                        sess.ice_config = this.ice_config;

                        sess.initiate(top.from, false);
                        // FIXME: setRemoteDescription should only be done when this call is to be accepted
                        sess.setRemoteDescription(stanza, 'offer');

                        this.sessions[sess.sid] = sess;
                        this.jid2session[sess.peerjid] = sess;

                        signals.call.incoming.dispatch(sess.sid);

                        // FIXME: this should be a callback based on the jid
                        if (this.AUTOACCEPT) {
                            sess.sendAnswer();
                            sess.accept();
                            // FIXME: watch for unavailable from this specific jid to terminate properly and remove handler later
                            //  currently done by app + terminateByJid
                            // hand = this.connection.addHandler(onPresenceUnavailable, null, 'presence', 'unavailable', null, roomjid, {matchBare: true});
                        } else if (this.PRANSWER) {
                            sess.sendAnswer(true);
                        }
                    } else {
                        sess = new JingleSession(top.to, stanza.sid, this.dispatcher);
                        sess.peerjid = top.from;
                        sess.sendTerminate('busy');
                        sess.terminate();
                    }
                    break;
                case 'session-accept':
                    sess.setRemoteDescription(stanza, 'answer');
                    sess.accept();
                    break;
                case 'session-terminate':
                    console.log('terminating...');
                    sess.terminate();
                    this.terminate(sess.sid);
                    signals.call.terminated.dispatch(sess.sid, stanza.reason);
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
        sess.localStream = this.localStream;
        sess.media_constraints = this.media_constraints;
        sess.pc_constraints = this.pc_constraints;
        sess.ice_config = this.ice_config;

        sess.initiate(peerjid, true);
        this.sessions[sess.sid] = sess;
        this.jid2session[sess.peerjid] = sess;
        sess.sendOffer();
        return sess;
    }

    jingle.terminate = function(sid, reason, text) {
        if (sid == null) {
            for (sid in this.sessions) {
                if(this.sessions[sid].state != 'ended'){
                    this.sessions[sid].sendTerminate(reason||(!this.sessions[sid].active())?'cancel':null, text);
                    this.sessions[sid].terminate();
                }
                delete this.jid2session[this.sessions[sid].peerjid];
                delete this.sessions[sid];
            }
        } else if (this.sessions.hasOwnProperty(sid)) {
            if(this.sessions[sid].state != 'ended'){
                this.sessions[sid].sendTerminate(reason||(!this.sessions[sid].active())?'cancel':null, text);
                this.sessions[sid].terminate();
            }
            delete this.jid2session[this.sessions[sid].peerjid];
            delete this.sessions[sid];
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
