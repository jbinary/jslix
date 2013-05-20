"use strict";
(function(){

    var jslix = window.jslix,
        fields = jslix.fields;

    jslix.version= function(dispatcher, options) {
        this.options = options || {};
        this._name = this.options.name || '';
        this._version = this.options.version || '';
        this._os = this.options.os || this._defineOs();
        this._dispatcher = dispatcher;

    };

    var version = jslix.version.prototype;

    version._name = 'jslix.version';

    version.VERSION_NS = 'jabber:iq:version';

    version.setName = function(name){
        this._name = name;
    }

    version.getName = function(){
        return this._name;
    }

    version.setVersion = function(version){
        this._version = version;
    }

    version.getVersion = function(){
        return this._version;
    }

    version.getOs = function(){
        return this._os;
    }

    version._defineOs = function(){
        var os = window.navigator ? window.navigator.appName : 'n/a',
            version = window.navigator ? window.navigator.appVersion: 'n/a';
        return version != 'n/a' ? os + ' ' + version : os;
    };

    version.get = function(jid) {
        var iq = jslix.stanzas.iq.create({
            type: 'get',
            to: jid,
            link: this.RequestStanza.create()
        });
        return this._dispatcher.send(iq);
    };

    version.init = function(){
        if (this._dispatcher){
            this._dispatcher.addHandler(this.RequestStanza, this);
        }
        if(this.options['disco_plugin'] != undefined){
            this.options.disco_plugin.registerFeature(this.VERSION_NS);
        }
    };

    version.ResponseStanza = jslix.Element({
        //Definition
        xmlns: version.VERSION_NS,
        //Fields
        name: new fields.StringNode('name', true),
        version: new fields.StringNode('version', true),
        os: new fields.StringNode('os')
    }, [jslix.stanzas.query]);

    version.RequestStanza = jslix.Element({
        //Definition
        xmlns: version.VERSION_NS,
        //Handlers
        result_class: version.ResponseStanza,
        getHandler: function(query, top) {
            return query.makeResult({
                version: this.getVersion(),
                name: this.getName(),
                os:  this.getOs()
            });
        }
    }, [jslix.stanzas.query]);

})();
