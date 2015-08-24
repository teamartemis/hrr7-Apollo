var router = require('express').Router();

var Game = require('../models/game.js');
var Session = require('../models/session.js');

// MINIMUM OF THE CURRENT 'HIGH SCORES'
// Used in client to determine if the player's current score qualifies as a 'highscore'
router.get('/minHighscore', function(req, res) {
  Game.find({}).sort('-highscore').exec(function(err, games) {
    if (err) {
      console.error(err);
      res.send(500);
    } else {
      res.json(games[9].highscore);
    }
  });
});

// GAMES
// Create a new instance of Game with user's initials, highscore, and current date
router.post('/games', function(req, res) {
  Session.findOne({_id: req.body.session}).exec(function(err, session) {
    var game = new Game();
    game.initials = req.body.initials;
    game.highscore = session.currentScore;
    game.date = new Date();
    game.save(function(err) {
      if (err) {
        console.error(err);
        res.send(500);
      } else {
        res.json(game);
      }
    });
  });
});

// LEADERBOARD
// Retrieves Top 10 Scores
router.get('/leaderboard', function (req, res) {
  Game.find({}).sort('-highscore').limit(10).exec(function(err, games) {
    if(err) {
      console.error(err);
      res.send(500);
    } else {
      res.json(games);
    }
  });
});

// SESSIONS
router.post('/sessions', function(req, res) {
  if (!req.body.session) {
    new Session().save(function(err) {
      if (err) {
        console.error(err);
        res.send(500);
      } else {
        res.json({session: session._id});
      }
    });
  } if (!(req.body.session && req.body.score && req.body.score < 90)) {
    res.send(400);
  } else {
    Session.findOne({_id: req.body.session}).exec(function(err, session) {
      if (err) {
        console.error(err);
        res.send(500);
      }
      var totalScore = session.currentScore + req.body.score;
      var level = session.level + 1;
      var insert = {
        currentScore: totalScore,
        level: level
      };
      Session.findOneAndUpdate(query, insert, function(err, doc) {
        if (err) {
          res.send(500);
        } else {
          res.json(totalScore);
        }
      });
    });
  }
});

module.exports = router;
