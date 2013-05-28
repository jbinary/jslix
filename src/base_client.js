"use strict";
define(function(){

    var BaseClient = function(options){
        if(!options)
            return;
        this.connection = null;
        this.dispatcher = null;
        this.options = options;
    }

    var base_client = BaseClient.prototype;

    base_client.connect = function(){
        return this.connection.connect(this.dispatcher);
    }

    base_client.registerPlugin = function(plugin, options){
        return this.dispatcher.registerPlugin(plugin, options);
    }

    base_client.unregisterPlugin = function(plugin){
        this.dispatcher.unregisterPlugin(plugin);
    }

    base_client.addHandler = function(handler, host, plugin_name){
        this.dispatcher.addHandler(handler, host, plugin_name);
    }

    base_client.send = function(stanza){
        return this.dispatcher.send(stanza);
    }

    base_client.disconnect = function(){
        return this.dispatcher.send(this.connection.disconnect());
    }

    return BaseClient;

});
