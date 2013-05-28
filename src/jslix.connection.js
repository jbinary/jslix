"use strict";
define(['jslix.connection.transports.bosh', 'jslix.jid', 'libs/signals'],
    function(BOSH, JID, signals){

    var plugin = function(jid, password, http_base){
        this._connection = null;
        this.http_base = http_base;
        this.jid = new JID(jid);
        this.password = password;
        if(!this.jid.resource)
            this.jid.resource = 'default';
    }

    plugin.transports = {};

    var connection = plugin.prototype;

    connection.signals = {
        disconnect: new signals.Signal()
    };


    connection.connect = function(dispatcher){
        this._connection = new BOSH(dispatcher,
            this.jid, this.password, this.http_base);
        return this._connection.connect();
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
