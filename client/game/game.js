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
    $scope.playerSolution = [];
    $scope.showMessage = false;
    $scope.incorrect = false;
    $scope.challenges = [];
    $scope.timer;
    $scope.playing = false;

    $scope.startGame = function() {
      $scope.playing = true;
      return $scope.loadChallenge().then($scope.startTimer);
    };

    $scope.loadBatch = function() {
      return $http.get('/api/challengeBatch/' + $scope.batch).then(function(res) {
        if (res.data.length) {
          $scope.levelOffset += $scope.level;
          $scope.challenges = res.data[0].batch;
          $scope.batch++;
        } else {
          Socket.emit('player:gameComplete', {
            score: $scope.score
          });
          $scope.playing = false;
        }
      });
    };

    $scope.loadChallenge = function() {
      $scope.showMessage = false;
      $scope.playerPosition = 0;
      $scope.opponentPosition = 0;
      $scope.playerSolution = [];
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

    $scope.startTimer = function(timeLimit){
      $scope.timer = $interval(function() {
        $scope.timeLimit--;
        // if the timer runs out before a successful submit, the player loses
        if ($scope.timeLimit === 0) {
          $scope.editorOptions = {readOnly: "nocursor"};
          $interval.cancel($scope.timer);

          //$scope.gameOver = true;
          // Send a timeup event
          Socket.emit('player:timeup', {

          });
          $scope.playing = false;
        }
      }, 1000);
    };

    $scope.endLevel = function() {
      $interval.cancel($scope.timer);
      $scope.score += $scope.timeLimit;
      Socket.emit('player:progress', {
        level: $scope.level,
        score: $scope.score,
        position: $scope.playerPosition,
        levelComplete: true
      });
      $scope.playing = false;
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
      $scope.setOpponentPosition(data.position);
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

    $scope.onUserPositionChange = function(pos) {
      if(pos === $scope.challenge.length) {
        $scope.endLevel();
      }
    };

    /*
     * Handle user interface and solution checking.
     * Interface through onUserPositionChange and setOpponentPosition.
     */

    var opponentOverlay = {
      token: function(stream, state) {
        var char = stream.next();
        if ($scope.playerPosition < $scope.opponentPosition &&
            $scope.playerPosition > stream.column()) {
          return null;
        }
        if ($scope.opponentPosition > stream.column()) {
          return 'opponent';
        }
        return null;
      }
    };

    $scope.codemirrorLoaded = function(_editor){
      $scope._editor = _editor;
      _editor.on('beforeChange', $scope.playerInputChange);
    };

    /*
     * change.cancel() prevents user input from being inserted into the
     * codemirror textarea.
     * change.origin can take the values '+input', '+delete' and
     * 'setValue'. We can prevent infinite recursion by checking that the
     * value was set by the $scope.render function.
     */
    $scope.playerInputChange = function(instance, change) {
      if (change.origin !== 'setValue') {
        change.cancel();
        if (change.origin === '+input') {
          $scope.playerSolution.push(change.text[0]);
        } else if (change.origin === '+delete') {
          $scope.playerSolution.pop();
          change.cancel();
        }
        var solution = $scope.playerSolution.join('');
        if ($scope.checkSolution(solution)) {
          $scope.playerPosition = solution.length;
          Socket.emit('player:progress', {
            level: $scope.level,
            score: $scope.score,
            position: $scope.playerPosition
          });
          $scope.onUserPositionChange($scope.playerPosition);
        }
        $scope.render();
      }
    };

    $scope.setOpponentPosition = function(pos) {
      $scope.opponentPosition = pos;
      $scope.render();
    };

    /*
     * Check solution updates the ui when the player made a typo. If the
     * challange starts with solution then we return true. Check solution
     * is called every time the player inputs or deletes a character.
     */
    $scope.checkSolution = function(solution) {
      if ($scope.challenge.startsWith(solution)) {
        $scope.incorrect = false;
        $scope.showMessage = false;
        return true;
      } else {
        $scope.incorrect = true;
        $scope.submitMessage = 'You typed an incorrect letter!'
        $scope.showMessage = true;
        return false;
      }
    };

    $scope.render = function() {
      var text = $scope.playerSolution.join('');
      if ($scope.opponentPosition > $scope.playerSolution.length) {
        text += $scope.challenge.substring($scope.playerSolution.length, $scope.opponentPosition);
      }
      $scope._editor.doc.setValue(text);
      $scope._editor.doc.setCursor({line: 0, ch: $scope.playerSolution.length});
      $scope._editor.removeOverlay(opponentOverlay);
      $scope._editor.addOverlay(opponentOverlay);
    }
  });
