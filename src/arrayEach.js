//action: processes action under each element of array
(function(){

    Array.prototype.each = function(action){
					var modifyedArr = [];
					for (var i = 0; i < this.length; ++i){
						modifyedArr[i] = action(this[i]);
					}

					return modifyedArr;
				};
})();
