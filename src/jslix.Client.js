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

    jslix.Client.prototype = new jslix.BaseClient();

    jslix.Client.prototype.connect = function(){
        this.register_stanza(jslix.Element({
            anyHandler: function(top){
                return jslix.stanzas.presence.create();
            }
        }, [jslix.session.stanzas.request]));
        return this.connection.connect(this.dispatcher);
    }

})();
