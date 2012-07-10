"debugger";
"use strict";
(function(window, JSJacJID, JSJaCJIDInvalidException) {
    var STANZAS_NS = 'jabber:client';
    var jslix = {
        Element: function(object, bases) {
            bases = bases || [jslix.stanzas.base_stanza];
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
        },
        Class: function(parent, constructor, fields) {
            if (parent.constructor == Function) {
                constructor.prototype = new parent;
            } else {
                constructor.prototype = parent;
            }
            constructor.prototype.constructor = constructor;
            if (fields === undefined) {
                fields = {};
            }
            for (var k in fields) {
                constructor.prototype[k] = fields[k];
            }
            return constructor;
        }
    }
    var Class = jslix.Class;

    // Exceptions
    jslix.exceptions = {};
    jslix.exceptions.Error =
        Class(Error,
              function(msg) {
        		var me = jslix.exceptions.Error;
                var objArr = Error.call(me, msg);

                objArr.prototype = me.prototype;

                objArr.name = 'JslixError'

                return objArr; 
    });

    jslix.exceptions.ElementParseError =
        Class(jslix.exceptions.Error,
              function(msg) {
        		
                jslix.exceptions.Error.call(this, msg);
                var objArr = Object();
                objArr.prototype = this.prototype;
                
                objArr.name = 'ElementParseError';
                return objArr;
              }
    );
    var ElementParseError = jslix.exceptions.ElementParseError;
    jslix.exceptions.WrongElement =
        Class(jslix.exceptions.Error,
              function(msg) {
        		var me = jslix.exceptions.WrongElement;
                var objArr = jslix.exceptions.Error.call(me, msg);
                objArr.prototype = me.prototype;
                
                objArr.name = 'WrongElement';
                
                return objArr;
              }
    );
    var WrongElement = jslix.exceptions.WrongElement;

    // Types
    jslix.types = {};
    var types = jslix.types;
    types.StringType = {
        to_js: function(value) {
            if (typeof(value) == 'string')
                return value;
        },
        from_js: function(value) {
            return new String(value);
        }
    },
    types.IntegerType = {
        to_js: function(value) {
            if (typeof(value) == 'string')
                return Number(value)
        },
        from_js: function(value) {
            return new String(value);
        }
    },
    types.JIDType = {
        to_js: function(value) {
            if (!value) return value;
            try {
                var jid = new JSJacJID(value);
                return jid;
            } catch(e) {
                if (e instanceof JSJaCJIDInvalidException) {
                    throw(ElementParseError('Invalid JID'));
                } else {
                    throw(e);
                }
            }
        },
        from_js: function(value) {
            if (value)
                return value.toString();
        }
    }

    // Fields
    var Attr = function(name, required) {
//    	var objArr = Object();
//    	objArr.prototype = this.prototype;
    	
        this.name = name;
        this.required = required;
        this.type = null;
        this.field = true;
        
        //return objArr;
    }
    Attr.prototype.get_from_el = function(el) {
        var attr = el.attributes.getNamedItem(this.name);
        if (attr == null) {
            return null;
        } else {
            return attr.value;
        }
    };
    Attr.prototype.put_to_el = function(el, value) {
        var attr = document.createAttribute(this.name);
        attr.nodeValue = value;
        el.attributes.setNamedItem(attr);
    };
    Attr.prototype.clean = function(value) {
        return value;
    };
    Attr.prototype.clean_set = function(value) {
        return value;
    };

    var Node = function(name, xmlns, required, listed) {
        this.name = name;
        this.xmlns = xmlns;
        this.required = required;
        this.type = null;
        this.field = true;
        this.listed = listed;
    }

    Node.prototype.get_from_el = function(el) {
        if (this.xmlns === undefined) {
            var xmlns = el.namespaceURI;
        } else {
            var xmlns = this.xmlns;
        }
        var value = [];
        for (var i=0; i<el.childNodes.length; i++) {
            var node = el.childNodes[i];
            if ((this.name === undefined || node.nodeName == this.name) && 
                 xmlns == node.namespaceURI) value[value.length] = node;
        }
        if (!this.listed) return value[0] || null;
        return value;
    },
    Node.prototype.put_to_el = function(el, values) {
        if (! this.listed) values = [values];
        for (var i=0; i<values.length; i++) {
            el.appendChild(values[i]);
        }
    },
    Node.prototype.clean_set = function(value) {
        return value;
    }
    Node.prototype.clean = function(value) {
        return value;
    }

    jslix.fields = {
        Attr: Attr,
        Node: Node
    };
    var fields = jslix.fields;

    // Attr Fields
    fields.StringAttr = Class(
        fields.Attr,
        function(name, required) {
            fields.Attr.call(this, name, required);
            
            this.type = types.StringType;
        }
    );

    fields.IntegerAttr = Class(
        fields.StringAttr,
        function(name, required) {
            fields.StringAttr.call(this, name, required);
            this.type = types.IntegerType;
        }
    );

    fields.JIDAttr = Class(
        fields.Attr,
        function(name, required) {
            fields.Attr.call(this, name, required);
            this.type = types.JIDType;
        }
    );

    // Node fields
    fields.StringNode = Class(
        fields.Node,
        function(name, required, listed, uri) {
            fields.Node.call(this, name, uri, required, listed);
            this.type = types.StringType;
        },
        {
            'put_to_el': function(stanza, value) {
                var xmlns = this.xmlns || stanza.namespaceURI;
                var node = document.createElementNS(xmlns, this.name);
                var text_node = document.createTextNode(value);
                node.appendChild(text_node);
                stanza.appendChild(node);
            },
            'get_from_el': function(el) {
                var extract = function(value) {
                    if (value.childNodes.length != 1)
                        throw(ElementParseError('TextNode contains no one or more than one child'))
                    value = value.childNodes[0];
                    if (value.nodeName == '#text')
                        value = value.nodeValue;
                    else
                        throw(ElementParseError("Wrong node type when TextNode parsing"));
                    return value;
                }
                var values = fields.Node.prototype.get_from_el.call(this, el);
                if (!values) return values;
                if (this.listed)
                    for (var i=0; i<values.length; i++) {
                        values[i] = extract(values[i]);
                    }
                else values = extract(values);
                return values;
            }
        }
    );

    fields.ElementNode = Class(
        fields.Node,
        function(definition, required, listed) {
            fields.Node.call(this, definition.element_name,
                             definition.xmlns, required, listed);
            this.definition = definition;
        },
        {
            get_from_el: function(el) {
                var values = fields.Node.prototype.get_from_el.call(this, el);
                this.definition.xmlns = this.definition.xmlns || el.namespaceURI;
                if (!values) return values;
                if (this.listed)
                    for (var i=0; i<values.length; i++) {
                        values[i] = jslix._parse(values[i], this.definition);
                    }
                else values = jslix._parse(values, this.definition);
                return values
            },
            put_to_el: function(stanza, values) {
                var prepared = jslix.build(values, true);
                stanza.appendChild(prepared);
            }
        }
    );

    fields.IntegerNode = Class(
        fields.StringNode,
        function(name, required, listed) {
            fields.StringNode.call(this, name, required, listed);
            this.type = types.IntegerType;
        }
    );

    fields.JIDNode = Class(
        fields.StringNode,
        function(name, required, listed) {
            fields.StringNode.call(this, name, undefined, required, listed);
            this.type = types.JIDType;
        }
    );

    jslix.createStanza = function(definition) {
        return {
            '__definition__': definition,
            '__links__': [],
            getTop: function() {
                if (this.parent === undefined) {
                    return this;
                } else {
                    return this.parent.getTop();
                }
            },
            link: function(link) {
                this.__links__[this.__links__.length] = link;
                link.parent = this;
            },
            setParent: function(parent) {
                parent.link(this);
            }
        }
    }

    jslix.parse = function(el, definition, path) {
        var path = path || [];
        path[path.length] = definition;
        if ('parent_element' in definition) {
            return jslix.parse(el, definition.parent_element, path);
        }
        var parent = null;
        for (var i=path.length-1; i>=0; i--) {
            var link_def = path[i];
            var link = null;
            for (var ii=0; ii<el.childNodes.length; ii++) {
                var eel = el.childNodes[ii];
                try {
                    link = jslix._parse(eel, path[i]);
                    break;
                } catch (e) {
                    if (e instanceof WrongElement) continue;
                    throw (e)
                }
            }
            el = eel;
            if (!link) throw (WrongElement('Can\'t find "' + eel.xmlns + ':' + eel.element_name + '" child'));
            if (parent) {
                link.parent = parent;
                parent.__links__[parent.__links__.length] = link;
            }
            parent = link;
        }
        return link
    }
    
    jslix._parse = function(el, definition) {
        if (el.nodeName == '#document') el = el.childNodes[0];
        if ((definition.element_name &&
             el.nodeName != definition.element_name) || 
            definition.xmlns != el.namespaceURI) {
            throw(WrongElement());
        }
        var validate = function(value) {
            if (f.type)
                value = f.type.to_js(value);
            value = f.clean(value);
            return value;
        }
        var result = jslix.createStanza(definition);
        for (var key in definition) {
            var f = definition[key];
            if (typeof(f) == 'object' && 'field' in f) {
                var value = f.get_from_el(el);
                if (f.listed) {
                    if (!value.length && f.required) throw (ElementParseError(f.name + ' is required field'))
                    for (var i=0; i<value.length; i++) {
                        value[i] = validate(value[i]);
                    }
                } else {
                    value = validate(value);
                }

                var validator = definition['clean_' + key];
                if (validator !== undefined && value) {
                    value = validator.call(definition, value);
                } // TODO: final validator?

                result[key] = value;
            } else if (typeof(f) == 'function') {
                result[key] = f;
            }
        }
        /*if ('parent_element' in definition) {
            var parent = jslix.parse(el.parentNode, definition['parent_element']);
            result.parent = parent;
            parent.__links__[parent.__links__.length] = result;
        }*/
        return result;
    };

    jslix.build = function(obj, element_needed) {
        if (element_needed) {
            var doc = document.createElementNS(obj.__definition__.xmlns,
                                               obj.__definition__.element_name)
            var stanza = doc;
        } else {
            var doc = window.XmlDocument.create(obj.__definition__.element_name,
                                                obj.__definition__.xmlns);
            var stanza = doc.childNodes[0];
        }
        function put(value) {
            if (f.type)
                value = f.type.from_js(value);
            value = value || null;
            value = f.clean_set(value, stanza);
            f.put_to_el(stanza, value);
        }
        for (var k in obj.__definition__) {
            var f = obj.__definition__[k];
            if (typeof(f) == 'object' && 'field' in f && obj[k] !== undefined) {
                var value = obj[k];
                if (f.listed)
                    for (var i=0; i<value.length; i++)
                        put(value[i]);
                else put(value);
            }
        }
        for (var i=0; i<obj.__links__.length; i++) {
            stanza.appendChild(jslix.build(obj.__links__[i], true));
        }
        return doc;
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
    // Stanzas
    jslix.stanzas = {
        base_stanza: {
            create: function(params) {
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
            makeError: function(params_or_condition, text, type) {
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
            makeResult: function(params) {
                params.parent = this.getTop().makeReply();
                return this.__definition__.result_class.create(params);
            }
        }
    }

    jslix.stanzas.stanza = 
        jslix.Element({
            xmlns: STANZAS_NS,
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
        })

    jslix.stanzas.message =
        jslix.Element({
                element_name: 'message',
                body: new fields.StringNode('body', false),
                thread: new fields.StringNode('thread', false)
                }, [jslix.stanzas.stanza])

    jslix.stanzas.presence =
        jslix.Element({
                element_name: 'presence',
                show: new fields.StringNode('show', false),
                status: new fields.StringNode('status', false),
                priority: new fields.IntegerNode('priority', false),
                
                clean_show: function(value) {
                    if (['chat', 'away', 'xa', 'dnd'].indexOf(value) == -1)
                        throw(ElementParseError('Presence show element has the wrong value'));
                    return value
                    }
                }, [jslix.stanzas.stanza])

    var randomUUID = function () {
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

    jslix.stanzas.iq = 
        jslix.Element({
                element_name: 'iq',
                id: new fields.StringAttr('id', true),
                type: new fields.StringAttr('type', true), // TODO: validate types everywhere

                create: function(params) {
                    params.id = params.id || randomUUID();
                    return jslix.stanzas.stanza.create.call(this, params);
                }
            }, [jslix.stanzas.stanza]);

    jslix.stanzas.query =
        jslix.Element({
            element_name: 'query',
            parent_element: jslix.stanzas.iq,
            node: new fields.StringAttr('node', false)
        });

    // Definition of error stanza
    fields.ErrorConditionNode = Class(
        fields.Node,
        function() {
            var uri = 'urn:ietf:params:xml:ns:xmpp-stanzas';
            fields.Node.call(this, undefined, uri, false);
            this.type = types.StringType;
        },
        {
            'get_from_el': function(el) {
                var value = fields.Node.prototype.get_from_el.call(this, el);
                return value.nodeName;
            },
            'put_to_el': function(el, value) {
                value = document.createElementNS(this.xmlns, value);
                fields.Node.prototype.put_to_el.call(this, el, value);
            }
        }
    );
    jslix.stanzas.error =
        jslix.Element({
            parent_element: jslix.stanzas.stanza,
            xmlns: STANZAS_NS,
            element_name: 'error',
            type: new fields.StringAttr('type', true),
            condition: new fields.ErrorConditionNode(),
            text: new fields.StringNode('text', false, false,
                                    'urn:ietf:params:xml:ns:xmpp-stanzas'),
            // Validators
            clean_type: function(value) {
                if (['cancel', 'continue', 'modify', 'auth', 'wait'].indexOf(value) == -1)
                    throw(ElementParseError('Wrong error type ' + value));
                return value;
            }
        });

    window.jslix = jslix;
})(window, JSJaCJID, JSJaCJIDInvalidException);

// Dispatcher
(function(window) {
    var jslix = window.jslix;
    jslix.dispatcher = function(myjid) {
        this.myjid = myjid;
        this.handlers = [];
    }
    var dispatcher = jslix.dispatcher;
    dispatcher.prototype.addHandler = function(handler, host) {
        this.handlers[this.handlers.length] = [handler, host];
        this.deferreds = {};
    }
    dispatcher.prototype.dispatch = function(el) {
        var tops = [jslix.stanzas.iq, jslix.stanzas.presence,
                    jslix.stanzas.message];
        for (var i=0; i<tops.length; i++) {
            try {
                var top = jslix.parse(el, tops[i]);
                break;
            } catch (e) {}
        }
        var results = [];
        var bad_request = false;
        var i = 0;
        var self = this;
        var can_error = ['result', 'error'].indexOf(top.type) == -1;

        // FIXME: check sender
        if (!can_error && top.id in this.deferreds) {
            var d = this.deferreds[top.id][0];
            var r_el = this.deferreds[top.id][1];
            var result_class = r_el.__definition__.result_class;
            if (result_class && top.type == 'result') {
                try {
                    var result = jslix.parse(el, result_class);
                    d.resolve(result);
                } catch (e) {
                    d.reject(e);
                }
            } else if (!result_class && top.type == 'result') {
                d.resolve(r_el);
            } else if (top.type == 'error') {
                try {
                    exception = jslix.parse(el, r_el.error_class);
                } catch(e) {
                    exception = e;
                }
                d.reject(exception);
            }
            delete this.deferreds[top.id];
        }

        var continue_loop = function() {
            i++;
            if (i<self.handlers.length) {
                loop();
            } else {
                if (results.length)
                    self.send(results);
                else if (bad_request && can_error) {
                    self.send(top.makeError('bad-request'));
                } else if (can_error && top.__definition__.element_name == 'iq') {
                    self.send(top.makeError('feature-not-implemented'));
                }
            }
        }

        var loop_fail = function(failure) {
            if (typeof failure == 'object' && 
                'definition' in failure) self.send(failure)
            else if (failure instanceof Error) {
                self.send(top.makeError('internal-server-error',
                                        failure.toString()));
                            // XXX: remove failure information when not debug
            } else if (typeof failure == 'object' &&
                       'condition' in failure) {
                self.send(top.makeError(failure));
            } else if (typeof failure == 'string') {
                self.send(top.makeError(failure));
            } else {
                self.send(top.makeError('internal-server-error'));
            }
            continue_loop();
        }

        var loop_done = function(result) {
            results[results.length] = result;
            continue_loop();
        }

        var loop = function() { // I hate JS for that shit.
            var handler = self.handlers[i][0];
            var host = self.handlers[i][1];
            try {
                var obj = jslix.parse(el, handler);
            } catch (e) {
                if (e instanceof jslix.exceptions.WrongElement) return continue_loop();
                if (e instanceof jslix.exceptions.ElementParseError) {
                    bad_request = True;
                    return continue_loop(); // TODO: pass an exception message?
                }
                throw (e); // TODO: internal-server-error?
            }
            var func = obj[top.type+'Handler'] || obj['anyHandler'];
            if (func === undefined) {
                bad_request = true;
                return continue_loop();
            }
            try {
                var deferred = func.call(host, obj, top);
            } catch (e) {
                loop_fail(e);
            }
            if ('__definition__' in deferred) {
                loop_done(deferred);
            } else {
                deferred.done(loop_done);
                deferred.fail(loop_fail);
            }
        }
        loop();
    }
    dispatcher.prototype.send = function(els) {
        if(els.length === undefined) els = [els];
        var d = null;
        for (var i=0; i<els.length; i++) {
            var el = els[i];
            var top = el.getTop();
            var packet = new window.JSJaCPacket(top.__definition__.element_name);
            if (top.__definition__.element_name == 'iq' && 
                ['get', 'set'].indexOf(top.type) != -1) {
                d = new $.Deferred();
                this.deferreds[top.id] = [d, el];
                // TODO: implement timeouts
            }
            packet.doc = jslix.build(top);
            window.con.send(packet);
        }
        return d;
    }
})(window);
