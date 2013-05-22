"use strict";
(function() {
    var jslix = window.jslix,
        fields = jslix.fields,
        Signal = signals.Signal,
        WrongElement = jslix.exceptions.WrongElement,
        my_activity;

    jslix.Chatstates = function(dispatcher, options) {
        this.options = options || {};
        this._dispatcher = dispatcher;
        this.my_activity = {};
        my_activity = this.my_activity;
        this.support_map = {};
        this.support_map_bare = {};
        if (this.options.composing_paused_timeout === undefined) {
            this.options.composing_paused_timeout = 15;
        }
        if (this.options.inactive_timeout === undefined) {
            this.options.inactive_timeout = 120;
        }
        if (this.options.gone_timeout === undefined) {
            this.options.gone_timeout = 600 - 120;
        }
        // How much to wait for some message we can to link a chatstate to?
        if (this.options.send_timeout === undefined) {
            this.options.send_timeout = 0.25;
        }
    }
    var chatstates = jslix.Chatstates.prototype;

    // TODO: unload method, should clean all the timeouts
    chatstates._name = 'jslix.Chatstates';

    // Signals
    chatstates.signals = {
        updated: new Signal()
    }

    chatstates.CHATSTATES_NS = 'http://jabber.org/protocol/chatstates';

    chatstates.init = function() {
        if (this.options['disco_plugin'] !== undefined) {
            this.options['disco_plugin'].registerFeature(this.CHATSTATES_NS);
        }
        if (this._dispatcher) {
            this._dispatcher.addHandler(chatstates.StateHandler, this,
                this._name);
            this._dispatcher.addHook('send', chatstates.MessageHook, this,
                this._name);
        }
    }

    chatstates.update_my_activity = function(state, jid) {
        var activity = this.my_activity[jid.getBareJID()] || {'state': state};
        var old_activity = activity['state'];
        activity['state'] = state;
        var that = this, timer;
        if (state == 'composing') {
            // What if a user paused an input?
            timer = setTimeout(function() {
                that.update_my_activity('paused', jid);
            }, this.options['composing_paused_timeout'] * 1000);
        } else if (state == 'active' || state == 'paused') {
            // If user is not paying attention to the conversaion
            // for some time then the state should be changed
            // to "inactive".
            timer = setTimeout(function() {
                that.update_my_activity('inactive', jid);
            }, this.options['inactive_timeout'] * 1000);
        } else if (state == 'inactive') {
            // If user is inactive for a long time then he's gone
            timer = setTimeout(function() {
                that.update_my_activity('gone', jid); 
            }, this.options['gone_timeout'] * 1000);
        }
        if (timer !== undefined) {
            // If some timer was scheduled, clear the previous one if any
            // and update the state with it.
            if (activity['timer']) {
                clearTimeout(activity['timer']);
            }
            activity.timer = timer;
        }
        if (old_activity != activity['state']) {
            // activity has changed, let's send the new state
            // wait some time if any message will be sent we can link to
            // or send a blank message hook can use to link
            activity.send_timeout = setTimeout(function() {
                var message = jslix.stanzas.MessageStanza.create({
                    to: jid,
                    type: 'chat',
                    id: 'chatstates_fake'
                });
                that._dispatcher.send(message);
            }, this.options['send_timeout'] * 1000);
        }
        this.my_activity[jid.getBareJID()] = activity;
    }

    chatstates.get_support_flag = function(jid) {
        var flag = this.support_map[jid.toString()] ||
                   this.support_map_bare[jid.getBareJID()];
        return flag;
    }

    chatstates.set_support_flag = function(jid, flag) {
        this.support_map[jid.toString()] = flag;
        this.support_map_bare[jid.getBareJID()] = flag;
    }

    chatstates.StateStanza = jslix.Element({
        xmlns: chatstates.CHATSTATES_NS,
        element_name: ':state',
        parent_element: jslix.stanzas.MessageStanza,
        // Validators
        clean_state: function(value) {
            if (['active', 'inactive', 'gone', 'composing','paused'].
                indexOf(value) == -1) {
                throw new WrongElement();
            }
            return value;
        }
    });

    chatstates.StateHandler = jslix.Element({
        clean_type: function(value) {
            // seems stupid but what if we'll want to add support for
            // another message types?
            if (value == 'error' || value != 'chat') {
                throw new WrongElement();
            }
            return value;
        },
        anyHandler: function(el, top) {
            this.set_support_flag(top.from, true);
            this.signals.updated.dispatch(top.from, el.state);
            return jslix.stanzas.EmptyStanza.create();
        }
    }, [chatstates.StateStanza]);

    chatstates.MessageHook = jslix.Element({
        clean_type: function(value) {
            if (value !== 'chat') {
                throw new WrongElement();
            }
            return value;
        },
        clean_to: function(value) {
            var bare = value.getBareJID();
            if (!value || !my_activity[bare]) {
                throw new WrongElement();
            }
            return value;
        },
        anyHandler: function(el, top) {
            var is_fake = el.id == 'chatstates_fake';
            if (is_fake) {
                delete el.id;
            }
            var flag = this.get_support_flag(el.to);
            if (flag === undefined || flag) {
                var activity = my_activity[el.to.getBareJID()];
                if (activity.send_timeout) {
                    clearTimeout(activity.send_timeout);
                    delete activity.send_timeout;
                }
                if (flag === undefined) {
                    this.set_support_flag(el.to, false);
                }
                var state = chatstates.StateStanza.create({
                    state: activity.state
                });
                el.link(state);
            } else if (is_fake) {
                el = jslix.stanzas.EmptyStanza.create();
            }
            return el;
        }
    }, [jslix.stanzas.MessageStanza]);

})();
