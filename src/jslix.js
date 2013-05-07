"use strict";
(function(){
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
                constructor.prototype = new parent();
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

    jslix._name = 'jslix';

    jslix.STANZAS_NS = 'jabber:client';

    var Class = jslix.Class;

    // Exceptions
    jslix.exceptions = {};
    jslix.exceptions.Error = Class(Error, function(msg) {
        this.name = 'JslixError';
        this.message = msg;
        this.stack = new Error().stack;
    });

    jslix.exceptions.ElementParseError = Class(jslix.exceptions.Error, function(msg) {
        jslix.exceptions.Error.call(this, msg);
        this.name = 'ElementParseError';
    });

    var ElementParseError = jslix.exceptions.ElementParseError;
    jslix.exceptions.WrongElement = Class(jslix.exceptions.Error, function(msg) {
        jslix.exceptions.Error.call(this, msg);
        this.name = 'WrongElement';
    });
    var WrongElement = jslix.exceptions.WrongElement;

    var JIDInvalidException = jslix.exceptions.JIDInvalidException;

    // Types
    jslix.types = {};
    var types = jslix.types;
    types.FlagType = {
        to_js: function(value){
            return value;
        },
        from_js: function(value){
            return value;
        }
    }
    types.StringType = {
        to_js: function(value) {
            if (typeof(value) == 'string' || value === null)
                return value;
        },
        from_js: function(value) {
            return new String(value);
        }
    }
    types.IntegerType = {
        to_js: function(value) {
            if (typeof(value) == 'string')
                return Number(value)
        },
        from_js: function(value) {
            return new String(value);
        }
    }
    types.JIDType = {
        to_js: function(value) {
            if (!value) return value;
            try {
                var jid = new jslix.JID(value);
                return jid;
            } catch(e) {
                if (e instanceof JIDInvalidException) {
                    throw new ElementParseError('Invalid JID');
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
    // TODO: DateType, TimeType
    types.DateTimeType = {
        to_js: function(ts) {
            if (typeof(ts) != 'string') {
                throw new ElementParseError("Can't parse datetime");
            }
            // Copied from JSJaC
            var date = new Date(Date.UTC(ts.substr(0,4),
                                         ts.substr(5,2)-1,
                                         ts.substr(8,2),
                                         ts.substr(11,2),
                                         ts.substr(14,2),
                                         ts.substr(17,2)));
            if (ts.substr(ts.length-6,1) != 'Z') { // there's an offset
                var offset = new Date();
                offset.setTime(0);
                offset.setUTCHours(ts.substr(ts.length-5,2));
                offset.setUTCMinutes(ts.substr(ts.length-2,2));
                if (ts.substr(ts.length-6,1) == '+')
                    date.setTime(date.getTime() - offset.getTime());
                else if (ts.substr(ts.length-6,1) == '-')
                    date.setTime(date.getTime() + offset.getTime());
            }
            return date;
        },
        from_js: function(ts) {
            var padZero = function(i) {
                if (i < 10) return "0" + i;
                    return i;
            };

            var jDate = ts.getUTCFullYear() + "-";
            jDate += padZero(ts.getUTCMonth()+1) + "-";
            jDate += padZero(ts.getUTCDate()) + "T";
            jDate += padZero(ts.getUTCHours()) + ":";
            jDate += padZero(ts.getUTCMinutes()) + ":";
            jDate += padZero(ts.getUTCSeconds()) + "Z";

            return jDate;
        }
    }

    // Fields
    var Attr = function(name, required) 
    {
        this.name = name;
        this.required = required;
        this.type = null;
        this.field = true;
    };

    Attr.prototype.get_from_el = function(el) {
        var attr = el.attributes.getNamedItem(this.name);
        if (attr == null) {
            return undefined;
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
    
    var Node = function(name, xmlns, required, listed) 
    {
        this.name = name;
        this.xmlns = xmlns;
        this.required = required;
        this.type = null;
        this.field = true;
        this.listed = listed;
    };

    Node.prototype.toString = function() {
        return '<Node> ' + this.name + ':' + this.xmlns;
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
            if ((this.name === undefined || node.localName == this.name) && 
                 xmlns == node.namespaceURI) value[value.length] = node;
        }
        if (!this.listed) return value[0] || undefined;
        return value;
    };
    
    Node.prototype.put_to_el = function(el, values) {
        if (! this.listed) values = [values];
        for (var i=0; i<values.length; i++) {
            el.appendChild(values[i]);
        }
    };
    
    Node.prototype.clean_set = function(value) {
        return value;
    };
    
    Node.prototype.clean = function(value) {
        return value;
    };
    
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
            //objAttr.prototype = this.prototype;

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

    fields.DateTimeAttr = Class(
        fields.StringAttr,
        function() {
            fields.StringAttr.apply(this, arguments);
            this.type = types.DateTimeType;
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
    fields.FlagNode = Class(
        fields.Node,
        function(name, required, uri){
            fields.Node.call(this, name, uri, required, false);
            this.type = types.FlagType;
        },
        {
            put_to_el: function(stanza, value){
                if(!value)
                    return;
                var xmlns = this.xmlns || stanza.namespaceURI,
                    node = document.createElementNS(xmlns, this.name);
                stanza.appendChild(node);
            },
            get_from_el: function(el){
                var xmlns = this.xmlns || el.namespaceURI,
                    value = false;
                for(var i=0; i<el.childNodes.length; i++){
                    var node = el.childNodes[i];
                    if(this.name == node.localName && xmlns == node.namespaceURI){
                        value = true;
                        break;
                    }
                }
                return value;
            }
        });

    fields.StringNode = Class(
        fields.Node,
        function(name, required, listed, uri, self) {
            fields.Node.call(this, name, uri, required, listed);
            this.type = types.StringType;
            this.self = self;
        },
        {
            put_to_el: function(stanza, value) {
                var xmlns = this.xmlns || stanza.namespaceURI;
                if (this.self) {
                    var node = stanza;
                } else {
                    var node = document.createElementNS(xmlns, this.name);
                }
                var text_node = document.createTextNode(value);
                node.appendChild(text_node);
                if (!this.self)
                    stanza.appendChild(node);
            },
            get_from_el: function(el) {
                var self = this;
                var extract = function(value) {
                    if (value.childNodes.length == 0)
                        return null;
                    var s = '';
                    for (var i=0; i<value.childNodes.length; i++) {
                        var node = value.childNodes[i];
                        if (node.nodeName == '#text') {
                            s += node.nodeValue;
                        } else {
                            throw new ElementParseError(
                               "Wrong node type when TextNode " + self.toString() +
                               " parsing");
                        }
                    }
                    return s;
                }
                if (!this.self) {
                    var values = fields.Node.prototype.get_from_el.call(this, el);
                } else if(this.listed){
                    var values = [el];
                }else
                    var values = el;
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
                if(!stanza.__definition__) {
                    values = this.definition.create(values);
                }
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

    fields.DateTimeNode = Class(
        fields.StringNode,
        function() {
            fields.StringNode.apply(this, arguments);
            this.type = types.DateTimeType;
        }
    );

    fields.ConditionNode = Class(
        fields.Node,
        function(uri) {
            fields.Node.call(this, undefined, uri, false);
            this.type = types.StringType;
        },
        {
            'get_from_el': function(el) {
                var value = fields.Node.prototype.get_from_el.call(this, el);
                return value.localName;
            },
            'put_to_el': function(el, value) {
                value = document.createElementNS(this.xmlns, value);
                fields.Node.prototype.put_to_el.call(this, el, value);
            }
        }
    );

    jslix.createStanza = function(definition) {
    var retObj = 
        {
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
        };

    for (var key in definition)
    {
        var f = definition[key];

        if (typeof(f) == 'function') {
                retObj[key] = f;
            }
    }
    return retObj;
    };

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
                    throw (e);
                }
            }
            el = eel;
            if (!link) throw new WrongElement('Can\'t find "' + eel.xmlns + ':' + eel.element_name + '" child');
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
             definition.element_name[0] !== ':' &&
             el.localName != definition.element_name) || 
            definition.xmlns != el.namespaceURI) {
            throw new WrongElement();
        }
        var validate = function(value) {
            if (f.type)
                value = f.type.to_js(value);
            value = f.clean(value);
            return value;
        }
        var result = jslix.createStanza(definition);
        if (definition.element_name && definition.element_name[0] == ':') {
            result[definition.element_name.slice(1)] = el.localName;
        }
        for (var key in definition) {
            var f = definition[key];
            if (typeof(f) == 'object' && 'field' in f) {
                var value = f.get_from_el(el);
                if (f.listed) {
                    if (!value.length && f.required) throw new ElementParseError(f.name + ' is required field')
                    for (var i=0; i<value.length; i++) {
                        value[i] = validate(value[i]);
                    }
                } else {
                    value = validate(value);
                }

                var validator = definition['clean_' + key];
                if (validator !== undefined) {
                    value = validator.call(definition, value);
                } // TODO: final validator?

                result[key] = value;
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
        var element_name = obj.__definition__.element_name;
        if (element_name && element_name[0] == ':') {
            element_name = obj[element_name.slice(1)];
        }
        if (element_needed) {
            var doc = document.createElementNS(obj.__definition__.xmlns,
                                               element_name);
            var stanza = doc;
        } else {
            var doc = document.implementation.createDocument(
                obj.__definition__.xmlns, element_name, null);
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

  window.jslix = jslix;
})();
