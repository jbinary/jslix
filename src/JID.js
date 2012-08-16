//copy-paste. source: jsjac.js, jsjac.JID
(function(window){
	
	var jslix = window.jslix;
	var fields = jslix.fields;

	var JID_FORBIDDEN = ['"',' ','&','\'','/',':','<','>','@'];

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
  	   	throw new JIDObjectInvalidException("domain name missing");

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
})(window);
