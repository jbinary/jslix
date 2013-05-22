"use strict";
(function(){

    var jslix = window.jslix;

    jslix.Connection = function(jid, password, http_base){
        this._connection = null;
        this.http_base = http_base;
        this.jid = new jslix.JID(jid);
        this.password = password;
        if(!this.jid.getResource())
            this.jid.setResource('default');
    }

    jslix.Connection.transports = {};

    var connection = jslix.Connection.prototype;

    connection.signals = {
        disconnect: new signals.Signal()
    };


    connection.connect = function(dispatcher){
        this._connection = new jslix.Connection.transports.BOSH(dispatcher,
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

})();
