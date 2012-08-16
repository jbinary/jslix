
//(function(window){
	
	var jslix = window.jslix;
	var fields = jslix.fields;

	var JID_FORBIDDEN = ['"',' ','&','\'','/',':','<','>','@'];

	var jidObject = function(jid)
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


	jidObject.prototype.getNode = function() 
	{ 
		return this._node; 
	};

	jidObject.prototype.getDomain = function() 
	{ 
		return this._domain; 
	};

	jidObject.prototype.getResource = function() 
	{ 
		return this._resource; 
	};

	jidObject.prototype.setNode = function(node)
	{
	    jidObject._checkNodeName(node);
	    this._node = node || '';
	    return this;
	};


	jidObject.prototype.setDomain = function(domain)
	{
  	   if (!domain || domain == '')
  	   	throw new JIDObjectInvalidException("domain name missing");

  	   jidObject._checkNodeName(domain);
  	   this._domain = domain;
  	   return this;
	};

	jidObject.prototype.setResource = function(resource) 
	{
  	   this._resource = resource || '';
           return this;
	};

	jidObject.prototype.toString = function()
	{
  	   var jid = '';

  	   if (this.getNode() && this.getNode() != '')
 	    jid = this.getNode() + '@';

	   jid += this.getDomain();

	   if (this.getResource() && this.getResource() != "")
	    jid += '/' + this.getResource();

	   return jid;
	};

	jidObject.prototype.removeResource = function()
	{
	   return this.setResource();
	};

	jidObject.prototype.clone = function()
	{
  	   return new jidObject(this.toString());
	};

	jidObject.prototype.isEntity = function(jid)
	{
	   if (typeof jid == 'string')
	       jid = (new JSJaCJID(jid));

	   jid.removeResource();

	   return (this.clone().removeResource().toString() === jid.toString());
	};

	jidObject._checkNodeName = function(nodeprep)
	{
	    if (!nodeprep || nodeprep == '')
	      return;

	    for (var i=0; i< JID_FORBIDDEN.length; i++)
	      if (nodeprep.indexOf(JID_FORBIDDEN[i]) != -1) 
		  throw new JIDObjectInvalidException("forbidden char in nodename: " + JID_FORBIDDEN[i]);
	};

        var JIDObjectInvalidException = function(message)
        {
  	    this.message = message;
	    this.name = "JIDObjectInvalidException";
        };
  

      jslix.JID = jidObject;
      jslix.exceptions.JIDObjectInvalidException = JIDObjectInvalidException;
//})(window);
