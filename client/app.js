angular.module('app', ['ui.router', 'app.game', 'app.socket', 'ui.codemirror'])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

  $urlRouterProvider.otherwise('/');

  var game = {
    name: 'game',
    url: '/',
    templateUrl: './game/game.html'
  };

  $stateProvider.state(game);
}])

.run(['$state', function($state){
  $state.transitionTo('game');
}]);
