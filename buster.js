var config = module.exports;

config['jslix'] = {
    env: 'browser',
    rootPath: './',
    /* We can safe preload libs only if they don't use define function */
    libs: [
        'libs/require.js',
        'require-config.js',
        'libs/log4javascript.js',
        'libs/cryptojs/components/core.js',
        'libs/cryptojs/components/enc-base64.js',
        'libs/cryptojs/components/md5.js',
        'libs/cryptojs/components/sha1.js'
    ],
    /* If lib use define function you can add this lib to sources */
    sources: ['src/*.js'],
    resources: ['libs/jquery.js', 'libs/signals.js'],
    tests: ['tests/*.test.js'],
    extensions: [/*require('buster-coverage'),*/ require('buster-amd')],
    /*'buster-coverage': {
        outputDirectory: 'coverage',
        format: 'lcov',
        combinedResultsOnly: true,
        coverageExclusions: ['libs', 'resources']
    },*/
    'buster-amd': {
        pathMapper: function(path){
            return path.replace(/\.js$/, '').replace(/^\//, '../');
        }
    }
};
