"use strict";
define(['jslix/jid', 'libs/signals', 'libs/jquery'],
    function(JID, signals, $){

    var plugin = function(jid, password, http_base){
        this._connection = null;
        this.http_base = http_base;
        this.jid = new JID(jid);
        this.password = password;
        this._connection_deferred = $.Deferred();
    }

    plugin.transports = [];

    var connection = plugin.prototype;

    connection.signals = {
        disconnect: new signals.Signal()
    };

    connection.connect = function(dispatcher, index){
        var index = index || -1;
        if(index >= plugin.transports.length){
            // XXX: Can't find working transport
            this._connection = null;
            this._connection_deferred.reject();
            return this._connection_deferred;
        }
        if(!this._connection){
            var transport_plugin = plugin.transports[++index],
                plugin_instance = this;
            if(transport_plugin.is_supported){
                this._connection = new transport_plugin(dispatcher,
                    this.jid, this.password, this.http_base);
                var deferred = this._connection.connect();
            }else{
                var deferred = $.Deferred();
                deferred.reject();
            }
            deferred.done(function(){
                plugin_instance._connection_deferred.resolve();
            });
            deferred.fail(function(){
                var index = plugin.transports.indexOf(plugin_instance._connection.constructor);
                plugin_instance._connection = null;
                plugin_instance.connect(dispatcher, index);
            });
        }
        return this._connection_deferred;
    }

    connection.restart = function(){
        return this._connection ? this._connection.restart() : false;
    }

    connection.send = function(doc){
        return this._connection ? this._connection.send(doc) : false;
    }

    connection.disconnect = function(){
        this.signals.disconnect.dispatch();
        return this._connection ? this._connection.disconnect() : false;
    }

    connection.suspend = function(){
        if(this._connection && this._connection['suspend']){
            return this._connection.suspend();
        }else{
            throw new Error('Method not implemented.');
        }
    }

    connection.resume = function(settings){
        if(this._connection && this._connection['resume']){
            return this._connection.resume(settings);
        }else{
            throw new Error('Method not implemented.');
        }
    }

    return plugin;

});
