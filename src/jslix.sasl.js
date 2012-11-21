"use strict";
(function(){

    var jslix = window.jslix;

    jslix.sasl = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addTopHandler(jslix.sasl.stanzas.mechanisms, this);
        this._dispatcher.addTopHandler(jslix.sasl.stanzas.success, this);
    }

    jslix.sasl.generate_random_string = function(length){
        var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
            result = '';
          for (var i=0; i<length; i++)
            result += tab.charAt(Math.round(Math.random(
                new Date().getTime())*(tab.length-1)));
        return result;
    }

    jslix.sasl.SASL_NS = 'urn:ietf:params:xml:ns:xmpp-sasl';

    jslix.sasl.stanzas = {};

    jslix.sasl.mechanisms = {};

    jslix.sasl.stanzas.auth = jslix.Element({
        xmlns: jslix.sasl.SASL_NS,
        element_name: 'auth',
        mechanism: new jslix.fields.StringAttr('mechanism', true),
        content: new jslix.fields.StringNode(null, false, false, undefined, true)
    });

    jslix.sasl.stanzas.challenge = jslix.Element({
        xmlns: jslix.sasl.SASL_NS,
        element_name: 'challenge',
        content: new jslix.fields.StringNode(null, true, false, undefined, true)
    });

    jslix.sasl.stanzas.response = jslix.Element({
        xmlns: jslix.sasl.SASL_NS,
        element_name: 'response',
        content: new jslix.fields.StringNode(null, true, false, undefined, true)
    });

    jslix.sasl.stanzas.abort = jslix.Element({
        xmlns: jslix.sasl.SASL_NS,
        element_name: 'abort'
    });

    jslix.sasl.stanzas.failure = jslix.Element({
        xmlns: jslix.sasl.SASL_NS,
        element_name: 'failure',
        condition: new jslix.fields.ConditionNode(),
        text: new jslix.fields.StringNode('text', false)
    });

    jslix.sasl.stanzas.success = jslix.Element({
        xmlns: jslix.sasl.SASL_NS,
        element_name: 'success',
        handler: function(top){
            this._dispatcher.connection.restart();
        }
    });

    jslix.sasl.stanzas.mechanisms = jslix.Element({
        xmlns: jslix.sasl.SASL_NS,
        mechanisms: new jslix.fields.StringNode('mechanism', true, true),
        parent_element: jslix.stanzas.features,
        handler: function(top){
            for(var i=0; i<top.mechanisms.length; i++){
                var mechanism = top.mechanisms[i];
                if(jslix.sasl.mechanisms[mechanism]){
                    mechanism = new jslix.sasl.mechanisms[mechanism](
                        this._dispatcher);
                    return mechanism.auth();
                }
            }
            // FIXME: What if we can't find valid mechanism?
        }
    });

})();
