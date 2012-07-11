
JSLixTest = TestCase("JSLixTest");

var compareDocuments = function(doc1, doc2)
{
	assertEquals(doc1.childNodes.length, doc2.childNodes.length);
	
	assertEquals(doc1.namespaceURI, doc2.namespaceURI);
	
	assertEquals(doc1.nodeName, doc2.nodeName);

	
	if (doc1.attributes == null)
		assertSame(doc1.attributes, doc2.attributes);
	else
	{		
	
		for (var j = 0; j < doc1.attributes.length; ++j)
		{
			if (doc1.attributes[j].name == 'xmlns') continue;
			assertEquals(doc1.attributes[j].value, doc2.attributes.getNamedItem(doc1.attributes[j].name).value);
		}
	}
	
	var len = doc1.childNodes.length;
	
	for (var i = 0; i < len; ++i)
	{
		compareDocuments(doc1.childNodes[i], doc2.childNodes[i]);
	}
};

var compareDocumentsFromString = function(doc1, str)
{	
	return compareDocuments(doc1, (new DOMParser()).parseFromString(str, "text/xml"));
};

JSLixTest.prototype.testBuildIQStanza = function()
{
	var iqStanza = jslix.stanzas.iq.create({element_name:'iq', id:'123', type:'get'});
	
	var iqStanzaDocument = jslix.build(iqStanza);

	
	compareDocumentsFromString(iqStanzaDocument, '<iq xmlns="jabber:client" id="123" type="get"/>');
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

JSLixTest.prototype.testParseQueryStanza = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', false), 
									  xmlns:'my_xmlns'}, 
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({});
	
	var iqParent = jslix.stanzas.iq.create({});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);});
};

JSLixTest.prototype.testNoElementParseError = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', true), 
									  xmlns:'my_xmlns'}, 
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: "123"});
	
	var iqParent = jslix.stanzas.iq.create({});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);}); 
};

JSLixTest.prototype.testElementParseError = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', true, true), 
									  xmlns:'my_xmlns'}, 
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({});
	
	var iqParent = jslix.stanzas.iq.create({});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertException(function(){jslix.parse(myDocument, myDefinition);}, jslix.ElementParseError); 
};

JSLixTest.prototype.testIntegerType = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.IntegerNode('int_node', false), 
									  xmlns:'int_xmlns'},
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123});
	
	var iqParentIntegerNode = jslix.stanzas.iq.create({});
	
	iqParentIntegerNode.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);}); 
};

JSLixTest.prototype.testJIDType = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.JIDNode('jid_node', false), 
									  xmlns:'jid_xmlns'},
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123});
	
	var iqParentIntegerNode = jslix.stanzas.iq.create({});
	
	iqParentIntegerNode.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);});
};


JSLixTest.prototype.testElementNode = function()
{
	var definitionElementNode = new jslix.Element({node: new jslix.fields.StringNode('string_node', false), 
											   xmlns:'string_xmlns', 
											   element_name:'myName'});
	
	var myDefinition = new jslix.Element({node: new jslix.fields.ElementNode(definitionElementNode, false), 
									  xmlns:'element_xmlns', 
									  element_name:'qwer'});
	
	var myStanza = myDefinition.create({node: {
											node: 'test'
											  }
										});
	
	var myDocument = jslix.build(myStanza);

	compareDocumentsFromString(myDocument, 
			"<qwer xmlns='element_xmlns'>" +
			"<myName xmlns='string_xmlns'>" +
			"<string_node>qwer</string_node>" +
			"</myName></qwer>");
};