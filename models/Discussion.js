// models/Discussion.js
const mongoose = require("mongoose");

const DiscussionSchema = new mongoose.Schema({
  forumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Forum",
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  moduleIndex: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
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
  isSticky: {
    type: Boolean,
    default: false
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  aiAssisted: {
    type: Boolean,
    default: false
  },
  aiSummary: {
    type: String,
    default: ""
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

module.exports = mongoose.model("Discussion", DiscussionSchema);