"use strict";
define(['jslix/fields', 'jslix/stanzas', 'jslix/jid'],
    function(fields, stanzas, JID){

    var plugin = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.RestartResultStanza, this, this._name);
        this._dispatcher.addHandler(this.ResponseStanza, this, this._name);
    }

    var bind = plugin.prototype,
        Element = stanzas.Element;

    bind._name = 'jslix.Bind';

    bind.BIND_NS = 'urn:ietf:params:xml:ns:xmpp-bind';

    bind.BaseStanza = Element({
        xmlns: bind.BIND_NS,
        element_name: 'bind'
    });

    bind.RestartResultStanza = Element({
        parent_element: stanzas.FeaturesStanza,
        handler: function(top){
            return stanzas.IQStanza.create({
                type: 'set',
                link: bind.RequestStanza.create({
                    resource: this._dispatcher.connection.jid.getResource()
                })
            });
        }
    }, [bind.BaseStanza]);

    bind.RequestStanza = Element({
        parent_element: stanzas.IQStanza,
        resource: new fields.StringNode('resource', true)
    }, [bind.BaseStanza]);

    bind.ResponseStanza = Element({
        parent_element: stanzas.IQStanza,
        jid: new fields.StringNode('jid', true),
        handler: function(top){
            this._dispatcher.connection.jid = new JID(top.jid);
        }
    }, [bind.BaseStanza]);

    return plugin;

});
