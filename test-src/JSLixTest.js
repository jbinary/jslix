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
	var iqStanza = jslix.stanzas.iq.create({id:'123', type:'get', from:'abc', to:'qwe'});
	
	var iqStanzaDocument = jslix.build(iqStanza);
	
	
	assertNoException(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.iq);});
	
	
	assertException(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.query);},
			jslix.WrongElement);
	
	var parsedStanza = jslix.parse(iqStanzaDocument, jslix.stanzas.iq);

	assertTrue(compareDictionaries(parsedStanza, {id:'123', type:'get', from:'abc', to:'qwe'}));
};

JSLixTest.prototype.testParseQueryStanza = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', false, true), 
									  xmlns:'my_xmlns'}, 
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: ['1', '2', '3']});
	
	var iqParent = jslix.stanzas.iq.create({to:'abc', from:'qwe', id:'123', type:'get'});
	
	iqParent.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);});

	var parsedObject = jslix.parse(myDocument, myDefinition);

	assertTrue(compareDictionaries(parsedObject, {
							node: ['1', '2', '3'], 
							parent: {
								  	to:'abc', from:'qwe', id:'123', type:'get'
								}
						     }));
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

	assertTrue(compareDictionaries(parsedObject, { node: 123,
							parent: {
									to:'abc', from:'qwe', id:'123', type:'get'
								}
						     }));
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

	assertTrue(compareDictionaries(parsedObject, { node: 123, int_attr: 100500,
							parent: {
								    id:'123', type:'get', to:'abc', from:'qwe'
								}
						     }));
};

JSLixTest.prototype.testJIDType = function()
{
	var myDefinition = jslix.Element({node: new jslix.fields.JIDNode('jid_node', false), 
									  xmlns:'jid_xmlns'},
									  [jslix.stanzas.query]);
	
	var myStanza = myDefinition.create({node: 123, to:'abcd', from:'qwe'});
	
	var iqParentIntegerNode = jslix.stanzas.iq.create({id:'123', type:'get'});
	
	iqParentIntegerNode.link(myStanza);
	
	var myDocument = jslix.build(myStanza.getTop());
	
	assertNoException(function(){jslix.parse(myDocument, myDefinition);});

	var parsedObject = jslix.parse(myDocument, myDefinition);

	assertTrue(compareDictionaries(parsedObject, {node:123, 
							parent: {
									to:'abcd', from:'qwe', id:'123', type:'get'
								}
						     }));
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


	assertTrue(compareDictionaries(parsedObject, {node: {
								node: 'test'
							  	}
						     }));

};


JSLixTest.prototype.testCreateStanza = function()
{	
	var stanza = jslix.createStanza(jslix.stanzas.iq);

	assertFunction(stanza.makeError);

	assertFunction(stanza.makeResult);

	assertFunction(stanza.makeReply);
};

JSLixTest.prototype.testParseStanza = function()
{
	var iqStanza = jslix.stanzas.iq.create({element_name:'iq', id:'123', from:'isaak', to:'abram', type:'get'});
	
	var iqStanzaDocument = jslix.build(iqStanza);
	
	var parsedObject = jslix.parse(iqStanzaDocument, jslix.stanzas.iq);

	assertFunction(iqStanza.makeError);

	assertFunction(iqStanza.makeResult);

	assertFunction(iqStanza.makeReply);
};

JSLixTest.prototype.testMakeError = function()
{
	var iqStanza = jslix.stanzas.iq.create({element_name:'iq', id:'123', from:'isaak', to:'abram', type:'get'});

	var errorStanza = iqStanza.makeError('bad-request', 'bad-request', 'auth');

	assertEquals(errorStanza.getTop().from, "abram");

	assertEquals(errorStanza.getTop().to, "isaak");

	assertEquals(errorStanza.getTop().type, "error");

	assertEquals(errorStanza.text, "bad-request");

	assertEquals(errorStanza.type, "auth");

	compareDictionaries(errorStanza, {text:'bad-request',
					  type:'auth',
					   parent:{
							to:'isaak', from:'abram', type:'error'
						  }
						});
};


JSLixTest.prototype.testPresenceStanza = function()
{
	var presenceStanza = jslix.stanzas.presence.create({from:'abc', to:'qwe', id:1, type:'get',
							    show:'chat', status:'OK', priority:1});

	var presenceDoc = jslix.build(presenceStanza);

	assertNoException(function(){jslix.parse(presenceDoc, jslix.stanzas.presence)});

	var parsedPresence = jslix.parse(presenceDoc, jslix.stanzas.presence);

	compareDictionaries(parsedPresence, {show:'chat', status:'OK', priority:1, 
						parent:{
							    from:'abc', to:'qwe', id:1, type:'get'
						       }
					    });

	var badPresenceStanza = jslix.stanzas.presence.create({from:'abc', to:'qwe', id:1, type:'get',
							    show:'bad', status:'OK', priority:1});

	var badPresenceDoc = jslix.build(badPresenceStanza);

	assertException(function(){jslix.parse(badPresenceDoc, jslix.stanzas.presence)}, jslix.ElementParseError);
};

JSLixTest.prototype.testJSLixDispatcherSend = function()
{
	var iqStanza = jslix.stanzas.iq.create({id:'123', type:'get', from:'abc', to:'qwe'});

	var dummyFunction = { send: function(packet)
				    {
					  //this is just a dummy
				    }
			    }

	window.con = dummyFunction;

	assertNoException(function(){jslix.dispatcher.send(iqStanza);});
};

