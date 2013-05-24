"use strict";
define(['jslix.sasl', 'cryptojs/components/core',
        'cryptojs/components/enc-base64'],
    function(SASL, CryptoJS){
    
    var auth_plugin = function(dispatcher){
        this._dispatcher = dispatcher;
    };

    SASL.mechanisms['PLAIN'] = auth_plugin;

    var plain = auth_plugin.prototype;

    plain.getPlainMessage = function(){
        return CryptoJS.enc.Base64.stringify(
            CryptoJS.enc.Latin1.parse(
                this._dispatcher.connection.jid.getBareJID() + '\0' + this._dispatcher.connection.jid.getNode() + '\0' + this._dispatcher.connection.password));
    }

    plain.auth = function(){
        return SASL.prototype.AuthStanza.create({
            mechanism: 'PLAIN',
            content: this.getPlainMessage()
        });
    }

    return auth_plugin;

});
