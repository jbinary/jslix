var SASLTest = buster.testCase('SASLTest', {
    setUp: function(){
        this.connection = {
            status: null
        };
        this.dispatcher = new jslix.dispatcher(this.connection);
        this.sasl = new jslix.sasl(this.dispatcher);
    },
    testGenerateRandomString: function(){
        var value = jslix.sasl.generate_random_string();
        assert(value.length == 14);
        assert(jslix.sasl.generate_random_string() != value);
    },
    testSuccess: function(){
        this.dispatcher.dispatch(jslix.build(
            this.sasl.SuccessStanza.create()
        ));
        assert(this.sasl.deferred.state() == 'resolved');
    },
    testMechanisms: function(){
        var connection = this.connection;
        jslix.sasl.mechanisms['fake'] = function(dispatcher){
            this.auth = function(){
                connection.status = 'auth';
            }
        };
        this.dispatcher.dispatch(jslix.build(
            jslix.stanzas.features.create({
                link: this.sasl.MechanismsStanza.create({
                    mechanisms: ['fake']
                })
            })
        ));
        assert(this.connection.status == 'auth');
    }
});
