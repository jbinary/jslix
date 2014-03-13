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

    connection.connect = function(dispatcher){
        var selected_transport = -1;
        if(this._connection){
            selected_transport = plugin.transports.indexOf(this._connection.constructor);
        }
        if(selected_transport >= plugin.transports.length){
            // XXX: Can't find working transport
            this._connection = null;
            this._connection_deferred.reject();
            return this._connection_deferred;
        }
        var plugin_instance = this;
        if(!this._connection){
            var transport_plugin = plugin.transports[++selected_transport];
            this._connection = new transport_plugin(dispatcher,
                this.jid, this.password, this.http_base);
            var deferred = this._connection.connect();
            deferred.done(function(){
                plugin_instance._connection_deferred.resolve();
            });
            deferred.fail(function(){
                plugin_instance._connection = null;
            });
        }
        this._timeout = setTimeout(function(){
            plugin_instance.connect(dispatcher);
        }, 250);
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

    return plugin;

});
