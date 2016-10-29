angular.module('todoService', [])

	// super simple service
	// each function returns a promise object
	.factory('Calls', ['$http',function($http) {
		return {
			getAccounts : function(caller) {

				console.log(caller);
				return $http(
					{
						url: '/api/getAccounts', method: 'POST', params: caller
					}
				)
			}
		}
	}]);
