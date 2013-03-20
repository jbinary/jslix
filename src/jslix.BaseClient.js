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

    jslix.BaseClient._name = 'jslix.BaseClient';

    jslix.BaseClient.prototype.connect = function(){
        return this.connection.connect(this.dispatcher);
    }

    jslix.BaseClient.prototype.registerPlugin = function(plugin, options){
        this.dispatcher.registerPlugin(plugin, options);
    }

    jslix.BaseClient.prototype.unregisterPlugin = function(plugin){
        this.dispatcher.unregisterPlugin(plugin);
    }

    jslix.BaseClient.prototype.addHandler = function(handler, host, plugin_name){
        this.dispatcher.addHandler(handler, host, plugin_name);
    }

    jslix.BaseClient.prototype.send = function(stanza){
        return this.dispatcher.send(stanza);
    }

    jslix.BaseClient.prototype.disconnect = function(){
        return this.dispatcher.send(this.connection.disconnect());
    }

})();
