"use strict";
(function(){

    var jslix = window.jslix;

    jslix.session = function(dispatcher){
        this._dispatcher = dispatcher;
    }

    jslix.session.SESSION_NS = 'urn:ietf:params:xml:ns:xmpp-session';

    jslix.session.stanzas = {};

    jslix.session.stanzas.bind_result = jslix.Element({
        handler: function(top){
            return jslix.stanzas.iq.create({
                type: 'set',
                link: jslix.session.stanzas.request.create({})
            });
        }
    }, [jslix.bind.stanzas.response]);

    jslix.session.stanzas.request = jslix.Element({
        xmlns: jslix.session.SESSION_NS,
        element_name: 'session',
        parent_element: jslix.stanzas.iq
    });

})();
