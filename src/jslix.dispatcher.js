"use strict";
(function(){

    var jslix = window.jslix;

    jslix.dispatcher = function(connection) {
        this.connection = connection;
        this.handlers = [];
        this.top_handlers = [];
        this.deferreds = {};
        this.plugins = {};
    }

    jslix.dispatcher._name = 'jslix.dispatcher';

    var dispatcher = jslix.dispatcher;

    dispatcher.prototype.registerPlugin = function(plugin){
        // XXX: We don't use any aditional plugin initialization yet.
        if(!this.plugins[plugin._name]){
            this.plugins[plugin._name] = new plugin(this);
        }
        return this.plugins[plugin._name];
    }

    dispatcher.prototype.unregisterPlugin = function(plugin){

        var remove_handlers = function(value){
            return !value[2] == plugin._name;
        };

        this.top_handlers = this.top_handlers.filter(remove_handlers);
        this.handlers = this.handlers.filter(remove_handlers);
        delete this.plugins[plugin._name];
    }

    dispatcher.prototype.addHandler = function(handler, host, plugin_name){
        if(typeof handler.handler == 'function'){
            this.top_handlers[this.top_handlers.length] = [handler, host, plugin_name];
        }else{
            this.handlers[this.handlers.length] = [handler, host, plugin_name];
        }
    }

    dispatcher.prototype.dispatch = function(el) {
        if(el.nodeName != '#document'){
            var doc = document.implementation.createDocument(null, null, null);
            doc.appendChild(el);
            el = doc;
        }
        for (var i=0; i<this.top_handlers.length; i++) {
            try {
                var top = jslix.parse(el, this.top_handlers[i][0]);
                var host = this.top_handlers[i][1];
            } catch (e) {
                var top = null;
            }
            if(top){
                var func = top.handler;
                var result = func.call(host, top);
                if(result){
                    if(!(result instanceof jslix.stanzas.break_stanza))
                        this.send(result);
                    break;
                }
            }
        }
        if(top) return;

        var tops = [jslix.stanzas.iq, jslix.stanzas.presence,
                    jslix.stanzas.message];
        for (var i=0; i<tops.length; i++) {
            try {
                var top = jslix.parse(el, tops[i]);
                break;
            } catch (e) {}
        }
        if(!top)
            return;
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
        if(!this.handlers.length && can_error){
            this.send(top.makeError('feature-not-implemented'));
            return;
        } else if (this.handlers.length)
            loop();
    }

    dispatcher.prototype.send = function(els) {
        if(els.length === undefined) els = [els];
        var d = null;
        for (var i=0; i<els.length; i++) {
            var el = els[i];
            if(el instanceof jslix.stanzas.empty_stanza)
                continue;
            var top = el.getTop();
            if (top.__definition__.element_name == 'iq' && 
                ['get', 'set'].indexOf(top.type) != -1) {
                d = new $.Deferred();
                this.deferreds[top.id] = [d, el];
                // TODO: implement timeouts
            }
            this.connection.send(jslix.build(top));
        }
        return d;
    }

})();
