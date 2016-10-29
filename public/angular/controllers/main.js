angular.module('todoController', [])
	// inject the Todo service factory into our controller
	.controller('mainController', ['$scope','$http','Calls', function($scope, $http, Calls) {

		console.log($scope.callerData);


		$scope.getAccounts = function() {

			Calls.getAccounts($scope.callerData)
				.success(function(response) {
					console.log(response);
				})
		}

	}]);
