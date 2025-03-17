const mongoose = require("mongoose");

const AchievementSchema = new mongoose.Schema({
  // Achievement identifier
  code: {
    type: String,
    required: true,
    unique: true
  },
  // Display name of the achievement
  title: {
    type: String,
    required: true
  },
  // Description of how to earn the achievement
  description: {
    type: String,
    required: true
  },
  // Category of achievement
  category: {
    type: String,
    enum: ["course", "streak", "question", "module", "milestone"],
    required: true
  },
  // Icon emoji for the achievement
  icon: {
    type: String,
    default: "🏆"
  },
  // Conditions to complete achievement
  condition: {
    type: {
      type: String,
      enum: ["count", "streak", "percentage", "completion"],
      required: true
    },
    target: {
      type: Number,
      required: true
    },
    field: {
      type: String,
      required: true
    }
  },
  // Points awarded for completing this achievement
  points: {
    type: Number,
    default: 10
  },
  // Display order in the achievements list
  displayOrder: {
    type: Number,
    default: 999
  },
  // Date created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Achievement", AchievementSchema);