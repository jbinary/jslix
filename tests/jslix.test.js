var compareDocuments = function(doc1, doc2){
    assert(doc1.childNodes.length == doc2.childNodes.length);
    
    assert(doc1.namespaceURI == doc2.namespaceURI);
    
    assert(doc1.nodeName == doc2.nodeName);

    
    if (doc1.attributes == null)
        assert.same(doc1.attributes, doc2.attributes);
    else
    {        
    
        for (var j = 0; j < doc1.attributes.length; ++j)
        {
            if (doc1.attributes[j].name == 'xmlns') continue;
            assert(doc1.attributes[j].value == doc2.attributes.getNamedItem(doc1.attributes[j].name).value);
        }
    }
    
    var len = doc1.childNodes.length;
    
    for (var i = 0; i < len; ++i)
    {
        compareDocuments(doc1.childNodes[i], doc2.childNodes[i]);
    }
};

var compareDictionaries = function(d1, d2){
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

var JslixTest = buster.testCase('JslixTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
        this.dispatcher.connection = {
            count: 0,
            send: function(doc, cb){
                this.count++;
                if(typeof cb == 'function')
                    return cb.call(this, doc);
                return doc;
            }
        }
    },
    testCompareDictionaries: function(){
        var d1 = new Object();
        var d2 = new Object();

        var incapsObj_1 = new Object();
        incapsObj_1.arrOfSpy = [1, 2, 3];

        var incapsObj_2 = new Object();
        incapsObj_2.arrOfSpy = [1, 2, 3];

        d1.incapsObject = incapsObj_1;
        d2.incapsObject = incapsObj_2;

        assert(compareDictionaries(d1, d2));

        var oneMoreObject_1 = new Object();
        var oneMoreObject_2 = new Object();

        oneMoreObject_1.soup = "1";
        oneMoreObject_2.soup = "1";

        d1.incapsObject_2 = oneMoreObject_1;
        d2.incapsObject_2 = oneMoreObject_2;

        assert(compareDictionaries(d1, d2));
    },
    testBuildIQStanza: function(){
        var iqStanza = jslix.stanzas.IQStanza.create({element_name:'iq', id:'123', type:'get'});
        
        var iqStanzaDocument = jslix.build(iqStanza);

        compareDocumentsFromString(iqStanzaDocument, '<iq xmlns="jabber:client" id="123" type="get"/>');
    },
    testCompareDocuments: function(){
        var iqStanza = jslix.stanzas.IQStanza.create({element_name:'iq', id:'123', type:'get'});

        var iqStanzaDocument = jslix.build(iqStanza);

        var doc2 = (new DOMParser()).parseFromString('<iq xmlns="jabber:client" id="123" type="get"/>', "text/xml");

        compareDocuments(iqStanzaDocument, doc2);
    },
    testParseIQStanza:  function(){
        var iqStanza = jslix.stanzas.IQStanza.create({id:'123', type:'get', from:'abc', to:'qwe'});
        
        var iqStanzaDocument = jslix.build(iqStanza);
        
        
        refute.exception(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.IQStanza);});
        
        
        assert.exception(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.QueryStanza);},
                jslix.WrongElement);
        
        var parsedStanza = jslix.parse(iqStanzaDocument, jslix.stanzas.IQStanza);

        assert(compareDictionaries(parsedStanza, {id:'123', type:'get', from:'abc', to:'qwe'}));
    },
    testParseQueryStanza: function(){
        var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', false, true), 
                                          xmlns:'my_xmlns'}, 
                                          [jslix.stanzas.QueryStanza]);
        
        var myStanza = myDefinition.create({node: ['1', '2', '3']});
        
        var iqParent = jslix.stanzas.IQStanza.create({to:'abc', from:'qwe', id:'123', type:'get'});
        
        iqParent.link(myStanza);
        
        var myDocument = jslix.build(myStanza.getTop());
        
        refute.exception(function(){jslix.parse(myDocument, myDefinition);});

        var parsedObject = jslix.parse(myDocument, myDefinition);

        assert(compareDictionaries(parsedObject, {
                                node: ['1', '2', '3'], 
                                parent: {
                                          to:'abc', from:'qwe', id:'123', type:'get'
                                    }
                                 }));
    },
    testNoElementParseError: function(){
        var myDefinition = jslix.Element({node: new jslix.fields.StringNode('my_node', true), 
                                          xmlns:'my_xmlns'}, 
                                          [jslix.stanzas.QueryStanza]);
        
        var myStanza = myDefinition.create({node: 123});
        
        var iqParent = jslix.stanzas.IQStanza.create({id:'123', type:'get', to: 'abc', from: 'qwe'});
        
        iqParent.link(myStanza);
        
        var myDocument = jslix.build(myStanza.getTop());
        
        refute.exception(function(){jslix.parse(myDocument, myDefinition);}); 

        var parsedObject = jslix.parse(myDocument, myDefinition);

        assert(compareDictionaries(parsedObject, { node: 123,
                                parent: {
                                        to:'abc', from:'qwe', id:'123', type:'get'
                                    }
                                 }));
    },
    testElementParseError: function(){
        var myDefinition = jslix.Element({
            node: new jslix.fields.StringNode('my_node', true, true), 
            xmlns:'my_xmlns'
        }, [jslix.stanzas.QueryStanza]);
        
        var iqParent = jslix.stanzas.IQStanza.create({
            link: myDefinition.create()
        });
        
        var myDocument = jslix.build(iqParent);

        assert.exception(function(){
            jslix.parse(myDocument, myDefinition);
        }, 'ElementParseError'); 
    },
    testInteger: function(){
        var myDefinition = jslix.Element({node: new jslix.fields.IntegerNode('int_node', false),
                                          int_attr: new jslix.fields.IntegerAttr('int_attr', false),
                                          xmlns:'int_xmlns'},
                                          [jslix.stanzas.QueryStanza]);
        
        var myStanza = myDefinition.create({node: 123, int_attr: 100500});
        
        var iqParentIntegerNode = jslix.stanzas.IQStanza.create({
            id:'123', type:'get', to: 'abc', from: 'qwe'});
        
        iqParentIntegerNode.link(myStanza);

        var myDocument = jslix.build(myStanza.getTop());    

        refute.exception(function(){jslix.parse(myDocument, myDefinition);}); 

        var parsedObject = jslix.parse(myDocument, myDefinition);

        assert(compareDictionaries(parsedObject, { node: 123, int_attr: 100500,
                                parent: {
                                        id:'123', type:'get', to:'abc', from:'qwe'
                                    }
                                 }));
    },
    testJIDType: function(){
        var myDefinition = jslix.Element({node: new jslix.fields.JIDNode('jid_node', false), 
                                          xmlns:'jid_xmlns'},
                                          [jslix.stanzas.QueryStanza]);
        
        var myStanza = myDefinition.create({node: 123});
        
        var iqParentIntegerNode = jslix.stanzas.IQStanza.create({
            id:'123', type:'get', to: 'abcd', from: 'qwe'});
        
        iqParentIntegerNode.link(myStanza);
        
        var myDocument = jslix.build(myStanza.getTop());
        
        refute.exception(function(){jslix.parse(myDocument, myDefinition);});

        var parsedObject = jslix.parse(myDocument, myDefinition);
        assert(compareDictionaries(parsedObject, {node:123, 
                                parent: {
                                        to:'abcd', from:'qwe', id:'123', type:'get'
                                    }
                                 }));
    },
    testElementNode: function(){
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

        refute.exception(function(){jslix.parse(myDocument, myDefinition);});

        var parsedObject = jslix.parse(myDocument, myDefinition);


        assert(compareDictionaries(parsedObject, {node: {
                                    node: 'test'
                                      }
                                 }));

    },
    testCreateStanza: function(){
        var stanza = jslix.createStanza(jslix.stanzas.IQStanza);

        assert(typeof stanza.makeError == 'function');

        assert(typeof stanza.makeResult == 'function');

        assert(typeof stanza.makeReply == 'function');
    },
    testParseStanza: function(){
        var iqStanza = jslix.stanzas.IQStanza.create({element_name:'iq', id:'123', from:'isaak', to:'abram', type:'get'});
        
        var iqStanzaDocument = jslix.build(iqStanza);
        
        var parsedObject = jslix.parse(iqStanzaDocument, jslix.stanzas.IQStanza);

        assert(typeof iqStanza.makeError == 'function');

        assert(typeof iqStanza.makeResult == 'function');

        assert(typeof iqStanza.makeReply == 'function');
    },
    testMakeError: function(){
        var iqStanza = jslix.stanzas.IQStanza.create({element_name:'iq', id:'123', from:'isaak', to:'abram', type:'get'});

        var errorStanza = iqStanza.makeError('bad-request', 'bad-request', 'error');

        refute.exception(function(){
            compareDictionaries(errorStanza, {text:'bad-request',
                          type:'auth',
                           parent:{
                                to:'isaak', from:'abram', type:'error'
                              }
                            })
        });
    },
    testPresenceStanza: function(){
        var presenceStanza = jslix.stanzas.PresenceStanza.create({from:'abc', to:'qwe', id:1, type:'get',
                                    show:'chat', status:'OK', priority:1});

        var presenceDoc = jslix.build(presenceStanza);

        refute.exception(function(){jslix.parse(presenceDoc, jslix.stanzas.PresenceStanza)});

        var parsedPresence = jslix.parse(presenceDoc, jslix.stanzas.PresenceStanza);

        compareDictionaries(parsedPresence, {show:'chat', status:'OK', priority:1, 
                            parent:{
                                    from:'abc', to:'qwe', id:1, type:'get'
                                   }
                            });

        var badPresenceStanza = jslix.stanzas.PresenceStanza.create({from:'abc', to:'qwe', id:1, type:'get',
                                    show:'bad', status:'OK', priority:1});

        var badPresenceDoc = jslix.build(badPresenceStanza);

        assert.exception(function(){
            jslix.parse(badPresenceDoc, jslix.stanzas.PresenceStanza)
        }, 'ElementParseError');
    },
    testJSLixDispatcherSend: function(){
        this.dispatcher.deferreds = {};

        var firstIqStanza = jslix.stanzas.IQStanza.create({id:'1', type:'get', from:'abc', to:'qwe'});
        var secondIqStanza = jslix.stanzas.IQStanza.create({id:'2', type:'get', from:'abc', to:'qwe'});
        var thirdIqStanza = jslix.stanzas.IQStanza.create({id:'3', type:'get', from:'abc', to:'qwe'});


        var test = this;

        refute.exception(function(){
            var stanzas = [firstIqStanza, secondIqStanza, thirdIqStanza];
            for(var i=0; i<stanzas.length; i++){
                test.dispatcher.send(stanzas[i], function(doc){
                    compareDocumentsFromString(doc, 
                        '<iq xmlns="jabber:client" to="qwe" from="abc" id="' + this.count + '" type="get"/>');
                });
            }
        });

        var countStanzas = 0;

        for (var key in this.dispatcher.deferreds)
        {
            countStanzas++;
        }

        assert(countStanzas == 3);

    },
    testNoPresenseDeferred: function(){
        this.dispatcher.deferreds = {};

        var presenceStanza = jslix.stanzas.PresenceStanza.create({from:'abc', to:'qwe', id:'1', type:'get',
                                show:'chat', status:'OK', priority:1});
        var test = this;
        refute.exception(function(){test.dispatcher.send([presenceStanza]);});

        var countStanzas = 0;

        for (var key in this.dispatcher.deferreds)
        {
            countStanzas++;
        }

        assert(countStanzas == 0);
    },
    testDispatcher: function(){
        var iqHandler = jslix.stanzas.IQStanza;
        var testHost = {};

        var resultDefinition = jslix.stanzas.IQStanza;

        var definitionIq = new jslix.Element({node: new jslix.fields.StringNode('string_node', false), 
                                                   xmlns:'string_xmlns', 
                                            result_class: resultDefinition},
                            [jslix.stanzas.IQStanza]);

        this.dispatcher.addHandler(definitionIq, testHost);

        var iqStanza = definitionIq.create({id:'123', type:'get', from:'abc', to:'qwe'});

        this.dispatcher.send(iqStanza);

        var resultStanza = jslix.stanzas.IQStanza.create({type:'result', from:'qwe', to:'abc', id:'123'});

        var resultDoc = jslix.build(resultStanza);


        assert(this.dispatcher.deferreds.hasOwnProperty('123'));

        var test = this;
        refute.exception(function(){
                        test.dispatcher.dispatch(resultDoc);
                        }
                 );

        compareDictionaries(resultDoc, {id:'123', type:'get', from:'abc', to:'qwe'});

        compareDictionaries(this.dispatcher.deferreds, { });
    },
    testErrorStanzaDispatch: function(){
        var iqStanza = jslix.stanzas.IQStanza.create({from:'a', to:'b', type:'error', id:123});

        var iqDoc = jslix.build(iqStanza);

        var test = this;

        refute.exception(function(){
            test.dispatcher.dispatch(iqDoc);
        });
    },
    testMakeResult: function(){
        var definitionIq = new jslix.Element({xmlns:'iq_xmlns',
                              element_name:'iq', 
                              result_class: jslix.stanzas.IQStanza
                             }, [jslix.stanzas.IQStanza]);

        var iqStanza = definitionIq.create({from:'a', to:'b', id:1, type:'set'});

        var resultStanza = iqStanza.makeResult({id:2, type:'result'});

        refute.exception(function(){
            compareDictionaries(resultStanza, { id:2, 
                            parent:
                            {
                                from:'b', to:'a', id:1, type:'result'
                            }

                          });
        });
    },
    testSpecialStanza: function(){
        var special_stanza = jslix.stanzas.SpecialStanza.create();
        assert(special_stanza instanceof jslix.stanzas.SpecialStanza);
        assert(special_stanza.toString() == '<Special stanza>');
    },
    testEmptyStanza: function(){
        assert(this.dispatcher.connection.count == 0);
        var empty_stanza = jslix.stanzas.EmptyStanza.create();
        assert(empty_stanza instanceof jslix.stanzas.EmptyStanza);
        assert(empty_stanza.toString() == '<Empty stanza>');
        this.dispatcher.send(empty_stanza);
        assert(this.dispatcher.connection.count == 0);
    },
    testBreakStanza: function(){
        var break_stanza = jslix.stanzas.BreakStanza.create(),
            test_def = jslix.Element({
                element_name: 'test',
                handler: function(top){
                    return break_stanza;
                }
            });
        assert(break_stanza instanceof jslix.stanzas.BreakStanza);
        assert(break_stanza.toString() == '<Break stanza>');
        assert(this.dispatcher.connection.count == 0);
        this.dispatcher.addHandler(test_def, this);
        this.dispatcher.dispatch(jslix.build(test_def.create()));
        assert(this.dispatcher.connection.count == 0);
    },
    testErrorStanza: function(){
        var error_stanza = jslix.stanzas.ErrorStanza.create({type: 'some_wrong_type'});
        assert(error_stanza.type == 'some_wrong_type');
        error_stanza = jslix.build(jslix.stanzas.MessageStanza.create({
            link: error_stanza
        }));
        assert.exception(function(){
            jslix.parse(error_stanza, jslix.stanzas.ErrorStanza);
        }, 'ElementParseError');
    },
    testMultiChildStringNode: function(){
        var definition = new jslix.Element({
                xmlns: 'test_ns',
                element_name: 'test',
                text: new jslix.fields.StringNode('text')
            }),
            test_document = document.implementation.createDocument('test_ns', 'test', null),
            fragment = document.createElementNS('test_ns', 'text'),
            result;
        fragment.appendChild(document.createTextNode('some'));
        fragment.appendChild(document.createTextNode('text'));
        test_document.childNodes[0].appendChild(fragment);
        result = jslix.parse(test_document, definition);
        assert(result.text = 'sometext');
    },
    testToStringMethod: function(){
        assert(jslix.stanzas.PresenceStanza.create() == '<presence xmlns="jabber:client"/>');
    }
});
