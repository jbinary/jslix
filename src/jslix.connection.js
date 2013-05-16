"use strict";
(function(){

    var jslix = window.jslix;

    jslix.connection = function(jid, password, http_base){
        this._connection = null;
        this.http_base = http_base;
        this.jid = new jslix.JID(jid);
        this.password = password;
        if(!this.jid.getResource())
            this.jid.setResource('default');
    }

    jslix.connection._name = 'jslix.connection';

    jslix.connection.signals = {
        disconnect: new signals.Signal()
    };

    jslix.connection.transports = {};

    jslix.connection.prototype.connect = function(dispatcher){
        this._connection = new jslix.connection.transports.bosh(dispatcher,
            this.jid, this.password, this.http_base);
        return this._connection.connect();
    }

    jslix.connection.prototype.restart = function(){
        return this._connection ? this._connection.restart() : false;
    }

    jslix.connection.prototype.send = function(doc){
        return this._connection ? this._connection.send(doc) : false;
    }

    jslix.connection.prototype.disconnect = function(){
        jslix.connection.signals.disconnect.dispatch();
        return this._connection ? this._connection.disconnect() : false;
    }

})();
