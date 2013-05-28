"use strict";
define(['jslix/stanzas', 'jslix/sasl', 'cryptojs/core',
        'cryptojs/enc-base64', 'cryptojs/md5'],
    function(stanzas, SASL, CryptoJS){

    var auth_plugin = function(dispatcher){
        this._dispatcher = dispatcher;
        this._challenge = {
            'digest-uri': 'xmpp/' + this._dispatcher.connection.jid.getDomain(),
            'nc': '00000001'
        };
        this._dispatcher.addHandler(this.ChallengeStanza, this);
    }

    SASL.mechanisms['DIGEST-MD5'] = auth_plugin;

    var digest_md5 = auth_plugin.prototype;

    digest_md5.ChallengeStanza = stanzas.Element({
        handler: function(top){
            var hash = CryptoJS.enc.Latin1.stringify(CryptoJS.enc.Base64.parse(top.content)),
                params = hash.split(',');
            for(var i=0; i<params.length; i++){
                var el = params[i].replace(/"/g, '').split('='),
                    key = el[0],
                    value = el[1];
                this._challenge[key] = value;
            }
            if(this._challenge['rspauth'] === undefined)
                return this.getFirstResponse();
            else
                return this.getSecondResponse();
        }
    }, [SASL.prototype.ChallengeStanza]);

    digest_md5.auth = function(){
        return SASL.prototype.AuthStanza.create({
            mechanism: 'DIGEST-MD5'
        });
    }

    digest_md5.getFirstResponse  = function(cnonce){
        this._challenge['cnonce'] = cnonce || SASL.generate_random_string();
        var a1_sub_params_1 = CryptoJS.MD5([
                this._dispatcher.connection.jid.getNode(),
                this._dispatcher.connection.jid.getDomain(),
                this._dispatcher.connection.password].join(':')).toString(CryptoJS.enc.Latin1),
            a1_sub_params_2 = [
                this._challenge['nonce'],
                this._challenge['cnonce']].join(':'),
            a1 = a1_sub_params_1 + ':' + a1_sub_params_2,
            a2 = 'AUTHENTICATE:' + this._challenge['digest-uri'],
            response = CryptoJS.MD5([
                CryptoJS.MD5(CryptoJS.enc.Latin1.parse(a1)).toString(CryptoJS.enc.Hex),
                this._challenge['nonce'],
                this._challenge['nc'],
                this._challenge['cnonce'],
                'auth',
                CryptoJS.MD5(a2).toString(CryptoJS.enc.Hex)].join(':')).toString(CryptoJS.enc.Hex),
            content = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Latin1.parse([
                'username="' + this._dispatcher.connection.jid.getNode() + '"',
                'realm="' + this._dispatcher.connection.jid.getDomain() + '"',
                'nonce="' + this._challenge['nonce'] + '"',
                'cnonce="' + this._challenge['cnonce'] + '"',
                'nc="' + this._challenge['nc'] + '"',
                'qop=auth',
                'digest-uri="' + this._challenge['digest-uri'] + '"',
                'response="' + response + '"',
                'charset="utf-8"'].join(',')));

        return SASL.prototype.ResponseStanza.create({
            content: content
        });
    }

    digest_md5.getSecondResponse = function(){
        var a1_sub_params_1 = CryptoJS.MD5([
                this._dispatcher.connection.jid.getNode(),
                this._dispatcher.connection.jid.getDomain(),
                this._dispatcher.connection.password].join(':')).toString(CryptoJS.enc.Latin1),
            a1_sub_params_2 = [
                this._challenge['nonce'],
                this._challenge['cnonce']].join(':'),
            a1 = a1_sub_params_1 + ':' + a1_sub_params_2,
            a2 = ':' + this._challenge['digest-uri'],
            rsptest = CryptoJS.MD5([
                    CryptoJS.MD5(CryptoJS.enc.Latin1.parse(a1)).toString(CryptoJS.enc.Hex),
                    this._challenge['nonce'],
                    this._challenge['nc'],
                    this._challenge['cnonce'],
                    'auth',
                    CryptoJS.MD5(a2).toString(CryptoJS.enc.Hex)].join(':')).toString(CryptoJS.enc.Hex),
            valid = rsptest == this._challenge['rspauth'];
            this._challenge['rspauth'] = undefined;
        return valid ? SASL.prototype.ResponseStanza.create({content: ''}) : this._dispatcher.connection.disconnect();

    }

    return auth_plugin;

});
