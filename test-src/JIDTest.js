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
