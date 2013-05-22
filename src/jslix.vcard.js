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
    var vcard = jslix.vcard.prototype;

    vcard._name = 'jslix.vcard';
    vcard.VCARD_NS = 'vcard-temp';

    var base_ns = jslix.Element({
        xmlns: vcard.VCARD_NS
    });

    var base_query = jslix.Element({
        element_name: 'vCard'
    }, [base_ns, jslix.stanzas.QueryStanza]);

    vcard.NameStanza = jslix.Element({
        element_name: 'N',
        
        family_name: new fields.StringNode('FAMILY'),
        given_name: new fields.StringNode('GIVEN'),
        middle_name: new fields.StringNode('MIDDLE')
    }, [base_ns]);

    vcard.OrganizationStanza = jslix.Element({
        element_name: 'ORG',

        name: new fields.StringNode('ORGNAME'),
        unit: new fields.StringNode('ORGUNIT')
    }, [base_ns]);

    vcard.TelephoneStanza = jslix.Element({
        // TODO
    }, [base_ns]);

    vcard.AddressStanza = jslix.Element({
        // TODO
    }, [base_ns]);

    vcard.EmailStanza = jslix.Element({
        // TODO
    }, [base_ns]);

    vcard.PhotoStanza = jslix.Element({
        element_name: 'PHOTO',

        type: new fields.StringNode('TYPE'),
        binval: new fields.StringNode('BINVAL')
    }, [base_ns]);

    vcard.VCardStanza = jslix.Element({
        full_name: new fields.StringNode('FN'),
        name: new fields.ElementNode(vcard.NameStanza),
        nickname: new fields.StringNode('NICKNAME'),
        url: new fields.StringNode('URL'),
        birthday: new fields.StringNode('BDAY'),
        organization: new fields.ElementNode(vcard.OrganizationStanza),
        title: new fields.StringNode('TITLE'),
        role: new fields.StringNode('ROLE'),
        // telephones TODO
        // addresses TODO
        // emails TODO
        jid: new fields.StringNode('JABBERID'),
        description: new fields.StringNode('DESC'),
        photo: new fields.ElementNode(vcard.PhotoStanza)
    }, [base_query]);

    vcard.RequestStanza = jslix.Element({
        result_class: vcard.VCardStanza
    }, [base_query]);

    vcard.init = function() {
        // TODO: add disco feature
    }

    vcard.get = function(jid, from) {
        from = from || this._dispatcher.connection.jid;
        var request = this.RequestStanza.create({
            parent: jslix.stanzas.IQStanza.create({
                type: 'get', to: jid, from: from
            })
        });
        return this._dispatcher.send(request);       
    }

})();
