"use strict";
(function(){

    var jslix = window.jslix;

    jslix.disco = function(dispatcher){
        this.identities = [];
        this.features = [];
        this._dispatcher = dispatcher;
    }

    jslix.disco.prototype.init = function(caps_plugin) {
        this.caps_plugin = caps_plugin;
        this._dispatcher.addHandler(jslix.disco.stanzas.request, this,
                                    jslix.disco._name);
        this.registerFeature(jslix.disco.DISCO_INFO_NS);
    }

    jslix.disco.prototype.registerFeature = function(feature_var){
        this.features.push(
            jslix.disco.stanzas.feature.create({
                feature_var: feature_var
            })
        );
    }

    jslix.disco.prototype.getFeatures = function(){
        return this.features;
    }

    jslix.disco.prototype.registerIdentity = function(category, type, name){
        this.identities.push(
            jslix.disco.stanzas.identity.create({
                category: category,
                type: type,
                name: name
            })
        );
    }

    jslix.disco.prototype.getIdentities = function(){
        return this.identities;
    }

    jslix.disco.prototype.getJIDFeatures = function(jid, node){
        return this._dispatcher.send(
            jslix.disco.stanzas.request.create({
                node: node,
                parent: jslix.stanzas.iq.create({
                    to: jid,
                    type: 'get'
                })
            })
        );
    }

    jslix.disco.prototype.extractData = function(identities, features){
        var result = {
                identities: [],
                features: []
            },
            identities = identities || this.getIdentities(),
            features = features || this.getFeatures();
        for(var i=0; i<identities.length; i++){
            var identity = identities[i];
            result.identities.push([
                identity.category,
                identity.type,
                identity.xml_lang,
                identity.name
            ]);
        }
        result.identities.sort(function(a, b){
            for(var i=0; i<4; i++){
                if(a[i] === b[i]){
                    continue;
                }
                if(a[i] < b[i]){
                    return -1;
                }
                if(a[i] > b[i]){
                    return 1
                }
            }
            return 0;
        });
        for(var i=0; i<features.length; i++){
            var feature = features[i];
            result.features.push(feature.feature_var);
        }
        result.features.sort();
        return result;
    }

    jslix.disco._name = 'jslix.disco';

    jslix.disco.DISCO_INFO_NS = 'http://jabber.org/protocol/disco#info';

    jslix.disco.DISCO_ITEMS_NS = 'http://jabber.org/protocol/disco#items';

    jslix.disco.stanzas = {};

    jslix.disco.stanzas.feature = jslix.Element({
        xmlns: jslix.disco.DISCO_INFO_NS,
        element_name: 'feature',
        feature_var: new jslix.fields.StringAttr('var', true)
    });

    jslix.disco.stanzas.identity = jslix.Element({
        xmlns: jslix.disco.DISCO_INFO_NS,
        element_name: 'identity',
        xml_lang: new jslix.fields.StringAttr('xml:lang', false),
        category: new jslix.fields.StringAttr('category', true),
        type: new jslix.fields.StringAttr('type', true),
        name: new jslix.fields.StringAttr('name', false)
    });

    jslix.disco.stanzas.response = jslix.Element({
        xmlns: jslix.disco.DISCO_INFO_NS,
        identities: new jslix.fields.ElementNode(jslix.disco.stanzas.identity,
            true, true),
        features: new jslix.fields.ElementNode(jslix.disco.stanzas.feature,
            false, true)
    }, [jslix.stanzas.query]);

    jslix.disco.stanzas.request = jslix.Element({
        xmlns: jslix.disco.DISCO_INFO_NS,
        result_class: jslix.disco.stanzas.response,
        getHandler: function(query, top){
            if(query.node != undefined){
                var splited_node = query.node.split('#'),
                    node = splited_node[0],
                    hash = splited_node[1],
                    valid_hash,
                    valid_node;
                if(this.caps_plugin){
                    valid_node = this.caps_plugin.options.node;
                    valid_hash = this.caps_plugin.getVerificationString();
                }
                if(valid_hash != hash || valid_node != node){
                    return query.makeError('item-not-found');
                }
            }
            var result = query.makeResult({
                node: query.node
            });
            for(var i=0; i<this.identities.length; i++){
                result.link(this.identities[i]);
            }
            for(var i=0; i<this.features.length; i++){
                result.link(this.features[i]);
            }
            return result;
        },
    }, [jslix.stanzas.query]);

})();
