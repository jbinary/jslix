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

    jslix.BaseClient.prototype.connect = function(){
        return this.connection.connect(this.dispatcher);
    }

    jslix.BaseClient.prototype.register_stanza = function(stanza, context){
        var context = context || this;
        stanza.handler ? this.dispatcher.addTopHandler(stanza, context) : this.dispatcher.addHandler(stanza, context);
    }

    jslix.BaseClient.prototype.register_plugin = function(plugin){
        this.dispatcher.register_plugin(plugin);
    }

    jslix.BaseClient.prototype.send = function(stanza){
        return this.dispatcher.send(stanza);
    }

    jslix.BaseClient.prototype.disconnect = function(){
        return this.dispatcher.send(this.connection.disconnect());
    }

})();
