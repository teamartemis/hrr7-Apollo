var router = require('express').Router();

var Game = require('../models/game.js');
var ChallengeBatch = require('../models/challengeBatch.js');
var Session = require('../models/session.js');

var security = require('./sessionAuthorization.js');

// MINIMUM OF THE CURRENT 'HIGH SCORES'
// Used in client to determine if the player's current score qualifies as a 'highscore'
router.get('/minHighscore', function (req, res){
  Game.find({}).sort('-highscore').exec(function (err, games) {
    if (err) {
      console.log('ERROR',err);
      res.send(err);
    }

    // sends back 10th highscore
    // arbitrary # depending on how many you want in Leaderboard
    // (consider extracting to variable for easier refactoring)
    res.json(games[9].highscore);
  });
});

// GAMES
// Create a new instance of Game with user's initials, highscore, and current date
router.post('/games', security.checkSession, function (req, res){
  // find entry in Session collection with session id to get the user's total score
  Session.findOne({_id: req.body.session}).exec(function(err, session){
    // save it to the Games collection for the leaderboard
    var game = new Game();
    game.initials = req.body.initials;
    game.highscore = session.currentScore;
    game.date = new Date();
    game.save(function(err){
      if (err) {
        console.log('ERROR:', err);
        res.send(err);
      }
      res.json(game);
    });
  });
});

// LEADERBOARD
// Retrieves Top 10 Scores
router.get('/leaderboard', function (req, res){
  Game.find({}).sort('-highscore').limit(10).exec(function (err, games){
    if(err){
      console.log('ERROR:', err);
      res.send(err);
    }

    res.json(games);
  });
});

// CHALLENGE BATCH
// Retrieves batch of Challenges rather than making requests for individual challenges
router.get('/challengeBatch/:id', function (req, res){
  ChallengeBatch.find({id: req.params.id}).exec(function (err, batch){
    if (err) {
      console.log('ERROR:', err);
      res.send(err);
    }

    console.log('BATCH:', batch);
    res.json(batch);
  });
});

// SESSIONS
router.post('/sessions', function (req, res){
  // if there is no session id and no score sent with the request, insert a new session entry
  if (!req.body.session && !req.body.score){
    var session = new Session();
    session.date = new Date();
    session.level = 0;
    session.currentScore = 0;
    session.save(function(err){
      if (err) {
        console.log('ERROR:', err);
        res.send(err);
      }
      res.json( {session: session._id} );
    });
  // if it's missing either the score or the id, or the score is higher than what the game allows, send back a 'Bad Request' response
  // please note that if the timeLimits of the various challenges are changed to be not all the same,
  // this last check will need to happen after you've gotten the existing entry out of the database so you can see what level the user
  // was last on and check that against the timeLimit of that level's challenge
  } else if (!req.body.session || !req.body.score || req.body.score >= 90){
    res.send(400);
  // else update the score in the collection entry of the id
  } else {
    var query = {
      _id: req.body.session
    };
    // get existing document so we can get the current values and update them
    Session.findOne(query).exec(function(err, session){
      if (err) {
        console.log('ERROR:', err);
        res.end(err);
      }
      var totalScore = session.currentScore + +req.body.score;
      var level = session.level + 1;
      var insert = {
        currentScore: totalScore,
        level: level
      };
      Session.findOneAndUpdate(query, insert, function(err, doc){
        if (err) return res.send(500, { error: err });
        // send the total score back to the client
        return res.json(totalScore);
      });
    });
  }
});

module.exports = router;
