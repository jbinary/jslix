"use strict";
(function(){
    var jslix = window.jslix;

    jslix.caps = function(dispatcher, options){
        this.options = options || {};
        this.options.node = this.options.node || 'https://github.com/jbinary/jslix';
        this.storage = this.options.storage;
        this._dispatcher = dispatcher;
        if(this.options['disco_plugin'] === undefined){
            throw new Error('jslix.disco plugin required!');
        }
        this.options.disco_plugin.registerFeature(jslix.caps.CAPS_NS);
        this._dispatcher.addHook('send', jslix.caps.stanzas.Hook, this,
            jslix.caps._name);
        this._dispatcher.addHandler(jslix.caps.stanzas.Handler, this,
            jslix.caps._name);
        this.registerNodeHandlers();
        this.options.disco_plugin.constructor.signals.disco_changed.add(function(){
            this.options.disco_plugin.removeNodeHandlers(this.node);
            this.registerNodeHandlers(true);
        }, this);
        this._dispatcher.connection.constructor.signals.disconnect.add(function(){
            this._jid_cache = {};
            this._broken_nodes = [];
        }, this);
        this._jid_cache = {};
        this._broken_nodes = [];
    }

    jslix.caps.prototype.registerNodeHandlers = function(send_presence){
        this.node = [this.options.node, this.getVerificationString()].join('#');
        this.options.disco_plugin.addNodeHandlers(
            this.node,
            this.infoHandler,
            this.itemsHandler,
            this
        );
        if(send_presence){
            this._dispatcher.send(jslix.stanzas.presence.create());
        }
    }

    jslix.caps.prototype.getVerificationString = function(identities, features){
        var string = '',
            data = this.options.disco_plugin.extractData(identities, features);
        for(var i=0; i<data.identities.length; i++){
            string += data.identities[i].join('/') + '<';
        }
        string += data.features.join('<') + '<';
        return CryptoJS.enc.Base64.stringify(CryptoJS.SHA1(string))
    }

    jslix.caps.prototype.getJIDFeatures = function(jid){
        if(!(jid instanceof jslix.JID)){
            var jid = new jslix.JID(jid);
        }
        if(jid.getBareJID() == jid.toString()){
            throw new Error("jid shouldn't be bare.")
        }
        return this.storage.getItem(this._jid_cache[jid.toString()]);
    }

    jslix.caps.prototype.infoHandler = function(query){
        return this.options.disco_plugin.create_response(query);
    }

    jslix.caps.prototype.itemsHandler = function(query){
        return jslix.stanzas.empty_stanza.create();
    }

    jslix.caps.CAPS_NS = 'http://jabber.org/protocol/caps';

    jslix.caps._name = 'jslix.caps';

    jslix.caps.stanzas = {};

    jslix.caps.stanzas.c = jslix.Element({
        parent_element: jslix.stanzas.presence,
        xmlns: jslix.caps.CAPS_NS,
        element_name: 'c',
        hash: new jslix.fields.StringAttr('hash', true),
        node: new jslix.fields.StringAttr('node', true),
        ver: new jslix.fields.StringAttr('ver', true)
    });

    jslix.caps.stanzas.Hook = jslix.Element({
        anyHandler: function(el, top){
            var c = jslix.caps.stanzas.c.create({
                hash: 'sha-1',
                node: this.options.node,
                ver: this.getVerificationString()
            });
            el.link(c);
            return el;
        }
    }, [jslix.stanzas.presence]);

    jslix.caps.stanzas.Handler = jslix.Element({
        anyHandler: function(el, top){
            var not_same_jid = top.from.toString() !== this._dispatcher.connection.jid.toString(),
                node = [el.node, el.ver].join('#');
            if(not_same_jid && !(node in this._broken_nodes)){
                if(this.storage.getItem(node) === null){
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
                        if(!verification_string === el.ver){
                            self._broken_nodes.push(node);
                        }
                        self.storage.setItem(verification_string, data);
                        self._jid_cache[top.from.toString()] = node;
                    });
                }else{
                    this._jid_cache[top.from.toString()] = node;
                }
            }
            return jslix.stanzas.empty_stanza.create();
        }
    }, [jslix.caps.stanzas.c]);

})();
