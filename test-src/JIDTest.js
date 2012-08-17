JIDTest = TestCase("JIDTest");

JIDTest.prototype.testJIDBasic = function()
{
	var jid = new jslix.JID("ruutu@finland/keys");

	var node = jid.getNode();
	var domain = jid.getDomain();
	var resource = jid.getResource();

	assertEquals(node, "ruutu");
	assertEquals(domain, "finland");
	assertEquals(resource, "keys");
};

JIDTest.prototype.testIsEntity = function()
{
	var jid = new jslix.JID("baibako@a/b");

	assertTrue(jid.isEntity("baibako@a"));

	assertFalse(jid.isEntity("lostfilm@a/from"));
};

JIDTest.prototype.testThrowedException = function()
{
	assertException(function(){
				    var jid = new jslix.JID({node:'abc',
							    domain:'type"forbidden@symbols/',
							    resource:'qwe'});
				  }, jslix.JIDInvalidException);

	assertException(function(){
				    var jid = new jslix.JID({node:'',
							    domain:'',
							    resource:'qwe'});
				  }, jslix.JIDInvalidException);
};

JIDTest.prototype.testEscapeCorrect = function()
{
	var jid = new jslix.JID("ruutu@finland/keys");

	jid._node = "r:@u&tu";

	var escapedJID = jid.escape();

	assertEquals(escapedJID.getNode(), "r\\3a\\40u\\26tu");

	var unescapedJID = escapedJID.unescape("r\\3a\\40u\\26tu", escapedJID.getDomain(), escapedJID.getResource());

	assertEquals(unescapedJID, "r:@u&tu@finland/keys");
};

JIDTest.prototype.testUnescapeExceptions = function()
{
	var jid = new jslix.JID("ruutu@finland/keys");

	jid._node = "r:@u&tu";

	var escapedJID = jid.escape();

	escapedJID._node = "r\\3a\\40@u\\26tu";

	assertException(function(){
				   var unescapedJID = escapedJID.unescape("r\\3a\\40@u\\26tu", 
									  escapedJID.getDomain(), 
									  escapedJID.getResource());
				  }, jslix.JIDInvalidException);

	assertException(function(){
				   var unescapedJID = escapedJID.unescape("r\\20\\40u\\26tu\\2", 
									  escapedJID.getDomain(), 
									  escapedJID.getResource());
				  }, jslix.JIDInvalidException);

	
	assertException(function(){
				   var unescapedJID = escapedJID.unescape("\\20r\\3a\\40u\\26tu", 
									  escapedJID.getDomain(), 
									  escapedJID.getResource());
				  }, jslix.JIDInvalidException);

	assertException(function(){
				   var unescapedJID = escapedJID.unescape("r\\39\\40u\\26tu", 
									  escapedJID.getDomain(), 
									  escapedJID.getResource());
				  }, jslix.JIDInvalidException);
};

