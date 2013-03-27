"use strict";
(function(window) {

    var jslix = window.jslix,
        fields = jslix.fields;

    jslix.version = function(dispatcher, options) {
        this.options = options || {};
        this._name = options.name || '';
        this._version = options.version || '';
        this._os = options.os || jslix.version._defineOs();
        this._dispatcher = dispatcher;

    };

    jslix.version._name= 'jslix.version';

    jslix.version.VERSION_NS = 'jabber:iq:version';

    jslix.version.stanzas = {};

    jslix.version.prototype.setName = function(name){
        this._name = name;
    }

    jslix.version.prototype.getName = function(){
        return this._name;
    }

    jslix.version.prototype.setVersion = function(version){
        this._version = version;
    }

    jslix.version.prototype.getVersion = function(){
        return this._version;
    }

    jslix.version.prototype.getOs = function(){
        return this._os;
    }

    jslix.version._defineOs = function(){
        var os = window.navigator ? window.navigator.appName : 'n/a',
            version = window.navigator ? window.navigator.appVersion: 'n/a';
        return version != 'n/a' ? os + ' ' + version : os;
    };

    jslix.version.prototype.get = function(jid) {
        var iq = jslix.stanzas.iq.create({
            type: 'get',
            to: jid,
            link: jslix.version.stanzas.request.create()
        });
        return this._dispatcher.send(iq);
    };

    jslix.version.prototype.init = function(){
        if (this._dispatcher){
            this._dispatcher.addHandler(jslix.version.stanzas.request, this);
        }
        if(this.options['disco_plugin'] != undefined){
            this.options.disco_plugin.registerFeature(jslix.version.VERSION_NS);
        }
    };

    jslix.version.stanzas.response = jslix.Element({
        //Definition
        xmlns: jslix.version.VERSION_NS,
        //Fields
        name: new fields.StringNode('name', true),
        version: new fields.StringNode('version', true),
        os: new fields.StringNode('os')
    }, [jslix.stanzas.query]);

    jslix.version.stanzas.request = jslix.Element({
        //Definition
        xmlns: jslix.version.VERSION_NS,
        //Handlers
        result_class: jslix.version.stanzas.response,
        getHandler: function(query, top) {
            return query.makeResult({
                version: this.getVersion(),
                name: this.getName(),
                os:  this.getOs()
            });
        }
    }, [jslix.stanzas.query]);

})(window);
