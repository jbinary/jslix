(function(){
    var jslix = window.jslix;
    jslix.connection = function(jid, password){
        this.jid = new jslix.JID(jid);
        this.password = password;
    }
})();
