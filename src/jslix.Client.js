"use strict";
(function(){

    var jslix = window.jslix;

    jslix.Client = function(options){
        jslix.BaseClient.call(this, options);
        this.options['http_base'] = this.options['http_base'] || '/http-base/';
        this.connection = new jslix.connection(this.options['jid'],
           this.options['password'], this.options['http_base']);
        this.dispatcher = new jslix.dispatcher(this.connection);
    }

    jslix.Client._name = 'jslix.Client';

    jslix.Client.prototype = new jslix.BaseClient();

    jslix.Client.prototype.constructor = jslix.Client;

    jslix.Client.prototype.connect = function(){
        this.addHandler(jslix.Element({
            anyHandler: function(top){
                return jslix.stanzas.presence.create();
            }
        }, [jslix.session.stanzas.request]), this, jslix.Client._name);
        return this.connection.connect(this.dispatcher);
    }

})();
