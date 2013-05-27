"use strict";
define(['jslix.fields', 'jslix.stanzas', 'libs/jquery'],
    function(fields, stanzas, $){

    var plugin = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.MechanismsStanza, this, this._name);
        this._dispatcher.addHandler(this.SuccessStanza, this, this._name);
        this._dispatcher.addHandler(this.FailureStanza, this, this._name);
        this._mechanism = null;
        this.deferred = $.Deferred();
    }

    plugin.generate_random_string = function(length){
        var result = '',
            length = length || 14,
            tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          for (var i=0; i<length; i++)
            result += tab.charAt(Math.round(Math.random(
                new Date().getTime())*(tab.length-1)));
        return result;
    }

    plugin.mechanisms = {};

    var sasl = plugin.prototype,
        Element = stanzas.Element;

    sasl._name = 'jslix.SASL';

    sasl.SASL_NS = 'urn:ietf:params:xml:ns:xmpp-sasl';

    sasl.AuthStanza = Element({
        xmlns: sasl.SASL_NS,
        element_name: 'auth',
        mechanism: new fields.StringAttr('mechanism', true),
        content: new fields.StringNode(null, false, false, undefined, true)
    });

    sasl.ChallengeStanza = Element({
        xmlns: sasl.SASL_NS,
        element_name: 'challenge',
        content: new fields.StringNode(null, true, false, undefined, true)
    });

    sasl.ResponseStanza = Element({
        xmlns: sasl.SASL_NS,
        element_name: 'response',
        content: new fields.StringNode(null, true, false, undefined, true)
    });

    sasl.AbortStanza = Element({
        xmlns: sasl.SASL_NS,
        element_name: 'abort'
    });

    sasl.FailureStanza = Element({
        xmlns: sasl.SASL_NS,
        element_name: 'failure',
        condition: new fields.ConditionNode(),
        text: new fields.StringNode('text', false),
        handler: function(top) {
            this.deferred.reject(this);
        }
    });

    sasl.SuccessStanza = Element({
        xmlns: sasl.SASL_NS,
        element_name: 'success',
        handler: function(top){
            this.deferred.resolve();
        }
    });

    sasl.MechanismsStanza = Element({
        xmlns: sasl.SASL_NS,
        mechanisms: new fields.StringNode('mechanism', true, true),
        parent_element: stanzas.FeaturesStanza,
        handler: function(top){
            if(!this._mechanism){
                for(var i=0; i<top.mechanisms.length; i++){
                    var mechanism = top.mechanisms[i];
                    if(plugin.mechanisms[mechanism]){
                        this._mechanism = new plugin.mechanisms[mechanism](
                            this._dispatcher);
                        break;
                    }
                }
            }
            // FIXME: What if we can't find valid mechanism?
            return this._mechanism ? this._mechanism.auth() : false;
        }
    });

    return plugin;

});
