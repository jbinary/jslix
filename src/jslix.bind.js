"use strict";
(function(){

    var jslix = window.jslix;

    jslix.bind = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(jslix.bind.stanzas.restart_result, this);
        this._dispatcher.addHandler(jslix.bind.stanzas.response, this);
    }

    jslix.bind._name = 'jslix.bind';

    jslix.bind.BIND_NS = 'urn:ietf:params:xml:ns:xmpp-bind';

    jslix.bind.stanzas = {};

    jslix.bind.stanzas.base = jslix.Element({
        xmlns: jslix.bind.BIND_NS,
        element_name: 'bind'
    });

    jslix.bind.stanzas.restart_result = jslix.Element({
        parent_element: jslix.stanzas.features,
        handler: function(top){
            return jslix.stanzas.iq.create({
                type: 'set',
                link: jslix.bind.stanzas.request.create({
                    resource: this._dispatcher.connection.jid.getResource()
                })
            });
        }
    }, [jslix.bind.stanzas.base]);

    jslix.bind.stanzas.request = jslix.Element({
        parent_element: jslix.stanzas.iq,
        resource: new jslix.fields.StringNode('resource', true)
    }, [jslix.bind.stanzas.base]);

    jslix.bind.stanzas.response = jslix.Element({
        parent_element: jslix.stanzas.iq,
        jid: new jslix.fields.StringNode('jid', true),
        handler: function(top){
            this._dispatcher.connection.jid = new jslix.JID(top.jid);
        }
    }, [jslix.bind.stanzas.base]);

})();
