"use strict";
(function(){

    var jslix = window.jslix;

    jslix.disco = function(dispatcher){
        this.identities = [];
        this.features = [];
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(jslix.disco.stanzas.request, this);
    }

    jslix.disco.prototype.registerFeature = function(feature){
        this.features.push(feature);
    }

    jslix.disco.prototype.getFeatures = function(){
        return this.features;
    }

    jslix.disco.prototype.registerIdentity = function(identity){
        this.identities.push(identity);
    }

    jslix.disco.prototype.getIdentities = function(){
        return this.identities;
    }

    jslix.disco._name = 'jslix.disco';

    jslix.disco.DISCO_NS = 'http://jabber.org/protocol/disco#info';

    jslix.disco.stanzas = {};

    jslix.disco.stanzas.response = jslix.Element({
        xmlns: jslix.disco.DISCO_NS
    }, [jslix.stanzas.query]);

    jslix.disco.stanzas.request = jslix.Element({
        xmlns: jslix.disco.DISCO_NS,
        result_class: jslix.disco.stanzas.response,
        getHandler: function(query, top){
            if(query.node != undefined){
                return query.makeError('item-not-found');
            }
            var result = query.makeResult({});
            for(var i=0; i<this.identities.length; i++){
                result.link(this.identities[i]);
            }
            for(var i=0; i<this.features.length; i++){
                var feature = jslix.disco.stanzas.feature.create({
                    feature_var: this.features[i]
                });
                result.link(feature);
            }
            return result;
        }
    }, [jslix.stanzas.query]);

    jslix.disco.stanzas.feature = jslix.Element({
        parent_element: jslix.disco.stanzas.response,
        xmlns: jslix.disco.DISCO_NS,
        element_name: 'feature',
        feature_var: new jslix.fields.StringAttr('var', true)
    });

    jslix.disco.stanzas.identity = jslix.Element({
        parent_element: jslix.disco.stanzas.response,
        xmlns: jslix.disco.DISCO_NS,
        element_name: 'identity',
        xml_lang: new jslix.fields.StringAttr('xml:lang', false),
        category: new jslix.fields.StringAttr('category', true),
        type: new jslix.fields.StringAttr('type', true),
        name: new jslix.fields.StringAttr('name', false)
    });

})();
