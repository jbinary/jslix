var VersionTest = buster.testCase("VersionTest", {
    setUp: function(){
        this.connection = {
            lst_stnz: null,
            send: function(doc){
                this.lst_stnz = doc;
            }
        };
        this.dispatcher = new jslix.dispatcher(this.connection);
        this.options = {
            name: 'Deadushka Moroz',
            version: '1.0'
        };
    },
    testInitVersion: function(){
        var version,
            test = this;

        refute.exception(function(){
            version = test.dispatcher.registerPlugin(jslix.version, test.options);
        });

        refute.exception(function(){
            version.init()
        });

        assert(version.getName() == 'Deadushka Moroz');
        assert(version.getVersion() ==  "1.0");
    },
    testGet: function(){
        var version = this.dispatcher.registerPlugin(jslix.version, this.options),
            jid = new jslix.JID('posoh@urta'),
            test = this,
            stanza;
        version.init();

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
        var version = this.dispatcher.registerPlugin(jslix.version, this.options);
        version.setName('some_name');
        assert(version.getName() == 'some_name');
    },
    testResponse: function(){
        var version = this.dispatcher.registerPlugin(jslix.version, this.options),
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
        version.init();
        request.id = 'some_id_1';
        this.dispatcher.dispatch(jslix.build(request));
        refute.exception(function(){
            stanza = jslix.parse(test.connection.lst_stnz, jslix.version.stanzas.response);
        });
        assert(stanza.name == 'Deadushka Moroz' && stanza.version == '1.0');
    }
});
