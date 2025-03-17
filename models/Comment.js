// models/Comment.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  discussionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Discussion",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null
  },
  isAnswer: {
    type: Boolean,
    default: false
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  votes: {
    up: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    down: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for vote count
CommentSchema.virtual('voteCount').get(function() {
  return (this.votes.up ? this.votes.up.length : 0) - 
         (this.votes.down ? this.votes.down.length : 0);
});

module.exports = mongoose.model("Comment", CommentSchema);