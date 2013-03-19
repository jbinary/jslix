"use strict";
(function(){

    var jslix = window.jslix;

    jslix.disco = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(jslix.disco.stanzas.request, this);
    }

    jslix.disco._name = 'jslix.disco';

    jslix.disco.DISCO_NS = 'http://jabber.org/protocol/disco#info';

    jslix.disco.stanzas = {};

    jslix.disco.stanzas.request = jslix.Element({
        xmlns: jslix.disco.DISCO_NS,
        getHandler: function(query, top){
            return query.makeError('feature-not-implemented');
        }
    }, [jslix.stanzas.query]);

    jslix.disco.stanzas.feature = jslix.Element({
        parent_element: jslix.stanzas.query,
        f_var: jslix.fields.StringNode('var', true)
    });

    jslix.disco.stanzas.identity = jslix.Element({
        parent_element: jslix.stanzas.query,
        category: jslix.fields.StringNode('category', true),
        type: jslix.fields.StringNode('type', true),
        name: jslix.fields.StringNode('name', false)
    });

})();
