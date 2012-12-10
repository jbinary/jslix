
var goodNodes = ["space cadet", 
           "call me \"ishmael\"",
           "at&t guy",
           "d'artagnan",
           "/.fanboy",
           "::foo::",
           "<foo>",
           "user@host",
           "c:\\net",
           "c:\\\\net",
           "c:\\cool stuff",
           "c:\\5commas"];

var escapedGoodJIDs = ["space\\20cadet@example.com",
              "call\\20me\\20\\22ishmael\\22@example.com",
              "at\\26t\\20guy@example.com",
              "d\\27artagnan@example.com",
              "\\2f.fanboy@example.com",
              "\\3a\\3afoo\\3a\\3a@example.com",
              "\\3cfoo\\3e@example.com",
              "user\\40host@example.com",
              "c\\3a\\net@example.com",
              "c\\3a\\\\net@example.com",
              "c\\3a\\cool\\20stuff@example.com",
              "c\\3a\\5c5commas@example.com"];

var badStrings = ["\\20rt", "rt@\\2"];

var JIDTest = buster.testCase("JIDTest", {
    testJIDBasic: function(){
        var jid = new jslix.JID("ruutu@finland/keys");

        var node = jid.getNode();
        var domain = jid.getDomain();
        var resource = jid.getResource();

        assert(node == "ruutu");
        assert(domain == "finland");
        assert(resource == "keys");
    },
    testIsEntity: function(){
        var jid = new jslix.JID("baibako@a/b");

        assert(jid.isEntity("baibako@a"));

        assert(!jid.isEntity("lostfilm@a/from"));
    },
    testThrowedException: function(){
        assert.exception(function(){
                        var jid = new jslix.JID({node:'abc',
                                    domain:'type"forbidden@symbols/',
                                    resource:'qwe'});
                      }, jslix.JIDInvalidException);

        assert.exception(function(){
                        var jid = new jslix.JID({node:'',
                                    domain:'',
                                    resource:'qwe'});
                      }, jslix.JIDInvalidException);
    },
    testEscapeCorrect: function(){
        for (var i = 0; i < goodNodes.length; ++i){
            refute.exception(function(){
                               var jidForEscape = new jslix.JID("test", "test");
                               var escapedJID = jidForEscape.escape(goodNodes[i], "example.com");
                               assert(escapedJID.toString() == escapedGoodJIDs[i]);

                               var unescapedJID = escapedJID.unescape();
                               assert(unescapedJID == goodNodes[i] + "@example.com");
                            });
        }

    },
    testUnescapeExceptions: function(){
        for (var i = 0; i < badStrings.length; ++i){
            assert.exception(function(){
                            var escapedJID = new jslix.JID("test", "test");
                            escapedJID.setNode(badStrings[i]);
                            var unescapedJID = escapedJID.unescape();
                           }, jslix.JIDInvalidException);
        }
    }
});
