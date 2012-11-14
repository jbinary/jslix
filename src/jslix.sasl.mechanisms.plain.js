(function(){
    
    var jslix = window.jslix;

    if(jslix.sasl === undefined)
        throw Error('Load sasl plugin first.');

    jslix.sasl.mechanisms['PLAIN'] = function(dispatcher){
        this._dispatcher = dispatcher;
    };

    jslix.sasl.mechanisms['PLAIN'].prototype.getPlainMessage = function(){
        // TODO: Replace with CryptoJS
        return b64encode(this._dispatcher.connection.jid.getBareJID() + '\0' + this._dispatcher.connection.jid.getNode() + '\0' + this._dispatcher.connection.password);
    }

    jslix.sasl.mechanisms['PLAIN'].prototype.auth = function(){
        return jslix.sasl.stanzas.auth.create({
            mechanism: 'PLAIN',
            content: this.getPlainMessage()
        });
    }

})();
