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
        // XXX: Next two libs use define
        // If we add it's to here we got error
        // Link: http://requirejs.org/docs/errors.html#mismatch
        // 'libs/jquery.js',
        // 'libs/signals.js'
    ],
    sources: ['src/*.js'],
    /* If lib use define function you can add this lib to resources */
    resources: ['libs/jquery.js', 'libs/signals.js'],
    tests: ['tests/*.test.js'],
    /* buster-coverage don't work with buster-amd */
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
