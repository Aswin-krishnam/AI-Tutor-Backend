// Fixed userProfileModel.js
const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema({
    userId: { 
        // Can be either ObjectId or string, depending on how you store user IDs
        type: String, 
        required: true,
        index: true
    },
    // Core profile data
    personalDetails: {
        name: { type: String, default: "" },
        preferredName: { type: String, default: "" },
        interests: { type: [String], default: [] },
        learningPreferences: { type: [String], default: [] },
        background: { type: String, default: "" },
        goals: { type: [String], default: [] }
    },
    // Keep track of subjects/topics the user has engaged with
    subjects: {
        type: [{
            name: String,
            confidenceLevel: { type: Number, default: 0 }, // 0-10 scale
            lastEngaged: { type: Date, default: Date.now }
        }],
        default: []
    },
    // Store the last active date
    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { 
    // Important: Make sure Mongoose knows how to convert to a plain object
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

// Auto-update the updatedAt field
userProfileSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("UserProfile", userProfileSchema);