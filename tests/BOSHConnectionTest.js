var BOSHConnectionTest = buster.testCase('BOSHConnectionTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
        this.connection = new jslix.connection.transports.bosh(this.dispatcher,
            new jslix.JID('user@server.com'), 'password', '/http-base/');
        this.connection.lst_stnz = null;
        this.dispatcher.connection = this.connection;
        this.connection._create_request = this.connection.create_request;
        this.connection.create_request = function(){
            var connection = this,
                response = {
                    closed: false,
                    status: 200,
                    readyState: 4,
                    responseXML: null,
                    send: function(doc){
                        connection.lst_stnz = doc;
                        this.responseXML = (function(doc){
                            if(!connection.established){
                                return jslix.build(jslix.connection.transports.bosh.stanzas.response.create({
                                    ver: '1.8',
                                    wait: 60,
                                    from: 'server.com',
                                    sid: 'some_sid',
                                    polling: 2,
                                    inactivity: 90,
                                    requests: 2
                                }));
                            }
                            return doc;
                        })(doc);
                        connection.process_response(this);
                    }
                };
            return response;
        }
    },
    testCreateRequest: function(){
        var req = this.connection._create_request();
        assert(req instanceof XMLHttpRequest);
        assert(typeof req.onreadystatechange == 'function');
        assert(!req.onreadystatechange());
        this.connection._slots.push(req);
        assert(this.connection._slots.length == 1);
        req = this.connection._create_request();
        assert(req == null);
    },
    testConnect: function(){
        this.connection.connect();
        var stnz = this.connection.lst_stnz;
        refute.exception(function(){
            jslix.parse(stnz, jslix.connection.transports.bosh.stanzas.request);
        });
        assert(this.connection.established);
        assert(this.connection._sid == 'some_sid');
    },
    testDisconnect: function(){
        this.connection.connect();
        this.connection.disconnect();
        var stnz = this.connection.lst_stnz;
        refute.exception(function(){
            jslix.parse(stnz, jslix.connection.transports.bosh.stanzas.empty);
        });
    },
    testRestart: function(){
        var stnz = this.connection.restart();
        assert(stnz.xmpp_restart == 'true');
    },
    testResponse: function(){
        var wrong_response = jslix.connection.transports.bosh.stanzas.response.create({
                ver: '1.8',
                wait: 60,
                from: 'server.com',
                polling: 2,
                inactivity: 90,
                request: 2
            });
        assert.exception(function(){
            jslix.parse(jslix.build(wrong_response), jslix.connection.transports.bosh.stanzas.response);
        }, new jslix.exceptions.WrongElement);
    },
    testFeatures: function(){
        var features = jslix.connection.transports.bosh.stanzas.features.create({
                bind: true,
                session: true
            });
        this.dispatcher.dispatch(jslix.build(features));
        assert(jslix.bind._name in this.dispatcher.plugins);
        assert(jslix.session._name in this.dispatcher.plugins);
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
        req.responseXML = jslix.build(jslix.stanzas.features.create({}));
        assert(!this.connection.process_response(req));
        this.connection.connect();
        assert(this.connection.established);
        req = this.connection.create_request();
        req.responseXML = jslix.build(
            jslix.connection.transports.bosh.stanzas.body.create({
                type: 'terminate'
            })
        );
        this.connection.process_response(req);
        assert(!this.connection.established);
        this.connection.connect();
        req = this.connection.create_request();
        req.responseXML = jslix.build(
            jslix.connection.transports.bosh.stanzas.body.create({
                link: jslix.stanzas.features.create({})
            })
        );
        this.connection.process_response(req);
    }
});
