var DiscoTest = buster.testCase('DiscoTest', {
    setUp: function(){
        var fake_connection = {
            last_stanza: null,
            send: function(stanza){
                this.last_stanza = stanza;
            }
        };
        this.dispatcher = new jslix.dispatcher(fake_connection);
        this.disco_plugin = this.dispatcher.registerPlugin(jslix.disco);
        this.disco_plugin.init();
        this.request = jslix.stanzas.iq.create({
            from: 'some_jid1',
            to: 'some_jid2',
            type: 'get',
            id: 'disco1'
        });
    },
    testError: function(){
        var request = this.request,
            test = this,
            result;
        request.link(
            this.disco_plugin.RequestStanza.create({
                node: 'test_node'
            })
        );
        this.dispatcher.dispatch(jslix.build(request));
        refute.exception(function(){
            result = jslix.parse(test.dispatcher.connection.last_stanza,
                jslix.stanzas.error);
        });
        assert(result.condition == 'item-not-found');
    },
    testResponse: function(){
        var request = this.request,
            test = this,
            result;
        request.link(
            this.disco_plugin.RequestStanza.create()
        );
        this.disco_plugin.registerIdentity('client', 'web', 'jslix');
        this.dispatcher.dispatch(jslix.build(request));
        refute.exception(function(){
            result = jslix.parse(test.dispatcher.connection.last_stanza,
                test.disco_plugin.ResponseStanza);
        });
        assert(result.xmlns != this.disco_plugin.DISCO_INFO_NS);
        assert(result.identities.length == 1);
        var identitie = result.identities[0];
        assert(identitie.category == 'client' && identitie.name == 'jslix' && identitie.type == 'web');
        assert(result.features.length == 2);
        var valid_features = [this.disco_plugin.DISCO_INFO_NS,
            this.disco_plugin.DISCO_ITEMS_NS];
        for(var i=0; i<result.features.length; i++){
            var feature = result.features[i];
            assert(valid_features.indexOf(feature.feature_var) !== -1);
        }
    }
});
