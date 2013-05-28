define(['jslix/connection', 'jslix/dispatcher', 'jslix/jid'],
    function(Connection, Dispatcher, JID){
    buster.testCase('ConnectionTest', {
        setUp: function(){
            this.connection = new Connection('jid', 'password', 'http_base');
            this.dispatcher = new Dispatcher(this.connection);
            assert(this.connection._connection == null);
            assert(this.connection.http_base == 'http_base');
            assert(this.connection.jid instanceof JID);
            assert(this.connection.password == 'password');
            assert(this.connection.jid.resource == 'default');
            this.server = sinon.fakeServer.create();
        },
        tearDown: function(){
            this.server.restore();
        },
        testConnect: function(){
            this.connection.connect(this.dispatcher);
            assert.equals(this.server.requests.length, 1);
            assert.match(this.server.requests[this.server.requests.length-1], {
                method: 'POST',
                url: 'http_base'
            });
        },
        testRestart: function(){
            refute(this.connection.restart());
            this.connection.connect(this.dispatcher);
            var result = this.connection.restart();
            assert(result.xmpp_restart == 'true');
        },
        testSend: function(){
            refute(this.connection.send());
            this.connection.connect(this.dispatcher);
            assert(this.connection._connection._queue.length == 0);
            this.connection.send(
                document.implementation.createDocument(null, 'body', null));
            assert(this.connection._connection._queue.length == 1);
        },
        testDisconnect: function(){
            refute(this.connection.disconnect());
            this.connection.connect(this.dispatcher);
            var result = this.connection.disconnect();
            assert(result.type == 'terminate');
        }
    });
});
