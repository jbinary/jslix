define(['jslix/caps', 'jslix/disco', 'jslix/dispatcher', 'libs/signals'],
    function(Caps, Disco, Dispatcher, signals){
    buster.testCase('CapsTest', {
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
            this.fake_storage = {
                _data: {},
                setItem: function(key, value){
                    this._data[key] = value;
                },
                getItem: function(key){
                    return this._data[key] || null;
                }
            };
            this.dispatcher = new Dispatcher(fake_connection);
            this.disco_plugin = this.dispatcher.registerPlugin(Disco);
            this.disco_plugin.init();
        },
        testException: function(){
            var dispatcher = this.dispatcher;
            assert.exception(function(){
                dispatcher.registerPlugin(Caps);
            });
        },
        testNoException: function(){
            var dispatcher = this.dispatcher,
                disco_plugin = this.disco_plugin,
                fake_storage = this.fake_storage,
                caps_plugin;
            refute.exception(function(){
                caps_plugin = dispatcher.registerPlugin(Caps, {
                    'disco_plugin': disco_plugin,
                    'storage': fake_storage
                });
            });
        },
        testVerificationString: function(){
            /*
                This test use some data from XEP-0115
                Link: http://xmpp.org/extensions/xep-0115.html#howitworks
            */
            var caps_plugin = this.dispatcher.registerPlugin(Caps, {
                    'disco_plugin': this.disco_plugin,
                    'storage': this.fake_storage
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
            var caps_plugin = this.dispatcher.registerPlugin(Caps, {
                disco_plugin: this.disco_plugin,
                storage: this.fake_storage
            });
            this.spy(caps_plugin, 'destructor');
            this.dispatcher.unregisterPlugin(Caps);
            assert.called(caps_plugin.destructor);
        },
        testDisconnectHandler: function(){
            var caps_plugin = this.dispatcher.registerPlugin(Caps, {
                disco_plugin: this.disco_plugin,
                storage: this.fake_storage
            });
            caps_plugin._broken_nodes.push('some');
            assert(caps_plugin._broken_nodes.length == 1);
            this.dispatcher.connection.signals.disconnect.dispatch();
            assert(caps_plugin._broken_nodes.length == 0);
        },
        testGetJIDFeatures: function(){
            var caps_plugin = this.dispatcher.registerPlugin(Caps, {
                    disco_plugin: this.disco_plugin,
                    storage: this.fake_storage
                });
            var result = caps_plugin.getJIDFeatures('some@server/res');
            assert(result == null);
        }
    });
});
