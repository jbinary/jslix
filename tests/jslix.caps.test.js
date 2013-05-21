var CapsTest = buster.testCase('CapsTest', {
    setUp: function(){
        var fake_connection = {
                signals: {
                    disconnect: new signals.Signal()
                },
            last_stanza: null,
            send: function(stanza){
                this.last_stanza = stanza;
            }
        };
        this.dispatcher = new jslix.dispatcher(fake_connection);
        this.disco_plugin = this.dispatcher.registerPlugin(jslix.disco);
        this.disco_plugin.init();
    },
    testException: function(){
        var dispatcher = this.dispatcher;
        assert.exception(function(){
            dispatcher.registerPlugin(jslix.caps);
        });
    },
    testNoException: function(){
        var dispatcher = this.dispatcher,
            disco_plugin = this.disco_plugin,
            caps_plugin;
        refute.exception(function(){
            caps_plugin = dispatcher.registerPlugin(jslix.caps, {
                'disco_plugin': disco_plugin
            });
        });
    },
    testVerificationString: function(){
        /*
            This test use some data from XEP-0115
            Link: http://xmpp.org/extensions/xep-0115.html#howitworks
        */
        var caps_plugin = this.dispatcher.registerPlugin(jslix.caps, {
                'disco_plugin': this.disco_plugin 
            }),
            valid_verification_string = 'QgayPKawpkPSDYmwT/WM94uAlu0=';
            this.disco_plugin.registerIdentity('client', 'pc', 'Exodus 0.9.1');
            this.disco_plugin.registerFeature(
                'http://jabber.org/protocol/muc');

        assert(
            caps_plugin.getVerificationString() == valid_verification_string
        );
    },
    testDestructor: function(){
        var caps_plugin = this.dispatcher.registerPlugin(jslix.caps, {
            disco_plugin: this.disco_plugin
        });
        this.spy(caps_plugin, 'destructor');
        this.dispatcher.unregisterPlugin(jslix.caps);
        assert.called(caps_plugin.destructor);
    },
    testDisconnectHandler: function(){
        var caps_plugin = this.dispatcher.registerPlugin(jslix.caps, {
            disco_plugin: this.disco_plugin
        });
        caps_plugin._broken_nodes.push('some');
        assert(caps_plugin._broken_nodes.length == 1);
        this.dispatcher.connection.signals.disconnect.dispatch();
        assert(caps_plugin._broken_nodes.length == 0);
    },
    testGetJIDFeatures: function(){
        var caps_plugin = this.dispatcher.registerPlugin(jslix.caps, {
                disco_plugin: this.disco_plugin,
                storage: sessionStorage
            });
        var result = caps_plugin.getJIDFeatures('some@server/res');
        assert(result == null);
    }
});
