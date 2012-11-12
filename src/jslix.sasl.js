"use strict";
(function(){

    var jslix = window.jslix;

    jslix.sasl = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addTopHandler(jslix.sasl.stanzas.mechanisms, this);
        this._dispatcher.addTopHandler(jslix.sasl.stanzas.success, this);
    }

    jslix.sasl.NS_SASL = 'urn:ietf:params:xml:ns:xmpp-sasl';

    jslix.sasl.stanzas = {};

    jslix.sasl.mechanisms = {};

    jslix.sasl.stanzas.auth = jslix.Element({
        xmlns: jslix.sasl.NS_SASL,
        element_name: 'auth',
        mechanism: new jslix.fields.StringAttr('mechanism', true),
        content: new jslix.fields.StringNode(null, false, false, undefined, true)
    });

    jslix.sasl.stanzas.challenge = jslix.Element({
        xmlns: jslix.sasl.NS_SASL,
        element_name: 'challenge',
        content: new jslix.fields.StringNode(null, true, false, undefined, true)
    });

    jslix.sasl.stanzas.response = jslix.Element({
        xmlns: jslix.sasl.NS_SASL,
        element_name: 'response',
        content: new jslix.fields.StringNode(null, true, false, undefined, true)
    });

    jslix.sasl.stanzas.abort = jslix.Element({
        xmlns: jslix.sasl.NS_SASL,
        element_name: 'abort'
    });

    jslix.sasl.stanzas.failure = jslix.Element({
        xmlns: jslix.sasl.NS_SASL,
        element_name: 'failure',
        condition: new jslix.fields.ConditionNode(),
        text: new jslix.fields.StringNode('text', false)
    });

    jslix.sasl.stanzas.success = jslix.Element({
        xmlns: jslix.sasl.NS_SASL,
        element_name: 'success',
        handler: function(host, top){
            this._dispatcher.connection.reInitStream();
        }
    });

    jslix.sasl.stanzas.features = jslix.Element({
        xmlns: 'http://etherx.jabber.org/streams',
        element_name: 'features'
    });

    jslix.sasl.stanzas.mechanisms = jslix.Element({
        xmlns: jslix.sasl.NS_SASL,
        mechanisms: new jslix.fields.StringNode('mechanism', true, true),
        parent_element: jslix.sasl.stanzas.features,
        handler: function(host, top){
            for(var i=0; i<host.mechanisms.length; i++){
                var mechanism = host.mechanisms[i];
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
