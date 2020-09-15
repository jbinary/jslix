"use strict";
define(['jslix/common', 'jslix/stanzas', 'jslix/fields', 'jslix/bind', 'jslix/connection'],
    function(jslix, stanzas, fields, Bind, Connection){

    var plugin = function(dispatcher){
        this.send = null;
        this.received = null;
        this._dispatcher = dispatcher;
        this._dispatcher.addHandler(this.BindResultStanza, this, this._name);
    };

    var sm = plugin.prototype,
        Element = stanzas.Element;

    sm._name = 'jslix.StreamManagement';

    sm.STREAM_MANAGEMENT_NS = 'urn:xmpp:sm:3';

    sm.BindResultStanza = Element({
        handler: function(top){
            this._dispatcher.addHandler(this.EnabledStanza, this, this._name);
            this._dispatcher.addHandler(this.FailedStanza, this, this._name);
            return this.EnableStanza.create();
        }
    }, [Bind.prototype.ResponseStanza])

    sm.EnableStanza = Element({
        xmlns: sm.STREAM_MANAGEMENT_NS,
        element_name: 'enable'
    });

    sm.EnabledStanza = Element({
        xmlns: sm.STREAM_MANAGEMENT_NS,
        element_name: 'enabled',
        handler: function(top){
            this.send = 0;
            this.received = 0;
            this.queue = [];
            var stanzas = [this.MessageStanza, this.IQStanza, this.PresenceStanza];
            for(var i=0; i<stanzas.length; i++){
                this._dispatcher.addHandler(stanzas[i], this, this._name);
                this._dispatcher.addHook('send', stanzas[i], this, this._name);
            }
            this._dispatcher.addHandler(this.AnswerStanza, this, this._name);
            this._dispatcher.addHandler(this.RequestStanza, this, this._name);
            if(this.queue.length){
                return this.RequestStanza.create();
            }
        }
    });

    sm.FailedStanza = Element({
        xmlns: sm.STREAM_MANAGEMENT_NS,
        element_name: 'failed',
        handler: function(top){
            this._dispatcher.unregisterPlugin(plugin);
        }
    });

    sm.RequestStanza = Element({
        xmlns: sm.STREAM_MANAGEMENT_NS,
        element_name: 'r',
        handler: function(top){
            return this.AnswerStanza.create({h: this.received});
        }
    });

    sm.AnswerStanza = Element({
        xmlns: sm.STREAM_MANAGEMENT_NS,
        element_name: 'a',
        h: new fields.IntegerAttr('h', true),
        handler: function(top){
            for(var i=0; i<this.queue.length; i++){
                if(this.queue[i][0]<=top.h){
                    // TODO: fire new 'send-acked' hook
                    console.log("fire new 'send-acked' hook");
                }
            }
            this.queue = this.queue.filter(function(els){
                return els[0] > top.h;
            });
            if(this.send > top.h){
                for(var i=0; i<this.queue.length; i++){
                    this.dispatcher.send(this.queue[i][1], true);
                }
                return sm.RequestStanza.create();
            }
        }
    });

    sm.count_received_stanzas = function(top){
        this.received++;
    };

    sm.process_send_stanzas = function(el, top){
        this.queue.push([++this.send, el]);
        return [el, sm.RequestStanza.create()];
    };

    sm.MessageStanza = Element({
        handler: sm.count_received_stanzas,
        anyHandler: sm.process_send_stanzas
    }, [stanzas.MessageStanza]);

    sm.IQStanza = Element({
        handler: sm.count_received_stanzas,
        anyHandler: sm.process_send_stanzas
    }, [stanzas.IQStanza]);

    sm.PresenceStanza = Element({
        handler: sm.count_received_stanzas,
        anyHandler: sm.process_send_stanzas
    }, [stanzas.PresenceStanza]);

    return plugin;

});
