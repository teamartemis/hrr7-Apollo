var socketio = require('socket.io');

// ----- helpers
var challenger = null;

// hash with key = socket.id
/*
value = {
  socket,
  score,
  level,
  room,
  timeup,
  levelComplete,
  gameComplete
}
*/
var players = {};
var nextRoom = 0;

module.exports = function(server) {
  var io = socketio(server);

  // helpers
  var getOpponentSocket = function(socket, room) { // optional room parameter
    room = room || socket.rooms[1];
    if( room === undefined ) {
      console.log('room undefined', socket.rooms);
      return; // if no room, then no match is going on
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
    player.level += 1;
    opponent.level += 1;
    player.levelComplete = opponent.levelComplete = false;
    io.to(socket.rooms[1]).emit('game:start', {
      level: player.level
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
        level: 0,
        room: undefined,
        timeup: false,
        levelComplete: false,
        gameComplete: false
      };

      if( challenger ) {
        socket.join(nextRoom);
        challenger.join(nextRoom);
        players[socket.id].room = players[challenger.id].room = nextRoom;

        io.to(nextRoom).emit('game:start', {
          level: 0
        });

        nextRoom += 1;
        challenger = null;
      } else {
        challenger = socket;
      }
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

