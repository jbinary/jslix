"use strict";
(function(){

    var jslix = window.jslix;

    jslix.connection.transports.bosh = function(dispatcher, jid, password, http_base){
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
        this.jid = jid;
        this.password = password;
        this.http_base = http_base;
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(jslix.connection.transports.bosh.stanzas.features, this);
        this.sasl = this._dispatcher.registerPlugin(jslix.sasl);
        var that = this;
        this.sasl.deferred.done(function() {
            dispatcher.send(that.restart());
        }).fail(function(reason) {
            that.disconnect();
            that._connection_deferred.reject(reason); // TODO: abstract exception
        });
        this._connection_deferred = null;
    }

    jslix.connection.transports.bosh.signals = {
        fail: new signals.Signal()
    };

    jslix.connection.transports.bosh._name = 'jslix.connection.transports.bosh';

    jslix.connection.transports.bosh.BOSH_NS = 'http://jabber.org/protocol/httpbind';

    jslix.connection.transports.bosh.XBOSH_NS = 'urn:xmpp:xbosh';

    jslix.connection.transports.bosh.stanzas = {};

    jslix.connection.transports.bosh.stanzas.body = jslix.Element({
        xmlns: jslix.connection.transports.bosh.BOSH_NS,
        element_name: 'body',
        type: new jslix.fields.StringAttr('type', false),
        condition: new jslix.fields.StringAttr('condition', false)
    });

    jslix.connection.transports.bosh.stanzas.empty = jslix.Element({
        rid: new jslix.fields.IntegerAttr('rid', true),
        sid: new jslix.fields.StringAttr('sid', true)
    }, [jslix.connection.transports.bosh.stanzas.body]);

    jslix.connection.transports.bosh.stanzas.base = jslix.Element({
        ver: new jslix.fields.StringAttr('ver', true),
        wait: new jslix.fields.IntegerAttr('wait', true),
        ack: new jslix.fields.IntegerAttr('ack', false)
    }, [jslix.connection.transports.bosh.stanzas.body]);

    jslix.connection.transports.bosh.stanzas.request = jslix.Element({
        to: new jslix.fields.JIDAttr('to', true),
        rid: new jslix.fields.IntegerAttr('rid', true),
        hold: new jslix.fields.IntegerAttr('hold', true),
        // XXX: Temporary solution
        xml_lang: new jslix.fields.StringAttr('xml:lang', true),
        content: new jslix.fields.StringAttr('content', false),
        route: new jslix.fields.StringAttr('route', false),
        xmpp_version: new jslix.fields.StringAttr('xmpp:version', true),
        xmlns_xmpp: new jslix.fields.StringAttr('xmlns:xmpp', true)
    }, [jslix.connection.transports.bosh.stanzas.base]);

    jslix.connection.transports.bosh.stanzas.response = jslix.Element({
        from: new jslix.fields.JIDAttr('from', true),
        sid: new jslix.fields.StringAttr('sid', true),
        polling: new jslix.fields.IntegerAttr('polling', true),
        inactivity: new jslix.fields.IntegerAttr('inactivity', true),
        requests: new jslix.fields.IntegerAttr('requests', true),
        accept: new jslix.fields.StringAttr('accept', false),
        maxpause: new jslix.fields.IntegerAttr('maxpause', false),
        charsets: new jslix.fields.StringAttr('charsets', false),
        secure: new jslix.fields.StringAttr('secure', false),
        clean_sid: function(value){
            if(!value)
                throw new jslix.exceptions.WrongElement();
            return value;
        }
    }, [jslix.connection.transports.bosh.stanzas.base]);

    jslix.connection.transports.bosh.stanzas.restart = jslix.Element({
        to: new jslix.fields.JIDAttr('to', true),
        xml_lang: new jslix.fields.StringAttr('xml:lang', true),
        xmpp_restart: new jslix.fields.StringAttr('xmpp:restart', true),
        xmlns_xmpp: new jslix.fields.StringAttr('xmlns:xmpp', true)
    }, [jslix.connection.transports.bosh.stanzas.empty]);

    jslix.connection.transports.bosh.stanzas.features = jslix.Element({
        bind: new jslix.fields.FlagNode('bind', false, jslix.bind.BIND_NS),
        session: new jslix.fields.FlagNode('session', false, jslix.session.SESSION_NS),
        handler: function(top){
            if(top.bind)
                this._dispatcher.registerPlugin(jslix.bind);
            if(top.session) {
                var session = this._dispatcher.registerPlugin(jslix.session);
                var that = this;
                session.deferred.done(function() {
                    that._connection_deferred.resolve();
                }).fail(function(reason) {
                    that.disconnect();
                    that._connection_deferred.reject(reason); // TODO: abstract exception
                });
            }
        }
    }, [jslix.stanzas.features]);

    jslix.connection.transports.bosh.prototype.connect = function(){
        if (this._connection_deferred) return this._connection_deferred;
        this._connection_deferred = $.Deferred();
        if(this.resume()) return this._connection_deferred;
        this.send(jslix.build(
            jslix.connection.transports.bosh.stanzas.request.create({
                rid: this._rid,
                to: this.jid.getDomain(),
                ver: '1.8',
                wait: this.wait,
                hold: this.requests,
                xml_lang: 'en',
                xmpp_version: '1.0',
                xmlns_xmpp: jslix.connection.transports.bosh.XBOSH_NS
            })
        ));

        this.process_queue();
        return this._connection_deferred;
    }

    jslix.connection.transports.bosh.prototype.send = function(doc){
        if(!doc || doc.firstChild.nodeName != 'body'){
            var body = jslix.build(
                jslix.connection.transports.bosh.stanzas.empty.create({
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

    jslix.connection.transports.bosh.prototype.restart = function(){
        return jslix.connection.transports.bosh.stanzas.restart.create({
            sid: this._sid,
            rid: this._rid,
            xml_lang: 'en',
            xmpp_restart: 'true',
            xmlns_xmpp: jslix.connection.transports.bosh.XBOSH_NS
        });
    }

    jslix.connection.transports.bosh.prototype.clean_slots = function(){
        this._slots = this._slots.filter(function(value){
            return !value.closed;
        });
    }

    jslix.connection.transports.bosh.prototype.process_queue = function(timestamp){
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
            req.send(doc);
            timestamp = new Date().getTime();
            this._slots.push(req);
        }
        var connection = this;
        if(this._queue.length || this._slots.length || this.established){
            this._interval = setTimeout(function(){
                connection.process_queue(timestamp);
            }, this.queue_check_interval);
        }
    }

    jslix.connection.transports.bosh.prototype.process_response = function(response){
        var result = false;
        if(response.readyState == 4){
            if(response.status == 200 && response.responseXML){ // TODO: handle other statuses as well (404 at least)
                var doc = response.responseXML,
                    stanzas = jslix.connection.transports.bosh.stanzas;
                var definitions = [stanzas.body, stanzas.response];
                var top = undefined;
                for (var i=0; i<definitions.length; i++) {
                    try{
                        var top = jslix.parse(doc, definitions[i]);
                    } catch(e){
                        if (!e instanceof jslix.exceptions.WrongElement)
                            return result;
                    }
                }
                if(!top) return result;
                if(!this.established && top.type != 'terminate' && top.sid){
                    this.requests = top.requests;
                    this.wait = top.wait;
                    this.polling = top.polling;
                    this._sid = top.sid;
                    this.established = true;
                }else{
                    if(top.type == 'terminate') {
                        if (this.established)
                            this.established = false;
                        else
                            this._connection_deferred.reject(top.condition); // TODO: abstract exception here
                    }
                }
                while(doc.firstChild.childNodes.length) {
                    this._dispatcher.dispatch(doc.firstChild.childNodes[0]);
                }
                result = true;
            }else{
                this.established = false;
                jslix.connection.transports.bosh.signals.fail.dispatch(response.status);
            }
            response.closed = true;
        }
        return result;
    }

    jslix.connection.transports.bosh.prototype.create_request = function(){
        if(this._slots.length >= this.requests)
            return null;
        var req = new XMLHttpRequest(),
            connection = this;
        req.open('POST', this.http_base, true);
        req.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
        req.closed = false;
        req.onreadystatechange = function(){
            return connection.process_response(this);
        }
        return req;
    }

    jslix.connection.transports.bosh.prototype.suspend = function(){
        if(!this.established){
            return false;
        }
        this.established = false;
        var expires = new Date().getTime(),
            jslix_settings = JSON.stringify({
                jid: this.jid.toString(),
                requests: this.requests,
                wait: this.wait,
                polling: this.polling,
                sid: this._sid,
                rid: this._rid
            });
        expires = new Date(expires+this.wait*1000).toUTCString();
        document.cookie = "jslix_settings=" + jslix_settings + "; path=/; expires=" + expires;
        return true;
    }

    jslix.connection.transports.bosh.prototype.resume = function(){
        if(this.established){
            return false;
        }
        var cookie = {},
            raw_cookie = document.cookie.split(';'),
            jslix_settings;
        for(var i=0; i<raw_cookie.length; i++){
            var raw_data = raw_cookie[i].trim().split('=');
            cookie[raw_data[0]] = raw_data[1];
        }
        jslix_settings = JSON.parse(cookie['jslix_settings'] || '{}');
        if(jslix_settings['jid'] == this.jid.toString()){
            this.requests = jslix_settings['requests'] || this.requests;
            this.wait = jslix_settings['wait'] || this.wait;
            this.polling = jslix_settings['polling'] || this.polling;
            this._sid = jslix_settings['sid'] || this._sid;
            this._rid = jslix_settings['rid'] || this._rid;
            this.established = true;
            this.process_queue();
            return true;
        }
        return false;
    }

    jslix.connection.transports.bosh.prototype.disconnect = function(){
        this.established = false;
        return jslix.connection.transports.bosh.stanzas.empty.create({
            sid: this._sid,
            rid: this._rid,
            type: 'terminate'
        });
    }

})();
