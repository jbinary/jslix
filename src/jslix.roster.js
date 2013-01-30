/*
 * JSLix Roster Implementation.
 * Requires the js-signals library
 *
 */

"use strict";
(function(){

    var jslix = window.jslix;
    var fields = jslix.fields;
    var Signal = signals.Signal;

    jslix.roster = function(dispatcher){
        this._dispatcher = dispatcher;
        this.signals = roster.signals;
    }
    var roster = jslix.roster;

    roster._name = 'jslix.roster';

    roster.ROSTER_NS = 'jabber:iq:roster';

    // Signals
    roster.signals = {
        got: new Signal()
    }

    // Stanzas
    roster.stanzas = {};
    var stanzas = roster.stanzas;

    stanzas.item = jslix.Element({
        element_name: 'item',
        xmlns: roster.ROSTER_NS,

        jid: new fields.JIDAttr('jid'),
        subscription: new fields.StringAttr('subscription', false),
        ask: new fields.StringAttr('ask', false),
        nick: new fields.StringAttr('name', false),
        groups: new fields.StringNode('group', false, true)
    });

    stanzas.response = jslix.Element({
        xmlns: roster.ROSTER_NS,
        items: new fields.ElementNode(stanzas.item, false, true)
    }, [jslix.stanzas.query]);

    stanzas.request = jslix.Element({
        result_class: stanzas.response,
        xmlns: roster.ROSTER_NS
    }, [jslix.stanzas.query]);

    // Methods
    roster.prototype.init = function() {
        var d = $.Deferred();
        var request = stanzas.request.create({
            parent: jslix.stanzas.iq.create({type: 'get'})
        });
        var that = this;
        this._dispatcher.send(request).done(function(result) {
            roster.signals.got.dispatch(result);
            d.resolve(result);
        }).fail(function(failure) {
            d.reject(failure);
        });
        return d;
    }
})();
