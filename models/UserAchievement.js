const mongoose = require("mongoose");

const UserAchievementSchema = new mongoose.Schema({
  // User who earned the achievement
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Achievement reference
  achievementCode: {
    type: String,
    required: true
  },
  // Date when the achievement was earned
  earnedAt: {
    type: Date,
    default: Date.now
  },
  // Current progress towards achievement (for partially completed achievements)
  progress: {
    type: Number,
    default: 0
  },
  // Boolean indicating if the achievement has been completed
  isCompleted: {
    type: Boolean,
    default: false
  },
  // Boolean indicating if this is a new achievement (for UI notifications)
  isNew: {
    type: Boolean,
    default: true
  }
});

// Create a compound index on userId and achievementCode to ensure uniqueness
UserAchievementSchema.index({ userId: 1, achievementCode: 1 }, { unique: true });

module.exports = mongoose.model("UserAchievement", UserAchievementSchema);