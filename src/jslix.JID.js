"use strict";
(function(){

    var jslix = window.jslix;

    var JID_FORBIDDEN = ['"',' ','&','\'','/',':','<','>','@'];

    var codesForEscape = {
        ' ' : '20',
        '"' : '22',
        '&' : '26',
        '\'' : '27',
        '/' : '2f',
        ':' : '3a',
        '<' : '3c',
        '>' : '3e',
        '@' : '40',
        '\\' : '5c'
    };

    var codesForUnescape = {};

    for(var key in codesForEscape)
      codesForUnescape[codesForEscape[key]] = key;

    jslix.JID = function(jid){
        this._node = '';
        this._domain = '';
        this._resource = '';
        if (typeof(jid) == 'string'){
           if (jid.indexOf('@') != -1){
              this.setNode(jid.substring(0, jid.indexOf('@')));
              jid = jid.substring(jid.indexOf('@') + 1);
           }
          if (jid.indexOf('/') != -1){
             this.setResource(jid.substring(jid.indexOf('/') + 1));
             jid = jid.substring(0, jid.indexOf('/'));
          }
           this.setDomain(jid);
        }else{
           this.setNode(jid.node);
           this.setDomain(jid.domain);
           this.setResource(jid.resource);
        }
    };

    jslix.JID._name = 'jslix.JID';

    jslix.JID.exceptions = {
        JIDInvalidException: function(message){
            this.message = message;
            this.name = "JIDInvalidException";
        }
    };

    var JID = jslix.JID,
        JIDInvalidException = JID.exceptions.JIDInvalidException;

    jslix.JID.prototype.getNode = function(){
        return this._node;
    };

    jslix.JID.prototype.getDomain = function(){
        return this._domain;
    };

    jslix.JID.prototype.getBareJID = function(){
        return this._node + '@' + this._domain;
    }

    jslix.JID.prototype.getResource = function(){
        return this._resource;
    };

    jslix.JID.prototype.setNode = function(node){
        JID._checkNodeName(node);
        this._node = node || '';
        return this;
    };

    jslix.JID.prototype.setDomain = function(domain){
        if (!domain || domain == '')
         throw new JIDInvalidException("domain name missing");
        JID._checkNodeName(domain);
        this._domain = domain;
        return this;
    };

    jslix.JID.prototype.setResource = function(resource){
        this._resource = resource || '';
        return this;
    };

    jslix.JID.prototype.toString = function(){
        var jid = '';
        if (this.getNode() && this.getNode() != '')
            jid = this.getNode() + '@';
        jid += this.getDomain();
        if (this.getResource() && this.getResource() != "")
            jid += '/' + this.getResource();
        return jid;
    };

    jslix.JID.prototype.removeResource = function(){
        return this.setResource();
    };

    jslix.JID.prototype.clone = function(){
        return new JID(this.toString());
    };

    jslix.JID.prototype.isEntity = function(jid){
        if (typeof jid == 'string')
            jid = (new JID(jid));
        jid.removeResource();
        return (this.clone().removeResource().toString() === jid.toString());
    };

    jslix.JID.prototype.escape = function(node, domain, resource){
        var escapeNode = '';
        for (var i = 0; i < node.length; ++i)
            if (JID_FORBIDDEN.indexOf(node[i]) != -1)
                escapeNode += '\\' + codesForEscape[node[i]];
        else{
            //if situation like c:\5ccommon
            if (i < node.length - 2 && node[i] == '\\'){
                var code = node.slice(i + 1, i + 3);
                var key = codesForUnescape[code];
                if (key){
                    escapeNode += '\\' + codesForEscape[key];
                }else
                    escapeNode += node[i];
            }else
                escapeNode += node[i];
        }
        return new JID({
            node: escapeNode,
            domain: domain,
            resource: resource
        });
    };

    jslix.JID.prototype.unescape = function(){
        var resultJID = '';
        var i = 0;
        var node = this.getNode();
        while (i < node.length){
            if (JID_FORBIDDEN.indexOf(node[i]) != -1 && node[i] != '\\')
                throw new JIDInvalidException("forbidden char in escape nodename: " + JID_FORBIDDEN[i]);
            if (node[i] == '\\'){
                var code = node.slice(i + 1, i + 3);
                var key = codesForUnescape[code];
                if (key){
                    if (key == ' ' && (i == 0 || i == node.length - 3))
                        throw new JIDInvalidException("wrong unescape: space at the beginning or at the end");
                    resultJID += key;
                    i += 2;
                }else
                    resultJID += node[i];
            }else
                resultJID += node[i];
            i++;
        }
        resultJID += '@' + this.getDomain();
        if (this.getResource() && this.getResource() != '')
            resultJID += '/' + this.getResource();
        return resultJID;
    };

    jslix.JID._checkNodeName = function(nodeprep){
        if (!nodeprep || nodeprep == '')
            return;
        for (var i=0; i< JID_FORBIDDEN.length; i++)
            if (nodeprep.indexOf(JID_FORBIDDEN[i]) != -1)
                throw new JIDInvalidException("forbidden char in nodename: " + JID_FORBIDDEN[i]);
    };

})();
