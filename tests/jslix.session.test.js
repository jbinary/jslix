var SessionTest = buster.testCase('SessionTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
        this.dispatcher.connection = {
            lst_stnz: null,
            send: function(doc){
                this.lst_stnz = doc;
            }
        }
        this.session = new jslix.session(this.dispatcher);
    },
    testResponse: function(){
        var bind_result = jslix.stanzas.IQStanza.create({
            type: 'set',
            link: jslix.bind.prototype.ResponseStanza.create({
                jid: 'user@server.com/res'
            })
        });
        this.dispatcher.dispatch(jslix.build(bind_result));
        var stnz = this.dispatcher.connection.lst_stnz,
            test = this;
        refute.exception(function(){
            jslix.parse(stnz, test.session.request);
        });
    }
});
