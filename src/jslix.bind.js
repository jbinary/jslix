(function(){

    var jslix = window.jslix;

    jslix.bind = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addTopHandler(jslix.bind.stanzas.response, this);
    }

    jslix.bind.BIND_NS = 'urn:ietf:params:xml:ns:xmpp-bind';

    jslix.bind.stanzas = {};

    jslix.bind.stanzas.base = jslix.Element({
        xmlns: jslix.bind.BIND_NS,
        element_name: 'bind',
        parent_element: jslix.stanzas.iq
    });

    jslix.bind.stanzas.request = jslix.Element({
        resource: new jslix.fields.StringNode('resource', true)
    }, [jslix.bind.stanzas.base]);

    jslix.bind.stanzas.response = jslix.Element({
        jid: new jslix.fields.StringNode('jid', true),
        handler: function(result, top){
            this._dispatcher.connection.jid = new jslix.JID(result.jid);
        }
    }, [jslix.bind.stanzas.base]);

})();
