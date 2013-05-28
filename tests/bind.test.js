define(['jslix/common', 'jslix/stanzas', 'jslix/dispatcher', 'jslix/bind', 'jslix/jid'],
    function(jslix, stanzas, Dispatcher, Bind, JID){
    buster.testCase('BindTest', {
        setUp: function(){
            this.dispatcher = new Dispatcher();
            this.dispatcher.connection = {
                lst_stnz: null,
                send: function(doc){
                    this.lst_stnz = doc;
                },
                jid: new JID('test@server.com')
            }
            this.bind = new Bind(this.dispatcher);
        },
        testRestartResult: function(){
            var restart_result = stanzas.FeaturesStanza.create({
                link: this.bind.BaseStanza.create({})
            });
            this.dispatcher.dispatch(jslix.build(restart_result));
            var stnz = this.dispatcher.connection.lst_stnz,
                test = this;
            refute.exception(function(){
                jslix.parse(stnz, test.bind.RequestStanza);
            });
        },
        testResponse: function(){
            var old_jid = this.dispatcher.connection.jid,
                server_response = stanzas.IQStanza.create({
                    type: 'set',
                    link: this.bind.ResponseStanza.create({
                        jid: 'new_jid@server.com/res'
                    })
                });
            this.dispatcher.dispatch(jslix.build(server_response));
            assert(old_jid.toString() != this.dispatcher.connection.jid.toString());
        }
    });
});
