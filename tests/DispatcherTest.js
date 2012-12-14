var DispatcherTest = buster.testCase('DispatcherTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
    },
    testUnregisterPlugin: function(){
        var plugin = jslix.sasl;
        this.dispatcher.registerPlugin(plugin);
        assert(plugin._name in this.dispatcher.plugins);
        this.dispatcher.unregisterPlugin(plugin);
        refute(plugin._name in this.dispatcher.plugins);
        refute(this.dispatcher.handlers.lenght && this.dispatcher.top_handlers.lenght);
    }
});
