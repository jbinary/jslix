"use strict";
(function(){

    var jslix = window.jslix;

    jslix.Client = function(options){
        if (!options) return;
        jslix.BaseClient.call(this, options);
        this.options['http_base'] = this.options['http_base'] || '/http-base/';
        this.connection = new jslix.Connection(this.options['jid'],
           this.options['password'], this.options['http_base']);
        this.dispatcher = new jslix.Dispatcher(this.connection);
    }

    jslix.Client.prototype = new jslix.BaseClient();

    var client = jslix.Client.prototype;

    client.constructor = jslix.Client;

    client.connect = function(){
        return this.connection.connect(this.dispatcher);
    }

})();
