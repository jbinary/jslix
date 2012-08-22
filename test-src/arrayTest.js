arrayTest = new TestCase("arrayTest");

arrayTest.prototype.testDigitsEach = function(){
	var digitArr = [1, 2, 3, 4];
	var doubleDigitArr = [2, 4, 6, 8];

	var modifyedArr = digitArr.each(function(elem){
				  return elem *= 2;
				});

	for (var i = 0; i < digitArr.length; ++i){
		assertEquals(modifyedArr[i], doubleDigitArr[i]);
	}
};

arrayTest.prototype.testStringsEach = function(){
	var stringArr = ["abc", "test", "javascript", "lol"];
	var withoutFirstStringArr = ["bc", "est", "avascript", "ol"];

	var modifyedArr = stringArr.each(function(elem){
				   return elem.slice(1, elem.length);
				 });

	for (var i = 0; i < stringArr.length; ++i){
		assertEquals(modifyedArr[i], withoutFirstStringArr[i]);
	}
};
