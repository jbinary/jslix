"use strict";
define(['jslix/stanzas', 'jslix/fields', 'jslix/bind'],
    function(stanzas, fields, Bind){

    var plugin = function(dispatcher){
        this.outbound_count = null;
        this.inbound_count = null;
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
            this.outbound_count = 0;
            this.outbound_queue = [];
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
            this.inbound_count= 0;
            var stanzas = [this.MessageStanza, this.IQStanza, this.PresenceStanza];
            for(var i=0; i<stanzas.length; i++){
                this._dispatcher.addHandler(stanzas[i], this, this._name);
                this._dispatcher.addHook('send', stanzas[i], this, this._name);
            }
            this._dispatcher.addHandler(this.AnswerStanza, this, this._name);
            this._dispatcher.addHandler(this.RequestStanza, this, this._name);
            if(this.outbound_queue.length){
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
            return this.AnswerStanza.create({h: this.inbound_count});
        }
    });

    sm.AnswerStanza = Element({
        xmlns: sm.STREAM_MANAGEMENT_NS,
        element_name: 'a',
        h: new fields.IntegerAttr('h', true),
        handler: function(top){
            for(var i=0; i<this.outbound_queue.length; i++){
                if(this.outbound_queue[i][0] <= top.h){
                    var el = this._dispatcher.check_hooks(
                        this.outbound_queue[i][1],
                        this.outbound_queue[i][2],
                        'send-acked'
                    ) || stanzas.EmptyStanza.create();
                    this._dispatcher.send(el, true);
                }
            }
            this.outbound_queue = this.outbound_queue.filter(function(els){
                return els[0] > top.h;
            });
            if(this.outbound_count > top.h){
                for(var i=0; i<this.outbound_queue.length; i++){
                    this._dispatcher.send(this.outbound_queue[i][1], true);
                }
                return sm.RequestStanza.create();
            }
        }
    });

    sm.process_inbound_stanzas = function(top){
        this.inbound_count++;
    };

    sm.process_outbound_stanzas = function(el, top){
        this.outbound_queue.push([++this.outbound_count, el, top]);
        var dispatcher = this._dispatcher;
        setTimeout(function(){
            dispatcher.send(sm.RequestStanza.create());
        }, 300);
        return el;
    };

    sm.MessageStanza = Element({
        handler: sm.process_inbound_stanzas,
        anyHandler: sm.process_outbound_stanzas
    }, [stanzas.MessageStanza]);

    sm.IQStanza = Element({
        handler: sm.process_inbound_stanzas,
        anyHandler: sm.process_outbound_stanzas
    }, [stanzas.IQStanza]);

    sm.PresenceStanza = Element({
        handler: sm.process_inbound_stanzas,
        anyHandler: sm.process_outbound_stanzas
    }, [stanzas.PresenceStanza]);

    return plugin;

});
