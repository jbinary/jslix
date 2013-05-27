define(['jslix', 'jslix.stanzas', 'jslix.dispatcher', 'jslix.bind', 'jslix.session'],
    function(jslix, stanzas, Dispatcher, Bind, Session){
    buster.testCase('SessionTest', {
        setUp: function(){
            this.dispatcher = new Dispatcher();
            this.dispatcher.connection = {
                lst_stnz: null,
                send: function(doc){
                    this.lst_stnz = doc;
                }
            }
            this.session = new Session(this.dispatcher);
        },
        testResponse: function(){
            var bind_result = stanzas.IQStanza.create({
                type: 'set',
                link: Bind.prototype.ResponseStanza.create({
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
});
