"use strict";
define(['jslix/stanzas', 'jslix/fields', 'jslix/delay'],
function(stanzas, fields, delay) {
    var plugin = function(dispatcher) {
        this._dispatcher = dispatcher;
    }

    var forwarded = plugin.prototype;
    forwarded._name = 'jslix.Forwarded';
    forwarded.NS = 'urn:xmpp:forward:0';

    forwarded.ForwardedStanza = stanzas.Element({
        parent_element: stanzas.MessageStanza,
        element_name: 'forwarded',
        xmlns: forwarded.NS,

        delay: new fields.ElementNode(delay.stanzas.delay)
    });
    return plugin;
});
