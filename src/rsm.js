"use strict";
// TODO: Discover support
define(['jslix/fields', 'jslix/stanzas'],
function(fields, stanzas) {
    var plugin = function(dispatcher, options) {
        this._dispatcher = dispatcher;
    }

    var rsm = plugin.prototype,
    Element = stanzas.Element;

    rsm._name = 'jslix.RSM';
    rsm.NS = 'http://jabber.org/protocol/rsm';
    rsm.FirstElement = Element({
        element_name: 'first',
        index: new fields.IntegerNode('index'),
        id: new fields.StringNode(undefined, true, false, undefined, true)
    });
    rsm.SetElement = Element({
        element_name: 'set',
        xmlns: rsm.NS,
        after: new fields.StringNode('after'),
        before: new fields.StringNode('before'),
        count: new fields.IntegerNode('count'),
        index: new fields.IntegerNode('index'),
        last: new fields.StringNode('last'),
        max: new fields.IntegerNode('max'),
        first: new fields.ElementNode(rsm.FirstElement)
    });

    // TODO: destructor should remove decorator from dispatcher.send
    rsm.init = function() {
        var dispatcher = this._dispatcher,
        that = this,
        send = dispatcher.send;
        dispatcher.send = function() {
            var els = arguments[0],
            params = that._rsm_params,
            definition = els.__definition__,
            result_class = definition && definition.result_class;
            if (params && els instanceof Array) {
                // TODO: warn
            } else if (params && !result_class) {
                // TODO: warn
            } else if (params && result_class) {
                els.link(that.SetElement.create(params));
                els.__definition__ = Element({
                    result_class: Element({
                        rsm: new fields.ElementNode(that.SetElement)
                    }, [result_class])
                }, [els.__definition__]);
            }
            return send.apply(dispatcher, arguments);
        }
    }

    rsm.wrap = function(fun, rsm_params) {
        var that = this,
        clean_env = function() {
            delete that._rsm_params;
        };
        return function() {
            that._rsm_params = rsm_params;
            try {
                var result = fun.apply(this, arguments);
            } catch(e) {
                clean_env();
                throw(e);
            }
            clean_env();
            return result;
        }
    }
    return plugin;
});
