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
    testBuildIQStanza: function(){
        var iqStanza = jslix.stanzas.IQStanza.create({element_name:'iq', id:'123', type:'get'});

        var doc = new XMLSerializer().serializeToString(jslix.build(iqStanza));

        assert(doc == '<iq xmlns="jabber:client" id="123" type="get"/>');
    },
    testParseIQStanza:  function(){
        var iqStanza = jslix.stanzas.IQStanza.create({id:'123', type:'get', from:'abc', to:'qwe'});
        
        var iqStanzaDocument = jslix.build(iqStanza);
        
        
        refute.exception(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.IQStanza);});
        
        
        assert.exception(function(){jslix.parse(iqStanzaDocument, jslix.stanzas.QueryStanza);},
                jslix.WrongElement);
        
        var parsedStanza = jslix.parse(iqStanzaDocument, jslix.stanzas.IQStanza);

        assert(parsedStanza.id == '123' && parsedStanza.type == 'get');
        assert(parsedStanza.from.toString() == 'abc' && parsedStanza.to.toString() == 'qwe');
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

        var parsedObject = jslix.parse(myDocument, myDefinition),
            parent = parsedObject.parent;
        assert(parsedObject.node instanceof Array && parsedObject.node.length == 3);
        assert(parent && parent.id == '123' && parent.type == 'get');
        assert(parent.to instanceof jslix.JID && parent.to.toString() == 'abc');
        assert(parent.from instanceof jslix.JID && parent.from.toString() == 'qwe');
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

        var parsedObject = jslix.parse(myDocument, myDefinition),
            parent = parsedObject.parent;

        assert(parsedObject.node && parsedObject.node == 123);

        assert(parent && parent.id == '123' && parent.type == 'get');
        assert(parent.to instanceof jslix.JID && parent.to.toString() == 'abc');
        assert(parent.from instanceof jslix.JID && parent.from.toString() == 'qwe');
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

        var parsedObject = jslix.parse(myDocument, myDefinition),
            parent = parsedObject.parent;
        assert(parsedObject.node && parsedObject.node == 123);
        assert(parsedObject.int_attr && parsedObject.int_attr == 100500);
        assert(parent && parent.id == '123' && parent.type == 'get');
        assert(parent.to instanceof jslix.JID && parent.to.toString() == 'abc');
        assert(parent.from instanceof jslix.JID && parent.from.toString() == 'qwe');

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

        var parsedObject = jslix.parse(myDocument, myDefinition),
            parent = parsedObject.parent;
        assert(parsedObject.node && parsedObject.node instanceof jslix.JID);
        assert(parent && parent.id == '123' && parent.type == 'get');
        assert(parent.to instanceof jslix.JID && parent.to.toString() == 'abcd');
        assert(parent.from instanceof jslix.JID && parent.from.toString() == 'qwe');
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

        assert(myStanza.toString() == '<qwer xmlns="element_xmlns">' +
                '<myName xmlns="string_xmlns">' +
                '<string_node>test</string_node>' +
                '</myName></qwer>');

        refute.exception(function(){jslix.parse(myDocument, myDefinition);});

        var parsedObject = jslix.parse(myDocument, myDefinition);

        assert(parsedObject.node && parsedObject.node.node && parsedObject.node.node == 'test');

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

        var errorStanza = iqStanza.makeError('bad-request', 'bad-request', 'error'),
            parent = errorStanza.parent;

        assert(errorStanza.text == 'bad-request');

        assert(errorStanza.type == 'error');

        assert(parent && parent.id == '123' && parent.type == 'error');
        assert(parent.from == 'abram');
        assert(parent.to == 'isaak');

    },
    testPresenceStanza: function(){
        var presenceStanza = jslix.stanzas.PresenceStanza.create({from:'abc', to:'qwe', id:1, type:'get',
                                    show:'chat', status:'OK', priority:1});

        var presenceDoc = jslix.build(presenceStanza);

        refute.exception(function(){jslix.parse(presenceDoc, jslix.stanzas.PresenceStanza)});

        var parsedPresence = jslix.parse(presenceDoc, jslix.stanzas.PresenceStanza),
            parent = parsedPresence.parent;

        assert(parsedPresence.show == 'chat');
        assert(parsedPresence.status == 'OK');
        assert(parsedPresence.priority == 1);

        assert(parsedPresence.from instanceof jslix.JID && parsedPresence.from.toString() == 'abc');
        assert(parsedPresence.to instanceof jslix.JID && parsedPresence.to.toString() == 'qwe');

        assert(parsedPresence.id == 1 && parsedPresence.type == 'get');

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
                    assert(doc.toString() == '<iq xmlns="jabber:client" to="qwe" from="abc" id="' + this.count + '" type="get"/>');
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

        refute.exception(function(){
            resultDoc = jslix.parse(resultDoc, resultDefinition);
        });

        assert(resultDoc.id == '123' && resultDoc.type == 'result');
        assert(resultDoc.from instanceof jslix.JID && resultDoc.from.toString() == 'qwe');
        assert(resultDoc.to instanceof jslix.JID && resultDoc.to.toString() == 'abc')

        assert.equals(this.dispatcher.deferreds, {});
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

        assert(resultStanza.id == 2 && resultStanza.type == 'result');

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
