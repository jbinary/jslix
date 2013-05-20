var ConnectionsTransportsBOSHTest = buster.testCase('ConnectionsTransportsBOSHTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
        this.connection = new jslix.connection.transports.bosh(this.dispatcher,
            new jslix.JID('user@server.com'), 'password', '/http-base/');
        assert(this.connection._dispatcher instanceof jslix.dispatcher);
        assert(this.connection.jid instanceof jslix.JID);
        assert(this.connection.password == 'password');
        assert(this.connection.http_base == '/http-base/');
        this.dispatcher.connection = this.connection;
        this.server = sinon.fakeServer.create();
        this.clock = sinon.useFakeTimers();
        this.headers = {
            'content-type': 'application/xml'
        };
        this.responses = {
            'connect': new XMLSerializer().serializeToString(
                jslix.build(
                    this.connection.ResponseStanza.create({
                        ver: '1.8',
                        wait: 60,
                        from: 'server.com',
                        sid: 'some_sid',
                        polling: 2,
                        inactivity: 90,
                        requests: 2
                    })
                )
            ),
            'wrong features': new XMLSerializer().serializeToString(
                jslix.build(jslix.stanzas.features.create())
            ),
            'terminate': new XMLSerializer().serializeToString(
                jslix.build(
                    this.connection.BodyStanza.create({
                        type: 'terminate'
                    })
                )
            ),
            'features': new XMLSerializer().serializeToString(
                jslix.build(
                    this.connection.BodyStanza.create({
                        link: jslix.stanzas.features.create({})
                    })
                )
            )
        };
    },
    tearDown: function(){
        this.clock.restore();
        this.server.restore();
    },
    testCreateRequest: function(){
        var req = this.connection.create_request();
        assert(req instanceof XMLHttpRequest);
        assert(typeof req.onreadystatechange == 'function');
        assert(!req.onreadystatechange());
        this.connection._slots.push(req);
        assert(this.connection._slots.length == 1);
        req = this.connection.create_request();
        assert(req == null);
    },
    testConnect: function(){
        this.server.respondWith('POST', '/http-base/', [200,
            this.headers, this.responses['connect']
        ]);

        this.connection.connect();
        assert.equals(this.server.requests.length, 1);
        var req = this.server.requests[this.server.requests.length-1],
            test = this;
        assert.match(req, {
            method: 'POST',
            url: '/http-base/'
        });
        refute.exception(function(){
            jslix.parse(req.requestBody, test.connection.RequestStanza);
        });
        this.server.respond();
        assert(this.connection.established);
        assert(this.connection._sid == 'some_sid');
        this.clock.tick(this.connection.polling*1000+this.connection.queue_check_interval);
        assert.equals(this.server.requests.length, 2);
    },
    testDisconnect: function(){
        this.server.respondWith('POST', '/http-base/', [200,
            this.headers, this.responses['connect']
        ]);
        this.connection.connect();
        this.server.respond();
        assert.equals(this.server.requests.length, 1);
        this.dispatcher.send(this.connection.disconnect());
        this.clock.tick(this.connection.queue_check_interval);
        assert.equals(this.server.requests.length, 2);
        var req = this.server.requests[this.server.requests.length-1],
            stanza = null,
            test = this;
        assert.match(req, {
            method: 'POST',
            url: '/http-base/'
        });
        refute.exception(function(){
            stanza = jslix.parse(req.requestBody, test.connection.EmptyStanza);
        });
        assert(stanza != null && stanza.type == 'terminate');
    },
    testRestart: function(){
        var stnz = this.connection.restart();
        assert(stnz.xmpp_restart == 'true');
    },
    testResponse: function(){
        var wrong_response = this.connection.ResponseStanza.create({
                ver: '1.8',
                wait: 60,
                from: 'server.com',
                polling: 2,
                inactivity: 90,
                request: 2
            }),
            test = this;
        assert.exception(function(){
            jslix.parse(jslix.build(wrong_response),
                test.connection.ResponseStanza);
        }, 'WrongElement');
    },
    testFeatures: function(){
        var features = this.connection.FeaturesStanza.create({
                bind: true,
                session: true
            });
        this.dispatcher.dispatch(jslix.build(features));
        assert(jslix.bind.prototype._name in this.dispatcher.plugins);
        assert(jslix.session.prototype._name in this.dispatcher.plugins);
    },
    testCleanSlots: function(){
        var req = this.connection.create_request();
        req.closed = true;
        this.connection._slots.push(req);
        assert(this.connection._slots.length == 1);
        this.connection.clean_slots();
        assert(this.connection._slots.length == 0);
    },
    testProcessResponse: function(){
        var req = this.connection.create_request();
        req.onreadystatechange = null;
        req.respond(200, this.headers, this.responses['wrong features']);
        assert(!this.connection.process_response(req));
        this.connection.connect();
        this.server.respondWith('POST', '/http-base/', [200,
            this.headers, this.responses['connect']
        ]);
        this.server.respond();
        assert(this.connection.established);
        req = this.connection.create_request();
        req.onreadystatechange = null;
        req.respond(200,this.headers, this.responses['terminate']);
        this.connection.process_response(req);
        assert(!this.connection.established);
        this.connection.connect();
        this.server.respond();
        req = this.connection.create_request();
        req.onreadystatechange = null;
        req.respond(200, this.headers, this.responses['features']);
        assert(this.connection.process_response(req));
    }
});
