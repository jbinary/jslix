"use strict";
(function(){
    var jslix = window.jslix;

    jslix.caps = function(dispatcher, options){
        this.options = options || {};
        this._dispatcher = dispatcher;
        if(this.options['disco_plugin'] === undefined){
            throw new Error('jslix.disco plugin required!');
        }
        this.options.disco_plugin.registerFeature(jslix.caps.CAPS_NS);
    }

    jslix.caps.prototype.getVerificationString = function(){
        var string = '',
            identities_values = [],
            identities = this.options.disco_plugin.getIdentities(),
            features = this.options.disco_plugin.getFeatures().sort();
        for(var i=0; i<identities.length; i++){
            var identity = identities[i];
            identities_values.push([
                identity.category,
                identity.type,
                identity.xml_lang,
                identity.name
            ])
        }
        identities_values.sort(function(a, b){
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
        for(var i=0; i<identities_values.length; i++){
            string += identities_values[i].join('/') + '<';
        }
        string += features.join('<') + '<';
        return CryptoJS.enc.Base64.stringify(CryptoJS.SHA1(string))
    }

    jslix.caps.CAPS_NS = 'http://jabber.org/protocol/caps';

    jslix.caps.stanzas = {};

    jslix.caps.stanzas.c = jslix.Element({
        parent_element: jslix.stanzas.presence,
        xmlns: jslix.caps.CAPS_NS,
        element_name: 'c',
        hash: new jslix.fields.StringAttr('hash', true),
        node: new jslix.fields.StringAttr('node', true),
        ver: new jslix.fields.StringAttr('ver', true)
    });

})();
