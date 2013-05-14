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
            if(not_same_jid && this.storage.getItem(node) === null){
                var result = this.options.disco_plugin.getJIDFeatures(top.from,
                    node),
                    self = this;
                result.done(function(response){
                    var verification_string = self.getVerificationString(
                        response.identities, response.features),
                        data = 'broken';
                    if(verification_string === el.ver){
                        data = JSON.stringify(
                            self.options.disco_plugin.extractData(
                                response.identities, response.features
                            )
                        );
                    }
                    self.storage.setItem(node, data);
                });
            }
            return new jslix.stanzas.empty_stanza();
        }
    }, [jslix.caps.stanzas.c]);

})();
