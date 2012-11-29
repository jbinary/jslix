VersionTest = new TestCase("VersionTest");

VersionTest.prototype.setUp = function(){
    this.dispatcher = new jslix.dispatcher();
}

VersionTest.prototype.testInitVersion = function(){
    var version,
        test = this;

    assertNoException(function(){
                        version = new jslix.version(test.dispatcher);
                        });

    assertNoException(function(){
                        version.init('Deadushka Moroz', '1.0');
                        });

    assertEquals(version.getName(), 'Deadushka Moroz');
    assertEquals(version.getVersion(), "1.0");
};

VersionTest.prototype.testGet = function(){
    var version = new jslix.version(this.dispatcher);
    version.init('Deadushka Moroz', '2.0');

    var jid = new jslix.JID("posoh@urta");
    var requestId;

    var dummyFunction = { send: function(doc)
                    {
                        var parsedStanza = jslix.parse(doc, jslix.version.stanzas.response);
                        requestId = parsedStanza.parent.id;
                    }
                }

    this.dispatcher.connection  = dummyFunction;

    assertNoException(function(){
                            version.get(jid);
                        });

    assertTrue(requestId in this.dispatcher.deferreds);

};

VersionTest.prototype.testEqualityNames = function(){
    var version1 = new jslix.version(this.dispatcher);
    var version2 = new jslix.version(this.dispatcher);

    version1.setName('v1');
    version2.setName('v2');

    assertEquals(version1.getName(), 'v1');
    assertEquals(version2.getName(), 'v2');
};
