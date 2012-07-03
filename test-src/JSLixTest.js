
JSLixTest = TestCase("JSLixTest");

JSLixTest.prototype.testBuildIQStanza = function()
{
	var iqStanza = jslix.stanzas.iq.create({element_name:'iq', id:'123', type:'string'});
	
	var iqStanzaDocument = jslix.build(iqStanza);

	assertSame(iqStanzaDocument.xml, '<iq xmlns="jabber:client"/>');
};


JSLixTest.prototype.testParseIQStanza = function()
{
	var iqStanza = jslix.stanzas.iq.create({element_name:'iq', id:'123', type:'string'});
	
	var iqStanzaDocument = jslix.build(iqStanza);
	
	
	assertNoException(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.iq);});
	
	
	assertException(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.query);},
			jslix.WrongElement);
	
	var parsedDefinition = (jslix.parse(iqStanzaDocument, jslix.stanzas.iq)).__definition__;

	assertSame(parsedDefinition.element_name, iqStanza.element_name);
};
