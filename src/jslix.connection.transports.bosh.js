"use strict";
(function(){

    var jslix = window.jslix;

    jslix.connection.transports.bosh = function(dispatcher, jid, password, http_base){
        this.queue_check_interval = 250;
        this.established = false;
        this.requests = 1;
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
        this._dispatcher.addTopHandler(jslix.connection.transports.bosh.stanzas.features, this);
        this.plugins = [];
        this.plugins.push(new jslix.sasl(this._dispatcher));
    }

    jslix.connection.transports.bosh.BOSH_NS = 'http://jabber.org/protocol/httpbind';

    jslix.connection.transports.bosh.XBOSH_NS = 'urn:xmpp:xbosh';

    jslix.connection.transports.bosh.stanzas = {};

    jslix.connection.transports.bosh.stanzas.body = jslix.Element({
        xmlns: jslix.connection.transports.bosh.BOSH_NS,
        element_name: 'body',
        type: new jslix.fields.StringAttr('type', false)
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
                this.plugins.push(new jslix.bind(this._dispatcher));
            if(top.session)
                this.plugins.push(new jslix.session(this._dispatcher));
            return false;
        }
    }, [jslix.stanzas.features]);

    jslix.connection.transports.bosh.prototype.connect = function(){
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
    }

    jslix.connection.transports.bosh.prototype.send = function(doc){
        if(doc.firstChild.nodeName != 'body'){
            var body = jslix.build(
                jslix.connection.transports.bosh.stanzas.empty.create({
                    sid: this._sid,
                    rid: this._rid
                }));
            body.firstChild.appendChild(doc.firstChild);
            doc = body;
        }
        this._queue.push(doc);
        this._rid++;
    }

    jslix.connection.transports.bosh.prototype.restart = function(){
        this.send(jslix.build(
            jslix.connection.transports.bosh.stanzas.restart.create({
                sid: this._sid,
                rid: this._rid,
                xml_lang: 'en',
                xmpp_restart: 'true',
                xmlns_xmpp: jslix.connection.transports.bosh.XBOSH_NS
            })
        ));
    }

    jslix.connection.transports.bosh.prototype.clean_slots = function(){
        this._slots = this._slots.filter(function(value){
            return !value.closed;
        });
    }

    jslix.connection.transports.bosh.prototype.process_queue = function(timestamp){
        this.clean_slots();
        if(this.established && !(this._slots.length || this._queue.length) && new Date().getTime() > timestamp + this.polling * 1000){
            this.send(jslix.build(
                jslix.connection.transports.bosh.stanzas.empty.create({
                    rid: this._rid,
                    sid: this._sid
                })
            ));
        }
        while(this._queue.length){
            this.clean_slots();
            var doc = this._queue.shift(),
                req = this.create_request();
            if(!req)
                break;
            req.send(doc);
            timestamp = new Date().getTime();
            this._slots.push(req);
        }
        var connection = this;
        if(this._queue.length || this._slots.length || this.established){
            setTimeout(function(){ connection.process_queue(timestamp); },
                this.queue_check_interval);
        }
    }

    jslix.connection.transports.bosh.prototype.process_response = function(response){
        if(response.readyState == 4 && response.responseXML){
            var doc = response.responseXML,
                stanzas = jslix.connection.transports.bosh.stanzas;
            try{
                var top = jslix.parse(doc, (this.established ? stanzas.body : stanzas.response));
            } catch(e){
                return;
            }
            if(!this.established){
                this.requests = top.requests;
                this.wait = top.wait;
                this.polling = top.polling;
                this._sid = top.sid;
                this.established = true;
            }else{
                if(top.type == 'terminate')
                    this.established = false;
            }
            for(var j=0; j<doc.firstChild.childNodes.length; j++){
                this._dispatcher.dispatch(doc.firstChild.childNodes[j]);
            }
        }
        response.closed = true;
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
            connection.process_response(this);
        }
        return req;
    }

    jslix.connection.transports.bosh.prototype.disconnect = function(){
        this.send(jslix.build(
            jslix.connection.transports.bosh.stanzas.empty.create({
                sid: this._sid,
                rid: this._rid,
                type: 'terminate'
            })
        ));
        this.established = false;
    }

})();
