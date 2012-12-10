var ChildVersionTest = buster.testCase('ChildVersionTest', {
    setUp: function(){
        this.dispatcher = new jslix.dispatcher();
    },
    testInheritance: function(){
       var testClassExample = jslix.Class(
                jslix.version,
                function(dispatcher){
                    jslix.version.call(this, dispatcher);
                    this.setVersion(Math.floor((Math.random()*10)+1));
                }
            );

        var sample,
            test = this;
        refute.exception(function(){
                            sample = new testClassExample(test.dispatcher)
                          });

        assert(sample.getVersion() != null);

        sample.init("hell", "2.0");
        sample._os = "JSLiX";

        assert(sample.getName() == "hell");
        assert(sample.getOs() == "JSLiX");
    }
});
