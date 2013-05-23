"use strict";
(function(){
    var jslix = window.jslix,
        logging = window.log4javascript;

    jslix.logging = {
        settings: !logging ? undefined : {
            layouts: {
                'default': new logging.PatternLayout('%d %p %c - %m%n')
            },
            appenders: {
                'default': new logging.BrowserConsoleAppender()
            },
            'jslix.Dispatcher': {
                level: 'ALL',
                layout: 'default',
                appenders: ['default']
            }
        },
        getLogger: function(logger_name, level, layout, appenders){
            if(logging){
                var logger_settings = this.settings[logger_name] || {},
                    level = level instanceof logging.Level ? level : logging.Level[level || logger_settings.level || 'ALL'],
                    layout = layout instanceof logging.Layout ? layout : this.settings.layouts[layout || logger_settings.layout || 'default'];
                if(appenders != undefined){
                    var appenders = appenders instanceof Array ? appenders : [appenders];
                }else{
                    var appenders = logger_settings.appenders || ['default'];
                }
                for(var i=0; i<appenders.length; i++){
                    var appender = appenders[i];
                    appenders[i] = appender instanceof logging.Appender ? appender : this.settings.appenders[appender];
                }
                var logger = logging.getLogger(logger_name);
                for(var i=0; i<appender.length; i++){
                    var appender = appenders[i];
                    appender.setLayout(layout);
                    logger.addAppender(appender);
                }
                return logger;
            }else{
                var stub = new Function(),
                    fake_logger = {
                        trace: stub,
                        debug: stub,
                        info: stub,
                        warn: stub,
                        error: stub,
                        fatal: stub
                    };
                return fake_logger;
            }
        }
    }

})();
