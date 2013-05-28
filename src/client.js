"use strict";
define(['jslix/dispatcher', 'jslix/connection', 'jslix/base_client'],
    function(Dispatcher, Connection, BaseClient){

    var Client = function(options){
        if (!options) return;
        BaseClient.call(this, options);
        this.options['http_base'] = this.options['http_base'] || '/http-base/';
        this.connection = new Connection(this.options['jid'],
           this.options['password'], this.options['http_base']);
        this.dispatcher = new Dispatcher(this.connection);
    }

    Client.prototype = new BaseClient();

    var client = Client.prototype;

    client.constructor = Client;

    client.connect = function(){
        return this.connection.connect(this.dispatcher);
    }

    return Client;

});
