"use strict";
define(['jslix/fields', 'jslix/stanzas', 'jslix/jid',
        'cryptojs/core', 'libs/signals', 'cryptojs/enc-base64',
        'cryptojs/sha1'],
    function(fields, stanzas, JID, CryptoJS, signals){

    var plugin = function(dispatcher, options){
        this.options = options || {};
        this.options.node = this.options.node || 'https://github.com/jbinary/jslix';
        this.storage = this.options.storage;
        if(!this.storage){
            throw new Error('You should pass storage in options!');
        }
        this._dispatcher = dispatcher;
        if(this.options['disco_plugin'] === undefined){
            throw new Error('jslix.Disco plugin required!');
        }
        this.options.disco_plugin.registerFeature(this.CAPS_NS);
        this._dispatcher.addHook('send', this.PresenceHook, this, this._name);
        this._dispatcher.addHandler(this.CapsHandler, this, this._name);
        this.registerNodeHandlers();
        this.options.disco_plugin.signals.disco_changed.add(
            this.discoChangedHandler,
            this
        );
        this._dispatcher.connection.signals.disconnect.add(
            this.disconnectHandler,
            this
        );
        this._jid_cache = {};
        this._broken_nodes = [];
        this._cached_presence = stanzas.PresenceStanza.create();
    }

    var caps = plugin.prototype,
        Element = stanzas.Element;

    caps.signals = {
        caps_changed: new signals.Signal()
    };

    caps.destructor = function(){
        this.options.disco_plugin.signals.disco_changed.remove(
            this.discoChangedHandler,
            this
        );
        this._dispatcher.connection.signals.disconnect.remove(
            this.disconnectHandler,
            this
        );
    }

    caps.discoChangedHandler = function(){
        this.options.disco_plugin.removeNodeHandlers(this.node);
        this.registerNodeHandlers(true);
    }

    caps.disconnectHandler = function(){
        this._jid_cache = {};
        this._broken_nodes = [];
    }

    caps.registerNodeHandlers = function(send_presence){
        this.node = [this.options.node, this.getVerificationString()].join('#');
        this.options.disco_plugin.addNodeHandlers(
            this.node,
            this.infoHandler,
            this.itemsHandler,
            this
        );
        if(send_presence){
            this._dispatcher.send(this._cached_presence.clone());
        }
    }

    caps.getVerificationString = function(identities, features){
        var string = '',
            data = this.options.disco_plugin.extractData(identities, features);
        for(var i=0; i<data.identities.length; i++){
            string += data.identities[i].join('/') + '<';
        }
        string += data.features.join('<') + '<';
        return CryptoJS.enc.Base64.stringify(CryptoJS.SHA1(string))
    }

    caps.getJIDFeatures = function(jid){
        if(!(jid instanceof JID)){
            var jid = new JID(jid);
        }
        return this.storage.getItem(this._jid_cache[jid.toString()]);
    }

    caps.infoHandler = function(query){
        return this.options.disco_plugin.create_response(query);
    }

    caps.itemsHandler = function(query){
        return stanzas.EmptyStanza.create();
    }

    caps.CAPS_NS = 'http://jabber.org/protocol/caps';

    caps._name = 'jslix.Caps';

    caps.C = Element({
        parent_element: stanzas.PresenceStanza,
        xmlns: caps.CAPS_NS,
        element_name: 'c',
        hash: new fields.StringAttr('hash', true),
        node: new fields.StringAttr('node', true),
        ver: new fields.StringAttr('ver', true)
    });

    caps.PresenceHook = Element({
        anyHandler: function(el, top){
            var c = caps.C.create({
                hash: 'sha-1',
                node: this.options.node,
                ver: this.getVerificationString()
            });
            if(!el.to || el.to == el.from){
                this._cached_presence = el.clone();
            }
            el.link(c);
            return el;
        }
    }, [stanzas.PresenceStanza]);

    caps.CapsHandler = Element({
        anyHandler: function(el, top){
            var not_same_jid = top.from.toString() !== this._dispatcher.connection.jid.toString(),
                node = [el.node, el.ver].join('#');
            if(not_same_jid && !(node in this._broken_nodes)){
                var old_data = this.storage.getItem(node);
                if(old_data === null){
                    var self = this;
                    this.options.disco_plugin.queryJIDFeatures(top.from, node).done(function(response){
                        var verification_string = self.getVerificationString(
                                response.identities, response.features
                            ),
                            data = JSON.stringify(
                                self.options.disco_plugin.extractData(
                                    response.identities, response.features
                                )
                            );
                        if(verification_string !== el.ver){
                            self._broken_nodes.push(node);
                        }
                        self.storage.setItem(verification_string, data);
                    });
                }
                this._jid_cache[top.from.toString()] = node;
                var data = this.storage.getItem(node);
                if(old_data != data){
                    this.signals.caps_changed.dispatch(top.from, data);
                }
            }
            return stanzas.EmptyStanza.create();
        }
    }, [caps.C]);

    return plugin;

});
