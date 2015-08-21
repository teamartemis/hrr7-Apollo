// ----- helpers
var challenger = null;
var players = {}; // hash of key = socket.id, value = { socket, score, level, timeup }
var room = 0;

var getOpponentSocket = function(socket) {
  var room = socket.rooms[1];
  if( room === undefined ) return; // if no room, then no match is going on

  var opponent;
  // this is an array of all clients in the room
  Object.keys(io.nsps['/'].adapter.rooms[room]).forEach(function(id) {
    if( socket.id !== id ) {
      opponent = players[id].socket;
    }
  });
  return opponent;
}

var endGame = function(socket, win) {
  var opponent = getOpponentSocket(socket);
  if( !opponent ) return;

  socket.emit('game:'+ (win ? 'win' : 'lose'));
  opponent.emit('game:'+ (win ? 'lose' : 'win'));
  delete players[opponent.id];
  delete players[socket.id];
}

module.exports = function(server) {
  var io = require('socket.io')(server);

  io.on('connection', function(socket) {
    // unique id for socket looks something like this "lvkiH50mgbBqAG_2AAAC"
    console.log('a user connected: ', socket.id);

    // client is ready to enter a match
    socket.on('player:ready', function() {
      players[socket.id] = {
        socket: socket,
        score: 0,
        level: 0,
        timeup: false
      };

      if( challenger ) {
        socket.join(room);
        challenger.join(room);
        io.to(room).emit('game:start');

        room += 1;
        challenger = null;
      } else {
        challenger = socket;
      }
    });

    // client periodic update on level/score
    socket.on('player:progress', function(progress) {
      var player = players[socket.id];
      player.level = progress.level;
      player.score = progress.score;
      var opponent = players[getOpponentSocket(socket).id];

      // if opponent time up and player is ahead of opponent
      if( opponent.timeup && player.level >= opponent.level ) {
        return endGame(socket, true); // player wins
      }
      opponent.socket.emit('opponent:progress', progress);
    });

    // player is done with all levels
    socket.on('player:done', function() {
      endGame(socket, true); // first to finish wins
    });

    // player ran out of time
    socket.on('player:timeup', function() {
      var player = players[socket.id];
      player.timeup = true;
      var opponent = players[getOpponentSocket(socket).id];

      // if on the same level as opponent and opponent also timeup
      if( player.level === opponent.level && opponent.timeup ) {
        return endGame(socket, player.score > opponent.score); // higher score is winner
      }

      // if ahead of opponent
      if( player.level >= opponent.level ) {
        return socket.emit('game:wait'); // wait
      }

      // if behind opponent
      if( player.level < opponent.level ) {
        return endGame(socket, false); // player loses
      }
    });

    // disconnect
    socket.on('disconnect', function() {
      if( challenger === socket ) {
        challenger = null;
      }
      endGame(socket, false); // end the game if there is one, opponent wins
      console.log('user disconnected');
    });

    //--- for testing -- delete when ready
    var fakeOpponentLevel = 1;
    var fakeOpponentScore = 0;
    setInterval(function() {
      socket.emit('opponent:progress', {
        level: fakeOpponentLevel,
        score: fakeOpponentScore
      });
      fakeOpponentScore += 100;
      fakeOpponentLevel += 1;
    }, 5000);
    //---
  });

  return io;
}

