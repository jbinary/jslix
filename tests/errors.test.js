define(['jslix/common', 'jslix/errors', 'jslix/stanzas'],
    function(jslix, errors, stanzas) {
    buster.testCase('JslixTest', {
        testErrorStanza: function(){
            var error_stanza = errors.ErrorStanza.create({type: 'some_wrong_type'});
            assert(error_stanza.type == 'some_wrong_type');
            error_stanza = jslix.build(stanzas.MessageStanza.create({
                link: error_stanza
            }));
            assert.exception(function(){
                jslix.parse(error_stanza, errors.ErrorStanza);
            }, 'WrongElement');
        }
    });
});
