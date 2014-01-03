define(['jslix/fields', 'jslix/stanzas', 'jslix/jingle/errors'],
    function(fields, stanzas, errors) {
    var jingle = {};
    // XEP-0294: RTCP Negotiation Stanzas
    jingle.RTCPFBElement = stanzas.Element({
        element_name: 'rtcp-fb',
        xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0',
        type: new fields.StringAttr('type', true), // TODO: validate
        subtype: new fields.StringAttr('subtype', true) // TODO: validate
    });

    jingle.RTCPFBTRRIntElement = stanzas.Element({
        element_name: 'rtcp-fb-trr-int',
        xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0', // TODO: derive?
        value: new fields.IntegerAttr('value', true)
    });

    // XEP-0320: DTLS-SRTP Negotiation Stanzas
    jingle.FingerprintElement = stanzas.Element({
        element_name: 'fingerprint',
        xmlns: 'urn:xmpp:tmp:jingle:apps:dtls:0',
        hash: new fields.StringAttr('hash', true),
        required: new fields.BooleanAttr('required'),
        fingerprint: new fields.StringNode(undefined, true, false, undefined, true)
    });

    // Payload description stanzas
    jingle.ParameterElement = stanzas.Element({
        element_name: 'parameter',
        name: new fields.StringAttr('name', true),
        value: new fields.StringAttr('value', true)
    });

    jingle.PayloadElement = stanzas.Element({
        element_name: 'payload-type',
        id: new fields.StringAttr('id', true),
        name: new fields.StringAttr('name', true),
        clockrate: new fields.IntegerAttr('clockrate', false),
        channels: new fields.IntegerAttr('channels', false),
        parameters: new fields.ElementNode(jingle.ParameterElement, false, true),
        'rtcp-fb': new fields.ElementNode(jingle.RTCPFBElement, false),
        'rtcp-fb-trr-int': new fields.ElementNode(jingle.RTCPFBTRRIntElement, false)
    });

    // Encryption
    jingle.CryptoElement = stanzas.Element({
        element_name: 'crypto',
        'crypto-suite': new fields.StringAttr('crypto-suite'),
        'key-params': new fields.StringAttr('key-params'),
        'session-params': new fields.StringAttr('session-params'),
        'tag': new fields.StringAttr('tag')
    });

    jingle.EncryptionElement = stanzas.Element({
        element_name: 'encryption',
        required: new fields.IntegerAttr('required', false),
        crypto: new fields.ElementNode(jingle.CryptoElement, true, true)
    });

    jingle.RTPHeaderExtElement = stanzas.Element({
        element_name: 'rtp-hdrext',
        xmlns: 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0',
        uri: new fields.StringAttr('uri', true),
        id: new fields.StringAttr('id', true),
        senders: new fields.StringAttr('senders')
    });

    jingle.DescriptionElement = stanzas.Element({
        xmlns: 'urn:xmpp:jingle:apps:rtp:1',
        element_name: 'description',
        media: new fields.StringAttr('media', true), // TODO: validate this
        ssrc: new fields.StringAttr('ssrc', false),
        payloads: new fields.ElementNode(jingle.PayloadElement, true, true),
        encryption: new fields.ElementNode(jingle.EncryptionElement),
        'rtcp-mux': new fields.FlagNode('rtcp-mux', false),
        'rtcp-fb': new fields.ElementNode(jingle.RTCPFBElement, false),
        'rtcp-fb-trr-int': new fields.ElementNode(jingle.RTCPFBTRRIntElement, false),
        'rtp-headers': new fields.ElementNode(jingle.RTPHeaderExtElement, false, true)
    });

    // Transport description stanzas
    jingle.CandidateElement = stanzas.Element({
        element_name: 'candidate',
        component: new fields.IntegerAttr('component', true),
        foundation: new fields.IntegerAttr('foundation', true),
        generation: new fields.IntegerAttr('generation', true),
        id: new fields.StringAttr('id', true),
        ip: new fields.StringAttr('ip', true), // TODO: validate?
        port: new fields.IntegerAttr('port', true),
        network: new fields.IntegerAttr('network', false),
        priority: new fields.IntegerAttr('priority', true),
        protocol: new fields.StringAttr('protocol', true),
        type: new fields.StringAttr('type', false),
        'rel-port': new fields.IntegerAttr('rel-port', false),
        'rel-addr': new fields.StringAttr('rel-addr', false)
    });
    jingle.IceTransportElement = stanzas.Element({
        element_name: 'transport',
        xmlns: 'urn:xmpp:jingle:transports:ice-udp:1',
        pwd: new fields.StringAttr('pwd', true),
        ufrag: new fields.StringAttr('ufrag', true),
        candidates: new fields.ElementNode(jingle.CandidateElement, false, true),
        fingerprint: new fields.ElementNode(jingle.FingerprintElement)
    });

    // Content description
    jingle.ContentElement = stanzas.Element({
        element_name: 'content',
        creator: new fields.StringAttr('creator', true),
        senders: new fields.StringAttr('senders', false), // TODO: validate
        name: new fields.StringAttr('name', true),
        description: new fields.ElementNode(jingle.DescriptionElement),
        transport: new fields.ElementNode(jingle.IceTransportElement),
    });

    jingle.ReasonElement = stanzas.Element({
        element_name: 'reason',
        condition: new fields.ConditionNode(undefined, true),
        text: new fields.StringNode('text'),
        rtp_condition: new fields.ConditionNode(
            'urn:xmpp:jingle:apps:rtp:errors:1')
    });

    // The main element
    jingle.JingleQuery = stanzas.Element({
        error_class: errors.ErrorStanza,
        element_name: 'jingle',
        xmlns: 'urn:xmpp:jingle:1',
        action: new fields.StringAttr('action', true),
        initiator: new fields.JIDAttr('initiator'),
        sid: new fields.StringAttr('sid', true),
        contents: new fields.ElementNode(jingle.ContentElement, false, true),
        reason: new fields.ElementNode(jingle.ReasonElement)
    }, [stanzas.QueryStanza]);
    return jingle;
});
