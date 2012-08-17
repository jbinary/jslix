JIDTest = TestCase("JIDTest");

var badStrings = ["\\2plus\\2is\\4", "foo\\bar", "foob\\41r"];

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
	var escapedJID = jslix.JID.escape("r:@u&tu", "finland", "keys");

	assertEquals(escapedJID.getNode(), "r\\3a\\40u\\26tu");

	var unescapedJID = escapedJID.unescape();

	assertEquals(unescapedJID, "r:@u&tu@finland/keys");
};

JIDTest.prototype.testUnescapeExceptions = function()
{

	for (var i = 0; i < badStrings.length; ++i)
	{
		assertException(function(){
						var escapedJID = jslix.JID.escape(badStrings[i], "what", "is");
						var unescapedJID = escapedJID.unescape();
					   }, jslix.JIDInvalidException);
	}
};

