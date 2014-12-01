"use strict";
define(['jslix/jid', 'jslix/sasl', 'libs/signals', 'libs/jquery'],
    function(JID, SASL, signals, $){

    var plugin = function(options){
        this._connection = null;
        this.options = options;
        this.jid = new JID(options['jid']);
        this.password = options['password'];
        this._connection_deferred = $.Deferred();
    }

    plugin.transports = [];

    var connection = plugin.prototype;

    connection.signals = {
        disconnect: new signals.Signal(),
        fail: new signals.Signal()
    };

    connection.connect = function(dispatcher, index){
        var index = index === undefined ? -1 : index;
        if(index+1 >= plugin.transports.length){
            // XXX: Can't find working transport
            this._connection = null;
            this._connection_deferred.reject();
            return this._connection_deferred;
        }
        if(!this._connection){
            var transport_plugin = plugin.transports[++index],
                plugin_instance = this;
            if(transport_plugin.is_supported){
                this._connection = new transport_plugin(dispatcher, this.options);
                var deferred = this._connection.connect();
            }else{
                var deferred = $.Deferred();
                deferred.reject();
            }
            deferred.done(function(){
                plugin_instance._connection_deferred.resolve();
            });
            deferred.fail(function(){
                var connection = plugin_instance._connection;
                if(connection){
                    var constr = connection.constructor,
                        _index = plugin.transports.indexOf(constr);
                        dispatcher.unregisterPlugin(constr);
                        dispatcher.unregisterPlugin(SASL);
                        plugin_instance._connection = null;
                        plugin_instance.connect(dispatcher, _index);
                }else{
                    plugin_instance.connect(dispatcher, index);
                }
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
