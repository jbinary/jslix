
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

var compareDictionaries = function(d1, d2)
{

	if (d1 instanceof Array)
	{
		var type = "Array";
	}
	else
	{
		var type = typeof d1;
	}

	switch(type)
	{
		case "Array":
			for (var i = 0; i < d1.length; ++i)
			{
				if (!compareDictionaries(d1[i], d2[i])) return false;
			}
			return true;

		case "object":
			for (var key in d1)
			{

				if (typeof d1[key] == "function")
				{
					continue;
				}

				if (key.indexOf("_") == 0 ) continue;

				if (!d2.hasOwnProperty(key))
				{
					jstestdriver.console.log("key: " + key);
					return false;
				}

				if (!compareDictionaries(d1[key], d2[key])) return false;
			}
			return true;

		default:
			if (d1 != d2)
			{
				return false;
			}
			return true;
	}
};


var compareDocumentsFromString = function(doc1, str)
{	
	return compareDocuments(doc1, (new DOMParser()).parseFromString(str, "text/xml"));
};

JSLixTest.prototype.testCompareDictionaries = function()
{
	var d1 = new Object();
	var d2 = new Object();

	var incapsObj_1 = new Object();
	incapsObj_1.arrOfSpy = [1, 2, 3];

	var incapsObj_2 = new Object();
	incapsObj_2.arrOfSpy = [1, 2, 3];

	d1.incapsObject = incapsObj_1;
	d2.incapsObject = incapsObj_2;

	assertTrue(compareDictionaries(d1, d2));

	var oneMoreObject_1 = new Object();
	var oneMoreObject_2 = new Object();

	oneMoreObject_1.soup = "1";
	oneMoreObject_2.soup = "1";

	d1.incapsObject_2 = oneMoreObject_1;
	d2.incapsObject_2 = oneMoreObject_2;

	assertTrue(compareDictionaries(d1, d2));

};

JSLixTest.prototype.testBuildIQStanza = function()
{
	var iqStanza = jslix.stanzas.iq.create({element_name:'iq', id:'123', type:'get'});
	
	var iqStanzaDocument = jslix.build(iqStanza);

	compareDocumentsFromString(iqStanzaDocument, '<iq xmlns="jabber:client" id="123" type="get"/>');
};

JSLixTest.prototype.testCompareDocuments = function()
{
	var iqStanza = jslix.stanzas.iq.create({element_name:'iq', id:'123', type:'get'});

	var iqStanzaDocument = jslix.build(iqStanza);

	var doc2 = (new DOMParser()).parseFromString('<iq xmlns="jabber:client" id="123" type="get"/>', "text/xml");

	compareDocuments(iqStanzaDocument, doc2);
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
	
	var myStanza = myDefinition.create({node: 123, to:'abc', from:'qwe'});
	
	var iqParent = jslix.stanzas.iq.create({id:'123', type:'get'});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);});

	var parsedObject = jslix.parse(myDocument, myDefinition);

	var trueObject = myDefinition.create({node:123});

	var parentTrueObject = jslix.stanzas.iq.create({to:'abc', from:'qwe', id:'123', type:'get'});
	parentTrueObject.link(trueObject);

	assertTrue(compareDictionaries(parsedObject, trueObject));
};

JSLixTest.prototype.testNoElementParseError = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', true), 
									  xmlns:'my_xmlns'}, 
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123, to:'abc', from:'qwe'});
	
	var iqParent = jslix.stanzas.iq.create({id:'123', type:'get'});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);}); 

	var parsedObject = jslix.parse(myDocument, myDefinition);

	var trueObject = myDefinition.create({node:123});

	var parentTrueObject = jslix.stanzas.iq.create({to:'abc', from:'qwe', id:'123', type:'get'});
	parentTrueObject.link(trueObject);

	assertTrue(compareDictionaries(parsedObject, trueObject));
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

JSLixTest.prototype.testInteger = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.IntegerNode('int_node', false),
									  int_attr: new jslix.fields.IntegerAttr('int_attr', false),
									  xmlns:'int_xmlns'},
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123, int_attr: 100500, to:'abc', from:'qwe'});
	
	var iqParentIntegerNode = jslix.stanzas.iq.create({id:'123', type:'get'});
	
	iqParentIntegerNode.link(myStanza);

	var myDocument = jslix.build(myStanza.getTop());	

	assertNoException(function(){jslix.parse(myDocument, myDefinition);}); 

	var parsedObject = jslix.parse(myDocument, myDefinition);

	var trueObject = myDefinition.create({node:123, int_attr: 100500});

	var parentTrueObject = jslix.stanzas.iq.create({to:'abc', from:'qwe', id:'123', type:'get'});
	parentTrueObject.link(trueObject);

	assertTrue(compareDictionaries(parsedObject, trueObject));
};

JSLixTest.prototype.testJIDType = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.JIDNode('jid_node', false), 
									  xmlns:'jid_xmlns'},
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123, to:'abc', from:'qwe'});
	
	var iqParentIntegerNode = jslix.stanzas.iq.create({id:'123', type:'get'});
	
	iqParentIntegerNode.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);});

	var parsedObject = jslix.parse(myDocument, myDefinition);

	var trueObject = myDefinition.create({node: 123});

	var parentTrueObject = jslix.stanzas.iq.create({to:'abc', from:'qwe', id:'123', type:'get'});
	parentTrueObject.link(trueObject);

	assertTrue(compareDictionaries(parsedObject, trueObject));
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

	assertNoException(function(){jslix.parse(myDocument, myDefinition);});

	var parsedObject = jslix.parse(myDocument, myDefinition);

	var trueObject = new Object();

	trueObject.node = {node:'test'};

	assertTrue(compareDictionaries(parsedObject, trueObject));

};

