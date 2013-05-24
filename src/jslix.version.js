"use strict";
define(['jslix.fields', 'jslix.stanzas'], function(fields, stanzas){

    var plugin = function(dispatcher, options) {
        this.options = options || {};
        this._name = this.options.name || '';
        this._version = this.options.version || '';
        this._os = this.options.os || this._defineOs();
        this._dispatcher = dispatcher;

    };

    var version = plugin.prototype,
        Element = stanzas.Element;

    version._name = 'jslix.Version';

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
        var iq = stanzas.IQStanza.create({
            type: 'get',
            to: jid,
            link: this.RequestStanza.create()
        });
        return this._dispatcher.send(iq);
    };

    version.init = function(){
        if (this._dispatcher){
            this._dispatcher.addHandler(this.RequestStanza, this, this._name);
        }
        if(this.options['disco_plugin'] != undefined){
            this.options.disco_plugin.registerFeature(this.VERSION_NS);
        }
    };

    version.ResponseStanza = Element({
        //Definition
        xmlns: version.VERSION_NS,
        //Fields
        name: new fields.StringNode('name', true),
        version: new fields.StringNode('version', true),
        os: new fields.StringNode('os')
    }, [stanzas.QueryStanza]);

    version.RequestStanza = Element({
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
    }, [stanzas.QueryStanza]);

    return plugin;

});
