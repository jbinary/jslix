"use strict";
(function(){

    var jslix = window.jslix;

    jslix.bind = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.stanzas.restart_result, this);
        this._dispatcher.addHandler(this.stanzas.response, this);
    }

    var bind = jslix.bind.prototype;

    bind._name = 'jslix.bind';

    bind.BIND_NS = 'urn:ietf:params:xml:ns:xmpp-bind';

    bind.stanzas = {};

    bind.stanzas.base = jslix.Element({
        xmlns: bind.BIND_NS,
        element_name: 'bind'
    });

    bind.stanzas.restart_result = jslix.Element({
        parent_element: jslix.stanzas.features,
        handler: function(top){
            return jslix.stanzas.iq.create({
                type: 'set',
                link: bind.stanzas.request.create({
                    resource: this._dispatcher.connection.jid.getResource()
                })
            });
        }
    }, [bind.stanzas.base]);

    bind.stanzas.request = jslix.Element({
        parent_element: jslix.stanzas.iq,
        resource: new jslix.fields.StringNode('resource', true)
    }, [bind.stanzas.base]);

    bind.stanzas.response = jslix.Element({
        parent_element: jslix.stanzas.iq,
        jid: new jslix.fields.StringNode('jid', true),
        handler: function(top){
            this._dispatcher.connection.jid = new jslix.JID(top.jid);
        }
    }, [bind.stanzas.base]);

})();
