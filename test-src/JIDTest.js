JIDTest = TestCase("JIDTest");

var goodNodes = ["space cadet", 
		   "call me \"ishmael\"",
		   "at&t guy",
		   "d'artagnan",
		   "/.fanboy",
		   "::foo::",
		   "<foo>",
		   "user@host",
		   "c:\\net",
		   "c:\\\\net",
		   "c:\\cool stuff",
		   "c:\\5commas"];

var escapedGoodJIDs = ["space\\20cadet@example.com",
			  "call\\20me\\20\\22ishmael\\22@example.com",
			  "at\\26t\\20guy@example.com",
			  "d\\27artagnan@example.com",
			  "\\2f.fanboy@example.com",
			  "\\3a\\3afoo\\3a\\3a@example.com",
			  "\\3cfoo\\3e@example.com",
			  "user\\40host@example.com",
			  "c\\3a\\net@example.com",
			  "c\\3a\\\\net@example.com",
			  "c\\3a\\cool\\20stuff@example.com",
			  "c\\3a\\5c5commas@example.com"];

var badStrings = ["\\20rt", "rt@\\2"];

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
	for (var i = 0; i < goodNodes.length; ++i)
	{
		assertNoException(function(){
					       var escapedJID = jslix.JID.escape(goodNodes[i], "example.com");
					       assertEquals(escapedJID.toString(), escapedGoodJIDs[i]);

					       var unescapedJID = escapedJID.unescape();
					       assertEquals(unescapedJID, goodNodes[i] + "@example.com");
					    });
	}

};

JIDTest.prototype.testUnescapeExceptions = function()
{

	for (var i = 0; i < badStrings.length; ++i)
	{
		assertException(function(){
						var escapedJID = jslix.JID.escape("ruutu", "what", "is");
						escapedJID.setNode(badStrings[i]);
						var unescapedJID = escapedJID.unescape();
					   }, jslix.JIDInvalidException);
	}
};

