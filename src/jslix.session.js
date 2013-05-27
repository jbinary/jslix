"use strict";
define(['jslix.stanzas', 'jslix.bind', 'libs/jquery'],
    function(stanzas, Bind, $){

    var plugin = function(dispatcher){
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.BindResultStanza, this, this._name);
        this.deferred = $.Deferred();
    };

    var session = plugin.prototype,
        Element = stanzas.Element;

    session._name = 'jslix.Session';

    session.SESSION_NS = 'urn:ietf:params:xml:ns:xmpp-session';

    session.BindResultStanza = Element({
        handler: function(top){
            var iq = stanzas.IQStanza.create({
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
    }, [Bind.prototype.ResponseStanza]);

    session.request = Element({
        xmlns: session.SESSION_NS,
        element_name: 'session',
        parent_element: stanzas.IQStanza
    });

    return plugin;

});
