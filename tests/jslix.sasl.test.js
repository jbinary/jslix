var SASLTest = buster.testCase('SASLTest', {
    setUp: function(){
        this.connection = {
            status: null
        };
        this.dispatcher = new jslix.Dispatcher(this.connection);
        this.sasl = new jslix.SASL(this.dispatcher);
    },
    testGenerateRandomString: function(){
        var value = jslix.SASL.generate_random_string();
        assert(value.length == 14);
        assert(jslix.SASL.generate_random_string() != value);
    },
    testSuccess: function(){
        this.dispatcher.dispatch(jslix.build(
            this.sasl.SuccessStanza.create()
        ));
        assert(this.sasl.deferred.state() == 'resolved');
    },
    testMechanisms: function(){
        var connection = this.connection;
        jslix.SASL.mechanisms['fake'] = function(dispatcher){
            this.auth = function(){
                connection.status = 'auth';
            }
        };
        this.dispatcher.dispatch(jslix.build(
            jslix.stanzas.FeaturesStanza.create({
                link: this.sasl.MechanismsStanza.create({
                    mechanisms: ['fake']
                })
            })
        ));
        assert(this.connection.status == 'auth');
    }
});
