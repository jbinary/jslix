#!/usr/bin/env bash
if [ ! -d "libs" ]; then
    mkdir libs
fi
curl -L http://code.jquery.com/jquery-1.9.1.js > libs/jquery.js
curl -L https://github.com/millermedeiros/js-signals/raw/master/dist/signals.js > libs/signals.js
curl -L https://github.com/brix/crypto-js/archive/release-3.1.2.zip > tmp.zip && unzip -jq tmp.zip crypto-js-release-3.1.2/src/*.js -d libs/cryptojs && rm tmp.zip
curl -L http://netcologne.dl.sourceforge.net/project/log4javascript/log4javascript/1.4.6/log4javascript-1.4.6.tar.gz | tar xzfO - log4javascript-1.4.6/log4javascript_uncompressed.js > libs/log4javascript.js
curl -L http://requirejs.org/docs/release/2.1.6/comments/require.js > libs/require.js
