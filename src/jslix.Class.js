"use strict";
define(function(){
    var Class = function(parent, constructor, fields) {
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
    };
    
    return Class;

});
