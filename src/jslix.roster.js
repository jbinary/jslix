/*
 * JSLix Roster Implementation.
 *
 */

"use strict";
(function(){

    var jslix = window.jslix;
    var fields = jslix.fields;
    var Signal = signals.Signal;

    jslix.roster = function(dispatcher){
        this._dispatcher = dispatcher;
    }

    var roster = jslix.roster.prototype;

    roster._name = 'jslix.roster';

    roster.ROSTER_NS = 'jabber:iq:roster';

    // Signals
    roster.signals = {
        got: new Signal(),
        updated: new Signal()
    };

    // Stanzas
    roster.ItemStanza = jslix.Element({
        element_name: 'item',
        xmlns: roster.ROSTER_NS,

        jid: new fields.JIDAttr('jid'),
        subscription: new fields.StringAttr('subscription', false),
        ask: new fields.StringAttr('ask', false),
        nick: new fields.StringAttr('name', false),
        groups: new fields.StringNode('group', false, true)
    });

    roster.ResponseStanza = jslix.Element({
        xmlns: roster.ROSTER_NS,
        items: new fields.ElementNode(roster.ItemStanza, false, true)
    }, [jslix.stanzas.QueryStanza]);

    roster.RequestStanza = jslix.Element({
        result_class: roster.ResponseStanza,
        xmlns: roster.ROSTER_NS
    }, [jslix.stanzas.QueryStanza]);

    roster.UpdateRequestStanza = jslix.Element({
        clean_from: function(value, top) {
            var myjid = this._dispatcher.myjid;
            if ([myjid.getBareJID, myjid.toString(), myjid.getDomain()].indexOf(
                    top.from) == -1) {
                throw "not-authorized";
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
            parent: jslix.stanzas.IQStanza.create({type: 'get'})
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
})();
