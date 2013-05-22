"use strict";
(function(){
    
    var jslix = window.jslix;

    jslix.sasl.mechanisms['PLAIN'] = function(dispatcher){
        this._dispatcher = dispatcher;
    };

    var plain = jslix.sasl.mechanisms['PLAIN'].prototype;

    plain.getPlainMessage = function(){
        return CryptoJS.enc.Base64.stringify(
            CryptoJS.enc.Latin1.parse(
                this._dispatcher.connection.jid.getBareJID() + '\0' + this._dispatcher.connection.jid.getNode() + '\0' + this._dispatcher.connection.password));
    }

    plain.auth = function(){
        return jslix.sasl.prototype.AuthStanza.create({
            mechanism: 'PLAIN',
            content: this.getPlainMessage()
        });
    }

})();
