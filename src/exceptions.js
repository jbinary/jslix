"use strict";
define(['jslix/class'], function(Class){

    var exceptions = {};

    exceptions.Error = Class(Error, function(msg) {
        this.name = 'JslixError';
        this.message = msg;
        this.stack = new Error().stack;
    });

    exceptions.ElementParseError = Class(exceptions.Error, function(msg) {
        exceptions.Error.call(this, msg);
        this.name = 'ElementParseError';
    });

    exceptions.WrongElement = Class(exceptions.Error, function(msg) {
        exceptions.Error.call(this, msg);
        this.name = 'WrongElement';
    });

    return exceptions;

});
