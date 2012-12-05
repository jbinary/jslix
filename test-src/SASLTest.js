SASLTest = TestCase('SASLTest');

SASLTest.prototype.setUp = function(){
    this.connection = {
        status: null,
        restart: function(){
            this.status = 'restart';
            return jslix.stanzas.break_stanza.create();
        }
    };
    this.dispatcher = new jslix.dispatcher(this.connection);
    this.sasl = new jslix.sasl(this.dispatcher);
}

SASLTest.prototype.testGenerateRandomString = function(){
    var value = jslix.sasl.generate_random_string();
    assertEquals(14, value.length);
    assertNotEquals(value, jslix.sasl.generate_random_string());
}

SASLTest.prototype.testSuccess = function(){
    this.dispatcher.dispatch(jslix.build(
        jslix.sasl.stanzas.success.create()
    ));
    assertEquals('restart', this.connection.status);
}

SASLTest.prototype.testMechanisms = function(){
    var connection = this.connection;
    jslix.sasl.mechanisms['fake'] = function(dispatcher){
        this.auth = function(){
            connection.status = 'auth';
        }
    };
    this.dispatcher.dispatch(jslix.build(
        jslix.stanzas.features.create({
            link: jslix.sasl.stanzas.mechanisms.create({
                mechanisms: ['fake']
            })
        })
    ));
    assertEquals('auth', this.connection.status);
}
