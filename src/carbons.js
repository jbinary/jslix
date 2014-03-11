"use strict";
define(['jslix/fields', 'jslix/stanzas', 'jslix/forwarded', 'jslix/common'],
function(fields, stanzas, forwarded, jslix) {
    var plugin = function(dispatcher, options) {
        this._dispatcher = dispatcher;
    }

    var carbons = plugin.prototype,
    Element = stanzas.Element;
    carbons._name = 'jslix.Carbons';
    carbons.NS = 'urn:xmpp:carbons:2';
    carbons.QueryStanza = Element({
        xmlns: carbons.NS
    }, [stanzas.QueryStanza]);
    carbons.EnableStanza = Element({
        element_name: 'enable'
    }, [carbons.QueryStanza]);
    carbons.DisableStanza = Element({
        element_name: 'disable'
    }, [carbons.QueryStanza]);
    carbons.PrivateStanza = Element({
        element_name: 'private',
        xmlns: carbons.NS,
        parent_element: stanzas.MessageStanza
    });
    carbons.SentStanza = Element({
        element_name: 'sent',
        xmlns: carbons.NS,
        parent_element: stanzas.MessageStanza
    });
    carbons.handlerStanza = Element({
        parent_element: carbons.SentStanza,
        node: new fields.Node('message', 'jabber:client'),
        anyHandler: function(stanza, top) {
            if (this.handler) {
                try {
                    var handler = jslix._parse(stanza.node, this.handler);
                } catch(e) {}
                if (handler) {
                    stanza.link(handler);
                    handler.carbonsHandler(handler);
                    return new stanzas.EmptyStanza();
                }
            }
        }
    }, [forwarded.prototype.ForwardedStanza]);

    carbons.init = function() {
        this._dispatcher.addHandler(this.handlerStanza, this, this._name);
    }
    carbons._request = function(QueryClass) {
        return this._dispatcher.send(
            QueryClass.create({
                parent: {
                    type: 'set'
                }
            })
        );
    }
    carbons.enable = function(handler) {
        this.handler = handler;
        return this._request(this.EnableStanza);
    }
    carbons.disable = function() {
        this.handler = undefined;
        return this._request(this.DisableStanza);
    }
    return plugin;
});
