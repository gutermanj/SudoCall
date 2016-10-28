angular.module('todoController', [])

	// inject the Todo service factory into our controller
	.controller('mainController', ['$scope','$http','Calls', function($scope, $http, Calls) {
		
		$scope.getPotato = function() {
			Calls.get()
				.success(function(response) {
					console.log(response);
				})
				.error(function(err) {
					console.log(err);
				});
		}

	}]);