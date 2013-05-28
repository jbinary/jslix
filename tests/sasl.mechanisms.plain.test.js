define(['jslix/jid', 'jslix/dispatcher', 'jslix/sasl', 'jslix/sasl.mechanisms.plain'],
    function(JID, Dispatcher, SASL){
    buster.testCase('SASLMechanismsPlainTest', {
        setUp: function(){
            this.connection = {
                jid: new JID('user@server.com'),
                password: 'password'
            }
            this.dispatcher = new Dispatcher(this.connection);
            this.plain = new SASL.mechanisms['PLAIN'](this.dispatcher);
        },
        testAuth: function(){
            var stanza = this.plain.auth(),
                jid = this.connection.jid,
                password = this.connection.password;
            assert(stanza.content != undefined);
            assert(stanza.content == 'dXNlckBzZXJ2ZXIuY29tAHVzZXIAcGFzc3dvcmQ=');
        }
    });
});
