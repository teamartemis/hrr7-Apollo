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

    $scope.loadChallenge = function() {
      // Make sure timer is stopped
      $interval.cancel($scope.timer);
      var index = ++$scope.level;
      if (!$scope.challenges[index]) {
        $scope.endGame();
      } else {
        var challenge = $scope.challenges[index];
        $scope.challenge = challenge.content;
        $scope.timeLimit = challenge.timeLimit;
        $scope.playing = true;
        $scope.startTimer();
      }
    };

    $scope.startTimer = function(timeLimit) {
      $scope.timer = $interval(function() {
        $scope.timeLimit--;

        if ($scope.timeLimit === 0) {
          $interval.cancel($scope.timer);
          Socket.emit('player:timeup');
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

    $scope.endGame = function() {
      Socket.emit('player:gameComplete', {
        score: $scope.score
      });
      $scope.playing = false;
    }

    Socket.on('game:start', function(data) {
      console.log('game:start event received');
      $scope.challenges = data.challenges;
      $scope.loadChallenge();
    })
    Socket.on('game:proceed', function(data) {
      console.log('game:proceed event received');
      $scope.loadChallenge();
    })
    Socket.on('game:win', function() {
      console.log('game:win event received');
    });
    Socket.on('game:lose', function() {
      console.log('game:lose event received');
    });
    Socket.on('opponent:progress', function(data) {
      console.log('Received opponent progress from server: ', data);
      if (data.level === $scope.level) {
        $scope.setOpponentPosition(data.position);
      }
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
          if ($scope.playerPosition < $scope.opponentPosition) {
            return 'opponent-ahead';
          }
          return 'opponent-behind';
        }
        return null;
      }
    };

    $scope.codemirrorLoaded = function(_editor){
      $scope._editor = _editor;
      _editor.on('beforeChange', $scope.playerInputChange);
      _editor.on('cursorActivity', function(editor) {
        if (editor.doc.getCursor().ch !== $scope.playerSolution.length) {
          editor.doc.setCursor({line: 0, ch: $scope.playerSolution.length});
        }
      });
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
