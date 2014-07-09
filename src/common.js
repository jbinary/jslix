"use strict";
define(['jslix/exceptions'],
    function(exceptions){

    var jslix = {};

    jslix.createStanza = function(definition) {
        var retObj = {
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
                    if (!parent.__definition__ &&
                        this.__definition__.parent_element) {
                        parent = this.__definition__.parent_element.create(
                            parent
                        );
                    }
                    parent.link(this);
                }
            };

        for (var key in definition){

            var f = definition[key];

            if (typeof(f) == 'function') {
                    retObj[key] = f;
            }
        }

        return retObj;
    };

    // IEFIX: This shit needed for IE8 and IE9
    jslix.get_local_name = function(node){
        if(node.localName && node.localName.indexOf(':') == -1){
            return node.localName;
        }else{
            return node.nodeName.substr(node.nodeName.indexOf(':')+1);
        }
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
                    if (e instanceof exceptions.WrongElement) continue;
                    throw (e);
                }
            }
            el = eel;
            if (!link){
                throw new exceptions.WrongElement(
                    'Can\'t find "' + link_def.xmlns + ':' + link_def.element_name + '" child'
                );
            }
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
        var localName = jslix.get_local_name(el);
        if ((definition.element_name &&
             definition.element_name[0] !== ':' &&
             localName != definition.element_name) || 
            definition.xmlns != el.namespaceURI) {
            throw new exceptions.WrongElement();
        }
        var validate = function(value) {
            if (f.type)
                value = f.type.to_js(value);
            value = f.clean(value);
            return value;
        }
        var result = jslix.createStanza(definition);
        if (definition.element_name && definition.element_name[0] == ':') {
            result[definition.element_name.slice(1)] = localName;
        }
        for (var key in definition) {
            var f = definition[key];
            if (typeof(f) == 'object' && 'field' in f) {
                var value = f.get_from_el(el);
                if (f.listed) {
                    if (!value.length && f.required){
                        throw new exceptions.ElementParseError(
                            f.name + ' is required field'
                        )
                    }
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

    jslix.build = function(obj, element_needed, parent) {
        var element_name = obj.__definition__.element_name,
            ns = obj.__definition__.xmlns || (parent ? parent.namespaceURI : null);
        if (element_name && element_name[0] == ':') {
            element_name = obj[element_name.slice(1)];
        }
        var doc = document.implementation.createDocument(ns, element_name, null);
        var stanza = doc.firstChild;
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
        return element_needed ? doc.firstChild : doc;
    }

  return jslix;

});
