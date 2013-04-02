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
            this.options.composing_paused_timeout = 30;
        }
        if (this.options.inactive_timeout === undefined) {
            this.options.inactive_timeout = 120;
        }
        if (this.options.gone_timeout === undefined) {
            this.options.gone_timeout = 600 - 120;
        }
        // How much to wait for some message we can to link a chatstate to?
        if (this.options.send_timeout === undefined) {
            this.options.send_timeout = 0.5;
        }
    }
    var Chatstates = jslix.Chatstates;
    var proto = Chatstates.prototype;

    // Signals
    Chatstates.signals = {
        updated: new Signal()
    }

    Chatstates.stanzas = {};

    Chatstates.NS = 'http://jabber.org/protocol/chatstates'
    proto.init = function() {
        if (this.options['disco_plugin'] !== undefined) {
            this.options['disco_plugin'].registerFeature(Chatstates.NS);
        }
        if (this._dispatcher) {
            this._dispatcher.addHandler(Chatstates.stanzas.Handler, this,
                                        jslix.Chatstates._name);
            this._dispatcher.addHook('send', Chatstates.stanzas.Hook, this,
                                     jslix.Chatstates._name);
        }
    }

    proto.update_my_activity = function(state, jid) {
        var activity = this.my_activity[jid.getBareJID()] || {'state': state};
        var old_activity = activity['state'];
        activity['state'] = state;
        var that = this, timer;
        if (status == 'composing') {
            // What if a user paused an input?
            timer = setTimeout(function() {
                that.update_my_activity('paused', jid);
            }, this.options['composing_paused_timeout'] * 1000);
        } else if (status == 'active' || status == 'paused') {
            // If user is not paying attention to the conversaion
            // for some time then the state should be changed
            // to "inactive".
            timer = setTimeout(function() {
                that.update_my_activity('inactive', jid);
            }, this.options['inactive_timeout'] * 1000);
        } else if (status == 'inactive') {
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
                var message = jslix.stanzas.message.create({
                    to: jid,
                    type: 'chat'
                });
                this._dispatcher.send(message);
            }, this.options['send_timeout'] * 1000);
        }
        this.my_activity[jid.getBareJID] = activity;
    }

    proto.get_support_flag = function(jid) {
        var flag = this.support_map[jid.toString()] ||
                   this.support_map_bare[jid.getBareJID()];
        return flag;
    }

    proto.set_support_flag = function(jid, flag) {
        this.support_map[jid.toString()] = flag;
        this.support_map_bare[jid.getBareJID()] = flag;
    }

    Chatstates.stanzas.State = jslix.Element({
        xmlns: Chatstates.NS,
        element_name: ':state',
        parent_element: jslix.stanzas.message,
        // Validators
        clean_state: function(value) {
            if (['active', 'inactive', 'gone', 'composing','paused'].
                indexOf(value) == -1) {
                throw new WrongElement();
            }
            return value;
        }
    });

    Chatstates.stanzas.Handler = jslix.Element({
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
            Chatstates.signals.updated.dispatch(top.from, this.state);
            return new jslix.stanzas.empty_stanza();
        }
    }, [Chatstates.stanzas.State]);

    Chatstates.stanzas.Hook = jslix.Element({
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
            var flag = this.get_support_flag(el.to);
            if (flag === undefined || flag) {
                var activity = my_activity[el.to.getBareJID()];
                if (activity.send_timeout) {
                    clearTimeout(activity.send_timeout);
                    delete activity.send_timeout;
                }
                this.set_support_flag(el.to, false);
                var state = Chatstates.stanzas.State.create({
                    state: activity.state
                });
                el.link(state);
                return el;
            }
        }
    }, [jslix.stanzas.message]);

    // TODO: unload method, should clean all the timeouts
    jslix.Chatstates._name = 'jslix.Chatstates';
})();
