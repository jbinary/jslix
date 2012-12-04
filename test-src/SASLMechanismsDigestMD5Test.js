SASLMechanismsDigestMD5Test = TestCase('SASLMechanismsDigestMD5Test');

SASLMechanismsDigestMD5Test.prototype.setUp = function(){
    this.connection = {
        lst_stnz: null,
        status: null,
        jid: new jslix.JID('user@server.com'),
        password: 'password',
        send: function(stnz){
            this.lst_stnz = stnz;
        },
        disconnect: function(){
            this.status = 'disconnect';
            return true;
        }
    };
    this.dispatcher = new jslix.dispatcher(this.connection);
    this.digest_md5 = new jslix.sasl.mechanisms['DIGEST-MD5'](this.dispatcher);
}

SASLMechanismsDigestMD5Test.prototype.testResponse = function(){
    this.dispatcher.dispatch(jslix.build(
        jslix.sasl.stanzas.challenge.create({
            content: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Base64.parse(''))
        })
    ));
    var response = this.connection.lst_stnz;
    assertNoException(function(){
        jslix.parse(response, jslix.sasl.stanzas.response);
    });
}

SASLMechanismsDigestMD5Test.prototype.testGetFirstResponse = function(){
    var response = this.digest_md5.getFirstResponse('some_cnonce');
    assertNotUndefined(response.content);
    assertEquals('dXNlcm5hbWU9InVzZXIiLHJlYWxtPSJzZXJ2ZXIuY29tIixub25jZT0idW5kZWZpbmVkIixjbm9uY2U9InNvbWVfY25vbmNlIixuYz0iMDAwMDAwMDEiLHFvcD1hdXRoLGRpZ2VzdC11cmk9InhtcHAvc2VydmVyLmNvbSIscmVzcG9uc2U9IjkyZWJhMzFkN2NjNzJhNTViMzlkMTZmYjBiYzMwNDRmIixjaGFyc2V0PSJ1dGYtOCI=', response.content);
}

SASLMechanismsDigestMD5Test.prototype.testGetSecondResponse = function(){
    this.digest_md5._challenge['cnonce'] = 'some_cnonce';
    this.digest_md5._challenge['rspauth'] = 'dcd07b6b671d60735cac1c3b8787ea16';
    var response = jslix.build(this.digest_md5.getSecondResponse());
    assertNoException(function(){
        jslix.parse(response, jslix.sasl.stanzas.response);
    });
    assertNull(this.connection.status);
    this.digest_md5._challenge['rspauth'] = 'wrong rspauth';
    response = this.digest_md5.getSecondResponse();
    assertTrue(response);
    assertEquals('disconnect', this.connection.status);
}
