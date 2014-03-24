"use strict";
define(['jslix/common', 'jslix/fields', 'jslix/stanzas', 'jslix/sasl',
        'jslix/session', 'jslix/bind', 'jslix/connection',
        'libs/signals', 'libs/jquery'],
    function(jslix, fields, stanzas, SASL, Session, Bind, connection, signals, $){

    var plugin = function(dispatcher, jid, password, http_base){
        this._dispatcher = dispatcher;
        this.jid = jid;
        this.password = password;
        this.http_base = http_base;
        this.established = false;
        this.fix = true;
        this.socket = null;
        this._connection_deferred = null;
        this._serializer = new XMLSerializer();
        this._parser = new DOMParser();
        this._dispatcher.addHandler(this.CloseStanza, this, this._name);
        this.sasl = this._dispatcher.registerPlugin(SASL);
        var that = this;
        this.sasl.deferred.done(function(){
            dispatcher.send(that.restart());
        }).fail(function(reason){
            dispatcher.send(that.disconnect());
            that._connection_deferred = null;
        });
    }

    plugin.is_supported = 'WebSocket' in window ? true : false;

    connection.transports.push(plugin);

    var websocket = plugin.prototype,
        Element = stanzas.Element;

    websocket._name = 'jslix.connection.transports.WebSocket';

    websocket.signals = {
        fail: new signals.Signal()
    };

    websocket.XMPP_FRAMING_NS = 'urn:ietf:params:xml:ns:xmpp-framing';

    websocket.BaseStanza = Element({
        xmlns: websocket.XMPP_FRAMING_NS,
        from: new fields.JIDAttr('from', false),
        id: new fields.StringAttr('id', false),
        to: new fields.JIDAttr('to', false),
        version: new fields.StringAttr('version', false),
        xml_lang: new fields.StringAttr('xml:lang', false)
    });

    websocket.OpenStanza = Element({
        element_name: 'open'
    }, [websocket.BaseStanza])

    websocket.CloseStanza = Element({
        element_name: 'close',
        see_other_uri: new fields.StringAttr('see-other-uri', false),
        handler: function(top){
            this.socket.close();
        }
    }, [websocket.BaseStanza]);

    websocket.StreamStanza = Element({
        handler: function(top){
            this._dispatcher.addHandler(this.FeaturesStanza, this, this._name);
            this.established = true;
        }
    }, [stanzas.StreamStanza]);

    websocket.FeaturesStanza = Element({
        bind: new fields.FlagNode('bind', false, Bind.prototype.BIND_NS),
        session: new fields.FlagNode('session', false, Session.prototype.SESSION_NS),
        handler: function(top){
            if(top.bind)
                this._dispatcher.registerPlugin(Bind);
            if(top.session){
                var session = this._dispatcher.registerPlugin(Session),
                    that = this;
                session.deferred.done(function(){
                    that._connection_deferred.resolve();
                }).fail(function(reason){
                    that._dispatcher(that.disconnect());
                    that._connection_deferred.reject(reason);
                })
            }
        }
    }, [stanzas.FeaturesStanza]);

    websocket.connect = function(){
        if(this._connection_deferred) return this._connection_deferred;
        this._connection_deferred = $.Deferred();
        this.socket = new WebSocket(this.http_base, 'xmpp');
        var connection = this;
        this.socket.onopen = function(evt){
            connection._onopen(evt);
        }
        this.socket.onmessage = function(evt){
            connection._onmessage(evt);
        }
        this.socket.onerror = function(evt){
            connection._onerror(evt);
        }
        this.socket.onclose = function(evt){
            connection._onclose(evt);
        }
        return this._connection_deferred;
    }

    websocket.send = function(doc){
        var str = this._serializer.serializeToString(doc);
        console.log('send:', str);
        this.socket.send(str);
    }

    websocket.restart = function(){
        return websocket.OpenStanza.create({
            to: this.jid.domain
        });
    }

    websocket.disconnect = function(){
        return this.CloseStanza.create({});
    }

    websocket._onopen = function(evt){
        console.log('onopen');
        this._dispatcher.addHandler(this.StreamStanza, this, this._name);
        this.send(
            jslix.build(
                this.OpenStanza.create({
                    to: this.jid.domain
                })
            )
        );
    }

    websocket._onmessage = function(evt){
        console.log('onmessage:', evt.data);
        var str = evt.data;
        if(this.fix){
            str += '</stream:stream>'
            this.fix = false;
        }
        var doc = this._parser.parseFromString(str, 'text/xml');
        // TODO: Handler parse errors
        this._dispatcher.dispatch(doc);
    }

    websocket._onerror = function(evt){
        console.log('onerror');
    }

    websocket._onclose = function(evt){
        this.established = false;
        console.log('onclose');
    }

    return plugin;

});
