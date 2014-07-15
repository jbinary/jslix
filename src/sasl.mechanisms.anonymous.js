"use strict";
define(['jslix/sasl'], function(SASL){

    var auth_plugin = function(dispatcher){
        this._dispatcher = dispatcher;
    };

    SASL.mechanisms['ANONYMOUS'] = auth_plugin;

    var anonymous = auth_plugin.prototype;

    anonymous.auth = function(){
        return SASL.prototype.AuthStanza.create({
            mechanism: 'ANONYMOUS'
        });
    };

    return auth_plugin;

});
