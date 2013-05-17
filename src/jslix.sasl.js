"use strict";
(function(){

    var jslix = window.jslix;

    jslix.sasl = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.stanzas.mechanisms, this);
        this._dispatcher.addHandler(this.stanzas.success, this);
        this._dispatcher.addHandler(this.stanzas.failure, this);
        this._mechanism = null;
        this.deferred = $.Deferred();
    }

    jslix.sasl.mechanisms = {};

    var sasl = jslix.sasl.prototype;

    sasl._name = 'jslix.sasl';

    jslix.sasl.generate_random_string = function(length){
        var result = '',
            length = length || 14,
            tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          for (var i=0; i<length; i++)
            result += tab.charAt(Math.round(Math.random(
                new Date().getTime())*(tab.length-1)));
        return result;
    }

    sasl.SASL_NS = 'urn:ietf:params:xml:ns:xmpp-sasl';

    sasl.stanzas = {};


    sasl.stanzas.auth = jslix.Element({
        xmlns: sasl.SASL_NS,
        element_name: 'auth',
        mechanism: new jslix.fields.StringAttr('mechanism', true),
        content: new jslix.fields.StringNode(null, false, false, undefined, true)
    });

    sasl.stanzas.challenge = jslix.Element({
        xmlns: sasl.SASL_NS,
        element_name: 'challenge',
        content: new jslix.fields.StringNode(null, true, false, undefined, true)
    });

    sasl.stanzas.response = jslix.Element({
        xmlns: sasl.SASL_NS,
        element_name: 'response',
        content: new jslix.fields.StringNode(null, true, false, undefined, true)
    });

    sasl.stanzas.abort = jslix.Element({
        xmlns: sasl.SASL_NS,
        element_name: 'abort'
    });

    sasl.stanzas.failure = jslix.Element({
        xmlns: sasl.SASL_NS,
        element_name: 'failure',
        condition: new jslix.fields.ConditionNode(),
        text: new jslix.fields.StringNode('text', false),
        handler: function(top) {
            this.deferred.reject(this);
        }
    });

    sasl.stanzas.success = jslix.Element({
        xmlns: sasl.SASL_NS,
        element_name: 'success',
        handler: function(top){
            this.deferred.resolve();
        }
    });

    sasl.stanzas.mechanisms = jslix.Element({
        xmlns: sasl.SASL_NS,
        mechanisms: new jslix.fields.StringNode('mechanism', true, true),
        parent_element: jslix.stanzas.features,
        handler: function(top){
            if(!this._mechanism){
                for(var i=0; i<top.mechanisms.length; i++){
                    var mechanism = top.mechanisms[i];
                    if(jslix.sasl.mechanisms[mechanism]){
                        this._mechanism = new jslix.sasl.mechanisms[mechanism](
                            this._dispatcher);
                        break;
                    }
                }
            }
            // FIXME: What if we can't find valid mechanism?
            return this._mechanism ? this._mechanism.auth() : false;
        }
    });

})();
