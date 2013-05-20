"use strict";
(function(){

    var jslix = window.jslix;

    jslix.session = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.BindResultStanza, this);
        this.deferred = $.Deferred();
    }

    var session = jslix.session.prototype;

    session._name = 'jslix.session';

    session.SESSION_NS = 'urn:ietf:params:xml:ns:xmpp-session';

    session.BindResultStanza = jslix.Element({
        handler: function(top){
            var iq = jslix.stanzas.IQStanza.create({
                type: 'set',
                link: session.request.create({})
            });
            var that = this;
            this._dispatcher.send(iq).done(function() {
                that.deferred.resolve();
            }).fail(function(reason) {
                that.deferred.reject(reason);
            });
        }
    }, [jslix.bind.prototype.ResponseStanza]);

    session.request = jslix.Element({
        xmlns: session.SESSION_NS,
        element_name: 'session',
        parent_element: jslix.stanzas.IQStanza
    });

})();
