define(['jslix/common', 'jslix/stanzas', 'jslix/dispatcher', 'jslix/sasl', 'libs/jquery'],
    function(jslix, stanzas, Dispatcher, SASL, $){
    buster.testCase('DispatcherTest', {
        setUp: function(){
            this.dispatcher = new Dispatcher();
            this.dispatcher.connection = {
                last_stanza: null,
                send: function(stanza){
                    this.last_stanza = stanza;
                }
            }
            this.get_iq_settings = function(type){
                return {
                    id: stanzas.randomUUID(),
                    to: 'to_jid',
                    from: 'from_jid',
                    type: type || 'get'
                };
            };
        },
        testAddHook: function(){
            assert(this.dispatcher.hooks['stub'] == undefined);
            this.dispatcher.addHook('stub', function(){
                return stub;
            }, {stub: 'stub'}, 'stub');
            assert.isArray(this.dispatcher.hooks['stub']);
            assert(this.dispatcher.hooks['stub'].length == 1);
        },
        testUnregisterPlugin: function(){
            var plugin = SASL,
                name = SASL.prototype._name;
            this.dispatcher.registerPlugin(plugin);
            assert(name in this.dispatcher.plugins);
            this.dispatcher.addHook('stub', function(){
                return stub;
            }, {stub: 'stub'}, name);
            this.dispatcher.unregisterPlugin(plugin);
            refute(name in this.dispatcher.plugins);
            refute(this.dispatcher.handlers.lenght && this.dispatcher.top_handlers.lenght);
        },
        testCheckHooks: function(){
            var definition = stanzas.Element({
                    getHandler: function(el){
                        el.id = this.id;
                        return el;
                    }
                }, [stanzas.IQStanza]),
                iq_settings = this.get_iq_settings(),
                context = {
                    id: stanzas.randomUUID()
                },
                result;
            this.dispatcher.addHook('send', definition, context, 'fake_plugin');
            result = this.dispatcher.check_hooks(
                definition.create(iq_settings)
            );
            assert(result.__definition__ && result.__definition__ === definition);
            assert(result.id == context.id);
            this.dispatcher.unregisterPlugin({ prototype: {_name: 'fake_plugin'}});
            assert.isArray(this.dispatcher.hooks['send']);
            assert(this.dispatcher.hooks['send'].length == 0);
            this.dispatcher.addHook('send', {}, {}, 'fake_plugin');
            result = this.dispatcher.check_hooks(definition.create(iq_settings));
            assert(result.__definition__ && result.__definition__ === definition);
            assert(function(){
                for(var key in iq_settings){
                    if(iq_settings[key] != result[key]){
                        return false;
                    }
                }
                return true;
            }());
        },
        testCanErrorCases: function(){
            var deferred = $.Deferred(),
                iq_settings = this.get_iq_settings('result');
            this.dispatcher.deferreds[iq_settings.id] = [deferred, {
                __definition__: {
                    result_class: stanzas.MessageStanza
                }
            }];
            this.dispatcher.dispatch(jslix.build(stanzas.IQStanza.create(iq_settings)));
            assert(deferred.state() == 'rejected');
            assert.equals(this.dispatcher.deferreds, {})
            deferred = $.Deferred();
            this.dispatcher.deferreds[iq_settings.id] = [deferred, {
                __definition__: {}
            }];
            this.dispatcher.dispatch(jslix.build(stanzas.IQStanza.create(iq_settings)));
            assert(deferred.state() == 'resolved');
            assert.equals(this.dispatcher.deferreds, {});
            deferred = $.Deferred();
            iq_settings = this.get_iq_settings('error');
            this.dispatcher.deferreds[iq_settings.id] = [deferred, {
                __definition__: {}
            }];
            this.dispatcher.dispatch(jslix.build(stanzas.IQStanza.create(iq_settings)));
            assert(deferred.state() == 'rejected');
        }
    });
});
