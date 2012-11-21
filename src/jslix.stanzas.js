"use strict";
(function(){

    var jslix = window.jslix,
        fields = jslix.fields;

    jslix.randomUUID = function(){
        var s = [], itoh = '0123456789ABCDEF';

        // Make array of random hex digits. The UUID only has 32 digits in it, but we
        // allocate an extra items to make room for the '-'s we'll be inserting.
        for (var i = 0; i <36; i++) s[i] = Math.floor(Math.random()*0x10);

        // Conform to RFC-4122, section 4.4
        s[14] = 4;  // Set 4 high bits of time_high field to version
        s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence

        // Convert to hex chars
        for (var i = 0; i <36; i++) s[i] = itoh[s[i]];

        // Insert '-'s
        s[8] = s[13] = s[18] = s[23] = '-';

        return s.join('');
    }

    // Error conditions according to
    // http://xmpp.org/rfcs/rfc6120.html#stanzas-error
    var conditions = {
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

    jslix.STREAMS_NS = 'http://etherx.jabber.org/streams';

    jslix.stanzas = {};

    jslix.stanzas.base_stanza = {
        create : function(params) {
            params = params || {};
            var result = jslix.createStanza(this);                
            for (var k in params) {
                if (['parent', 'link'].indexOf(k) == -1) {
                    result[k] = params[k];
                }
            }                
            if ('parent' in params) result.setParent(params.parent)
            else if ('link' in params) result.link(params.link);                
            return result;
        },
        makeError : function(params_or_condition, text, type) {
            if (typeof params_or_condition == 'string') {
                var params = {condition: params_or_condition,
                              text: text,
                              type: type};
            } else {
                var params = params_or_condition;
            }
            params.type = params.type || conditions[params.condition];
            params.parent = this.getTop().makeReply('error');
            var eclass = this.__definition__.error_class || 
                            jslix.stanzas.error;
            var error = eclass.create(params);
            return error;
        },
    makeResult : function(params) {
            params.parent = this.getTop().makeReply();
            return this.__definition__.result_class.create(params);
        }
    }

    jslix.stanzas.stanza = jslix.Element({
        xmlns: jslix.STANZAS_NS,
        to: new fields.JIDAttr('to', false),
        from: new fields.JIDAttr('from', false),
        id: new fields.StringAttr('id', false),
        type: new fields.StringAttr('type', false),

        makeReply: function(type) {
            var result = this.__definition__.create({
                from: this.to,
                to: this.from,
                id: this.id
            });
            if (['get', 'set'].indexOf(this.type) >= 0)
                type = type || 'result';
            else type = type || this.type;
            result.type = type;
            return result;
        }
    });

    jslix.stanzas.message = jslix.Element({
        element_name: 'message',
        body: new fields.StringNode('body', false),
        thread: new fields.StringNode('thread', false)
    }, [jslix.stanzas.stanza]);

    jslix.stanzas.presence = jslix.Element({
        element_name: 'presence',
        show: new fields.StringNode('show', false),
        status: new fields.StringNode('status', false),
        priority: new fields.IntegerNode('priority', false),
        
        clean_show: function(value) {
            if (['chat', 'away', 'xa', 'dnd'].indexOf(value) == -1)
                throw new ElementParseError('Presence show element has the wrong value');
            return value
        }
    }, [jslix.stanzas.stanza]);

    jslix.stanzas.iq = jslix.Element({
        element_name: 'iq',
        id: new fields.StringAttr('id', true),
        type: new fields.StringAttr('type', true), // TODO: validate types everywhere

        create: function(params) {
            params.id = params.id || jslix.randomUUID();

            return jslix.stanzas.stanza.create.call(this, params);
        }
    }, [jslix.stanzas.stanza]);

    jslix.stanzas.query = jslix.Element({
        element_name: 'query',
        parent_element: jslix.stanzas.iq,
        node: new fields.StringAttr('node', false)
    });

    jslix.stanzas.error = jslix.Element({
        parent_element: jslix.stanzas.stanza,
        xmlns: jslix.STANZAS_NS,
        element_name: 'error',
        type: new fields.StringAttr('type', true),
        condition: new fields.ConditionNode(),
        text: new fields.StringNode('text', false, false,
                                'urn:ietf:params:xml:ns:xmpp-stanzas'),
        // Validators
        clean_type: function(value) {
            if (['cancel', 'continue', 'modify', 'auth', 'wait'].indexOf(value) == -1)
                throw new ElementParseError('Wrong error type ' + value);
            return value;
        }
    });

    jslix.stanzas.features = jslix.Element({
        xmlns: jslix.STREAMS_NS,
        element_name: 'features'
    });

})();
