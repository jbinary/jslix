"use strict";
define(['libs/signals'], function(signals) {
    var Signal = signals.Signal;

    return {
        /* Args: sid, error_object, source */
        error: new Signal(),
        media: {
            ready: new Signal(),
            failure: new Signal()
        },
        call: {
            incoming: new Signal(),
            /* Args: sid, ReasonElement object */
            terminated: new Signal(),
        },
        info: {
            /* Args: sid */
            ringing: new Signal(),
            /* Args: sid, affected (name of the media) */
            mute: new Signal(),
            /* Args: sid, affected (name of the media) */
            unmute: new Signal()
        },
        remote_stream: {
            /* Args for both: event, sid */
            added: new Signal(),
            removed: new Signal()
        },
        ice: {
            /* Args: sid, session_object */
            state_change: new Signal(),
            /* Args: sid */
            no_stun_candidates: new Signal()
        }
    }
});
