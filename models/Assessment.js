const mongoose = require("mongoose");

const AssessmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  moduleIndex: {
    type: Number,
    required: true
  },
  questions: [{
    questionText: {
      type: String,
      required: true
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    explanation: String
  }],
  passPercentage: {
    type: Number,
    default: 70
  },
  timeLimit: {
    type: Number,  // in minutes
    default: 15
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add a pre-save hook to update the updatedAt field
AssessmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add compound index to ensure uniqueness for course-module combinations
AssessmentSchema.index({ courseId: 1, moduleIndex: 1 }, { unique: true });

module.exports = mongoose.model("Assessment", AssessmentSchema);