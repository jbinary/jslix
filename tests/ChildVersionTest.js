var ChildVersionTest = buster.testCase('ChildVersionTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
        this.options = {
            name: 'hell',
            version: '2.0'
        };
    },
    testInheritance: function(){
       var test = this,
           testClassExample = jslix.Class(
                jslix.version,
                function(dispatcher, options){
                    jslix.version.call(this, dispatcher, options);
                    this.setVersion(Math.floor((Math.random()*10)+1));
                }
            ),
           sample;

        refute.exception(function(){
            sample = new testClassExample(test.dispatcher, test.options);
        });

        assert(sample.getVersion() != null);

        sample.init();
        sample._os = "JSLiX";

        assert(sample.getName() == "hell");
        assert(sample.getOs() == "JSLiX");
    }
});
