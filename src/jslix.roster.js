"use strict";
(function(){

    var jslix = window.jslix;

    jslix.roster = function(dispatcher){
        this._dispatcher = dispatcher;
    }

    jslix.roster.name = 'jslix.roster';

    jslix.roster.ROSTER_NS = 'jabber:iq:roster';

    jslix.roster.stanzas = {};

    jslix.roster.stanzas.request = jslix.Element({
        xmlns: jslix.roster.ROSTER_NS
    }, [jslix.stanzas.query]);

})();
