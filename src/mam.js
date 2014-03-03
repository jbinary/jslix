"use strict";
define(['jslix/fields', 'jslix/stanzas', 'jslix/forwarded', 'jslix/common'],
function(fields, stanzas, forwarded, jslix) {
    var Element = stanzas.Element;
    var plugin = function(dispatcher, options) {
        this._dispatcher = dispatcher;
        this.options = options || {};
        if (!this.options.forwarded_plugin) {
            this.forwarded = dispatcher.registerPlugin(forwarded);
            this.ForwardedMessage = Element({
                parent_element: mam.ResultStanza,
                node: new fields.Node('message', 'jabber:client'),
                anyHandler: function(stanza, top) {
                    var qid = stanza.parent.query_id;
                    if (qid in this.handlers) {
                        $.each(this.handlers[qid], function() {
                            var handler = undefined;
                            try {
                                var handler = jslix._parse(stanza.node, this);
                            } catch(e) {}
                            if (handler) {
                                stanza.link(handler);
                                handler.mamHandler(handler);
                            }
                        });
                        return new stanzas.EmptyStanza();
                    }
                }
            }, [this.forwarded.ForwardedStanza]);
        } else {
            this.forwarded = options.forwarded_plugin;
        }
        this.handlers = {};
    }


    var mam = plugin.prototype;
    mam._name = 'jslix.MAM';
    mam.NS = 'urn:xmpp:mam:tmp';
    mam.QueryStanza = Element({
        xmlns: mam.NS,
        query_id: new fields.StringAttr('queryid'),
        with_filter: new fields.JIDNode('with'),
        start: new fields.DateTimeNode('start'),
        end: new fields.DateTimeNode('end')
    }, [stanzas.QueryStanza]);

    mam.ResultStanza = Element({
        parent_element: stanzas.MessageStanza,
        element_name: 'result',
        xmlns: mam.NS,

        query_id: new fields.StringAttr('queryid'),
        id: new fields.StringAttr('id', true),
    });

    mam.init = function() {
        this._dispatcher.addHandler(this.ForwardedMessage, this, this._name);
    }

    mam.get = function(handlers, with_filter, start, end, query_id) {
        // TODO: RSM
        if (handlers && !query_id) {
            query_id = Math.random().toString();
        }
        var query = this.QueryStanza.create({
            query_id: query_id,
            with_filter: with_filter,
            start: start,
            end: end,
            parent: {
                type: 'get'
            }
        });
        if (handlers) {
            if (!(handlers instanceof Array)) {
                handlers = [handlers];
            }
            this.handlers[query_id] = handlers;
        }
        return this._dispatcher.send(query);
    }
    return plugin;
});
