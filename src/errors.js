"use strict";
define(['jslix/class', 'jslix/stanzas', 'jslix/exceptions', 'jslix/fields',
        'libs/jquery'],
    function(Class, stanzas, exceptions, fields, $){
    var errors = {};

    // Error conditions according to
    // http://xmpp.org/rfcs/rfc6120.html#stanzas-error
    errors.conditions = {
        'bad-request': 'modify',
        conflict: 'cancel',
        'feature-not-implemented': 'cancel',
        forbidden: 'auth',
        gone: 'cancel',
        'internal-server-error': 'cancel',
        'item-not-found': 'cancel',
        'jid-malformed': 'modify',
        'not-acceptable': 'modify',
        'not-allowed': 'cancel',
        'not-authorized': 'auth',
        'policy-violation': 'modify',
        'recipient-unavailable': 'wait',
        redirect: 'modify',
        'registration-required': 'auth',
        'remote-server-not-found': 'cancel',
        'remote-server-timeout': 'wait',
        'resource-constraint': 'wait',
        'service-unavailable': 'cancel',
        'subscription-required': 'auth',
        'unexpected-request': 'wait'
    }

    errors.condition_to_name = function(condition) {
        var words = condition.split('-');
        $.each(words, function(i) {
            words[i] = this[0].toUpperCase() + this.slice(1);
        });
        words[words.length] = 'Error';
        return words.join('');
    }

    errors.ErrorStanza = stanzas.Element({
        xmlns: stanzas.STANZAS_NS,
        element_name: 'error',
        type: new fields.StringAttr('type', true),
        condition: new fields.ConditionNode('urn:ietf:params:xml:ns:xmpp-stanzas'),
        text: new fields.StringNode('text', false, false,
                                'urn:ietf:params:xml:ns:xmpp-stanzas'),
        // Validators
        clean_type: function(value) {
            if (['cancel', 'continue', 'modify', 'auth', 'wait'].indexOf(value) == -1)
                throw new exceptions.ElementParseError(
                    'Wrong error type ' + value
                );
            return value;
        },
        get_module: function() {
            return errors;
        },
        get_exception: function(top) {
            var name = errors.condition_to_name(this.app_condition || 
                                                this.condition);
            return new (this.get_module()[name])(this.text, this.type, this.top);
        }
    });

    errors.XMPPError = Class(exceptions.Error, function(reason, type, top) {
            exceptions.Error.call(this, reason);
            this.reason = reason;
            if (this.parent && this.parent.prototype.condition) {
                this._condition = this.parent.prototype.condition;
                this._app_condition = this.condition;
            } else {
                this._condition = this.condition;
            }
            if (type === undefined) {
                type = errors.conditions[this._condition];
            }
            this.type = type;
            this.top = top;
        }, {
        get_xmpp_error: function(top) {
            top = top || this.top;
            if (top) {
                var parent = top.makeReply('error');
            }
            var condition, app_condition;
            var error = this.stanza_class.create({
                type: this.type,
                app_condition: this._app_condition,
                condition: this._condition,
                text: this.reason,
                parent: parent
            });
            return error;
        }
    });

    errors.prepare_errors_classes = function(conditions, module,
                                             stanza_class) {
        for (var condition in conditions) {
            var name = errors.condition_to_name(condition),
                parent,
                stanza_class = stanza_class || module.ErrorStanza ||
                                errors.ErrorStanza,
                gen_exception = function(name, parent) {
                return Class(parent, function() {
                    parent.apply(this, arguments);
                    this.name = name;
                }, {'condition': condition,
                    'parent': parent,
                    'stanza_class': stanza_class});
            };
            parent = conditions[condition] || errors.XMPPError;
            if (typeof(parent) == 'string') {
                parent = errors.XMPPError;
            }
            module[name] = gen_exception(name, parent);
        }
    }
    errors.prepare_errors_classes(errors.conditions, errors);
    return errors;
});
