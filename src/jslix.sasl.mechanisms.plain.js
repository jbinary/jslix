"use strict";
(function(){
    
    var jslix = window.jslix;

    jslix.SASL.mechanisms['PLAIN'] = function(dispatcher){
        this._dispatcher = dispatcher;
    };

    var plain = jslix.SASL.mechanisms['PLAIN'].prototype;

    plain.getPlainMessage = function(){
        return CryptoJS.enc.Base64.stringify(
            CryptoJS.enc.Latin1.parse(
                this._dispatcher.connection.jid.getBareJID() + '\0' + this._dispatcher.connection.jid.getNode() + '\0' + this._dispatcher.connection.password));
    }

    plain.auth = function(){
        return jslix.SASL.prototype.AuthStanza.create({
            mechanism: 'PLAIN',
            content: this.getPlainMessage()
        });
    }

})();
