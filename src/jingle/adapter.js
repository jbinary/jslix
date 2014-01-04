"use strict";
// mozilla chrome compat layer -- very similar to adapter.js
// adapted from https://github.com/ESTOS/strophe.jingle
define(['jslix/jingle/signals'], function(signals) {
    var adapter = {},
        RTC = null;
    adapter.setupRTC = function() {
        if (RTC) {
            return RTC;
        }
        if (navigator.mozGetUserMedia && mozRTCPeerConnection) {
            console.log('This appears to be Firefox');
            var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1]);
            if (version >= 22) {
                RTC = {
                    peerconnection: mozRTCPeerConnection,
                    browser: 'firefox',
                    getUserMedia: navigator.mozGetUserMedia.bind(navigator),
                    attachMediaStream: function(element, stream) {
                        element[0].mozSrcObject = stream;
                        element[0].play();
                    },
                    pc_constraints: {}
                };
                if (!MediaStream.prototype.getVideoTracks)
                    MediaStream.prototype.getVideoTracks = function() { return []; };
                if (!MediaStream.prototype.getAudioTracks)
                    MediaStream.prototype.getAudioTracks = function() { return []; };
                var RTCSessionDescription = mozRTCSessionDescription;
                var RTCIceCandidate = mozRTCIceCandidate;
            }
        } else if (navigator.webkitGetUserMedia) {
            console.log('This appears to be Chrome');
            RTC = {
                peerconnection: webkitRTCPeerConnection,
                browser: 'chrome',
                getUserMedia: navigator.webkitGetUserMedia.bind(navigator),
                attachMediaStream: function(element, stream) {
                    element.attr('src', webkitURL.createObjectURL(stream));
                },
                // DTLS should now be enabled by default but..
                pc_constraints: {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]}
            };
            if (navigator.userAgent.indexOf('Android') != -1) {
                RTC.pc_constraints = {}; // disable DTLS on Android
            }
            if (!webkitMediaStream.prototype.getVideoTracks) {
                webkitMediaStream.prototype.getVideoTracks = function()
                { return this.videoTracks; };
            }
            if (!webkitMediaStream.prototype.getAudioTracks) {
                webkitMediaStream.prototype.getAudioTracks = function()
                { return this.audioTracks; };
            }
        }
        if (RTC == null) {
            try { console.log('Browser does not appear to be WebRTC-capable'); } catch (e) { }
        }
        return RTC;
    }

    adapter.getUserMediaWithConstraints = function(RTC, um, resolution, bandwidth, fps) {
        var constraints = {audio: false, video: false};

        if ($.inArray('video', um) >= 0) {
            constraints.video = {mandatory:{}}; // same behaviour as true
        }
        if ($.inArray('audio', um) >= 0) {
            constraints.audio = {}; // same behaviour as true
        }
        if ($.inArray('screen', um) >= 0) {
            constraints.video = {
                "mandatory": {
                    "chromeMediaSource": "screen"
                }
            }
        }

        if (resolution && !constraints.video) {
            constraints.video = {mandatory:{}};// same behaviour as true
        }
        // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
        var v = constraints.video.mandatory;
        switch (resolution) {
            // 16:9 first
            case '1080':
            case 'fullhd':
                v.minWidth = 1920;
                v.minHeight = 1080;
                v.minAspectRatio = 1.77;
                break;
            case '720':
            case 'hd':
                v.minWidth = 1280;
                v.minHeight = 720;
                v.minAspectRatio = 1.77;
                break;
            case '360':
                v.minWidth = 640;
                v.minHeight = 360;
                v.minAspectRatio = 1.77;
                break;
            case '180':
                v.minWidth = 320;
                v.minHeight = 180;
                v.minAspectRatio = 1.77;
                break;
                // 4:3
            case '960':
                v.minWidth = 960
                v.minHeight = 720;
                break;
            case '640':
            case 'vga':
                v.maxWidth = 640;
                v.maxHeight = 480;
                break;
            case '320':
                v.maxWidth = 320;
                v.maxHeight = 240;
                break;
            default:
                if (navigator.userAgent.indexOf('Android') != -1) {
                    v.maxWidth = 320;
                    v.maxHeight = 240;
                    v.maxFrameRate = 15;
                }
                break;
        }

        if (bandwidth) { // doesn't work currently, see webrtc issue 1846
            if (!constraints.video) constraints.video = {mandatory: {}};
            constraints.video.optional = [{bandwidth: bandwidth}];
        }
        if (fps) { // for some cameras it might be necessary to request 30fps
            // so they choose 30fps mjpg over 10fps yuy2
            if (!constraints.video) constraints.video = {mandatory: {}};
            constraints.video.mandatory['minFrameRate'] = fps;
        }

        try {
            RTC.getUserMedia(constraints,
                    function(stream) {
                        console.log('onUserMediaSuccess');
                        signals.media.ready.dispatch(stream);
                    },
                    function(error) {
                        console.warn('Failed to get access to local media. Error ', error);
                        signals.media.failure.dispatch();
                    });
        } catch (e) {
            console.error('GUM failed: ', e);
            signals.media.failure.dispatch();
        }
    }
    return adapter;
});
