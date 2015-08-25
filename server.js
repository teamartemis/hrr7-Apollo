var express = require('express');
var mongoose = require('mongoose');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

mongoose.connect(process.env.DB_URI || 'mongodb://localhost/apollo');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Mongo DB connection is open");
});

var app = express();
app.use(express.static('client'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(methodOverride());

var server = require('http').Server(app);
var io = require('./server/socket')(server);

var port = process.env.PORT || 8080;
server.listen(port);
console.log("App listening on port " + port);
