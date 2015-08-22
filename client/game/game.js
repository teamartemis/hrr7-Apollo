angular.module('app.game', [])
  .controller('gameController', function($scope, $timeout, $interval, $http, $q, Socket){

    $scope.editorOptions = {
        lineWrapping : true,
        lineNumbers: true,
        tabSize: 2,
        autofocus: true
    };

    $scope.batch = 0;
    $scope.level = -1;
    $scope.score = 0;
    $scope.levelOffset = 0;
    $scope.challenge = '';
    $scope.timeLimit = 0;
    $scope.playerPosition = 0;
    $scope.opponentPosition = 0;
    $scope.showMessage = false;
    $scope.incorrect = false;
    $scope.playerSolution = '';
    $scope.challenges = [];
    $scope.timer;

    $scope.startGame = function() {
      $scope.batch = 0;
      return $scope.loadChallenge().then($scope.startTimer);
    };

    $scope.loadBatch = function() {
      return $http.get('/api/challengeBatch/' + $scope.batch).then(function(res) {
        if (res.data.length) {
          $scope.levelOffset += $scope.level;
          $scope.challenges = res.data[0].batch;
          $scope.batch++;
        }
      });
    };

    $scope.loadChallenge = function() {
      $scope.showMessage = false;
      $scope.playerSolution = '';
      var index = ++$scope.level - $scope.levelOffset;
      var load = function() {
        var challenge = $scope.challenges[index];
        $scope.challenge = challenge.content;
        $scope.timeLimit = challenge.timeLimit;
      }
      if (!$scope.challenges[index]) {
        return $scope.loadBatch().then(load);
      } else {
        return $q(function(resolve) {
          load();
          resolve();
        });
      }
    };

    $scope.checkChar = function(playerSolution){
      if(playerSolution === $scope.challenge){
        $scope.endLevel();
      } else if ($scope.challenge.startsWith(playerSolution)) {
        $scope.incorrect = false;
        $scope.showMessage = false;
      } else {
        $scope.incorrect = true;
        $scope.submitMessage = 'You typed an incorrect letter!'
        $scope.showMessage = true;
      }
    };

    $scope.startTimer = function(timeLimit){
      $scope.timer = $interval(function() {
        $scope.timeLimit--;
        // if the timer runs out before a successful submit, the player loses
        if ($scope.timeLimit === 0) {
          $scope.editorOptions = {readOnly: "nocursor"};
          $interval.cancel($scope.timer);
          $scope.gameOver = true;
        }
      }, 1000);
    };

    $scope.endLevel = function() {
      $interval.cancel($scope.timer);
      $scope.submitMessage = 'You are amazing!'
      $scope.showMessage = true;
      $scope.score += $scope.timeLimit;
      Socket.emit('player:progress', {
        level: $scope.level,
        score: $scope.score
      });
      // after a pause
      $timeout(function() {
        $scope.loadChallenge().then($scope.startTimer);
      }, 1500);
    };

    Socket.on('game:start', function() {
      console.log('game:start event received');
      $scope.startGame();
    })
    Socket.on('game:win', function() {
      console.log('game:win event received');
    });
    Socket.on('game:lose', function() {
      console.log('game:lose event received');
    });
    Socket.on('opponent:progress', function(data) {
      console.log('Received opponent progress from server: ', data);
      //$scope.opponent.score = data.score;
      //$scope.opponent.level = data.level;
      $scope.opponentPosition++;
      $scope.displayOpponent();
    });
    Socket.on('disconnect', function() {
      console.log('Client has disconnected from the server');
    });

    // Will need to destroy listener
    // $scope.$on('$destroy', function (event) {
    //     // Socket.removeAllListeners();
    //     // or something like
    //     // Socket.removeListener(this);
    // });
    Socket.emit('player:ready');

    $scope.codemirrorLoaded = function(_editor){
      $scope._editor = _editor;
    };

    $scope.opponentOverlay = {
      token: function(stream, state) {
        var char = stream.next();
        if ($scope.opponentPosition > stream.column()) {
          return 'opponent';
        }
        return null;
      }
    };

    $scope.displayOpponent = function(pos) {
      //$scope.opponentPosition = pos;
      $scope._editor.removeOverlay($scope.opponentOverlay);
      $scope._editor.addOverlay($scope.opponentOverlay);
    };

    $scope.startGame();
  })
