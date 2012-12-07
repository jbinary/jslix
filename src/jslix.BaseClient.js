"use strict";
(function(){

    var jslix = window.jslix;

    jslix.BaseClient = function(options){
        if(!options)
            return;
        this.options = options;
    }

    jslix.BaseClient.prototype.connect = function(){
        throw new Error('Method not implemented.');
    }

    jslix.BaseClient.prototype.register_handler = function(){
        throw new Error('Method not implemented.');
    }

    jslix.BaseClient.prototype.register_plugin = function(){
        throw new Error('Method not implemented.');
    }

    jslix.BaseClient.prototype.send = function(){
        throw new Error('Method not implemented.');
    }

    jslix.BaseClient.prototype.disconnect = function(){
        throw new Error('Method not implemented.');
    }

})();
