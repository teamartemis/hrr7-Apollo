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

var port = process.env.PORT || 8080;
app.listen(port);
console.log("App listening on port " + port);
