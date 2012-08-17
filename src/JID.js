//copy-paste. source: jsjac.js, jsjac.JID
(function(){
	var fields = jslix.fields;

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
	   }

	var JID = function(jid)
	{
	    this._node = '';

	    this._domain = '';

	    this._resource = '';

	    if (typeof(jid) == 'string')
	    {
	       if (jid.indexOf('@') != -1)
	       {
		  this.setNode(jid.substring(0, jid.indexOf('@')));
		  jid = jid.substring(jid.indexOf('@') + 1);
	       }

	       if (jid.indexOf('/') != -1) 
	       {
	          this.setResource(jid.substring(jid.indexOf('/') + 1));
	          jid = jid.substring(0, jid.indexOf('/'));
	       }

	    this.setDomain(jid);
	  } 
	   else 
           {
	     this.setNode(jid.node);
	     this.setDomain(jid.domain);
	     this.setResource(jid.resource);
	   }
	};


	JID.prototype.getNode = function() 
	{ 
		return this._node; 
	};

	JID.prototype.getDomain = function() 
	{ 
		return this._domain; 
	};

	JID.prototype.getResource = function() 
	{ 
		return this._resource; 
	};

	JID.prototype.setNode = function(node)
	{
	    JID._checkNodeName(node);
	    this._node = node || '';
	    return this;
	};


	JID.prototype.setDomain = function(domain)
	{
  	   if (!domain || domain == '')
  	   	throw new JIDInvalidException("domain name missing");

  	   JID._checkNodeName(domain);
  	   this._domain = domain;
  	   return this;
	};

	JID.prototype.setResource = function(resource) 
	{
  	   this._resource = resource || '';
           return this;
	};

	JID.prototype.toString = function()
	{
  	   var jid = '';

  	   if (this.getNode() && this.getNode() != '')
 	    jid = this.getNode() + '@';

	   jid += this.getDomain();

	   if (this.getResource() && this.getResource() != "")
	    jid += '/' + this.getResource();

	   return jid;
	};

	JID.prototype.removeResource = function()
	{
	   return this.setResource();
	};

	JID.prototype.clone = function()
	{
  	   return new JID(this.toString());
	};

	JID.prototype.isEntity = function(jid)
	{
	   if (typeof jid == 'string')
	       jid = (new JID(jid));

	   jid.removeResource();

	   return (this.clone().removeResource().toString() === jid.toString());
	};

	JID.prototype.escape = function()
	{
	     var escapeNode = '';

	     for (var i = 0; i < this._node.length; ++i)
		if (JID_FORBIDDEN.indexOf(this._node[i]) != -1)
			escapeNode += '\\' + codesForEscape[this._node[i]];
		else
			escapeNode += this._node[i];

		var jid = new JID({ node: escapeNode,
				    domain: this.getDomain(),
				    resource: this.getResource()
				});
		return jid;
	};

	JID.prototype.unescape = function(node, domain, resource)
	{
		var resultJID = '';
		var i = 0;

		while (i < node.length)
		{
		   if (JID_FORBIDDEN.indexOf(node[i]) != -1 && node[i] != '\\')
		       throw new JIDInvalidException("forbidden char in escape nodename: " + JID_FORBIDDEN[i]);

		   if (node[i] == '\\')
		   {
		       if (i > node.length - 3)
			  throw new JIDInvalidException("wrong escape message: " + node[i]);

		       var code = node[i + 1] + node[i + 2];
		       var isWrong = true;

		       for (var key in codesForEscape)
			 if (codesForEscape[key] == code)
			 {
				if (key == ' ' && (i == 0 || i == node.length - 3))
				   throw new JIDInvalidException("wrong unescape: space at the beginning or at the end");

			    resultJID += key;
			    i += 2;
			    isWrong = false;
			    break;
			 }

			if (isWrong)
			   throw new JIDInvalidException("wrong escape message: no allowed symbols");
		   }
		   else
		      resultJID += node[i];

		   i++;
		}

		resultJID += '@' + domain;
		resultJID += '/' + resource;

		return resultJID;
	};

	JID._checkNodeName = function(nodeprep)
	{
	    if (!nodeprep || nodeprep == '')
	      return;

	    for (var i=0; i< JID_FORBIDDEN.length; i++)
	      if (nodeprep.indexOf(JID_FORBIDDEN[i]) != -1)
		  throw new JIDInvalidException("forbidden char in nodename: " + JID_FORBIDDEN[i]);
	};

        var JIDInvalidException = function(message)
        {
  	    this.message = message;
	    this.name = "JIDInvalidException";
        };


      jslix.JID = JID;
      jslix.exceptions.JIDInvalidException = JIDInvalidException;
})();
