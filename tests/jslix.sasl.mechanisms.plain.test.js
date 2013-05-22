var SASLMechanismsPlainTest = buster.testCase('SASLMechanismsPlainTest', {
    setUp: function(){
        this.connection = {
            jid: new jslix.JID('user@server.com'),
            password: 'password'
        }
        this.dispatcher = new jslix.Dispatcher(this.connection);
        this.plain = new jslix.SASL.mechanisms['PLAIN'](this.dispatcher);
    },
    testAuth: function(){
        var stanza = this.plain.auth(),
            jid = this.connection.jid,
            password = this.connection.password;
        assert(stanza.content != undefined);
        assert(stanza.content == 'dXNlckBzZXJ2ZXIuY29tAHVzZXIAcGFzc3dvcmQ=');
    }
});
