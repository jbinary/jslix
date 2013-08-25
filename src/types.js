"use strict";
define(['jslix/jid'], function(JID){

    var types = {};

    types.FlagType = {
        to_js: function(value){
            return value;
        },
        from_js: function(value){
            return value;
        }
    }

    types.BooleanType = {
        to_js: function(value) {
            var map = {
                '1': true,
                '0': false,
                'true': true,
                'false': false
            }
            return map[value];
        },
        from_js: function(value) {
            return !!value;
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
                var jid = new JID(value);
                return jid;
            } catch(e) {
                if (e instanceof JID.exceptions.JIDInvalidException) {
                    throw new exceptions.ElementParseError('Invalid JID');
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
                throw new exceptions.ElementParseError("Can't parse datetime");
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

    return types;

});
