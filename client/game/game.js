angular.module('app.game', [])
  .controller('gameController', function($scope, $timeout, $interval, $http, scoreFactory, sessionFactory, levelFactory, Socket){

    //////////
    // SET UP
    //////////
    // code editor settings
    $scope.editorOptions = {
        lineWrapping : true,
        lineNumbers: true,
        tabSize: 2,
        autofocus: true
    };
    // links factory score and level variables with their scope versions that are shown in the DOM
    $scope.totalScore = scoreFactory;
    $scope.totalLevel = levelFactory;
    // requests a new session id from the database
    sessionFactory.getSession();

    // helper methods
    var setNewBatch = function(resultsObject){
      $scope.level = 0;
      $scope.challengeFixtures = resultsObject.data[0].batch;
    };
    var startNewLevel = function(){
      $scope.challenge = $scope.challengeFixtures[$scope.level]['content'];
      $scope.timeLimit = $scope.challengeFixtures[$scope.level]['timeLimit'];
      levelFactory.totalLevel++;
    };
    var startTimer = function(timeLimit){
      stop = $interval(function(){
        $scope.timeLimit--;
        // if the timer runs out before a successful submit, the player loses
        if ($scope.timeLimit === 0){
          $scope.editorOptions = {readOnly: "nocursor"};
          $interval.cancel(stop);
          $scope.gameOver = true;
          $timeout(function(){
            scoreFactory.checkScore($scope.totalScore);
          }, 2500);
        }
      }, 1000);
    };

    // Holds opponents data, which will be updated through socket communication
    $scope.opponent = {};

    // Set listener on Socket
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
      $scope.opponent.score = data.score;
      $scope.opponent.level = data.level;
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

    $scope.startGame = function() {
      // gets the challenge content from the server for the first batch
      // and saves the content in the first level to scope variables that the DOM can access
      $http.get('/api/challengeBatch/0')
      .then(function(res){
        $scope.batch = 0;
        setNewBatch(res);
        startNewLevel();
      });

      // timer setup
      var stop;
      // start the timer for the first challenge
      startTimer();
    }

    //////////////////////////
    // PLAYER SOLUTION CHECKS
    //////////////////////////
    $scope.checkChar = function(playerSolution){
      if(playerSolution.length > 0){
        if(playerSolution === $scope.challenge){
          $scope.endLevel(playerSolution);
        } else if (playerSolution[playerSolution.length-1] === $scope.challenge[playerSolution.length-1]){
          //the just typed letter is equal to that in same index of the solution
          if($scope.incorrectBool){//a past value was wrong
            //change to true if values were fixed
            if(playerSolution[$scope.incorrectIndex] === $scope.challenge[$scope.incorrectIndex]){
              $scope.incorrectBool = false;
              $scope.showMessage = false;
            }
          }
        } else {
          // track that there is an error in the solution and where it is in the code
          $scope.incorrectBool = true;
          $scope.incorrectIndex = playerSolution.length-1;
          // show 'incorrect' message
          $scope.submitMessage = 'You typed an incorrect letter!'
          $scope.showMessage = true;
        }
      } else {

      }
    };

    $scope.endLevel = function(playerSolution){
      // stops timer
      $interval.cancel(stop);
      stop = undefined;
      // shows 'correct' message
      $scope.submitMessage = 'You are amazing!'
      $scope.showMessage = true;
      // increase user's level
      $scope.level++;
      // get user's score for this level and add it to total score
      $scope.score = $scope.timeLimit;
      $http.post('/api/sessions', {
        session: sessionFactory.sessionId,
        score: $scope.score
      }).then(function(res){
        // set the factory score variable to the score returned
        scoreFactory.totalScore = res.data;

        // Send level and total score data through sockets
        // Ideally, we will move from AJAX calls completely to sockets
        // as this data is being sent twice
        Socket.emit('player:progress', {
          level: $scope.level,
          score: scoreFactory.totalScore
        });
      });
      // after a pause
      $timeout(function(){
        // reset win message and code editor
        $scope.showMessage = false;
        $scope.playerSolution = "";
        // set up next challenge
        $scope.setNextChallenge();
      }, 1500);
    };

    $scope.setNextChallenge = function(){
      // if there are more challenges in challengeFixtures
      if ( $scope.challengeFixtures[$scope.level] !== undefined ){
        // set up the next challenge
        startNewLevel();
        startTimer();
      // if that was the last challenge in challengeFixtures
      } else {
        // get next batch from server
        $scope.batch++;
        $http.get('/api/challengeBatch/' + $scope.batch)
        .then(function(res){
          // if we received a new batch from the database
          if (res.data.length){
            // set up the next batch + challenge
            setNewBatch(res);
            startNewLevel();
            startTimer();
          // if there are no more challenge batches
          } else {
            // tell the user they won the game and check if the score is high enough for the leaderboard
            $scope.gameWon = true;
            $scope.editorOptions = {readOnly: "nocursor"};
            $timeout(function(){
              scoreFactory.checkScore($scope.totalScore);
            }, 2500);
          }
        });
      }
    };
  })


  /////////////
  // FACTORIES
  /////////////
  .factory('scoreFactory', function($http, $state){
    var obj = {};

    obj.totalScore = 0;

    // checks to see if the score is high enough for the leaderboard
    obj.checkScore = function(playerScore) {
      $http.get('/api/minHighscore')
        .then(function(res){
          var minHighscore = res.data;
          if (playerScore.totalScore < minHighscore) {
            $state.transitionTo('leaderboard');
          } else {
            $state.transitionTo('setInitials');
          }
        })
    };

    return obj;
  })
  .factory('sessionFactory', function($http){
    var obj = {};

    obj.sessionId;

    obj.getSession = function(){
      $http.post('/api/sessions')
      .then(function(res){
        obj.sessionId = res.data.session;
      });
    };

    return obj;
  })
  .factory('levelFactory', function(){
    var obj = {};

    obj.totalLevel = -1;

    return obj;
  });
