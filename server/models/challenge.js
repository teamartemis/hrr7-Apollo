var mongoose = require('mongoose');

var challengeSchema = new mongoose.Schema({
  content: {
    type: String
  },
  timeLimit: {
    type: Number
  }
});

module.exports = mongoose.model('challenges', challengeSchema);
