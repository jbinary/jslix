"use strict";
(function(){
    
    var jslix = window.jslix;

    if(jslix.sasl === undefined)
        throw Error('Load sasl plugin first.');

    jslix.sasl.mechanisms['PLAIN'] = function(dispatcher){
        this._dispatcher = dispatcher;
    };

    jslix.sasl.mechanisms['PLAIN'].prototype.getPlainMessage = function(){
        return CryptoJS.enc.Base64.stringify(
            CryptoJS.enc.Latin1.parse(
                this._dispatcher.connection.jid.getBareJID() + '\0' + this._dispatcher.connection.jid.getNode() + '\0' + this._dispatcher.connection.password));
    }

    jslix.sasl.mechanisms['PLAIN'].prototype.auth = function(){
        return jslix.sasl.stanzas.auth.create({
            mechanism: 'PLAIN',
            content: this.getPlainMessage()
        });
    }

})();
