SessionTest = TestCase('SessionTest');

SessionTest.prototype.setUp = function(){
    this.dispatcher = new jslix.dispatcher();
    this.dispatcher.connection = {
        lst_stnz: null,
        send: function(doc){
            this.lst_stnz = doc;
        }
    }
    this.session = new jslix.session(this.dispatcher);
}

SessionTest.prototype.testResponse = function(){
    var bind_result = jslix.stanzas.iq.create({
        type: 'set',
        link: jslix.bind.stanzas.response.create({
            jid: 'user@server.com/res'
        })
    });
    this.dispatcher.dispatch(jslix.build(bind_result));
    var stnz = this.dispatcher.connection.lst_stnz;
    assertNoException(function(){
        jslix.parse(stnz, jslix.session.stanzas.request);
    });
}
