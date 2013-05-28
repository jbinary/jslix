define(['jslix/common', 'jslix/stanzas', 'jslix/dispatcher', 'jslix/sasl'],
    function(jslix, stanzas, Dispatcher, SASL){
    buster.testCase('SASLTest', {
        setUp: function(){
            this.connection = {
                status: null
            };
            this.dispatcher = new Dispatcher(this.connection);
            this.sasl = new SASL(this.dispatcher);
        },
        testGenerateRandomString: function(){
            var value = SASL.generate_random_string();
            assert(value.length == 14);
            assert(SASL.generate_random_string() != value);
        },
        testSuccess: function(){
            this.dispatcher.dispatch(jslix.build(
                this.sasl.SuccessStanza.create()
            ));
            assert(this.sasl.deferred.state() == 'resolved');
        },
        testMechanisms: function(){
            var connection = this.connection;
            SASL.mechanisms['fake'] = function(dispatcher){
                this.auth = function(){
                    connection.status = 'auth';
                }
            };
            this.dispatcher.dispatch(jslix.build(
                stanzas.FeaturesStanza.create({
                    link: this.sasl.MechanismsStanza.create({
                        mechanisms: ['fake']
                    })
                })
            ));
            assert(this.connection.status == 'auth');
        }
    });
});
