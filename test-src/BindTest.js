BindTest = TestCase('BindTest');

BindTest.prototype.setUp = function(){
    this.dispatcher = new jslix.dispatcher();
    this.dispatcher.connection = {
        lst_stnz: null,
        send: function(doc){
            this.lst_stnz = doc;
        },
        jid: new jslix.JID('test@server.com')
    }
    this.bind = new jslix.bind(this.dispatcher);
}

BindTest.prototype.testRestartResult = function(){
    var restart_result = jslix.stanzas.features.create({
        link: jslix.bind.stanzas.base.create({})
    });
    this.dispatcher.dispatch(jslix.build(restart_result));
    var stnz = this.dispatcher.connection.lst_stnz;
    assertNoException(function(){
        jslix.parse(stnz, jslix.bind.stanzas.request);
    });
}

BindTest.prototype.testResponse = function(){
    var old_jid = this.dispatcher.connection.jid,
        server_response = jslix.stanzas.iq.create({
            type: 'set',
            link: jslix.bind.stanzas.response.create({
                jid: 'new_jid@server.com/res'
            })
        });
    this.dispatcher.dispatch(jslix.build(server_response));
    assertNotEquals(old_jid.toString(), this.dispatcher.connection.jid.toString());
}
