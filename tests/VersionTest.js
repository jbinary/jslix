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
    testEqualityName: function(){
        var version = this.dispatcher.registerPlugin(jslix.version);
        version.setName('some_name');
        assert(version.getName() == 'some_name');
    },
    testResponse: function(){
        var version = this.dispatcher.registerPlugin(jslix.version),
            request = jslix.stanzas.iq.create({
                type: 'get',
                to: 'user@server.com',
                link: jslix.version.stanzas.request.create()
            }),
            test = this,
            stanza;
        this.dispatcher.dispatch(jslix.build(request));
        assert.exception(function(){
            jslix.parse(test.connection.lst_stnz, jslix.version.stanzas.response);
        });
        refute.exception(function(){
            stanza = jslix.parse(test.connection.lst_stnz, jslix.stanzas.error);
        });
        assert(stanza.type == 'cancel' && stanza.condition == 'feature-not-implemented');
        version.init('some_name', 'some_version');
        request.id = 'some_id_1';
        this.dispatcher.dispatch(jslix.build(request));
        refute.exception(function(){
            stanza = jslix.parse(test.connection.lst_stnz, jslix.version.stanzas.response);
        });
        assert(stanza.name == 'some_name' && stanza.version == 'some_version');
    }
});
