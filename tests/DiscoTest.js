var DiscoTest = buster.testCase('DiscoTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
        this.disco_plugin = this.dispatcher.registerPlugin(jslix.disco);
        this.disco_plugin.init();
        this.dispatcher.connection = {
            last_stanza: null,
            send: function(stanza){
                this.last_stanza = stanza;
            }
        }
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
            jslix.disco.stanzas.request.create({
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
            jslix.disco.stanzas.request.create()
        );
        this.disco_plugin.registerIdentity(
            jslix.disco.stanzas.identity.create({
                category: 'client',
                name: 'jslix',
                type: 'web'
            })
        );
        this.dispatcher.dispatch(jslix.build(request));
        refute.exception(function(){
            result = jslix.parse(test.dispatcher.connection.last_stanza,
                jslix.disco.stanzas.response);
        });
        assert(result.xmlns != jslix.disco.DISCO_NS);
        refute.exception(function(){
            result = jslix.parse(test.dispatcher.connection.last_stanza,
                jslix.disco.stanzas.identity);
        });
        assert(result.category == 'client' && result.name == 'jslix' && result.type == 'web');
        refute.exception(function(){
            result = jslix.parse(test.dispatcher.connection.last_stanza,
                jslix.disco.stanzas.feature);
        });
        assert(result.feature_var == jslix.disco.DISCO_NS);
    }
});
