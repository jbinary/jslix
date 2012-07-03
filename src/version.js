"use strict";
(function(window) {

    var jslix = window.jslix;
    var fields = jslix.fields;
    var NS = 'jabber:iq:version';

    jslix.version = {
        name: 'jslix powered client',
        version: '0.0',

        get: function(jid) {
            var query = jslix.version.stanzas.request.create();
            var iq = jslix.stanzas.iq.create(
                {
                    type: 'get',
                    to: jid,
                    link: query
                });
            return jslix.dispatcher.send(query);
        },

        stanzas: {
            response: jslix.Element({
                //Definition
                xmlns: NS,
                //Fields
                name: new fields.StringNode('name', true),
                version: new fields.StringNode('version', true),
                os: new fields.StringNode('os'),
            }, [jslix.stanzas.query])
        }
    }
    jslix.version.stanzas.request = jslix.Element({
        //Definition
        xmlns: NS,
        //Handlers
        result_class: jslix.version.stanzas.response,
        getHandler: function(query, top) {
            var result = query.makeResult(
                {
                    version: this.version,
                    name: this.name,
                    os: 'JSLiX'
                }
            );
            return result;
        }
    }, [jslix.stanzas.query]);

    jslix.dispatcher = new jslix.dispatcher();
    jslix.dispatcher.addHandler(jslix.version.stanzas.request, jslix.version);

})(window);
