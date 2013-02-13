/*
 * JSLiX VCard implementation (XEP-0054)
 * 
 */

"use strict";
(function() {
    var jslix = window.jslix;
    var fields = jslix.fields;
    var Signal;
    
    jslix.vcard = function(dispatcher) {
        this._dispatcher = dispatcher;
    }
    var vcard = jslix.vcard;

    vcard._name = 'jslix.vcard';
    vcard.VCARD_NS = 'vcard-temp';

    vcard.stanzas = {};
    var stanzas = vcard.stanzas;

    var base_ns = jslix.Element({
        xmlns: vcard.VCARD_NS
    });

    var base_query = jslix.Element({
        element_name: 'vCard'
    }, [base_ns, jslix.stanzas.query]);

    stanzas.name = jslix.Element({
        element_name: 'N',
        
        family_name: new fields.StringNode('FAMILY'),
        given_name: new fields.StringNode('GIVEN'),
        middle_name: new fields.StringNode('MIDDLE')
    }, [base_ns]);

    stanzas.organization = jslix.Element({
        element_name: 'ORG',

        name: new fields.StringNode('ORGNAME'),
        unit: new fields.StringNode('ORGUNIT')
    }, [base_ns]);

    stanzas.telephone = jslix.Element({
        // TODO
    }, [base_ns]);

    stanzas.address = jslix.Element({
        // TODO
    }, [base_ns]);

    stanzas.email = jslix.Element({
        // TODO
    }, [base_ns]);

    stanzas.photo = jslix.Element({
        element_name: 'PHOTO',

        type: new fields.StringNode('TYPE'),
        binval: new fields.StringNode('BINVAL')
    }, [base_ns]);

    stanzas.vcard = jslix.Element({
        full_name: new fields.StringNode('FN'),
        name: new fields.ElementNode(stanzas.name),
        nickname: new fields.StringNode('NICKNAME'),
        url: new fields.StringNode('URL'),
        birthday: new fields.StringNode('BDAY'),
        organization: new fields.ElementNode(stanzas.organization),
        title: new fields.StringNode('TITLE'),
        role: new fields.StringNode('ROLE'),
        // telephones TODO
        // addresses TODO
        // emails TODO
        jid: new fields.StringNode('JABBERID'),
        description: new fields.StringNode('DESC'),
        photo: new fields.ElementNode(stanzas.photo)
    }, [base_query]);

    stanzas.request = jslix.Element({
        result_class: stanzas.vcard
    }, [base_query]);

    vcard.prototype.init = function() {
        // TODO: add disco feature
    }

    vcard.prototype.get = function(jid, from) {
        from = from || this._dispatcher.connection.jid;
        var request = stanzas.request.create({
            parent: jslix.stanzas.iq.create({type: 'get', to: jid, from: from})
        });
        return this._dispatcher.send(request);       
    }

})();
