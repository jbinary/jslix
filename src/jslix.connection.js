(function(){

    var jslix = window.jslix;

    jslix.connection = function(jid, password){
        this.jid = new jslix.JID(jid);
        this.password = password;
        this._connection = window.con;
        if(!this.jid.getResource())
            this.jid.setResource('default');
    }

    jslix.connection.prototype.reInitStream = function(){
        if(!this._connection)
            return false;
        var connection = this;
        return this._connection._reInitStream(function(){
            var iq = jslix.stanzas.iq.create({
                id: 'bind_1',
                type: 'set'
            });
            iq.link(jslix.bind.stanzas.request.create({
                resource: connection.jid.getResource()
            }));
            connection.sendRaw(jslix.build(iq.getTop()));
        });
    }

    jslix.connection.prototype.sendRaw = function(doc){
        if(!this._connection)
            return false;
        var packet = new JSJaCPacket('');
        packet.doc = doc;
        return this._connection.send(packet);
    }

    jslix.connection.prototype.disconnect = function(){
        if(!this._connection)
            return false;
        return this._connection.disconnect();
    }

})();
