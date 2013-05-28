"use strict";
define(['jslix/fields', 'jslix/stanzas', 'libs/signals'],
    function(fields, stanzas, signals){

    var plugin = function(dispatcher){
        this.identities = [];
        this.features = [];
        this._dispatcher = dispatcher;
        this._nodeHandlers = [];
    }

    var disco = plugin.prototype,
        Element = stanzas.Element;

    disco.init = function() {
        this._dispatcher.addHandler(this.RequestStanza, this, this._name);
        this.registerFeature(this.DISCO_INFO_NS);
        this.registerFeature(this.DISCO_ITEMS_NS);
    }

    disco.addNodeHandlers = function(pattern, infoHandler, itemsHandler, context){
        this._nodeHandlers.push([
            pattern,
            infoHandler,
            itemsHandler,
            context
        ]);
    }

    disco.removeNodeHandlers = function(pattern){
        this._nodeHandlers = this._nodeHandlers.filter(function(el){
            return el[0] !== pattern;
        });
    }

    disco.registerFeature = function(feature_var){
        this.features.push(
            this.FeatureStanza.create({
                feature_var: feature_var
            })
        );
        this.signals.disco_changed.dispatch();
    }

    disco.getFeatures = function(){
        return this.features;
    }

    disco.registerIdentity = function(category, type, name){
        this.identities.push(
            disco.IdentityStanza.create({
                category: category,
                type: type,
                name: name
            })
        );
        this.signals.disco_changed.dispatch();
    }

    disco.getIdentities = function(){
        return this.identities;
    }

    disco.queryJIDFeatures = function(jid, node){
        return this._dispatcher.send(
            disco.RequestStanza.create({
                node: node,
                parent: stanzas.IQStanza.create({
                    to: jid,
                    type: 'get'
                })
            })
        );
    }

    disco.extractData = function(identities, features){
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

    disco.create_response = function(query){
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
    }

    disco._name = 'jslix.Disco';

    disco.signals = {
        disco_changed: new signals.Signal()
    }

    disco.DISCO_INFO_NS = 'http://jabber.org/protocol/disco#info';

    disco.DISCO_ITEMS_NS = 'http://jabber.org/protocol/disco#items';

    disco.FeatureStanza = Element({
        xmlns: disco.DISCO_INFO_NS,
        element_name: 'feature',
        feature_var: new fields.StringAttr('var', true)
    });

    disco.IdentityStanza = Element({
        xmlns: disco.DISCO_INFO_NS,
        element_name: 'identity',
        xml_lang: new fields.StringAttr('xml:lang', false),
        category: new fields.StringAttr('category', true),
        type: new fields.StringAttr('type', true),
        name: new fields.StringAttr('name', false)
    });

    disco.ResponseStanza = Element({
        xmlns: disco.DISCO_INFO_NS,
        identities: new fields.ElementNode(disco.IdentityStanza,
            true, true),
        features: new fields.ElementNode(disco.FeatureStanza,
            false, true)
    }, [stanzas.QueryStanza]);

    disco.RequestStanza = Element({
        xmlns: disco.DISCO_INFO_NS,
        result_class: disco.ResponseStanza,
        getHandler: function(query, top){
            if(query.node != undefined){
                for(var i=0; i<this._nodeHandlers.length; i++){
                    var handler = this._nodeHandlers[i],
                        pattern = handler[0],
                        infoHandler = handler[1],
                        context = handler[3] || this;
                    if(query.node.match(pattern) && typeof infoHandler == 'function'){
                        return infoHandler.call(context, query);
                    }
                }
                return query.makeError('item-not-found');
            }
            return this.create_response(query);
        },
    }, [stanzas.QueryStanza]);

    return plugin;

});
