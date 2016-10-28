angular.module('todoService', [])

	// super simple service
	// each function returns a promise object 
	.factory('Calls', ['$http',function($http) {
		return {
			get : function() {
				return $http.get('/api/potato');
			}
		}
	}]);