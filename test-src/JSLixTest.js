
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

JSLixTest.prototype.testParseQueryStanza = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', false), xmlns:'my_xmlns'}, [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({});
	
	var iqParent = jslix.stanzas.iq.create({});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);});
};

JSLixTest.prototype.testNoElementParseError = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', true), xmlns:'my_xmlns'}, [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: "123"});
	
	var iqParent = jslix.stanzas.iq.create({});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);}); 
};

JSLixTest.prototype.testElementParseError = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', true, true), xmlns:'my_xmlns'}, [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({});
	
	var iqParent = jslix.stanzas.iq.create({});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertException(function(){jslix.parse(myDocument, myDefinition);}, jslix.ElementParseError); 
};

JSLixTest.prototype.testIntegerType = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.IntegerNode('int_node', false), xmlns:'int_xmlns'}, [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123});
	
	var iqParentIntegerNode = jslix.stanzas.iq.create({});
	
	iqParentIntegerNode.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);}); 
};

JSLixTest.prototype.testJIDType = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.JIDNode('jid_node', false), xmlns:'jid_xmlns'}, [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123});
	
	var iqParentIntegerNode = jslix.stanzas.iq.create({});
	
	iqParentIntegerNode.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);}); 
};


JSLixTest.prototype.testElementNode = function()
{
	var definitionElementNode = jslix.Element({node: new jslix.fields.StringNode('string_node', false), 
											   xmlns:'string_xmlns', element_name:'myName!'});
	var myDefinition = jslix.Element({node: jslix.fields.ElementNode(definitionElementNode, false), xmlns:'element_xmlns', element_name:'qwer'});
	
	var myStanza = myDefinition.create({node: {node : 
												definitionElementNode.create({node:'test'})}});	
	
	var myDocument = jslix.build(myStanza);
	
	assertNoException(function(){jslix.parse(myDocument.node, definitionElementNode);});	
};