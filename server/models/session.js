var mongoose = require('mongoose');

var SessionSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now()
  },
  currentScore: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('sessions', SessionSchema);
