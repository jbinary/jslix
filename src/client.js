"use strict";
define(['jslix/dispatcher', 'jslix/connection', 'jslix/base_client'],
    function(Dispatcher, Connection, BaseClient){

    var Client = function(options){
        if (!options) return;
        BaseClient.call(this, options);
        this.connection = new Connection(this.options);
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
