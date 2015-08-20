var express = require('express');
var mongoose = require('mongoose');
var morgan = require('morgan');                   // log requests to the console (express4)
var bodyParser = require('body-parser');          // pull information from HTML POST (express4)
var methodOverride = require('method-override');  // simulate DELETE and PUT (express4)
var api = require('./server/controllers/routes');

mongoose.connect(process.env.DB_URI || 'mongodb://localhost/apollo');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Mongo DB connection is open");
});

var app = express();
app.use(express.static('client'));                              // set the static files location (e.g. /client/game will be /game)
app.use(morgan('dev'));                                         // log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());
app.use('/api', api);

// Socket.IO
var server = require('http').Server(app);
var io = require('socket.io')(server);

io.on('connection', function(socket) {
  // unique id for socket looks something like this "lvkiH50mgbBqAG_2AAAC"
  console.log('a user connected: ', socket.id);

  socket.on('player:ready', function() {
    // store socket.id and socket somewhere
    // check if another player is ready & waiting
      // if so, pair them together, and emit 'game:start' to both
      socket.emit('game:start');
      // get opponent socket object, then opponentSocket.emit('game:start');
  });

  socket.on('player:progress', function(progress) {
    // store player progress somewhere?
    // get opponent socket object, opponentSocket
    // determine if ending conditions are met, if so
      // socket.emit('game:win'); // or socket.emit('game:lose')
      // opponentSocket.emit('game:lose') // or opponentSocket.emit('game:win')
    // if not, just update opponent on player's progress
      // opponentSocket.emit('opponent:progress', progress)
  });

  socket.on('player:timeup', function() {
    // get opponent socket object
    // if player is ahead
      // socket.emit('game:wait');
      // need to store level for comparison when opponent reaches the same level
    // if player is behind
      // socket.emit('game:lose');
      // opponentSocket.emit('game:win');
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

  // disconnect
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});

var port = process.env.PORT || 8080;
server.listen(port);
console.log("App listening on port " + port);
