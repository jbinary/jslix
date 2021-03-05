"use strict";
define(['jslix/common', 'jslix/fields', 'jslix/stanzas', 'jslix/sasl',
        'jslix/session', 'jslix/bind', 'jslix/exceptions', 'jslix/connection',
        'jslix/jid', 'jslix/sm',
        'libs/jquery'],
    function(jslix, fields, stanzas, SASL, Session, Bind, exceptions, Connection, JID, StreamManagement, $){

    var plugin = function(dispatcher, options){
        this.queue_check_interval = 250;
        this.established = false;
        this.requests = 1; // TODO: it should be possible to tune these; 2 is more suitable to be default here?
        this.inactivity = 0;
        this.polling = 0;
        this.wait = 60;
        this._sid = null;
        this._slots = [];
        this._queue = [];
        this._rid = Math.round(
            100000.5 + (((900000.49999)-(100000.5))*Math.random()));
        this.jid = new JID(options['jid']);
        this.password = options['password'];
        this.uri = options['bosh_uri'];
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.ResponseStanza, this, this._name);
        this.sasl = this._dispatcher.registerPlugin(SASL, options);
        this.timeout = null;
        var that = this;
        this.sasl.deferred.done(function() {
            dispatcher.send(that.restart());
        }).fail(function(reason) {
            dispatcher.send(that.disconnect());
            that._connection_deferred.reject(reason); // TODO: abstract exception
        });
        this._connection_deferred = null;
    }

    plugin.is_supported = true;

    Connection.transports.push(plugin);

    var bosh = plugin.prototype,
        Element = stanzas.Element;

    bosh._name = 'jslix.connection.transports.Bosh';

    bosh.BOSH_NS = 'http://jabber.org/protocol/httpbind';
    bosh.XBOSH_NS = 'urn:xmpp:xbosh';

    bosh.BodyStanza = Element({
        xmlns: bosh.BOSH_NS,
        element_name: 'body',
        type: new fields.StringAttr('type', false),
        condition: new fields.StringAttr('condition', false),
        childs: new fields.Node(undefined, null, undefined, true),
        handler: function(top){
            if(top.type == 'terminate'){
                if(this.established){
                    this.established = false;
                    clearTimeout(this.timeout);
                    this._dispatcher.connection.signals.disconnect.dispatch(top);
                }
                // TODO: Abstract exception here
                var that = this;
                this._connection_deferred.reject(top.condition).fail(function(){
                    that._connection_deferred = null;
                });
                return stanzas.BreakStanza.create();
            }
            for(var i=0; i<top.childs.length; i++){
                this._dispatcher.dispatch(top.childs[i]);
            }
            return stanzas.BreakStanza.create();
        }
    });

    bosh.EmptyStanza = Element({
        rid: new fields.IntegerAttr('rid', true),
        sid: new fields.StringAttr('sid', false)
    }, [bosh.BodyStanza]);

    bosh.BaseStanza = Element({
        ver: new fields.StringAttr('ver', false),
        wait: new fields.IntegerAttr('wait', false),
        ack: new fields.IntegerAttr('ack', false),
        clean_wait: function(value) {
            if (!value)
                throw new exceptions.WrongElement();
            return value;
        }
    }, [bosh.BodyStanza]);

    bosh.RequestStanza = Element({
        to: new fields.JIDAttr('to', true),
        rid: new fields.IntegerAttr('rid', true),
        hold: new fields.IntegerAttr('hold', true),
        // XXX: Temporary solution
        xml_lang: new fields.StringAttr('xml:lang', true),
        content: new fields.StringAttr('content', false),
        route: new fields.StringAttr('route', false),
        xmpp_version: new fields.StringAttr('xmpp:version', true,
            bosh.XBOSH_NS)
    }, [bosh.BaseStanza]);

    bosh.ResponseStanza = Element({
        from: new fields.JIDAttr('from', false),
        sid: new fields.StringAttr('sid', false),
        polling: new fields.IntegerAttr('polling', true),
        inactivity: new fields.IntegerAttr('inactivity', true),
        requests: new fields.IntegerAttr('requests', true),
        accept: new fields.StringAttr('accept', false),
        maxpause: new fields.IntegerAttr('maxpause', false),
        charsets: new fields.StringAttr('charsets', false),
        secure: new fields.StringAttr('secure', false),
        clean_sid: function(value){
            if(!value)
                throw new exceptions.WrongElement();
            return value;
        },
        handler: function(top){
            if(!this.established && top.type != 'terminate' && top.sid){
                this.requests = top.requests;
                this.wait = top.wait;
                this.polling = top.polling;
                this._sid = top.sid;
                this.established = true;
                this._dispatcher.addHandler(this.FeaturesStanza, this, this._name);
                this._dispatcher.addHandler(this.BodyStanza, this, this._name);
            }
            return bosh.BodyStanza.handler.call(this, top);
        }
    }, [bosh.BaseStanza]);

    bosh.RestartStanza = Element({
        to: new fields.JIDAttr('to', true),
        xml_lang: new fields.StringAttr('xml:lang', true),
        xmpp_restart: new fields.StringAttr('xmpp:restart', true,
            bosh.XBOSH_NS)
    }, [bosh.EmptyStanza]);

    bosh.FeaturesStanza = Element({
        bind: new fields.FlagNode('bind', false, Bind.prototype.BIND_NS),
        session: new fields.FlagNode('session', false, Session.prototype.SESSION_NS),
        sm: new fields.FlagNode('sm', false, StreamManagement.prototype.STREAM_MANAGEMENT_NS),
        handler: function(top){
            if(top.bind)
                this._dispatcher.registerPlugin(Bind);
            if(top.session){
                var session = this._dispatcher.registerPlugin(Session);
                var that = this;
                session.deferred.done(function() {
                    that._connection_deferred.resolve();
                }).fail(function(reason) {
                    that._dispatcher(that.disconnect());
                    that._connection_deferred.reject(reason); // TODO: abstract exception
                });
            }
            if(top.sm){
                this._dispatcher.registerPlugin(StreamManagement);
            }
        }
    }, [stanzas.FeaturesStanza]);

    bosh.connect = function(){
        if (this._connection_deferred) return this._connection_deferred;
        var that = this;
        this._connection_deferred = $.Deferred().fail(function(){
            that.disconnect();
        });
        this.send(jslix.build(
            this.RequestStanza.create({
                rid: this._rid,
                to: this.jid.domain,
                ver: '1.8',
                wait: this.wait,
                hold: this.requests,
                xml_lang: 'en',
                xmpp_version: '1.0'
            })
        ));

        this.process_queue();
        return this._connection_deferred;
    }

    bosh.send = function(doc){
        if(!doc || doc.firstChild.nodeName != 'body'){
            var body = jslix.build(
                this.EmptyStanza.create({
                    sid: this._sid,
                    rid: this._rid
                }));
            if (doc)
                body.firstChild.appendChild(doc.firstChild);
            doc = body;
        }
        this._queue.push(doc);
        this._rid++;
    }

    bosh.restart = function(){
        return this.RestartStanza.create({
            sid: this._sid,
            rid: this._rid,
            xml_lang: 'en',
            xmpp_restart: 'true'
        });
    }

    bosh.clean_slots = function(){
        this._slots = this._slots.filter(function(value){
            return !value.closed;
        });
    }

    bosh.process_queue = function(timestamp){
        this.clean_slots();
        if(this.established && 
                !(this._slots.length || this._queue.length) && 
                (this.requests > 1 || new Date().getTime() > timestamp + this.polling * 1000))
            this.send();
        while(this._queue.length){
            this.clean_slots();
            var doc = this._queue.shift(),
                req = this.create_request();
            if(!req) {
                this._queue = [doc].concat(this._queue);
                break;
            }
            req.send(new XMLSerializer().serializeToString(doc));
            timestamp = new Date().getTime();
            this._slots.push(req);
        }
        var connection = this;
        if(this._queue.length || this._slots.length || this.established){
            this.timeout = setTimeout(function(){
                connection.process_queue(timestamp);
            }, this.queue_check_interval);
        }
    }

    bosh.process_response = function(response){
        var result = false;
        if(response.readyState == 4){
            // TODO: handle other statuses as well (404 at least)
            if(response.status == 200 && response.responseXML){
                this._dispatcher.dispatch(response.responseXML.firstChild);
                result = true;
            }else{
                // TODO: Right behaviour?
                this._connection_deferred.reject();
                this._connection_deferred = null;
                this.established = false;
                this._dispatcher.connection.signals.fail.dispatch(response.status, this.suspend());
            }
            response.closed = true;
        }
        return result;
    }

    bosh.create_request = function(){
        if(this._slots.length >= this.requests)
            return null;
        var req = new XMLHttpRequest(),
            connection = this;
        req.open('POST', this.uri, true);
        req.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
        req.closed = false;
        req.onreadystatechange = function(){
            return connection.process_response(this);
        }
        return req;
    }

    bosh.suspend = function(){
        this.established = false;
        return {
            jid: this.jid.toString(),
            requests: this.requests,
            wait: this.wait,
            polling: this.polling,
            sid: this._sid,
            rid: this._rid
        };
    }

    bosh.resume = function(settings){
        if(this.established){
            return false;
        }
        if(settings['jid'] == this.jid.toString()){
            this.requests = settings['requests'] || this.requests;
            this.wait = settings['wait'] || this.wait;
            this.polling = settings['polling'] || this.polling;
            this._sid = settings['sid'] || this._sid;
            this._rid = settings['rid'] || this._rid;
            this.established = true;
            this.process_queue();
            return true;
        }
        return false;
    }

    bosh.disconnect = function(){
        return this.EmptyStanza.create({
            sid: this._sid,
            rid: this._rid,
            type: 'terminate'
        });
    }

    return plugin;

});
