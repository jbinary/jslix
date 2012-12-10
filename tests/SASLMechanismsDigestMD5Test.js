var SASLMechanismsDigestMD5Test = buster.testCase('SASLMechanismsDigestMD5Test', {
    setUp: function(){
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
    },
    testResponse: function(){
        this.dispatcher.dispatch(jslix.build(
            jslix.sasl.stanzas.challenge.create({
                content: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Base64.parse(''))
            })
        ));
        var response = this.connection.lst_stnz;
        refute.exception(function(){
            jslix.parse(response, jslix.sasl.stanzas.response);
        });
    },
    testGetFirstResponse: function(){
        var response = this.digest_md5.getFirstResponse('some_cnonce');
        assert(response.content != undefined);
        assert(response.content == 'dXNlcm5hbWU9InVzZXIiLHJlYWxtPSJzZXJ2ZXIuY29tIixub25jZT0idW5kZWZpbmVkIixjbm9uY2U9InNvbWVfY25vbmNlIixuYz0iMDAwMDAwMDEiLHFvcD1hdXRoLGRpZ2VzdC11cmk9InhtcHAvc2VydmVyLmNvbSIscmVzcG9uc2U9IjkyZWJhMzFkN2NjNzJhNTViMzlkMTZmYjBiYzMwNDRmIixjaGFyc2V0PSJ1dGYtOCI=');
    },
    testGetSecondResponse: function(){
        this.digest_md5._challenge['cnonce'] = 'some_cnonce';
        this.digest_md5._challenge['rspauth'] = 'dcd07b6b671d60735cac1c3b8787ea16';
        var response = jslix.build(this.digest_md5.getSecondResponse());
        refute.exception(function(){
            jslix.parse(response, jslix.sasl.stanzas.response);
        });
        assert(this.connection.status == null);
        this.digest_md5._challenge['rspauth'] = 'wrong rspauth';
        response = this.digest_md5.getSecondResponse();
        assert(response);
        assert(this.connection.status == 'disconnect');
    }
});
