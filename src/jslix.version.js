"use strict";
(function(window) {

    var jslix = window.jslix;
    var fields = jslix.fields;

    jslix.version = function(dispatcher) {
        this._name = '';
        this._version = '';
        this._os = '';

        this._dispatcher = dispatcher;

        this._os = jslix.version._defineOs();

    };

    jslix.version.NS_VERSION = 'jabber:iq:version';

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
        var type = '';
        var vers = '';
        var os = '';

        if (window.navigator.userAgent.indexOf ("Opera") >= 0){ // Opera
           type = 'Opera';
           vers = window.navigator.userAgent.substr(window.navigator.userAgent.indexOf("Opera")+6,4);
        }
        else
        if (window.navigator.userAgent.indexOf ("Gecko") >= 0){ // (Mozilla, Netscape, FireFox)
           type = 'Netscape';
           vers=window.navigator.userAgent.substr(window.navigator.userAgent.indexOf("Gecko")+6, 8)
                                                        +' ('+window.navigator.userAgent.substr(8,3) + ')';
        }
        else
        if (window.navigator.userAgent.indexOf ("MSIE") >= 0){ //IE
           type = 'Explorer';
           vers=window.navigator.userAgent.substr(window.navigator.userAgent.indexOf("MSIE")+5,3);
        }
        else
           type = window.navigator.appName;

        os = type;
        if (vers) os += ' ' + vers;

        return os;
    };

    jslix.version.prototype.get = function(jid) {
        var query = jslix.version.stanzas.request.create();
        var iq = jslix.stanzas.iq.create(
                    {
                        type: 'get',
                        to: jid,
                        link: query
                    });
        return this._dispatcher.send(query);
    };

    jslix.version.prototype.init = function(name, version){
        this.setName(name);
        this.setVersion(version);

        if (this._dispatcher) this._dispatcher.addHandler(jslix.version.stanzas.request, this);
    };

    jslix.version.stanzas.response = jslix.Element({
        //Definition
        xmlns: jslix.version.NS_VERSION,
        //Fields
        name: new fields.StringNode('name', true),
        version: new fields.StringNode('version', true),
        os: new fields.StringNode('os')
    }, [jslix.stanzas.query]);

    jslix.version.stanzas.request = jslix.Element({
        //Definition
        xmlns: jslix.version.NS_VERSION,
        //Handlers
        result_class: jslix.version.stanzas.response,
        getHandler: function(query, top) {
            var result = query.makeResult(
                {
                    version: this.getVersion(),
                    name: this.getName(),
                    os:  this.getOs()
                }
            );
            return result;
        }
    }, [jslix.stanzas.query]);

})(window);
