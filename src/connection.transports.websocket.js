"use strict";
define(['jslix/common', 'jslix/fields', 'jslix/stanzas', 'jslix/sasl',
        'jslix/session', 'jslix/bind', 'jslix/connection', 'jslix/jid',
        'jslix/sm',
        'libs/jquery'],
    function(jslix, fields, stanzas, SASL, Session, Bind, Connection, JID, StreamManagement, $){

    var plugin = function(dispatcher, options){
        this._dispatcher = dispatcher;
        this.jid = new JID(options['jid']);
        this.password = options['password'];
        this.uri = options['websocket_uri'];
        this.established = false;
        this.socket = null;
        this._connection_deferred = null;
        this._serializer = new XMLSerializer();
        this._parser = new DOMParser();
        this._dispatcher.addHandler(this.CloseStanza, this, this._name);
        this.sasl = this._dispatcher.registerPlugin(SASL, options);
        var that = this;
        this.sasl.deferred.done(function(){
            dispatcher.send(that.restart());
        }).fail(function(reason){
            dispatcher.send(that.disconnect());
            that._connection_deferred = null;
        });
    }

    plugin.is_supported = 'WebSocket' in window ? true : false;

    Connection.transports.push(plugin);

    var websocket = plugin.prototype,
        Element = stanzas.Element;

    websocket._name = 'jslix.connection.transports.WebSocket';

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
        element_name: 'open',
        handler: function(top){
            this._dispatcher.addHandler(this.FeaturesStanza, this, this._name);
            this.established = true;
        }
    }, [websocket.BaseStanza])

    websocket.CloseStanza = Element({
        element_name: 'close',
        see_other_uri: new fields.StringAttr('see-other-uri', false),
        handler: function(top){
            this.socket.close();
        }
    }, [websocket.BaseStanza]);

    websocket.FeaturesStanza = Element({
        bind: new fields.FlagNode('bind', false, Bind.prototype.BIND_NS),
        session: new fields.FlagNode('session', false, Session.prototype.SESSION_NS),
        sm: new fields.FlagNode('sm', false, StreamManagement.prototype.STREAM_MANAGEMENT_NS),
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
            if(top.sm){
                this._dispatcher.registerPlugin(StreamManagement);
            }
        }
    }, [stanzas.FeaturesStanza]);

    websocket.connect = function(){
        if(this._connection_deferred) return this._connection_deferred;
        this._connection_deferred = $.Deferred();
        try{
            this.socket = new WebSocket(this.uri, 'xmpp');
        }catch(e){
            return this._connection_deferred.reject(e);
        }
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
        this.socket.send(this._serializer.serializeToString(doc));
    }

    websocket.restart = function(){
        return websocket.OpenStanza.create({
            to: this.jid.domain
        });
    }

    websocket.disconnect = function(){
        return this.CloseStanza.create();
    }

    websocket._onopen = function(evt){
        this._dispatcher.addHandler(this.OpenStanza, this, this._name);
        this.send(
            jslix.build(
                this.OpenStanza.create({
                    to: this.jid.domain
                })
            )
        );
    }

    websocket._onmessage = function(evt){
        var str = evt.data;
        var doc = this._parser.parseFromString(str, 'text/xml');
        // TODO: Handler parse errors
        this._dispatcher.dispatch(doc);
    }

    websocket._onerror = function(evt){
        this._dispatcher.connection.signals.fail.dispatch(evt);
    }

    websocket._onclose = function(evt){
        this.established = false;
        this._connection_deferred.reject();
        this._dispatcher.connection.signals.disconnect.dispatch(evt);
    }

    return plugin;

});
