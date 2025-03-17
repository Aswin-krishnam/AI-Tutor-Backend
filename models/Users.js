const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    history: [{ question: String, response: String }],
    queryCount: { type: Number, default: 0 },

    // Course enrollment fields
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    }],

    // Enhanced courseProgress with more detailed tracking
    courseProgress: {
        type: Map,
        of: {
            // Completed modules (backward compatible)
            completedModules: [String],

            // More detailed progress tracking per module
            moduleData: [{
                moduleIndex: Number,
                moduleId: String,
                completed: Boolean,
                lastAccessed: Date,
                // timeSpent: Number,
                // visitCount: Number,
                quizScores: [{
                    quizId: String,
                    score: Number,
                    maxScore: Number,
                    completedAt: Date
                }]
            }],

            // Overall course progress statistics
            startedAt: Date,
            lastAccessed: Date,
            //  totalTimeSpent: Number,
            certificateIssued: Boolean
        },
        default: () => new Map()  // Important: Use proper Map initialization
    },

    // Track learning styles and preferences
    learningPreferences: {
        preferredContentTypes: [String], // e.g., "video", "text", "audio"
        contentLanguage: String,        // Preferred language 
        darkMode: Boolean,              // UI preference
    },
    level: {
        type: Number,
        default: 1
    },
    experience: {
        type: Number,
        default: 0
    },
    nextLevelExp: {
        type: Number,
        default: 100
    },
    rank: {
        type: String,
        enum: ["Beginner", "Apprentice", "Student", "Scholar", "Expert", "Master"],
        default: "Beginner"
    },

    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
module.exports = User;