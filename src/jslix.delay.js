"use strict";

(function() {
    var jslix = window.jslix;
    jslix.delayed = {};

    jslix.delayed.stanzas = {
        delay: jslix.Element({
            element_name: 'delay',
            xmlns: 'urn:xmpp:delay',

            from: new jslix.fields.JIDAttr('from', false),
            stamp: new jslix.fields.DateTimeAttr('stamp', true),
            description: new jslix.fields.StringNode(null, false, false,
                                                     undefined, self)
        })
    };

    jslix.delayed.stanzas.mixin = jslix.Element({
        delay: new jslix.fields.ElementNode(jslix.delayed.stanzas.delay)
    });
})();
