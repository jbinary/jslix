"use strict";
(function(){

    var jslix = window.jslix;

    jslix.Bind = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.RestartResultStanza, this);
        this._dispatcher.addHandler(this.ResponseStanza, this);
    }

    var bind = jslix.Bind.prototype;

    bind._name = 'jslix.Bind';

    bind.BIND_NS = 'urn:ietf:params:xml:ns:xmpp-bind';

    bind.BaseStanza = jslix.Element({
        xmlns: bind.BIND_NS,
        element_name: 'bind'
    });

    bind.RestartResultStanza = jslix.Element({
        parent_element: jslix.stanzas.FeaturesStanza,
        handler: function(top){
            return jslix.stanzas.IQStanza.create({
                type: 'set',
                link: bind.RequestStanza.create({
                    resource: this._dispatcher.connection.jid.getResource()
                })
            });
        }
    }, [bind.BaseStanza]);

    bind.RequestStanza = jslix.Element({
        parent_element: jslix.stanzas.IQStanza,
        resource: new jslix.fields.StringNode('resource', true)
    }, [bind.BaseStanza]);

    bind.ResponseStanza = jslix.Element({
        parent_element: jslix.stanzas.IQStanza,
        jid: new jslix.fields.StringNode('jid', true),
        handler: function(top){
            this._dispatcher.connection.jid = new jslix.JID(top.jid);
        }
    }, [bind.BaseStanza]);

})();
