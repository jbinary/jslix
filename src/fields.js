"use strict";
define(['jslix/common', 'jslix/class', 'jslix/types', 'jslix/exceptions'],
    function(jslix, Class, types, exceptions){

    var fields = {};

    // Attr fields

    var Attr = function(name, required){
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

    fields.Attr = Attr;

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

    var Node = function(name, xmlns, required, listed){
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

    fields.Node = Node;

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
                            throw new exceptions.ElementParseError(
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

    return fields;

});
