"use strict";
define(['jslix/errors', 'libs/jquery', 'jslix/stanzas', 'jslix/fields'],
    function(errors, $, stanzas, fields) {
    var module = {};
    module.conditions = {
        'out-of-order': errors.UnexpectedRequestError,
        'tie-break': errors.ConflictError,
        'unknown-session': errors.ItemNotFoundError,
        'unsupported-info': errors.FeatureNotImplementedError
    };
    module.ErrorStanza = stanzas.Element({
        app_condition: new fields.ConditionNode('urn:xmpp:jingle:errors:1',
                                                false),
        get_module: function() {
            return module;
        }
    }, [errors.ErrorStanza]);
    errors.prepare_errors_classes(module.conditions, module);
    return module;
});
