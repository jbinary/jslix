SASLMechanismsPlainTest = TestCase('SASLMechanismsPlainTest');

SASLMechanismsPlainTest.prototype.setUp = function(){
    this.connection = {
        jid: new jslix.JID('user@server.com'),
        password: 'password'
    }
    this.dispatcher = new jslix.dispatcher(this.connection);
    this.plain = new jslix.sasl.mechanisms['PLAIN'](this.dispatcher);
}

SASLMechanismsPlainTest.prototype.testAuth = function(){
    var stanza = this.plain.auth(),
        jid = this.connection.jid,
        password = this.connection.password;
    assertNotUndefined(stanza.content);
    assertEquals('dXNlckBzZXJ2ZXIuY29tAHVzZXIAcGFzc3dvcmQ=', stanza.content);
}
