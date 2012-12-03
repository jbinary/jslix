BOSHConnectionTest = TestCase('BOSHConnectionTest');

BOSHConnectionTest.prototype.setUp = function(){
    this.dispatcher = new jslix.dispatcher();
    this.connection = new jslix.connection.transports.bosh(this.dispatcher,
        new jslix.JID('user@server.com'), 'password', '/http-base/');
    this.connection.lst_stnz = null;
    this.dispatcher.connection = this.connection;
    this.connection._create_request = this.connection.create_request;
    this.connection.create_request = function(){
        if(this._slots.length >= this.request)
            return null;
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
}

BOSHConnectionTest.prototype.testCreateRequest = function(){
    var req = this.connection._create_request();
    assertInstanceOf(XMLHttpRequest, req);
    assertTypeOf('function', req.onreadystatechange);
    assertEquals(false, req.onreadystatechange());
    this.connection._slots.push(req);
    assertEquals(1, this.connection._slots.length);
    req = this.connection._create_request();
    assertEquals(null, req);
}

BOSHConnectionTest.prototype.testConnect = function(){
    this.connection.connect();
    var stnz = this.connection.lst_stnz;
    assertNoException(function(){
        jslix.parse(stnz, jslix.connection.transports.bosh.stanzas.request);
    });
    assertTrue(this.connection.established);
    assertEquals('some_sid', this.connection._sid);

}

BOSHConnectionTest.prototype.testDisconnect = function(){
    this.connection.connect();
    this.connection.disconnect();
    var stnz = this.connection.lst_stnz;
    assertNoException(function(){
        jslix.parse(stnz, jslix.connection.transports.bosh.stanzas.empty);
    });
}

BOSHConnectionTest.prototype.testRestart = function(){
    this.connection.restart();
    this.connection.process_queue();
    var stnz = this.connection.lst_stnz,
        result = null;
    assertNoException(function(){
        result = jslix.parse(stnz, jslix.connection.transports.bosh.stanzas.restart);
    });
    assertEquals('true', result.xmpp_restart);
}

BOSHConnectionTest.prototype.testResponse = function(){
    var wrong_response = jslix.connection.transports.bosh.stanzas.response.create({
            ver: '1.8',
            wait: 60,
            from: 'server.com',
            polling: 2,
            inactivity: 90,
            request: 2
        });
    assertException(function(){
        jslix.parse(jslix.build(wrong_response), jslix.connection.transports.bosh.stanzas.response);
    }, new jslix.exceptions.WrongElement);
}

BOSHConnectionTest.prototype.testFeatures = function(){
    var features = jslix.connection.transports.bosh.stanzas.features.create({
            bind: true,
            session: true
        }),
        old_plugins_lenght = this.connection.plugins.length;
    this.dispatcher.dispatch(jslix.build(features));
    assertNotEquals(old_plugins_lenght, this.connection.plugins.length);
}

BOSHConnectionTest.prototype.testCleanSlots = function(){
    this.connection.restart();
    this.connection.process_queue();
    assertEquals(1, this.connection._slots.length);
    this.connection.clean_slots();
    assertEquals(0, this.connection._slots.length);
}

BOSHConnectionTest.prototype.testProcessResponse = function(){
    var req = this.connection.create_request();
    req.responseXML = jslix.build(jslix.stanzas.features.create({}));
    assertEquals(false, this.connection.process_response(req));
    this.connection.connect();
    assertEquals(true, this.connection.established);
    req = this.connection.create_request();
    req.responseXML = jslix.build(
        jslix.connection.transports.bosh.stanzas.body.create({
            type: 'terminate'
        })
    );
    this.connection.process_response(req);
    assertEquals(false, this.connection.established);
    this.connection.connect();
    req = this.connection.create_request();
    req.responseXML = jslix.build(
        jslix.connection.transports.bosh.stanzas.body.create({
            link: jslix.stanzas.features.create({})
        })
    );
    console.log(req.responseXML);
    this.connection.process_response(req);
}
