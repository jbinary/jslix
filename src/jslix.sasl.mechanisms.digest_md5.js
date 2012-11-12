(function(){

    var jslix = window.jslix;

    jslix.sasl.mechanisms['DIGEST-MD5']= function(dispatcher){
        if(jslix.sasl === undefined)
            throw Error('Load sasl plugin first.');
        this._dispatcher = dispatcher;
        this._challenge = {};
        this._dispatcher.addTopHandler(jslix.sasl.mechanisms['DIGEST-MD5'].stanzas.challenge, this);
    }

    jslix.sasl.mechanisms['DIGEST-MD5'].stanzas = {};

    jslix.sasl.mechanisms['DIGEST-MD5'].stanzas.challenge = jslix.Element({
        handler: function(host, top){
            var hash = b64decode(host.content),
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
    }, [jslix.sasl.stanzas.challenge]);

    jslix.sasl.mechanisms['DIGEST-MD5'].prototype.auth = function(){
        return jslix.sasl.stanzas.auth.create({
            mechanism: 'DIGEST-MD5'
        });
    }

    jslix.sasl.mechanisms['DIGEST-MD5'].prototype.getFirstResponse  = function(){
        this._challenge['digest-uri'] = 'xmpp/' + this._dispatcher.connection.jid.getDomain();
        this._challenge['cnonce'] = cnonce(14);
        this._challenge['nc'] = '00000001';
        var a1_sub_params_1 = str_md5([
                this._dispatcher.connection.jid.getNode(),
                this._dispatcher.connection.jid.getDomain(),
                this._dispatcher.connection.password].join(':')),
            a1_sub_params_2 = [
                this._challenge['nonce'],
                this._challenge['cnonce']].join(':'),
            a1 = a1_sub_params_1 + ':' + a1_sub_params_2,
            a2 = 'AUTHENTICATE:' + this._challenge['digest-uri'],
            response = hex_md5([
                hex_md5(a1),
                this._challenge['nonce'],
                this._challenge['nc'],
                this._challenge['cnonce'],
                'auth',
                hex_md5(a2)].join(':')),
            content = binb2b64(str2binb([
                'username="' + this._dispatcher.connection.jid.getNode() + '"',
                'realm="' + this._dispatcher.connection.jid.getDomain() + '"',
                'nonce="' + this._challenge['nonce'] + '"',
                'cnonce="' + this._challenge['cnonce'] + '"',
                'nc="' + this._challenge['nc'] + '"',
                'qop=auth',
                'digest-uri="' + this._challenge['digest-uri'] + '"',
                'response="' + response + '"',
                'charset="utf-8"'].join(',')));

        return jslix.sasl.stanzas.response.create({
            content: content
        });
    }

    jslix.sasl.mechanisms['DIGEST-MD5'].prototype.getSecondResponse = function(){
        var a1_sub_params_1 = str_md5([
                this._dispatcher.connection.jid.getNode(),
                this._dispatcher.connection.jid.getDomain(),
                this._dispatcher.connection.password].join(':')),
            a1_sub_params_2 = [
                this._challenge['nonce'],
                this._challenge['cnonce']].join(':'),
            a1 = a1_sub_params_1 + ':' + a1_sub_params_2,
            a2 = ':' + this._challenge['digest-uri'],
            rsptest = hex_md5([
                    hex_md5(a1),
                    this._challenge['nonce'],
                    this._challenge['nc'],
                    this._challenge['cnonce'],
                    'auth',
                    hex_md5(a2)].join(':'));
        if(rsptest != this._challenge['rspauth'])
            this._dispatcher.connection.disconnect();
        return jslix.sasl.stanzas.response.create();

    }

})();
