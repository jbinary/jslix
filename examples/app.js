require.config({
    baseUrl: '/src',
    paths: {
        libs: '/libs',
        cryptojs: '/libs/cryptojs'
    },
    shim: {
        'libs/log4javascript': {
            exports: 'log4javascript'
        },
        'libs/jquery': {
            exports: '$'
        },
        'cryptojs/components/core': {
            exports: 'CryptoJS'
        },
        'cryptojs/components/md5': {
            deps: ['cryptojs/components/core'],
            exports: 'CryptoJS.MD5'
        },
        'cryptojs/components/sha1': {
            deps: ['cryptojs/components/core'],
            exports: 'CryptoJS.SHA1'
        },
        'cryptojs/components/enc-base64': {
            deps: ['cryptojs/components/core'],
            exports: 'CryptoJS.enc.Base64'
        }
    }
});

require(['jslix.Client', 'jslix.disco', 'jslix.caps', 'jslix.version',
         'jslix.stanzas', 'libs/jquery', 'jslix.sasl.mechanisms.plain',
         'jslix.sasl.mechanisms.digest_md5'],
    function(Client, Disco, Caps, Version, stanzas, $){
        $(function(){
            $(document).on('submit', '#loginForm', function(evt){
                var options = {
                        http_base: this.http_base.value,
                        jid: this.jid.value,
                        password: this.password.value,
                        register: this.register.checked
                    },
                    client = new Client(options);
                client.connect().done(function(){
                    var disco_plugin = client.registerPlugin(Disco),
                        plugins_options = {
                            'disco_plugin': disco_plugin,
                            'storage': sessionStorage,
                            'name': 'jslix',
                            'version': 'beta'
                        };
                    disco_plugin.registerIdentity('client', 'web', 'jslix');
                    client.registerPlugin(Version, plugins_options).init();
                    disco_plugin.init();
                    client.registerPlugin(Caps, plugins_options);
                    client.send(stanzas.PresenceStanza.create());
                });
                window.client = client;
                return false;
            });
        });
});
