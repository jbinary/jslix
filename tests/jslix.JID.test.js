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

var escapedGoodJIDs = ["space\\20cadet@example.com/res",
              "call\\20me\\20\\22ishmael\\22@example.com/res",
              "at\\26t\\20guy@example.com/res",
              "d\\27artagnan@example.com/res",
              "\\2f.fanboy@example.com/res",
              "\\3a\\3afoo\\3a\\3a@example.com/res",
              "\\3cfoo\\3e@example.com/res",
              "user\\40host@example.com/res",
              "c\\3a\\net@example.com/res",
              "c\\3a\\\\net@example.com/res",
              "c\\3a\\cool\\20stuff@example.com/res",
              "c\\3a\\5c5commas@example.com/res"];

var badStrings = ["\\20rt", "rt@\\2", '\'node'];

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
            var jid = new jslix.JID({
                node:'abc',
                domain:'type"forbidden@symbols/',
                resource:'qwe'
            });
        }, 'JIDInvalidException');

        assert.exception(function(){
            var jid = new jslix.JID({
                node:'',
                domain:'',
                resource:'qwe'
            });
        }, 'JIDInvalidException');
    },
    testEscapeCorrect: function(){
        var jid = new jslix.JID('test');
        for (var i = 0; i < goodNodes.length; i++){
                var escapedJID = jid.escape(goodNodes[i], "example.com", 'res');
                assert(escapedJID.toString() == escapedGoodJIDs[i]);
                var unescapedJID = escapedJID.unescape();
                assert(unescapedJID == goodNodes[i] + "@example.com/res");
        }
    },
    testUnescapeExceptions: function(){
        var jid = new jslix.JID('test/res');
        for (var i = 0; i < badStrings.length; i++){
            assert.exception(function(){
                jid._node = badStrings[i];
                jid.unescape();
            }, 'JIDInvalidException');
        }
    }
});
