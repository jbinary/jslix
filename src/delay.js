"use strict";
define(['jslix/stanzas', 'jslix/fields'], function(stanzas, fields){

    var module = {};

    module.stanzas = {
        delay: stanzas.Element({
            element_name: 'delay',
            xmlns: 'urn:xmpp:delay',

            from: new fields.JIDAttr('from', false),
            stamp: new fields.DateTimeAttr('stamp', true),
            description: new fields.StringNode(null, false, false,
                                               undefined, true)
        })
    };

    module.stanzas.mixin = stanzas.Element({
        delay: new fields.ElementNode(module.stanzas.delay)
    });

    return module;

});
