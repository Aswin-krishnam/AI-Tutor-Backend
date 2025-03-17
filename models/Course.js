const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  // Added fields for more course information
  instructor: { 
    type: String, 
    default: "Admin" 
  },
  duration: { 
    type: Number, 
    default: 0 
  },
  level: { 
    type: String, 
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Beginner"
  },
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  thumbnail: { 
    type: String, 
    default: "/images/default-course.jpg" 
  },
  // Added to track number of students enrolled
  enrollmentCount: { 
    type: Number, 
    default: 0 
  },
  // Added to manage course content
  modules: [
    {
      title: String,
      description: String,
      order: Number
    }
  ],
  // Metadata
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
CourseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Course", CourseSchema);