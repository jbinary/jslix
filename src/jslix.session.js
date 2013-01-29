"use strict";
(function(){

    var jslix = window.jslix;

    jslix.session = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(jslix.session.stanzas.bind_result, this);
        this.deferred = $.Deferred();
    }

    jslix.session._name = 'jslix.session';

    jslix.session.SESSION_NS = 'urn:ietf:params:xml:ns:xmpp-session';

    jslix.session.stanzas = {};

    jslix.session.stanzas.bind_result = jslix.Element({
        handler: function(top){
            var iq = jslix.stanzas.iq.create({
                type: 'set',
                link: jslix.session.stanzas.request.create({})
            });
            var that = this;
            this._dispatcher.send(iq).done(function() {
                that.deferred.resolve();
            }).fail(function(reason) {
                that.deferred.reject(reason);
            });
        }
    }, [jslix.bind.stanzas.response]);

    jslix.session.stanzas.request = jslix.Element({
        xmlns: jslix.session.SESSION_NS,
        element_name: 'session',
        parent_element: jslix.stanzas.iq
    });

})();
