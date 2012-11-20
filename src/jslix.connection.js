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

    jslix.connection.transports = {};

    jslix.connection.prototype.connect = function(dispatcher){
        this._connection = new jslix.connection.transports.bosh(dispatcher,
            this.jid, this.password, this.http_base);
        this._connection.connect();
    }

    jslix.connection.prototype.restart = function(){
        if(!this._connection)
            return false;
        return this._connection.restart();
    }

    jslix.connection.prototype.send = function(doc){
        if(!this._connection)
            return false;
        return this._connection.send(doc);
    }

    jslix.connection.prototype.disconnect = function(){
        if(!this._connection)
            return false;
        return this._connection.disconnect();
    }

})();
