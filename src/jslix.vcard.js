/*
 * JSLiX VCard implementation (XEP-0054)
 * 
 */

"use strict";
define(['jslix.fields', 'jslix.stanzas'], function(fields, stanzas) {

    var plugin = function(dispatcher) {
        this._dispatcher = dispatcher;
    };

    var vcard = plugin.prototype,
        Element = stanzas.Element;

    vcard._name = 'jslix.VCard';
    vcard.VCARD_NS = 'vcard-temp';

    var base_ns = Element({
        xmlns: vcard.VCARD_NS
    });

    var base_query = Element({
        element_name: 'vCard'
    }, [base_ns, stanzas.QueryStanza]);

    vcard.NameStanza = Element({
        element_name: 'N',
        
        family_name: new fields.StringNode('FAMILY'),
        given_name: new fields.StringNode('GIVEN'),
        middle_name: new fields.StringNode('MIDDLE')
    }, [base_ns]);

    vcard.OrganizationStanza = Element({
        element_name: 'ORG',

        name: new fields.StringNode('ORGNAME'),
        unit: new fields.StringNode('ORGUNIT')
    }, [base_ns]);

    vcard.TelephoneStanza = Element({
        // TODO
    }, [base_ns]);

    vcard.AddressStanza = Element({
        // TODO
    }, [base_ns]);

    vcard.EmailStanza = Element({
        // TODO
    }, [base_ns]);

    vcard.PhotoStanza = Element({
        element_name: 'PHOTO',

        type: new fields.StringNode('TYPE'),
        binval: new fields.StringNode('BINVAL')
    }, [base_ns]);

    vcard.VCardStanza = Element({
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

    vcard.RequestStanza = Element({
        result_class: vcard.VCardStanza
    }, [base_query]);

    vcard.init = function() {
        // TODO: add disco feature
    }

    vcard.get = function(jid, from) {
        from = from || this._dispatcher.connection.jid;
        var request = this.RequestStanza.create({
            parent: stanzas.IQStanza.create({
                type: 'get', to: jid, from: from
            })
        });
        return this._dispatcher.send(request);       
    }

    return plugin;

});
