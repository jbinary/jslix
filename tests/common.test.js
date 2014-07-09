define(['jslix/common', 'jslix/stanzas', 'jslix/fields', 'jslix/jid',
        'jslix/dispatcher', 'libs/jquery'],
    function(jslix, stanzas, fields, JID, Dispatcher, $){
    buster.testCase('JslixTest', {
        setUp: function(){
            this.dispatcher = new Dispatcher();
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
            var iqStanza = stanzas.IQStanza.create({element_name:'iq', id:'123', type:'get'});

            var doc = new XMLSerializer().serializeToString(jslix.build(iqStanza));

            assert(doc == '<iq xmlns="jabber:client" id="123" type="get"/>');
        },
        testParseIQStanza:  function(){
            var iqStanza = stanzas.IQStanza.create({id:'123', type:'get', from:'abc', to:'qwe'});

            var iqStanzaDocument = jslix.build(iqStanza);


            refute.exception(function(){jslix.parse(iqStanzaDocument, stanzas.IQStanza);});


            assert.exception(function(){
                jslix.parse(iqStanzaDocument, stanzas.QueryStanza);
            }, 'WrongElement');

            var parsedStanza = jslix.parse(iqStanzaDocument, stanzas.IQStanza);

            assert(parsedStanza.id == '123' && parsedStanza.type == 'get');
            assert(parsedStanza.from.toString() == 'abc' && parsedStanza.to.toString() == 'qwe');
        },
        testParseQueryStanza: function(){
            var myDefinition = stanzas.Element({node: new fields.StringNode('my_node', false, true), 
                                              xmlns:'my_xmlns'}, 
                                              [stanzas.QueryStanza]);

            var myStanza = myDefinition.create({node: ['1', '2', '3']});

            var iqParent = stanzas.IQStanza.create({to:'abc', from:'qwe', id:'123', type:'get'});

            iqParent.link(myStanza);

            var myDocument = jslix.build(myStanza.getTop());

            refute.exception(function(){jslix.parse(myDocument, myDefinition);});

            var parsedObject = jslix.parse(myDocument, myDefinition),
                parent = parsedObject.parent;
            assert(parsedObject.node instanceof Array && parsedObject.node.length == 3);
            assert(parent && parent.id == '123' && parent.type == 'get');
            assert(parent.to instanceof JID && parent.to.toString() == 'abc');
            assert(parent.from instanceof JID && parent.from.toString() == 'qwe');
        },
        testNoElementParseError: function(){
            var myDefinition = stanzas.Element({node: new fields.StringNode('my_node', true), 
                                              xmlns:'my_xmlns'}, 
                                              [stanzas.QueryStanza]);

            var myStanza = myDefinition.create({node: 123});

            var iqParent = stanzas.IQStanza.create({id:'123', type:'get', to: 'abc', from: 'qwe'});

            iqParent.link(myStanza);

            var myDocument = jslix.build(myStanza.getTop());

            refute.exception(function(){jslix.parse(myDocument, myDefinition);}); 

            var parsedObject = jslix.parse(myDocument, myDefinition),
                parent = parsedObject.parent;

            assert(parsedObject.node && parsedObject.node == 123);

            assert(parent && parent.id == '123' && parent.type == 'get');
            assert(parent.to instanceof JID && parent.to.toString() == 'abc');
            assert(parent.from instanceof JID && parent.from.toString() == 'qwe');
        },
        testElementParseError: function(){
            var myDefinition = stanzas.Element({
                node: new fields.StringNode('my_node', true, true), 
                xmlns:'my_xmlns'
            }, [stanzas.QueryStanza]);

            var iqParent = stanzas.IQStanza.create({
                link: myDefinition.create()
            });

            var myDocument = jslix.build(iqParent);

            assert.exception(function(){
                jslix.parse(myDocument, myDefinition);
            }, 'ElementParseError'); 
        },
        testInteger: function(){
            var myDefinition = stanzas.Element({node: new fields.IntegerNode('int_node', false),
                                              int_attr: new fields.IntegerAttr('int_attr', false),
                                              xmlns:'int_xmlns'},
                                              [stanzas.QueryStanza]);

            var myStanza = myDefinition.create({node: 123, int_attr: 100500});

            var iqParentIntegerNode = stanzas.IQStanza.create({
                id:'123', type:'get', to: 'abc', from: 'qwe'});

            iqParentIntegerNode.link(myStanza);

            var myDocument = jslix.build(myStanza.getTop());    

            refute.exception(function(){jslix.parse(myDocument, myDefinition);}); 

            var parsedObject = jslix.parse(myDocument, myDefinition),
                parent = parsedObject.parent;
            assert(parsedObject.node && parsedObject.node == 123);
            assert(parsedObject.int_attr && parsedObject.int_attr == 100500);
            assert(parent && parent.id == '123' && parent.type == 'get');
            assert(parent.to instanceof JID && parent.to.toString() == 'abc');
            assert(parent.from instanceof JID && parent.from.toString() == 'qwe');

        },
        testJIDType: function(){
            var myDefinition = stanzas.Element({node: new fields.JIDNode('jid_node', false), 
                                              xmlns:'jid_xmlns'},
                                              [stanzas.QueryStanza]);

            var myStanza = myDefinition.create({node: 123});

            var iqParentIntegerNode = stanzas.IQStanza.create({
                id:'123', type:'get', to: 'abcd', from: 'qwe'});

            iqParentIntegerNode.link(myStanza);

            var myDocument = jslix.build(myStanza.getTop());

            refute.exception(function(){jslix.parse(myDocument, myDefinition);});

            var parsedObject = jslix.parse(myDocument, myDefinition),
                parent = parsedObject.parent;
            assert(parsedObject.node && parsedObject.node instanceof JID);
            assert(parent && parent.id == '123' && parent.type == 'get');
            assert(parent.to instanceof JID && parent.to.toString() == 'abcd');
            assert(parent.from instanceof JID && parent.from.toString() == 'qwe');
        },
        testElementNode: function(){
            var definitionElementNode = new stanzas.Element({node: new fields.StringNode('string_node', false), 
                                                       xmlns:'string_xmlns', 
                                                       element_name:'myName'});

            var myDefinition = new stanzas.Element({node: new fields.ElementNode(definitionElementNode, false), 
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
            var stanza = jslix.createStanza(stanzas.IQStanza);

            assert(typeof stanza.makeResult == 'function');

            assert(typeof stanza.makeReply == 'function');
        },
        testParseStanza: function(){
            var iqStanza = stanzas.IQStanza.create({element_name:'iq', id:'123', from:'isaak', to:'abram', type:'get'});

            var iqStanzaDocument = jslix.build(iqStanza);

            var parsedObject = jslix.parse(iqStanzaDocument, stanzas.IQStanza);

            assert(typeof iqStanza.makeResult == 'function');

            assert(typeof iqStanza.makeReply == 'function');
        },
        testPresenceStanza: function(){
            var presenceStanza = stanzas.PresenceStanza.create({from:'abc', to:'qwe', id:1, type:'get',
                                        show:'chat', status:'OK', priority:1});

            var presenceDoc = jslix.build(presenceStanza);

            refute.exception(function(){jslix.parse(presenceDoc, stanzas.PresenceStanza)});

            var parsedPresence = jslix.parse(presenceDoc, stanzas.PresenceStanza),
                parent = parsedPresence.parent;

            assert(parsedPresence.show == 'chat');
            assert(parsedPresence.status == 'OK');
            assert(parsedPresence.priority == 1);

            assert(parsedPresence.from instanceof JID && parsedPresence.from.toString() == 'abc');
            assert(parsedPresence.to instanceof JID && parsedPresence.to.toString() == 'qwe');

            assert(parsedPresence.id == 1 && parsedPresence.type == 'get');

            var badPresenceStanza = stanzas.PresenceStanza.create({from:'abc', to:'qwe', id:1, type:'get',
                                        show:'bad', status:'OK', priority:1});

            var badPresenceDoc = jslix.build(badPresenceStanza);

            assert.exception(function(){
                jslix.parse(badPresenceDoc, stanzas.PresenceStanza)
            }, 'ElementParseError');
        },
        testJSLixDispatcherSend: function(){
            this.dispatcher.deferreds = {};

            var firstIqStanza = stanzas.IQStanza.create({id:'1', type:'get', from:'abc', to:'qwe'});
            var secondIqStanza = stanzas.IQStanza.create({id:'2', type:'get', from:'abc', to:'qwe'});
            var thirdIqStanza = stanzas.IQStanza.create({id:'3', type:'get', from:'abc', to:'qwe'});


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

            var presenceStanza = stanzas.PresenceStanza.create({from:'abc', to:'qwe', id:'1', type:'get',
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
            var iqHandler = stanzas.IQStanza;
            var testHost = {};

            var resultDefinition = stanzas.IQStanza;

            var definitionIq = new stanzas.Element({node: new fields.StringNode('string_node', false), 
                                                       xmlns:'string_xmlns', 
                                                result_class: resultDefinition},
                                [stanzas.IQStanza]);

            this.dispatcher.addHandler(definitionIq, testHost, 'somename');

            var iqStanza = definitionIq.create({id:'123', type:'get', from:'abc', to:'qwe'});

            this.dispatcher.send(iqStanza);

            var resultStanza = stanzas.IQStanza.create({type:'result', from:'qwe', to:'abc', id:'123'});

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
            assert(resultDoc.from instanceof JID && resultDoc.from.toString() == 'qwe');
            assert(resultDoc.to instanceof JID && resultDoc.to.toString() == 'abc')

            assert.equals(this.dispatcher.deferreds, {});
        },
        testErrorStanzaDispatch: function(){
            var iqStanza = stanzas.IQStanza.create({from:'a', to:'b', type:'error', id:123});

            var iqDoc = jslix.build(iqStanza);

            var test = this;

            refute.exception(function(){
                test.dispatcher.dispatch(iqDoc);
            });
        },
        testMakeResult: function(){
            var definitionIq = new stanzas.Element({xmlns:'iq_xmlns',
                                  element_name:'iq', 
                                  result_class: stanzas.IQStanza
                                 }, [stanzas.IQStanza]);

            var iqStanza = definitionIq.create({from:'a', to:'b', id:1, type:'set'});

            var resultStanza = iqStanza.makeResult({id:2, type:'result'});

            assert(resultStanza.id == 2 && resultStanza.type == 'result');

        },
        testSpecialStanza: function(){
            var special_stanza = stanzas.SpecialStanza.create();
            assert(special_stanza instanceof stanzas.SpecialStanza);
            assert(special_stanza.toString() == '<Special stanza>');
        },
        testEmptyStanza: function(){
            assert(this.dispatcher.connection.count == 0);
            var empty_stanza = stanzas.EmptyStanza.create();
            assert(empty_stanza instanceof stanzas.EmptyStanza);
            assert(empty_stanza.toString() == '<Empty stanza>');
            this.dispatcher.send(empty_stanza);
            assert(this.dispatcher.connection.count == 0);
        },
        testBreakStanza: function(){
            var break_stanza = stanzas.BreakStanza.create(),
                test_def = stanzas.Element({
                    element_name: 'test',
                    handler: function(top){
                        return break_stanza;
                    }
                });
            assert(break_stanza instanceof stanzas.BreakStanza);
            assert(break_stanza.toString() == '<Break stanza>');
            assert(this.dispatcher.connection.count == 0);
            this.dispatcher.addHandler(test_def, this, 'somename');
            this.dispatcher.dispatch(jslix.build(test_def.create()));
            assert(this.dispatcher.connection.count == 0);
        },
        testMultiChildStringNode: function(){
            var definition = new stanzas.Element({
                    xmlns: 'test_ns',
                    element_name: 'test',
                    text: new fields.StringNode('text')
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
            assert(stanzas.PresenceStanza.create() == '<presence xmlns="jabber:client"/>');
        },
        testDifferentNSForElementsWithOneName: function(){
            var definition = new stanzas.Element({
                    element_name: 'element_name',
                    first_some: new fields.StringAttr('some', true, 'first'),
                    second_some: new fields.StringAttr('some', true, 'second')
                }),
                stanza = definition.create({
                    first_some: 'first',
                    second_some: 'second'
                }),
                doc = jslix.build(stanza),
                test = this;
            refute.exception(function(){
                var result = jslix.parse(doc, definition);
                assert(result.first_some == stanza.first_some);
                assert(result.second_some == stanza.second_some);
            });
        }
    });
});
