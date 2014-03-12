"use strict";
define(['jslix/common', 'jslix/fields', 'jslix/exceptions'],
    function(jslix, fields, exceptions){

    var stanzas = {
            STANZAS_NS: 'jabber:client',
            STREAMS_NS:'http://etherx.jabber.org/streams'
        };

    stanzas.Element = function(object, bases) {
        bases = bases || [stanzas.BaseStanza];
        var _inherit = function(accum, object) {
            for (var key in object) {
                accum[key] = object[key];
            }
            return accum;
        }
        var result = {};
        for (var i = 0; i<bases.length; i++) {
            result = _inherit(result, bases[i]);
        }
        return _inherit(result, object);
    };

    var Element = stanzas.Element;

    stanzas.randomUUID = function(){
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

    stanzas.SpecialStanza = function(){
        this.type_name = 'Special stanza';
        this.__definition__ = stanzas.SpecialStanza;
    }

    stanzas.SpecialStanza.prototype.toString = function(){
        return ['<', this.type_name, '>'].join('');
    }

    stanzas.SpecialStanza.prototype.getTop = function(){
        return this;
    }

    stanzas.SpecialStanza.create = function(){
        return new stanzas.SpecialStanza();
    }

    stanzas.EmptyStanza = function(){
        this.type_name = 'Empty stanza';
        this.__definition__ = stanzas.EmptyStanza;
    }

    stanzas.EmptyStanza.create = function(){
        return new stanzas.EmptyStanza();
    }

    stanzas.EmptyStanza.prototype = new stanzas.SpecialStanza();

    stanzas.EmptyStanza.prototype.constructor = stanzas.EmptyStanza;

    stanzas.BreakStanza = function(){
        this.type_name = 'Break stanza';
        this.__definition__ = stanzas.BreakStanza;
    }

    stanzas.BreakStanza.create = function(){
        return new stanzas.BreakStanza();
    }

    stanzas.BreakStanza.prototype = new stanzas.SpecialStanza();

    stanzas.BreakStanza.prototype.constructor = stanzas.BreakStanza;

    stanzas.BaseStanza = {
        clone: function(){
            var options = {};
            for(var key in this.__definition__){
                var attr = this.__definition__[key];
                if(attr instanceof fields.Node || attr instanceof fields.Attr){
                    options[key] = this[key]
                }
            }
            return this.__definition__.create(options);
        },
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
        makeResult : function(params) {
            if (params === undefined) {
                params = {};
            }
            params.parent = this.getTop().makeReply();
            var result_class = this.__definition__.result_class,
                result;
            if (result_class) {
                result = result_class.create(params);
            } else {
                result = params.parent;
            }
            return result;
        },
        toString: function(){
            return new XMLSerializer().serializeToString(jslix.build(this));
        },
        toJSON: function(){
            var json = {};
            for (var k in this) {
                if (k[0] !== '_') {
                    json[k] = this[k];
                }
            }
            return json;
        }
    }

    stanzas.Stanza = Element({
        xmlns: stanzas.STANZAS_NS,
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

    stanzas.AutoIdStanzaMixin = Element({
        create: function(params) {
            params.id = params.id || stanzas.randomUUID();

            return stanzas.Stanza.create.call(this, params);
        }
    });

    stanzas.MessageStanza = Element({
        element_name: 'message',
        body: new fields.StringNode('body', false),
        thread: new fields.StringNode('thread', false)
    }, [stanzas.Stanza]);

    stanzas.MessageAutoIdStanza = Element({
    }, [stanzas.MessageStanza, stanzas.AutoIdStanzaMixin]);

    stanzas.PresenceStanza = Element({
        element_name: 'presence',
        show: new fields.StringNode('show', false),
        status: new fields.StringNode('status', false),
        priority: new fields.IntegerNode('priority', false),

        clean_show: function(value) {
            if ([undefined, 'chat', 'away', 'xa', 'dnd'].indexOf(value) == -1)
                throw new exceptions.ElementParseError(
                    'Presence show element has the wrong value'
                );
            return value
        }
    }, [stanzas.Stanza]);

    stanzas.IQStanza = Element({
        element_name: 'iq',
        id: new fields.StringAttr('id', true),
        type: new fields.StringAttr('type', true) // TODO: validate types everywhere
    }, [stanzas.Stanza, stanzas.AutoIdStanzaMixin]);

    stanzas.QueryStanza = Element({
        element_name: 'query',
        parent_element: stanzas.IQStanza,
        node: new fields.StringAttr('node', false)
    });

    stanzas.FeaturesStanza = Element({
        xmlns: stanzas.STREAMS_NS,
        element_name: 'features'
    });

    return stanzas;

});
