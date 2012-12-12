var VersionTest = buster.testCase("VersionTest", {
    setUp: function(){
        this.connection = {
            lst_stnz: null,
            send: function(doc){
                this.lst_stnz = doc;
            }
        };
        this.dispatcher = new jslix.dispatcher(this.connection);
    },
    testInitVersion: function(){
        var version,
            test = this;

        refute.exception(function(){
            version = test.dispatcher.registerPlugin(jslix.version);
        });

        refute.exception(function(){
            version.init('Deadushka Moroz', '1.0');
        });

        assert(version.getName() == 'Deadushka Moroz');
        assert(version.getVersion() ==  "1.0");
    },
    testGet: function(){
        var version = this.dispatcher.registerPlugin(jslix.version),
            jid = new jslix.JID('posoh@urta'),
            test = this,
            stanza;
        version.init('Deadushka Moroz', '2.0');

        refute.exception(function(){
            version.get(jid);
        });

        refute(this.connection.lst_stnz == null);

        refute.exception(function(){
            stanza = jslix.parse(test.connection.lst_stnz, jslix.version.stanzas.response);
        });

        refute(stanza.parent == undefined);

        refute(stanza.parent.id == undefined);

        assert(stanza.parent.id in this.dispatcher.deferreds);

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
