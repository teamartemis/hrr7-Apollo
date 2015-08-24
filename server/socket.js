var _ = require('lodash');
var socketio = require('socket.io');
var Challenge = require('./models/challenge.js');

// ----- helpers
var challenger = null;

// hash with key = socket.id
/*
value = {
  socket,
  score,
  room,
  timeup,
  levelComplete,
  gameComplete
}
*/
var players = {};
var nextRoom = 1; // start with a truthy room name

module.exports = function(server) {
  var io = socketio(server);

  // helpers
  var getOpponentSocket = function(socket, room) { // optional room parameter
    room = room || socket.rooms[1];
    if( !room ) {
      console.log('no rooms', socket.rooms);
      return;
    }

    var opponentSocket;
    // this is an array of all clients in the room
    Object.keys(io.nsps['/'].adapter.rooms[room]).forEach(function(id) {
      if( socket.id !== id ) {
        opponentSocket = players[id].socket;
      }
    });
    return opponentSocket;
  };

  var endGame = function(socket, win, room) { // optional room parameter
    var opponent = getOpponentSocket(socket, room);
    if( !opponent ) return;

    socket.emit('game:'+ (win ? 'win' : 'lose'));
    opponent.emit('game:'+ (win ? 'lose' : 'win'));
    delete players[opponent.id];
    delete players[socket.id];
  };

  // player and opponent are objects from players hash
  var startNextLevel = function(socket) {
    var player = players[socket.id];
    var opponent = players[getOpponentSocket(socket).id];
    player.levelComplete = opponent.levelComplete = false;
    io.to(socket.rooms[1]).emit('game:proceed');
  };

  // async fetch from DB, and return an array of _num_ challenges in randomized order to cb
  var fetchChallenges = function(num, callback) {
    Challenge.find().exec(function(err, data) {
      if (err) {
        console.error(err);
      } else {
        console.log(data);
        var random = _.shuffle(data);
        callback(random.slice(0, num));
      }
    });
  };

  // events
  io.on('connection', function(socket) {
    // unique id for socket looks something like this "lvkiH50mgbBqAG_2AAAC"
    console.log('a user connected: ', socket.id);

    // client is ready to enter a match
    socket.on('player:ready', function() {
      players[socket.id] = {
        socket: socket,
        score: 0,
        room: undefined,
        timeup: false,
        levelComplete: false,
        gameComplete: false
      };

      // if a challenger exists
      if( challenger ) {
        console.log('game start with', socket.id, challenger.id);
        socket.join(nextRoom);
        challenger.join(nextRoom);
        players[socket.id].room = players[challenger.id].room = nextRoom;

        fetchChallenges(10, function(challenges) {
          console.log('randomized levels', challenges);
          io.to(nextRoom).emit('game:start', {
            challenges: challenges
          });

          nextRoom += 1;
          challenger = null;
        });
        return;
      }

      // if no challenger
      challenger = socket;
    });

    // client periodic update on level/score
    socket.on('player:progress', function(progress) {
      var player = players[socket.id];
      player.levelComplete = progress.levelComplete;
      var opponent = players[getOpponentSocket(socket).id];
      if( player.levelComplete ) {
        console.log('player level complete');
      }

      if( player.levelComplete && opponent.levelComplete ) {
        console.log('next level!');
        startNextLevel(socket);
      }

      opponent.socket.emit('opponent:progress', progress);
    });

    // player is done with all levels
    socket.on('player:gameComplete', function(result) {
      console.log('game complete from', socket.id);
      var player = players[socket.id];
      var opponent = players[getOpponentSocket(socket).id];
      player.gameComplete = true;
      player.score = result.score;

      if( player.gameComplete && opponent.gameComplete ) {
        return endGame(socket, player.score > opponent.score); // highest score wins
      }
    });

    // player ran out of time
    socket.on('player:timeup', function() {
      // start both players on next level
      console.log('tiem up from', socket.id);
      var player = players[socket.id];
      var opponent = players[getOpponentSocket(socket).id];

      if( opponent.gameComplete ) {
        return endGame(socket, player.score > opponent.score);
      }

      startNextLevel(socket);
    });

    // disconnect
    socket.on('disconnect', function() {
      console.log('disconnect from', socket.id);
      if( challenger === socket ) {
        challenger = null;
        delete players[socket.id];
      }
      // end the game if there is one, opponent wins
      if( players[socket.id] ) {
        endGame(socket, false, players[socket.id].room);
      }
      console.log('user disconnected');
    });
  });

  return io;
};

