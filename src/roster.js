/*
 * JSLix Roster Implementation.
 *
 */

"use strict";
define(['jslix/fields', 'jslix/stanzas', 'libs/signals', 'jslix/errors'],
    function(fields, stanzas, signals, errors){

    var Signal = signals.Signal,
        Element = stanzas.Element;

    var plugin = function(dispatcher){
        this._dispatcher = dispatcher;
    }

    var roster = plugin.prototype;

    roster._name = 'jslix.Roster';

    roster.ROSTER_NS = 'jabber:iq:roster';

    // Signals
    roster.signals = {
        got: new Signal(),
        updated: new Signal()
    };

    // Stanzas
    roster.ItemStanza = Element({
        element_name: 'item',
        xmlns: roster.ROSTER_NS,

        jid: new fields.JIDAttr('jid'),
        subscription: new fields.StringAttr('subscription', false),
        ask: new fields.StringAttr('ask', false),
        nick: new fields.StringAttr('name', false),
        groups: new fields.StringNode('group', false, true)
    });

    roster.ResponseStanza = Element({
        xmlns: roster.ROSTER_NS,
        items: new fields.ElementNode(roster.ItemStanza, false, true)
    }, [stanzas.QueryStanza]);

    roster.RequestStanza = Element({
        result_class: roster.ResponseStanza,
        xmlns: roster.ROSTER_NS
    }, [stanzas.QueryStanza]);

    roster.UpdateRequestStanza = Element({
        clean_from: function(value, top) {
            var myjid = this._dispatcher.myjid;
            if ([myjid.bare(), myjid.toString(), myjid.domain].indexOf(
                    top.from) == -1) {
                throw new errors.NotAuthorizedError();
            }
            return value;
        },
        setHandler: function(query, top) {
            this.signals.updated.dispatch(query.items);
            return top.makeReply();
        }
    }, [roster.ResponseStanza]);

    // Methods
    roster.init = function() {
        var d = $.Deferred();

        this._dispatcher.addHandler(this.UpdateRequestStanza, this, this._name);

        var request = this.RequestStanza.create({
            parent: stanzas.IQStanza.create({type: 'get'})
        });
        var that = this;
        this._dispatcher.send(request).done(function(result) {
            that.signals.got.dispatch(result.items);
            d.resolve(result);
        }).fail(function(failure) {
            d.reject(failure);
        });
        return d;
    }

    return plugin;

});
