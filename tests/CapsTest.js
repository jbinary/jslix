var CapsTest = buster.testCase('CapsTest', {
    setUp: function(){
        var fake_connection = {
            constructor: {
                signals: {
                    disconnect: {
                        add: function(){}
                    }
                }
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
            disco_plugin = this.disco_plugin;
        refute.exception(function(){
            dispatcher.registerPlugin(jslix.caps, {
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
    }
});
