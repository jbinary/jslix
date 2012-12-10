var VersionTest = buster.testCase("VersionTest", {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
    },
    testInitVersion: function(){
        var version,
            test = this;

        refute.exception(function(){
                            version = new jslix.version(test.dispatcher);
                            });

        refute.exception(function(){
                            version.init('Deadushka Moroz', '1.0');
                            });

        assert(version.getName() == 'Deadushka Moroz');
        assert(version.getVersion() ==  "1.0");
    },
    testGet: function(){
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

        refute.exception(function(){
                                version.get(jid);
                            });

        assert(requestId in this.dispatcher.deferreds);

    },
    testEqualityNames: function(){
        var version1 = new jslix.version(this.dispatcher);
        var version2 = new jslix.version(this.dispatcher);

        version1.setName('v1');
        version2.setName('v2');

        assert(version1.getName() == 'v1');
        assert(version2.getName() == 'v2');
    }
});
