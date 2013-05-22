"use strict";
(function(){

    var jslix = window.jslix;

    jslix.BaseClient = function(options){
        if(!options)
            return;
        this.connection = null;
        this.dispatcher = null;
        this.options = options;
    }

    var BaseClient = jslix.BaseClient.prototype;

    BaseClient.connect = function(){
        return this.connection.connect(this.dispatcher);
    }

    BaseClient.registerPlugin = function(plugin, options){
        return this.dispatcher.registerPlugin(plugin, options);
    }

    BaseClient.unregisterPlugin = function(plugin){
        this.dispatcher.unregisterPlugin(plugin);
    }

    BaseClient.addHandler = function(handler, host, plugin_name){
        this.dispatcher.addHandler(handler, host, plugin_name);
    }

    BaseClient.send = function(stanza){
        return this.dispatcher.send(stanza);
    }

    BaseClient.disconnect = function(){
        return this.dispatcher.send(this.connection.disconnect());
    }

})();
