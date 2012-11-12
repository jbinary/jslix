(function(){

    var jslix = window.jslix;

    jslix.connection = function(jid, password){
        this.jid = new jslix.JID(jid);
        this.password = password;
        this._connection = window.con;
    }

    jslix.connection.prototype.sendRaw = function(doc){
        if(!this._connection)
            return false;
        var packet = new window.JSJaCPacket('');
        packet.doc = doc;
        return this._connection.send(packet);
    }

    jslix.connection.prototype.disconnect = function(){
        if(!this._connection)
            return false;
        return this._connection.disconnect();
    }

})();
