require.config({
    baseUrl: 'src',
    paths: {
        'jslix': '../src',
        'libs': '../libs',
        'cryptojs': '../libs/cryptojs/components'
    },
    shim: {
        'libs/log4javascript': {
            exports: 'log4javascript'
        },
        'libs/jquery': {
            exports: '$'
        },
        'cryptojs/core': {
            exports: 'CryptoJS'
        },
        'cryptojs/md5': {
            deps: ['cryptojs/core'],
            exports: 'CryptoJS.MD5'
        },
        'cryptojs/sha1': {
            deps: ['cryptojs/core'],
            exports: 'CryptoJS.SHA1'
        },
        'cryptojs/enc-base64': {
            deps: ['cryptojs/core'],
            exports: 'CryptoJS.enc.Base64'
        }
    }
});
