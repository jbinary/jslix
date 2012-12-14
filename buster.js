var config = module.exports;

config['jslix'] = {
    env: 'browser',
    rootPath: './',
    libs: [
        'libs/jquery.js',
        'libs/cryptojs/rollups/md5.js',
        'libs/cryptojs/components/core.js',
        'libs/cryptojs/components/enc-base64.js',
    ],
    sources: [
        'src/jslix.js',
        'src/jslix.stanzas.js',
        'src/jslix.bind.js',
        'src/jslix.session.js',
        'src/jslix.dispatcher.js',
        'src/jslix.JID.js',
        'src/jslix.sasl.js',
        'src/jslix.sasl.mechanisms.*.js',
        'src/jslix.connection.js',
        'src/jslix.connection.transports.*.js',
        'src/jslix.version.js'
    ],
    tests: ['tests/*.js'],
    extensions: [require('buster-coverage')],
    'buster-coverage': {
        outputDirectory: 'coverage',
        format: 'lcov',
        combinedResultsOnly: true,
        coverageExclusions: ['libs']
    }
};
