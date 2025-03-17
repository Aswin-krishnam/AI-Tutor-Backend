const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios"); // Required for AI requests
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const multer = require('multer');
const NodeCache = require('node-cache');
const PDFDocument = require('pdfkit');


const User = require("./models/Users"); // Import the User model
const Conversation = require("./models/conversationModel");
const Course = require("./models/Course");
const StudyMaterial = require("./models/studyMaterial"); // Import the model
const Podcast = require("./models/Podcast");
const Assessment = require("./models/Assessment");
const UserProfile = require("./models/userProfileModel");
const UserConnection = require("./models/userConnection");
const Achievement = require("./models/Achievement");
const UserAchievement = require("./models/UserAchievement");
const Forum = require("./models/Forum");
const Discussion = require("./models/Discussion");
const Comment = require("./models/Comment");



const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Connect to MongoDB
mongoose.connect("mongodb+srv://aswinkrishnam16:aswinkrishnam@cluster0.2iu51vz.mongodb.net/AITutorDB?retryWrites=true&w=majority&appName=Cluster0");

// ✅ JWT Secret Key
const jwtSecret = "blog-app";
const profileCache = new NodeCache({ stdTTL: 600 });

// ✅ Nodemailer Setup
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "neuralearnhelp@gmail.com",
    pass: "fgoe ccrb gpqe uvcf", // Ensure this is secure
  },
});

// ✅ Function to Hash Passwords
const generateHashedPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};


/**********************************Courses**************************************/

// ------------ USER ENROLLMENT ENDPOINTS ------------


app.post("/enroll", async (req, res) => {
  try {
    const { courseId, userId } = req.body;

    if (!courseId || !userId) {
      return res.status(400).json({ error: "Course ID and User ID are required" });
    }

    // Validate that the course exists and is published
    const course = await Course.findOne({ _id: courseId, isPublished: true });
    if (!course) {
      return res.status(404).json({ error: "Course not found or not available for enrollment" });
    }

    // Find the user and update their enrollments
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already enrolled
    if (!user.enrolledCourses) {
      user.enrolledCourses = [];
    }

    if (user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ error: "Already enrolled in this course" });
    }

    // Add the course to user's enrollments
    user.enrolledCourses.push(courseId);
    await user.save();

    // Update the course's enrollment count
    course.enrollmentCount = (course.enrollmentCount || 0) + 1;
    await course.save();

    // Send enrollment confirmation email
    try {
      const mailOptions = {
        from: '"NeuraleLearn" <neuralearnhelp@gmail.com>',
        to: user.email,
        subject: `🎓 You're Enrolled in ${course.title}!`,
        html: generateEnrollmentEmail(user.name, course)
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending enrollment email:", error);
        } else {
          console.log("Enrollment confirmation email sent:", info.response);
        }
      });
    } catch (emailError) {
      // Log email error but don't stop the enrollment process
      console.error("Error with enrollment email:", emailError);
    }

    res.status(200).json({
      message: "Successfully enrolled in the course",
      enrolledCourses: user.enrolledCourses
    });
  } catch (error) {
    console.error("Error enrolling in course:", error);
    res.status(500).json({ error: "Failed to enroll in course" });
  }
});

// Function to generate the enrollment confirmation email
function generateEnrollmentEmail(userName, course) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Course Enrollment Confirmation</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Poppins', sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          color: #333333;
          background-color: #f9f9f9;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #4b6cb7, #182848);
          padding: 30px;
          text-align: center;
          border-bottom: 5px solid #3a5999;
        }
        
        .header h1 {
          color: white;
          margin: 0;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .header p {
          color: rgba(255, 255, 255, 0.85);
          margin: 10px 0 0;
          font-size: 16px;
        }
        
        .course-banner {
          width: 100%;
          padding: 40px 0;
          background: linear-gradient(45deg, #e8f0fe, #d4e4fa);
          text-align: center;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .course-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .banner-title {
          font-size: 24px;
          font-weight: 700;
          color: #182848;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .content {
          padding: 30px;
        }
        
        .section-title {
          color: #4b6cb7;
          font-size: 20px;
          margin-bottom: 15px;
          font-weight: 600;
          position: relative;
          padding-left: 15px;
          border-left: 4px solid #4b6cb7;
        }
        
        .course-info {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 25px;
          border-left: 4px solid #4b6cb7;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .course-title {
          font-size: 22px;
          font-weight: 600;
          color: #182848;
          margin-top: 0;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .course-meta {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e8e8e8;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          margin-right: 20px;
          margin-bottom: 10px;
          color: #495057;
          font-weight: 500;
        }
        
        .meta-icon {
          margin-right: 8px;
          font-size: 16px;
          color: #4b6cb7;
        }
        
        .course-description {
          color: #495057;
          margin-bottom: 0;
          line-height: 1.7;
        }
        
        .message {
          margin-bottom: 25px;
          font-size: 16px;
          line-height: 1.7;
        }
        
        .highlight {
          color: #4b6cb7;
          font-weight: 600;
        }
        
        .next-steps {
          margin-bottom: 30px;
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #5cb85c;
        }
        
        .step {
          display: flex;
          margin-bottom: 15px;
          align-items: flex-start;
        }
        
        .step-number {
          background-color: #5cb85c;
          color: white;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-right: 15px;
          flex-shrink: 0;
        }
        
        .step-text {
          padding-top: 3px;
          font-weight: 500;
        }
        
        .cta-container {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: linear-gradient(to right, #f8f9fa, #e9ecef, #f8f9fa);
          border-radius: 8px;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #4b6cb7, #182848);
          color: white;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
          border: none;
          box-shadow: 0 4px 10px rgba(75, 108, 183, 0.3);
        }
        
        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 7px 15px rgba(75, 108, 183, 0.4);
        }
        
        .tips-container {
          background-color: #f1f7ff;
          border-radius: 8px;
          padding: 20px;
          margin-top: 25px;
          border-left: 4px solid #17a2b8;
        }
        
        .tips-title {
          color: #17a2b8;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .tip-item {
          margin-bottom: 10px;
          position: relative;
          padding-left: 20px;
        }
        
        .tip-item:before {
          content: "•";
          color: #17a2b8;
          font-weight: bold;
          position: absolute;
          left: 0;
          top: 0;
        }
        
        .divider {
          height: 1px;
          background: linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.1), rgba(0,0,0,0));
          margin: 30px 0;
        }
        
        .signature {
          font-style: italic;
          margin-bottom: 5px;
        }
        
        .team-name {
          font-weight: 600;
          color: #182848;
        }
        
        .footer {
          background-color: #f7f9fc;
          padding: 25px;
          text-align: center;
          color: #8a8a8a;
          font-size: 14px;
          border-top: 1px solid #e0e0e0;
        }
        
        .social-links {
          margin: 20px 0;
          display: flex;
          justify-content: center;
        }
        
        .social-link {
          display: inline-block;
          width: 36px;
          height: 36px;
          margin: 0 8px;
          border-radius: 50%;
          background-color: #e9ecef;
          color: #4b6cb7;
          text-align: center;
          line-height: 36px;
          font-size: 18px;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        
        .social-link:hover {
          background-color: #4b6cb7;
          color: white;
        }
        
        .footer-links {
          margin: 15px 0;
        }
        
        .footer-link {
          color: #4b6cb7;
          text-decoration: none;
          margin: 0 10px;
          transition: color 0.3s ease;
        }
        
        .footer-link:hover {
          color: #182848;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>NeuraleLearn</h1>
          <p>Your Learning Journey Begins</p>
        </div>
        
        <div class="course-banner">
          <div class="course-icon">📚</div>
          <h2 class="banner-title">Course Enrollment Confirmation</h2>
        </div>
        
        <div class="content">
          <p class="message">
            Hello <span class="highlight">${userName}</span>,
            <br><br>
            Congratulations! You've successfully enrolled in the following course:
          </p>
          
          <div class="course-info">
            <h2 class="course-title">${course.title}</h2>
            
            <div class="course-meta">
              <div class="meta-item">
                <span class="meta-icon">👨‍🏫</span>
                <span>Instructor: ${course.instructor}</span>
              </div>
              
              <div class="meta-item">
                <span class="meta-icon">⏱️</span>
                <span>Duration: ${course.duration || 'Self-paced'}</span>
              </div>
              
              <div class="meta-item">
                <span class="meta-icon">📊</span>
                <span>Level: ${course.level}</span>
              </div>
            </div>
            
            <p class="course-description">${course.description}</p>
          </div>
          
          <h3 class="section-title">Your Learning Path</h3>
          
          <div class="next-steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-text">Access your course through your NeuraleLearn dashboard</div>
            </div>
            
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-text">Review the course modules and learning materials</div>
            </div>
            
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-text">Set a personal study schedule to stay on track</div>
            </div>
            
            <div class="step">
              <div class="step-number">4</div>
              <div class="step-text">Join discussions and connect with fellow learners</div>
            </div>
          </div>
          
          <div class="cta-container">
            <a href="http://localhost:3000/course/${course._id}/learn" class="cta-button">Start Learning Now</a>
          </div>
          
          <div class="tips-container">
            <h4 class="tips-title">Tips for Success</h4>
            <div class="tip-item">Set aside dedicated time each day for your studies</div>
            <div class="tip-item">Take notes and practice what you learn</div>
            <div class="tip-item">Engage with your peers in discussion forums</div>
            <div class="tip-item">Don't hesitate to ask questions when you need help</div>
          </div>
          
          <div class="divider"></div>
          
          <p>
            Remember, learning is a journey! If you have any questions about the course or need technical assistance, our support team is here to help.
          </p>
          
          <p class="signature">
            Happy learning!<br>
            <span class="team-name">The NeuraleLearn Team</span>
          </p>
        </div>
        
        <div class="footer">
          <p>© 2025 NeuraleLearn. All rights reserved.</p>
          
          <div class="social-links">
            <a href="#" class="social-link">f</a>
            <a href="#" class="social-link">t</a>
            <a href="#" class="social-link">in</a>
            <a href="#" class="social-link">ig</a>
          </div>
          
          <div class="footer-links">
            <a href="#" class="footer-link">Privacy Policy</a>
            <a href="#" class="footer-link">Terms of Service</a>
            <a href="#" class="footer-link">Contact Us</a>
          </div>
          
          <p>
            You received this email because you enrolled in a course on NeuraleLearn.<br>
            If you prefer not to receive enrollment notifications, you can <a href="#" style="color: #4b6cb7;">update your email preferences</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Get user's enrolled courses
app.get("/user/:userId/enrollments", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      enrollments: user.enrolledCourses || []
    });
  } catch (error) {
    console.error("Error fetching user enrollments:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

// Get detailed information about user's enrolled courses
app.get("/user/:userId/courses", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
      return res.status(200).json({ courses: [] });
    }

    // Get detailed course information for each enrolled course
    const enrolledCourses = await Course.find({
      _id: { $in: user.enrolledCourses }
    });

    res.status(200).json({ courses: enrolledCourses });
  } catch (error) {
    console.error("Error fetching user courses:", error);
    res.status(500).json({ error: "Failed to fetch user courses" });
  }
});



//-------------------------------------New-------------------------------


//--------------------------------Gamification----------------------------



//--------------------------------Gamification----------------------------

//-----------------------------------some random updates-------------------

const initializeAchievements = async () => {
  try {
    const count = await Achievement.countDocuments();
    if (count === 0) {
      console.log("Initializing default achievements...");
      const defaultAchievements = [
        {
          code: "first_course_enrolled",
          title: "First Steps",
          description: "Enroll in your first course",
          category: "course",
          icon: "🚀",
          condition: {
            type: "count",
            target: 1,
            field: "enrolledCourses"
          },
          points: 10,
          displayOrder: 1
        },
        {
          code: "first_course_completed",
          title: "Course Graduate",
          description: "Complete your first course",
          category: "course",
          icon: "🎓",
          condition: {
            type: "count",
            target: 1,
            field: "completedCourses"
          },
          points: 50,
          displayOrder: 2
        },
        {
          code: "five_courses_enrolled",
          title: "Knowledge Seeker",
          description: "Enroll in 5 different courses",
          category: "course",
          icon: "📚",
          condition: {
            type: "count",
            target: 5,
            field: "enrolledCourses"
          },
          points: 30,
          displayOrder: 5
        },
        {
          code: "streak_7",
          title: "Week Warrior",
          description: "Maintain a 7-day learning streak",
          category: "streak",
          icon: "🔥",
          condition: {
            type: "streak",
            target: 7,
            field: "loginStreak"
          },
          points: 20,
          displayOrder: 3
        },
        {
          code: "streak_30",
          title: "Monthly Master",
          description: "Maintain a 30-day learning streak",
          category: "streak",
          icon: "⚡",
          condition: {
            type: "streak",
            target: 30,
            field: "loginStreak"
          },
          points: 100,
          displayOrder: 8
        },
        {
          code: "three_courses_completed",
          title: "Triple Threat",
          description: "Complete 3 courses",
          category: "course",
          icon: "🏆",
          condition: {
            type: "count",
            target: 3,
            field: "completedCourses"
          },
          points: 150,
          displayOrder: 6
        },
        {
          code: "ten_questions_asked",
          title: "Curious Mind",
          description: "Ask 10+ questions to AI Tutor",
          category: "question",
          icon: "💬",
          condition: {
            type: "count",
            target: 10,
            field: "questionsAsked"
          },
          points: 15,
          displayOrder: 4
        },
        {
          code: "modules_25",
          title: "Dedicated Learner",
          description: "Complete 25+ modules",
          category: "module",
          icon: "📘",
          condition: {
            type: "count",
            target: 25,
            field: "completedModules"
          },
          points: 80,
          displayOrder: 7
        },
        {
          code: "average_progress_75",
          title: "Progress Pioneer",
          description: "Reach 75% average progress in all enrolled courses",
          category: "milestone",
          icon: "📊",
          condition: {
            type: "percentage",
            target: 75,
            field: "averageCompletionRate"
          },
          points: 60,
          displayOrder: 9
        }
      ];

      await Achievement.insertMany(defaultAchievements);
      console.log("Default achievements initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing achievements:", error);
  }
};

// Call the initialization function when the server starts
initializeAchievements();

app.get("/achievements", async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ displayOrder: 1 });
    res.status(200).json(achievements);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// Get a user's achievements
app.get("/user/:userId/achievements", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all available achievements
    const allAchievements = await Achievement.find().sort({ displayOrder: 1 });
    
    // Get user's earned achievements
    const userAchievements = await UserAchievement.find({ userId });
    
    // Map user achievements to the achievement details
    const achievementsWithProgress = allAchievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => 
        ua.achievementCode === achievement.code
      );
      
      return {
        ...achievement.toObject(),
        progress: userAchievement ? userAchievement.progress : 0,
        isCompleted: userAchievement ? userAchievement.isCompleted : false,
        earnedAt: userAchievement ? userAchievement.earnedAt : null,
        isNew: userAchievement ? userAchievement.isNew : false
      };
    });
    
    res.status(200).json(achievementsWithProgress);
  } catch (error) {
    console.error("Error fetching user achievements:", error);
    res.status(500).json({ error: "Failed to fetch user achievements" });
  }
});

// Mark achievement as seen (no longer new)
app.put("/user/:userId/achievements/:achievementCode/seen", async (req, res) => {
  try {
    const { userId, achievementCode } = req.params;
    
    await UserAchievement.findOneAndUpdate(
      { userId, achievementCode },
      { isNew: false }
    );
    
    res.status(200).json({ message: "Achievement marked as seen" });
  } catch (error) {
    console.error("Error updating achievement seen status:", error);
    res.status(500).json({ error: "Failed to update achievement status" });
  }
});

// Check and update user achievements based on their activity
// This should be called whenever user analytics are updated
const checkAndUpdateAchievements = async (userId, analytics) => {
  try {
    // Get all achievements
    const achievements = await Achievement.find();
    
    // For each achievement, check if the user has met the criteria
    for (const achievement of achievements) {
      const { condition } = achievement;
      let progress = 0;
      let isCompleted = false;
      
      // Calculate progress based on condition type and field
      switch (condition.type) {
        case "count":
          if (condition.field === "enrolledCourses") {
            progress = analytics.totalCourses || 0;
          } else if (condition.field === "completedCourses") {
            progress = analytics.completedCourses || 0;
          } else if (condition.field === "questionsAsked") {
            progress = analytics.questionsAsked || 0;
          } else if (condition.field === "completedModules") {
            progress = analytics.totalCompletedModules || 0;
          }
          isCompleted = progress >= condition.target;
          progress = Math.min(progress, condition.target);
          break;
          
        case "streak":
          if (condition.field === "loginStreak") {
            progress = analytics.currentStreak || 0;
          }
          isCompleted = progress >= condition.target;
          progress = Math.min(progress, condition.target);
          break;
          
        case "percentage":
          if (condition.field === "averageCompletionRate") {
            progress = analytics.averageCompletionRate || 0;
          }
          isCompleted = progress >= condition.target;
          progress = Math.min(progress, condition.target);
          break;
          
        case "completion":
          // For future use with more complex completion conditions
          break;
      }
      
      // Update or create user achievement record
      const userAchievement = await UserAchievement.findOne({
        userId,
        achievementCode: achievement.code
      });
      
      if (userAchievement) {
        // Only update if progress has increased or achievement is newly completed
        if (progress > userAchievement.progress || (isCompleted && !userAchievement.isCompleted)) {
          userAchievement.progress = progress;
          
          // If newly completed, set isNew to true for UI notification
          if (isCompleted && !userAchievement.isCompleted) {
            userAchievement.isNew = true;
            userAchievement.earnedAt = new Date();
          }
          
          userAchievement.isCompleted = isCompleted;
          await userAchievement.save();
        }
      } else {
        // Create new user achievement record
        await UserAchievement.create({
          userId,
          achievementCode: achievement.code,
          progress,
          isCompleted,
          isNew: isCompleted, // Only mark as new if it's completed immediately
          earnedAt: isCompleted ? new Date() : null
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error checking and updating achievements:", error);
    return false;
  }
};

app.get("/user/:userId/learning-analytics", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user with populated course data
    const user = await User.findById(userId).populate('enrolledCourses');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Process course progress data to create analytics
    const analytics = {
      totalCourses: user.enrolledCourses.length,
      completedCourses: 0,
      inProgressCourses: 0,
      notStartedCourses: 0,
      averageCompletionRate: 0,
      courseDetails: [],
      currentStreak: 0,
      totalCompletedModules: 0,
      questionsAsked: user.queryCount || 0
    };

    // Calculate streak based on login history (simplified version)
    // In a real implementation, you would have a more sophisticated streak calculation
    analytics.currentStreak = calculateUserStreak(user);

    // Calculate course-specific analytics
    if (user.courseProgress) {
      const progressEntries = Object.entries(user.courseProgress instanceof Map ? 
        user.courseProgress.toObject() : user.courseProgress || {});

      for (const [courseId, progress] of progressEntries) {
        // Find the course object
        const course = user.enrolledCourses.find(c => c._id.toString() === courseId);

        if (course) {
          // Calculate completion rate for this course
          const totalModules = course.modules.length;
          const completedModules = progress.completedModules?.length || 0;
          analytics.totalCompletedModules += completedModules;
          
          const completionRate = totalModules > 0
            ? (completedModules / totalModules) * 100
            : 0;

          // Categorize course
          if (completionRate === 100) {
            analytics.completedCourses++;
          } else if (completionRate > 0) {
            analytics.inProgressCourses++;
          } else {
            analytics.notStartedCourses++;
          }

          // Add course details
          analytics.courseDetails.push({
            courseId,
            title: course.title,
            category: course.category,
            completionRate,
            lastAccessed: progress.lastAccessed,
            startedAt: progress.startedAt
          });
        }
      }

      // Calculate average completion rate across all courses
      if (analytics.courseDetails.length > 0) {
        const totalCompletionRate = analytics.courseDetails.reduce(
          (sum, course) => sum + course.completionRate, 0
        );
        analytics.averageCompletionRate =
          totalCompletionRate / analytics.courseDetails.length;
      }
    }

    // Check and update achievements with the new analytics data
    await checkAndUpdateAchievements(userId, analytics);

    res.status(200).json({ analytics });
  } catch (error) {
    console.error("Error fetching learning analytics:", error);
    res.status(500).json({ error: "Failed to fetch learning analytics" });
  }
});

// Helper function to calculate user streak (simplified)
function calculateUserStreak(user) {
  // In a real implementation, you would have a more sophisticated algorithm
  // For example, checking login dates or activity records
  
  // For now, let's use a placeholder calculation based on course access
  // This is just a simplified example - you should replace this with actual logic
  
  // Placeholder: use the number of courses as the streak, with a max of 30
  const courseCount = user.enrolledCourses?.length || 0;
  return Math.min(courseCount + 3, 30); // +3 to give a small boost for demo purposes
}



//-----------------------------------some random updates-------------------


//---------------------------------Forum---------------------------------

app.post("/api/forum/initialize", async (req, res) => {
  try {
    const { courseId } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Create a forum for each module in the course
    const forumPromises = course.modules.map(async (module, index) => {
      // Check if forum already exists for this module
      const existingForum = await Forum.findOne({
        courseId,
        moduleIndex: index
      });

      if (!existingForum) {
        // Create new forum for this module
        return Forum.create({
          courseId,
          moduleIndex: index,
          title: `${module.title} Discussion`,
          description: `Discussion forum for ${module.title}`
        });
      }
      return existingForum; // Return existing forum if found
    });

    const forums = await Promise.all(forumPromises);
    res.status(200).json({
      message: "Forums initialized successfully",
      forums
    });
  } catch (error) {
    console.error("Error initializing forums:", error);
    res.status(500).json({ error: "Failed to initialize forums" });
  }
});

// ✅ Get forum for a specific course module
app.get("/api/forum/module/:courseId/:moduleIndex", async (req, res) => {
  try {
    const { courseId, moduleIndex } = req.params;
    
    // Validate parameters
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }
    
    const moduleIdx = parseInt(moduleIndex);
    if (isNaN(moduleIdx)) {
      return res.status(400).json({ error: "Invalid module index" });
    }

    // Get or create forum for this module
    let forum = await Forum.findOne({ courseId, moduleIndex: moduleIdx });
    
    if (!forum) {
      // Fetch the course to get module information
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      // Ensure the module exists
      if (!course.modules || !course.modules[moduleIdx]) {
        return res.status(404).json({ error: "Module not found" });
      }
      
      // Create a new forum for this module
      forum = await Forum.create({
        courseId,
        moduleIndex: moduleIdx,
        title: `${course.modules[moduleIdx].title} Discussion`,
        description: `Discussion forum for ${course.modules[moduleIdx].title}`
      });
    }

    // Fetch discussions for this forum
    const discussions = await Discussion.find({ courseId, moduleIndex: moduleIdx })
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .sort({ isSticky: -1, createdAt: -1 });

    // For each discussion, get the count of comments
    const discussionsWithCounts = await Promise.all(discussions.map(async (discussion) => {
      const commentCount = await Comment.countDocuments({ discussionId: discussion._id });
      const discussionObj = discussion.toObject();
      discussionObj.commentCount = commentCount;
      return discussionObj;
    }));

    res.status(200).json(discussionsWithCounts);
  } catch (error) {
    console.error("Error fetching forum:", error);
    res.status(500).json({ error: "Failed to fetch forum" });
  }
});

// ✅ Create a new discussion
app.post("/api/forum/discussion", async (req, res) => {
  try {
    const { courseId, moduleIndex, title, content, useAI, userId, tags } = req.body;

    // Validate required fields
    if (!courseId || moduleIndex === undefined || !title || !content || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Process with AI if requested
    let aiAssisted = false;
    let aiSummary = "";
    
    if (useAI) {
      try {
        // Create an AI prompt to generate additional insights
        const aiPrompt = `
          I need your help enhancing a discussion post for an online course forum.
          
          Course details: The post is about "${title}"
          
          Original post content: "${content}"
          
          Please provide:
          1. A concise 2-3 sentence summary of the key points
          2. 1-2 additional insights or perspectives that could enrich the discussion
          3. 1-2 thoughtful questions that could prompt further discussion
          
          Format your response as a structured markdown with clearly labeled sections.
        `;

        // Call your AI service (using Ollama in this case)
        const aiResponse = await axios.post("http://localhost:5001/api/generate", {
          model: "mistral",
          prompt: aiPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2048,
            top_k: 40,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        });

        // Extract and clean up AI response
        aiSummary = aiResponse.data.response.trim();
        aiAssisted = true;

      } catch (aiError) {
        console.error("Error generating AI content:", aiError);
        // Continue without AI assistance if it fails
      }
    }

    // Find or create the forum for this module
    let forum = await Forum.findOne({ courseId, moduleIndex });
    if (!forum) {
      // Get course details for forum creation
      const course = await Course.findById(courseId);
      if (!course || !course.modules || !course.modules[moduleIndex]) {
        return res.status(404).json({ error: "Course or module not found" });
      }
      
      forum = await Forum.create({
        courseId,
        moduleIndex,
        title: `${course.modules[moduleIndex].title} Discussion`,
        description: `Discussion forum for ${course.modules[moduleIndex].title}`
      });
    }

    // Create the discussion
    const discussion = await Discussion.create({
      forumId: forum._id,
      courseId,
      moduleIndex,
      title,
      content,
      createdBy: userId,
      aiAssisted,
      aiSummary,
      tags: tags || []
    });

    // Update forum metadata
    await Forum.findByIdAndUpdate(forum._id, {
      $inc: { totalDiscussions: 1 },
      lastActivity: new Date()
    });

    // Return the created discussion with user info
    const populatedDiscussion = await Discussion.findById(discussion._id).populate({
      path: 'createdBy',
      select: 'name email'
    });

    res.status(201).json(populatedDiscussion);
  } catch (error) {
    console.error("Error creating discussion:", error);
    res.status(500).json({ error: "Failed to create discussion" });
  }
});
app.get("/api/test-objectid/:id", (req, res) => {
  const { id } = req.params;
  const isValid = mongoose.Types.ObjectId.isValid(id);
  
  res.json({
    providedId: id,
    isValid,
    length: id.length,
    // Try to create an actual ObjectId
    objectIdTest: isValid ? new mongoose.Types.ObjectId(id).toString() : null
  });
});

app.get("/api/forum/discussion/:discussionId", async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    // Enhanced debugging
    console.log(`Fetching discussion with ID: ${discussionId}`);
    
    // Basic validation
    if (!discussionId || discussionId === "undefined") {
      console.log("Discussion ID is missing or undefined");
      return res.status(400).json({ error: "Discussion ID is required" });
    }
    
    // Validate ID format with more detailed error handling
    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      console.log(`Invalid ObjectId format: ${discussionId}`);
      return res.status(400).json({ 
        error: "Invalid discussion ID format", 
        providedId: discussionId 
      });
    }

    // First check if the discussion exists
    const discussion = await Discussion.findById(discussionId).populate({
      path: 'createdBy',
      select: 'name email'
    });
    
    if (!discussion) {
      console.log(`Discussion not found with ID: ${discussionId}`);
      return res.status(404).json({ error: "Discussion not found" });
    }
    
    // If found, increment view count
    await Discussion.findByIdAndUpdate(discussionId, { $inc: { views: 1 } });

    // Get top-level comments (no parent)
    const comments = await Comment.find({ 
      discussionId, 
      parentId: null 
    })
    .populate({
      path: 'createdBy',
      select: 'name email'
    })
    .sort({ isAnswer: -1, createdAt: -1 });

    // For each comment, get its replies
    const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
      const replies = await Comment.find({ 
        discussionId, 
        parentId: comment._id 
      })
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .sort({ createdAt: 1 });
      
      const commentObj = comment.toObject();
      commentObj.replies = replies;
      return commentObj;
    }));

    console.log(`Successfully retrieved discussion and ${comments.length} comments`);
    
    res.status(200).json({
      discussion,
      comments: commentsWithReplies
    });
  } catch (error) {
    console.error("Error fetching discussion:", error);
    res.status(500).json({ error: "Failed to fetch discussion" });
  }
});

// ✅ Add a comment to a discussion
app.post("/api/forum/comment", async (req, res) => {
  try {
    const { discussionId, content, userId, parentId, useAI } = req.body;

    // Validate required fields
    if (!discussionId || !content || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the discussion
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }

    // Process with AI if requested
    let aiGenerated = false;
    let aiContent = content;
    
    if (useAI) {
      try {
        // Get discussion details and context for AI
        const discussionContext = discussion.content.substring(0, 500) + 
          (discussion.content.length > 500 ? "..." : "");
          
        // If this is a reply, get parent comment for context
        let parentContext = "";
        if (parentId) {
          const parentComment = await Comment.findById(parentId);
          if (parentComment) {
            parentContext = `\nReplying to: "${parentComment.content}"`;
          }
        }

        // Create an AI prompt
        const aiPrompt = `
          I need help improving and enhancing a comment for an educational discussion forum.
          
          Discussion topic: "${discussion.title}"
          Discussion context: "${discussionContext}"${parentContext}
          
          Original comment: "${content}"
          
          Please enhance this comment by:
          1. Improving clarity and academic tone
          2. Adding relevant insights or examples if appropriate
          3. Ensuring the response is helpful, constructive, and promotes further discussion
          4. Maintaining the original intent and core message
          
          Your response should be concise (maximum 2-3 paragraphs) and in a natural, conversational tone suitable for an educational setting.
          Return ONLY the enhanced comment text, without any explanations or additional formatting.
        `;

        // Call your AI service (using Ollama)
        const aiResponse = await axios.post("http://localhost:5001/api/generate", {
          model: "mistral",
          prompt: aiPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1024,
            top_k: 40,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        });

        // Extract and clean up AI response
        aiContent = aiResponse.data.response.trim();
        aiGenerated = true;

      } catch (aiError) {
        console.error("Error generating AI content for comment:", aiError);
        // Continue with original content if AI fails
      }
    }

    // Create the comment
    const comment = await Comment.create({
      discussionId,
      content: aiContent,
      createdBy: userId,
      parentId: parentId || null,
      aiGenerated
    });

    // Update discussion's lastActivity timestamp
    await Discussion.findByIdAndUpdate(discussionId, {
      lastActivity: new Date()
    });
    
    // Update forum's lastActivity timestamp
    await Forum.findByIdAndUpdate(discussion.forumId, {
      lastActivity: new Date()
    });

    // Return the created comment with user info
    const populatedComment = await Comment.findById(comment._id).populate({
      path: 'createdBy',
      select: 'name email'
    });

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// ✅ Vote on a comment
app.post("/api/forum/comment/vote", async (req, res) => {
  try {
    const { commentId, userId, voteType } = req.body;

    // Validate required fields
    if (!commentId || !userId || !['up', 'down'].includes(voteType)) {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user has already voted on this comment
    const hasUpvoted = comment.votes.up.includes(userId);
    const hasDownvoted = comment.votes.down.includes(userId);

    // Update votes based on current status and requested vote type
    let update = {};
    
    if (voteType === 'up') {
      if (hasUpvoted) {
        // Remove upvote (toggle off)
        update = { $pull: { 'votes.up': userId } };
      } else {
        // Add upvote and remove downvote if exists
        update = { 
          $addToSet: { 'votes.up': userId },
          $pull: { 'votes.down': userId }
        };
      }
    } else if (voteType === 'down') {
      if (hasDownvoted) {
        // Remove downvote (toggle off)
        update = { $pull: { 'votes.down': userId } };
      } else {
        // Add downvote and remove upvote if exists
        update = { 
          $addToSet: { 'votes.down': userId },
          $pull: { 'votes.up': userId }
        };
      }
    }

    // Apply the update
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      update,
      { new: true }
    ).populate({
      path: 'createdBy',
      select: 'name email'
    });

    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Error voting on comment:", error);
    res.status(500).json({ error: "Failed to register vote" });
  }
});

// ✅ Mark a comment as the answer to a discussion
app.post("/api/forum/comment/mark-answer", async (req, res) => {
  try {
    const { commentId, discussionId, userId } = req.body;

    // Validate required fields
    if (!commentId || !discussionId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if the user is the discussion creator
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }

    // Only the discussion creator or an admin can mark answers
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (discussion.createdBy.toString() !== userId && user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to mark answers for this discussion" });
    }

    // First, unmark any previously marked answers
    await Comment.updateMany(
      { discussionId: discussionId },
      { isAnswer: false }
    );

    // Then mark the specified comment as the answer
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { isAnswer: true },
      { new: true }
    ).populate({
      path: 'createdBy',
      select: 'name email'
    });

    if (!updatedComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.status(200).json({
      message: "Comment marked as answer",
      comment: updatedComment
    });
  } catch (error) {
    console.error("Error marking comment as answer:", error);
    res.status(500).json({ error: "Failed to mark answer" });
  }
});

// ✅ Get AI-assisted help for a discussion
app.post("/api/forum/ai-assist", async (req, res) => {
  try {
    const { discussionId, query, userId } = req.body;

    // Validate required fields
    if (!discussionId || !query || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the discussion
    const discussion = await Discussion.findById(discussionId).populate({
      path: 'createdBy',
      select: 'name email'
    });
    
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }

    // Get course and module context
    const course = await Course.findById(discussion.courseId);
    if (!course || !course.modules || !course.modules[discussion.moduleIndex]) {
      return res.status(404).json({ error: "Course or module not found" });
    }

    const moduleTitle = course.modules[discussion.moduleIndex].title;
    const moduleDescription = course.modules[discussion.moduleIndex].description;

    // Get comments for context
    const comments = await Comment.find({ discussionId })
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .sort({ createdAt: 1 })
      .limit(5); // Limit to recent comments for context

    // Create context for AI prompt
    const commentsText = comments.map(c => 
      `${c.createdBy.name}: "${c.content.substring(0, 200)}${c.content.length > 200 ? '...' : ''}"`
    ).join('\n');

    // Create AI prompt with context
    const aiPrompt = `
      You are an AI tutor helping a student in an educational discussion forum about "${course.title}".
      
      CONTEXT:
      - Course: "${course.title}"
      - Module: "${moduleTitle}" - ${moduleDescription}
      - Discussion Topic: "${discussion.title}"
      - Discussion Content: "${discussion.content}"
      
      Recent comments in the discussion:
      ${commentsText}
      
      STUDENT QUESTION:
      "${query}"
      
      INSTRUCTIONS:
      1. Provide a helpful, educational response addressing the student's question
      2. Include relevant information from the course/module context when applicable
      3. If appropriate, suggest resources or approaches for further learning
      4. Be concise but thorough (aim for 2-4 paragraphs)
      5. Use a supportive, encouraging tone while maintaining academic rigor
      
      YOUR RESPONSE:
    `;

    // Call AI service
    const aiResponse = await axios.post("http://localhost:5001/api/generate", {
      model: "mistral",
      prompt: aiPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2048,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    });

    // Create an AI-generated comment
    const comment = await Comment.create({
      discussionId,
      content: aiResponse.data.response.trim(),
      createdBy: userId, // The user who requested the AI assistance
      aiGenerated: true,
      parentId: null // Top-level comment
    });

    // Return the AI response
    const populatedComment = await Comment.findById(comment._id).populate({
      path: 'createdBy',
      select: 'name email'
    });

    res.status(200).json({
      message: "AI assistance generated",
      comment: populatedComment
    });
  } catch (error) {
    console.error("Error generating AI assistance:", error);
    res.status(500).json({ error: "Failed to generate AI assistance" });
  }
});

// ✅ Search discussions within a course
app.get("/api/forum/course/:courseId/search", async (req, res) => {
  try {
    const { courseId } = req.params;
    const { query, moduleIndex } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Build search criteria
    let searchCriteria = {
      courseId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    };

    // Filter by module if specified
    if (moduleIndex !== undefined) {
      searchCriteria.moduleIndex = parseInt(moduleIndex);
    }

    // Find matching discussions
    const discussions = await Discussion.find(searchCriteria)
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 });

    // For each discussion, get the count of comments
    const discussionsWithMeta = await Promise.all(discussions.map(async (discussion) => {
      const commentCount = await Comment.countDocuments({ discussionId: discussion._id });
      const discussionObj = discussion.toObject();
      discussionObj.commentCount = commentCount;
      return discussionObj;
    }));

    res.status(200).json(discussionsWithMeta);
  } catch (error) {
    console.error("Error searching discussions:", error);
    res.status(500).json({ error: "Failed to search discussions" });
  }
});

// ✅ Get forum activity for a user
app.get("/api/forum/user/:userId/activity", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's discussions
    const discussions = await Discussion.find({ createdBy: userId })
      .populate({
        path: 'courseId',
        select: 'title'
      })
      .sort({ createdAt: -1 });
      
    // Get user's comments
    const comments = await Comment.find({ createdBy: userId })
      .populate({
        path: 'discussionId',
        select: 'title courseId',
        populate: {
          path: 'courseId',
          select: 'title'
        }
      })
      .sort({ createdAt: -1 });
      
    // Format the results
    const formattedDiscussions = discussions.map(d => ({
      type: 'discussion',
      id: d._id,
      title: d.title,
      courseId: d.courseId._id,
      courseName: d.courseId.title,
      moduleIndex: d.moduleIndex,
      createdAt: d.createdAt,
      content: d.content.substring(0, 100) + (d.content.length > 100 ? '...' : '')
    }));
    
    const formattedComments = comments.map(c => ({
      type: 'comment',
      id: c._id,
      discussionId: c.discussionId._id,
      discussionTitle: c.discussionId.title,
      courseId: c.discussionId.courseId._id,
      courseName: c.discussionId.courseId.title,
      createdAt: c.createdAt,
      content: c.content.substring(0, 100) + (c.content.length > 100 ? '...' : '')
    }));
    
    // Combine and sort by date
    const activity = [...formattedDiscussions, ...formattedComments]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
    res.status(200).json(activity);
  } catch (error) {
    console.error("Error fetching user forum activity:", error);
    res.status(500).json({ error: "Failed to fetch forum activity" });
  }
});

//---------------------------------Forum---------------------------------


//------------------------------UserConnections--------------------------

app.get("/user/connections", async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get all accepted connections
    const connections = await UserConnection.find({
      $or: [
        { requesterId: userId, status: 'accepted' },
        { recipientId: userId, status: 'accepted' }
      ]
    }).populate('requesterId recipientId', 'name email');
    
    // Format the response
    const formattedConnections = connections.map(conn => {
      const isRequester = conn.requesterId._id.toString() === userId.toString();
      const otherUser = isRequester ? conn.recipientId : conn.requesterId;
      
      return {
        connectionId: conn._id,
        userId: otherUser._id,
        name: otherUser.name,
        email: otherUser.email,
        status: conn.status,
        visibility: conn.visibility,
        since: conn.requestDate
      };
    });
    
    res.status(200).json(formattedConnections);
  } catch (error) {
    console.error("Error fetching connections:", error);
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

// Get pending connection requests for the current user
app.get("/user/connection-requests", async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Get all pending requests sent to the user
    const pendingRequests = await UserConnection.find({
      recipientId: userId,
      status: 'pending'
    }).populate('requesterId', 'name email');
    
    // Format the response
    const formattedRequests = pendingRequests.map(req => ({
      requestId: req._id,
      from: {
        userId: req.requesterId._id,
        name: req.requesterId.name,
        email: req.requesterId.email
      },
      message: req.message,
      requestDate: req.requestDate
    }));
    
    res.status(200).json(formattedRequests);
  } catch (error) {
    console.error("Error fetching connection requests:", error);
    res.status(500).json({ error: "Failed to fetch connection requests" });
  }
});

// Send a connection request
app.post("/connection/send-request", async (req, res) => {
  try {
    const { requesterId, recipientId, message } = req.body;
    
    // Validate required fields
    if (!requesterId || !recipientId) {
      return res.status(400).json({ error: "Requester ID and recipient ID are required" });
    }
    
    // Check if users exist
    const requester = await User.findById(requesterId);
    const recipient = await User.findById(recipientId);
    
    if (!requester || !recipient) {
      return res.status(404).json({ error: "One or both users not found" });
    }
    
    // Check if connection already exists
    const existingConnection = await UserConnection.findOne({
      $or: [
        { requesterId, recipientId },
        { requesterId: recipientId, recipientId: requesterId }
      ]
    });
    
    if (existingConnection) {
      if (existingConnection.status === 'blocked') {
        return res.status(403).json({ error: "Unable to send request" });
      }
      
      if (existingConnection.status === 'pending') {
        // If requester is the recipient of the existing request, auto-accept
        if (existingConnection.recipientId.toString() === requesterId) {
          existingConnection.status = 'accepted';
          await existingConnection.save();
          return res.status(200).json({
            message: "Connection accepted",
            connection: existingConnection
          });
        }
        return res.status(400).json({ 
          error: "Connection request already pending",
          connectionId: existingConnection._id
        });
      }
      
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({ 
          error: "Users are already connected",
          connectionId: existingConnection._id
        });
      }
      
      if (existingConnection.status === 'rejected') {
        // Allow re-requesting if previously rejected
        existingConnection.status = 'pending';
        existingConnection.requestDate = Date.now();
        existingConnection.message = message || "";
        await existingConnection.save();
        
        return res.status(200).json({
          message: "Connection request sent",
          connection: existingConnection
        });
      }
    }
    
    // Create new connection request
    const newConnection = new UserConnection({
      requesterId,
      recipientId,
      message: message || "",
      status: 'pending'
    });
    
    await newConnection.save();
    
    res.status(201).json({
      message: "Connection request sent successfully",
      connection: newConnection
    });
  } catch (error) {
    console.error("Error sending connection request:", error);
    res.status(500).json({ error: "Failed to send connection request" });
  }
});

// Respond to a connection request (accept/reject)
app.put("/connection/:connectionId/respond", async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { status, userId } = req.body;
    
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'" });
    }
    
    const connection = await UserConnection.findById(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: "Connection request not found" });
    }
    
    // Ensure user is the recipient of the request
    if (connection.recipientId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to respond to this request" });
    }
    
    // Update status
    connection.status = status;
    await connection.save();
    
    res.status(200).json({
      message: `Connection request ${status}`,
      connection
    });
  } catch (error) {
    console.error("Error responding to connection request:", error);
    res.status(500).json({ error: "Failed to respond to connection request" });
  }
});

// Update connection visibility settings
app.put("/connection/:connectionId/visibility", async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { userId, visibility } = req.body;
    
    const connection = await UserConnection.findById(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    
    // Ensure user is part of the connection
    if (connection.requesterId.toString() !== userId && 
        connection.recipientId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to update this connection" });
    }
    
    // Update visibility settings
    if (visibility) {
      connection.visibility = {
        ...connection.visibility,
        ...visibility
      };
    }
    
    await connection.save();
    
    res.status(200).json({
      message: "Connection visibility updated",
      connection
    });
  } catch (error) {
    console.error("Error updating connection visibility:", error);
    res.status(500).json({ error: "Failed to update connection visibility" });
  }
});

// Remove/delete a connection
app.delete("/connection/:connectionId", async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { userId } = req.query;
    
    const connection = await UserConnection.findById(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    
    // Ensure user is part of the connection
    if (connection.requesterId.toString() !== userId && 
        connection.recipientId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to remove this connection" });
    }
    
    await UserConnection.findByIdAndDelete(connectionId);
    
    res.status(200).json({
      message: "Connection removed successfully"
    });
  } catch (error) {
    console.error("Error removing connection:", error);
    res.status(500).json({ error: "Failed to remove connection" });
  }
});

// Search for users to connect with (by name or email)
app.get("/user/search", async (req, res) => {
  try {
    const { query, userId } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    
    // Find users matching the search query, excluding the current user
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('name email');
    
    // For each user, include connection status if any
    const usersWithConnectionStatus = await Promise.all(users.map(async (user) => {
      const connection = await UserConnection.findOne({
        $or: [
          { requesterId: userId, recipientId: user._id },
          { requesterId: user._id, recipientId: userId }
        ]
      });
      
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        connectionStatus: connection ? connection.status : null,
        connectionId: connection ? connection._id : null
      };
    }));
    
    res.status(200).json(usersWithConnectionStatus);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// Get learning progress for a specific connection
app.get("/user/:userId/connection/:connectionId/progress", async (req, res) => {
  try {
    const { userId, connectionId } = req.params;
    
    // Validate the connection exists and user has permission to view
    const connection = await UserConnection.findById(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    
    // Ensure user is part of the connection
    if (connection.requesterId.toString() !== userId && 
        connection.recipientId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to view this connection's progress" });
    }
    
    // Only accepted connections can view progress
    if (connection.status !== 'accepted') {
      return res.status(403).json({ error: "Connection not yet accepted" });
    }
    
    // Determine which user's progress to fetch (the one that's not the requester)
    const targetUserId = connection.requesterId.toString() === userId 
      ? connection.recipientId
      : connection.requesterId;
    
    // Check visibility settings
    const isRequester = connection.requesterId.toString() === userId;
    if (!isRequester && !connection.visibility.progressVisible) {
      return res.status(403).json({ error: "User has restricted progress visibility" });
    }
    
    // Get progress data for the target user
    const targetUser = await User.findById(targetUserId).select('name');
    
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get enrolled courses 
    const userCourses = await axios.get(`${req.protocol}://${req.get('host')}/user/${targetUserId}/courses`);
    
    // Get activity data
    let activityData = {
      completedCourses: [],
      inProgressCourses: []
    };
    
    // Try to get learning analytics if available
    try {
      const analyticsResponse = await axios.get(`${req.protocol}://${req.get('host')}/user/${targetUserId}/learning-analytics`);
      if (analyticsResponse.data && analyticsResponse.data.analytics) {
        const analytics = analyticsResponse.data.analytics;
        
        activityData = {
          completedCourses: analytics.completedCourses || 0,
          inProgressCourses: analytics.inProgressCourses || 0,
          averageCompletionRate: analytics.averageCompletionRate || 0,
          courseDetails: analytics.courseDetails || []
        };
      }
    } catch (error) {
      console.warn("Could not fetch learning analytics:", error.message);
    }
    
    res.status(200).json({
      user: {
        userId: targetUserId,
        name: targetUser.name
      },
      courses: userCourses.data.courses || [],
      activity: activityData
    });
  } catch (error) {
    console.error("Error fetching connection progress:", error);
    res.status(500).json({ error: "Failed to fetch connection progress" });
  }
});


//------------------------------UserConnections--------------------------



//---------------------------Assessment----------------------------------

app.post("/send-certificate-email", async (req, res) => {
  try {
    const { 
      userId, 
      certificateId, 
      courseId, 
      courseName,
      certificateImage, 
      recipientName,
      email 
    } = req.body;
    
    // Validate required data
    if (!userId || !certificateId || !courseId) {
      return res.status(400).json({ error: "Missing required certificate information" });
    }
    
    // Get user email if not provided in request
    let userEmail = email;
    if (!userEmail) {
      const user = await User.findById(userId);
      if (!user || !user.email) {
        return res.status(400).json({ error: "User email not found" });
      }
      userEmail = user.email;
    }
    
    // Create a temporary directory if it doesn't exist
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Define PDF file path
    const pdfFilePath = path.join(tempDir, `${certificateId}.pdf`);
    
    // Process the certificate image and convert to PDF
    if (certificateImage) {
      try {
        // Remove the data URL prefix
        const imageData = certificateImage.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(imageData, 'base64');
        
        // Create a new PDF document
        const doc = new PDFDocument({
          layout: 'landscape',
          size: 'A4'
        });
        
        // Pipe the PDF to a file
        const pdfStream = fs.createWriteStream(pdfFilePath);
        doc.pipe(pdfStream);
        
        // Add the certificate image to the PDF (with proper sizing for A4 landscape)
        doc.image(imageBuffer, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
          align: 'center',
          valign: 'center',
          fit: [doc.page.width, doc.page.height]
        });
        
        // Finalize the PDF
        doc.end();
        
        // Wait for the PDF to be written completely
        await new Promise((resolve, reject) => {
          pdfStream.on('finish', resolve);
          pdfStream.on('error', reject);
        });
        
        console.log("PDF Certificate created successfully");
        
      } catch (pdfError) {
        console.error("Error creating PDF certificate:", pdfError);
        return res.status(500).json({ error: "Failed to process certificate image" });
      }
    } else {
      // If no image is provided, we'll send just the email without attachment
      console.log("No certificate image provided, sending email without attachment");
    }
    
    // Create email HTML with congratulatory message
    const emailTemplate = generateCongratulationsEmail(
      recipientName || "Student", 
      courseName || "the course",
      certificateId
    );
    
    // Configure email options
    const mailOptions = {
      from: '"NeuraleLearn" <neuralearnhelp@gmail.com>',
      to: userEmail,
      subject: `🎓 Your Certificate of Completion for ${courseName}`,
      html: emailTemplate,
      attachments: []
    };
    
    // Add PDF certificate as attachment if it exists
    if (fs.existsSync(pdfFilePath)) {
      mailOptions.attachments.push({
        filename: `${courseName.replace(/\s+/g, '_')}_Certificate.pdf`,
        path: pdfFilePath,
        contentType: 'application/pdf'
      });
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Certificate email sent:", info.response);
    
    // Clean up temporary file
    setTimeout(() => {
      try {
        if (fs.existsSync(pdfFilePath)) {
          fs.unlinkSync(pdfFilePath);
          console.log("Temporary certificate file removed");
        }
      } catch (cleanupError) {
        console.error("Error cleaning up certificate file:", cleanupError);
      }
    }, 5000); // Wait 5 seconds before deletion
    
    // Return success response
    res.status(200).json({ 
      message: "Certificate email sent successfully",
      emailId: info.messageId
    });
    
  } catch (error) {
    console.error("Error sending certificate email:", error);
    res.status(500).json({ error: "Failed to send certificate email" });
  }
});

// Generate HTML email template with congratulatory message
function generateCongratulationsEmail(studentName, courseName, certificateId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Course Completion Certificate</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Poppins', sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          color: #333333;
          background-color: #f9f9f9;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #4267B2, #5C7CFA);
          padding: 30px;
          text-align: center;
          border-bottom: 5px solid #36518F;
        }
        
        .header h1 {
          color: white;
          margin: 0;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: 1px;
        }
        
        .header p {
          color: rgba(255, 255, 255, 0.9);
          margin: 10px 0 0;
          font-size: 16px;
        }
        
        .content {
          padding: 30px;
        }
        
        .congratulations {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .congratulations h2 {
          color: #4267B2;
          font-size: 24px;
          margin-top: 0;
          margin-bottom: 15px;
        }
        
        .congratulations p {
          color: #555;
          font-size: 16px;
          margin-bottom: 20px;
        }
        
        .certificate-info {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
        }
        
        .certificate-id {
          font-family: monospace;
          background-color: #e9ecef;
          padding: 3px 8px;
          border-radius: 3px;
          color: #495057;
        }
        
        .next-steps {
          background-color: #e8f0ff;
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
        }
        
        .next-steps h3 {
          color: #4267B2;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .next-steps ul {
          margin-bottom: 0;
          padding-left: 20px;
        }
        
        .next-steps li {
          margin-bottom: 8px;
        }
        
        .button {
          display: inline-block;
          background-color: #4267B2;
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 5px;
          font-weight: 500;
          margin-top: 20px;
          text-align: center;
        }
        
        .button:hover {
          background-color: #36518F;
        }
        
        .pdf-notice {
          background-color: #fff8e1;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
        
        .footer {
          background-color: #f7f9fc;
          padding: 25px;
          text-align: center;
          color: #8a8a8a;
          font-size: 14px;
          border-top: 1px solid #e0e0e0;
        }
        
        .footer a {
          color: #4267B2;
          text-decoration: none;
        }
        
        .footer a:hover {
          text-decoration: underline;
        }
        
        @media screen and (max-width: 600px) {
          .header {
            padding: 20px;
          }
          
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>NeuraleLearn</h1>
          <p>Certificate of Achievement</p>
        </div>
        
        <div class="content">
          <div class="congratulations">
            <h2>Congratulations, ${studentName}!</h2>
            <p>We're excited to celebrate your achievement in completing <strong>${courseName}</strong>. Your hard work and dedication have paid off, and we're proud to present you with your official certificate of completion.</p>
          </div>
          
          <div class="pdf-notice">
            <p><strong>📎 Your certificate is attached to this email as a PDF file.</strong> You can download, print, or share it from your dashboard at any time.</p>
          </div>
          
          <div class="certificate-info">
            <p>Your certificate details:</p>
            <p><strong>Certificate ID:</strong> <span class="certificate-id">${certificateId}</span></p>
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Date Issued:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <p>This certificate verifies that you have successfully completed all the requirements for this course. It serves as a testament to your new skills and knowledge.</p>
          
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li><strong>Share your achievement</strong> on LinkedIn or other social platforms to showcase your new skills</li>
              <li><strong>Explore related courses</strong> to further enhance your knowledge</li>
              <li><strong>Join our community</strong> to connect with fellow learners and industry professionals</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/courses" class="button">Explore More Courses</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} NeuraleLearn. All rights reserved.</p>
          <p>
            <a href="#">Privacy Policy</a> | 
            <a href="#">Terms of Service</a> | 
            <a href="#">Contact Us</a>
          </p>
          <p>
            You received this email because you completed a course on NeuraleLearn.<br>
            If you prefer not to receive completion notifications, you can <a href="#">update your email preferences</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}


app.delete("/assessment/:assessmentId", async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ error: "Invalid assessment ID format" });
    }

    // Find and delete the assessment
    const assessment = await Assessment.findByIdAndDelete(assessmentId);

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    res.status(200).json({ message: "Assessment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assessment:", error);
    res.status(500).json({ error: "Failed to delete assessment" });
  }
});


app.get("/assessment/admin/:assessmentId", async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ error: "Invalid assessment ID format" });
    }

    // Find the assessment with all details
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    res.status(200).json(assessment);
  } catch (error) {
    console.error("Error fetching assessment for editing:", error);
    res.status(500).json({ error: "Failed to fetch assessment details" });
  }
});

// Update assessment
app.put("/assessment/:assessmentId", async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updates = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ error: "Invalid assessment ID format" });
    }

    // Find and update the assessment
    const assessment = await Assessment.findByIdAndUpdate(
      assessmentId,
      updates,
      { new: true } // Return the updated document
    );

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    res.status(200).json(assessment);
  } catch (error) {
    console.error("Error updating assessment:", error);
    res.status(500).json({ error: "Failed to update assessment" });
  }
});


app.get("/assessments/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    // Find all assessments for this course
    const assessments = await Assessment.find({ courseId });

    // Return assessments with additional information
    const assessmentsWithDetails = assessments.map(assessment => ({
      _id: assessment._id,
      courseId: assessment.courseId,
      moduleIndex: assessment.moduleIndex,
      timeLimit: assessment.timeLimit,
      questionCount: assessment.questions.length,
      passPercentage: assessment.passPercentage
    }));

    res.status(200).json(assessmentsWithDetails);
  } catch (error) {
    console.error("Error fetching course assessments:", error);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

app.get("/assessment/:courseId/:moduleIndex", async (req, res) => {
  try {
    const { courseId, moduleIndex } = req.params;
    const userId = req.query.userId;

    // console.log("Request parameters:", { courseId, moduleIndex, userId });

    // Validate IDs before proceeding
    if (!courseId || !moduleIndex || !userId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }


    // Convert moduleIndex to number
    const numericModuleIndex = parseInt(moduleIndex, 10);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: "Invalid ID format",
        details: { courseId, userId }
      });
    }

    // Check if user has completed this module
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract user progress for this course
    let courseProgress;
    if (user.courseProgress instanceof Map) {
      courseProgress = user.courseProgress.get(courseId);
    } else if (typeof user.courseProgress === 'object') {
      courseProgress = user.courseProgress[courseId];
    }

    if (!courseProgress) {
      console.log('No course progress found for course:', courseId);
      return res.status(400).json({
        error: "Module must be completed before taking the assessment"
      });
    }

    // Ensure completedModules exists and is an array
    if (!courseProgress.completedModules || !Array.isArray(courseProgress.completedModules)) {
      console.log('completedModules is not an array:', courseProgress.completedModules);
      return res.status(400).json({
        error: "No modules completed yet"
      });
    }

    // Check if the module is completed using various ID formats
    const moduleIdToCheck = `module-${moduleIndex}`;

    // Try to find completion in completedModules array
    const isCompleted = courseProgress.completedModules.some(id => {
      // Convert id to string if it's an ObjectId or other object
      const idStr = id && typeof id === 'object' && id.toString ? id.toString() : String(id);

      return (
        idStr === moduleIdToCheck ||
        idStr === `module-${numericModuleIndex}` ||
        idStr.endsWith(`-${moduleIndex}`) ||
        idStr === `${moduleIndex}` ||
        idStr === numericModuleIndex.toString()
      );
    });

    // Also check moduleData array for more robust check
    const isInModuleData = courseProgress.moduleData &&
      Array.isArray(courseProgress.moduleData) &&
      courseProgress.moduleData.some(m =>
        m.moduleIndex === numericModuleIndex &&
        m.completed === true
      );

    // console.log('Module completion check:', {
    //   courseId,
    //   moduleIndex: numericModuleIndex,
    //   moduleIdToCheck,
    //   completedModules: courseProgress.completedModules,
    //   isCompleted,
    //   isInModuleData,
    //   moduleData: courseProgress.moduleData
    // });

    if (!isCompleted && !isInModuleData) {
      return res.status(400).json({
        error: "Module must be completed before taking the assessment"
      });
    }

    // Find assessment for this module
    const assessment = await Assessment.findOne({
      courseId,
      moduleIndex: numericModuleIndex
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Return assessment without correct answers
    const assessmentForUser = {
      _id: assessment._id,
      courseId: assessment.courseId,
      moduleIndex: assessment.moduleIndex,
      timeLimit: assessment.timeLimit,
      questions: assessment.questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options.map(o => ({
          _id: o._id,
          text: o.text
        }))
      }))
    };

    res.status(200).json(assessmentForUser);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
});

// Submit assessment answers and get results
app.post("/assessment/submit", async (req, res) => {
  try {
    const { assessmentId, userId, answers, timeSpent } = req.body;

    // Validate required fields
    if (!assessmentId || !userId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "AssessmentId, userId, and answers array are required" });
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(assessmentId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Find the assessment
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate score
    let correctAnswers = 0;
    const results = [];

    answers.forEach(answer => {
      const question = assessment.questions.id(answer.questionId);

      if (!question) {
        results.push({
          questionId: answer.questionId,
          isCorrect: false,
          message: "Question not found"
        });
        return;
      }

      const selectedOption = question.options.id(answer.selectedOptionId);
      const correctOption = question.options.find(o => o.isCorrect);

      if (!selectedOption) {
        results.push({
          questionId: answer.questionId,
          isCorrect: false,
          message: "Selected option not found",
          correctOptionId: correctOption ? correctOption._id : null,
          explanation: question.explanation
        });
        return;
      }

      const isCorrect = selectedOption.isCorrect;
      if (isCorrect) correctAnswers++;

      results.push({
        questionId: answer.questionId,
        isCorrect,
        correctOptionId: correctOption ? correctOption._id : null,
        explanation: question.explanation
      });
    });

    const scorePercentage = (correctAnswers / assessment.questions.length) * 100;
    const passed = scorePercentage >= assessment.passPercentage;

    // Update user's progress
    const courseId = assessment.courseId.toString();
    let courseProgress;

    if (user.courseProgress instanceof Map) {
      courseProgress = user.courseProgress.get(courseId) || {
        completedModules: [],
        moduleData: [],
        startedAt: new Date(),
        lastAccessed: new Date(),
        totalTimeSpent: 0
      };
    } else if (typeof user.courseProgress === 'object') {
      courseProgress = user.courseProgress[courseId] || {
        completedModules: [],
        moduleData: [],
        startedAt: new Date(),
        lastAccessed: new Date(),
        totalTimeSpent: 0
      };
    } else {
      // Initialize course progress if it doesn't exist
      user.courseProgress = new Map();
      courseProgress = {
        completedModules: [],
        moduleData: [],
        startedAt: new Date(),
        lastAccessed: new Date(),
        totalTimeSpent: 0
      };
    }

    // Find the module in moduleData
    let moduleData = courseProgress.moduleData.find(
      m => m.moduleIndex === assessment.moduleIndex
    );

    if (!moduleData) {
      moduleData = {
        moduleIndex: assessment.moduleIndex,
        moduleId: `module-${assessment.moduleIndex}`,
        completed: true,
        lastAccessed: new Date(),
        timeSpent: 0,
        visitCount: 1,
        quizScores: []
      };
      courseProgress.moduleData.push(moduleData);
    }

    // Add quiz score
    moduleData.quizScores.push({
      quizId: assessmentId,
      score: scorePercentage,
      maxScore: 100,
      completedAt: new Date()
    });

    // Update the course progress
    if (user.courseProgress instanceof Map) {
      user.courseProgress.set(courseId, courseProgress);
    } else if (typeof user.courseProgress === 'object') {
      user.courseProgress[courseId] = courseProgress;
    }

    await user.save();

    res.status(200).json({
      score: scorePercentage,
      correct: correctAnswers,
      total: assessment.questions.length,
      passed,
      results
    });
  } catch (error) {
    console.error("Error submitting assessment:", error);
    res.status(500).json({ error: "Failed to submit assessment" });
  }
});

// Generate assessment for a module
app.post("/assessment/generate", async (req, res) => {
  try {
    const { courseId, moduleIndex } = req.body;

    // Validate required fields
    if (!courseId || moduleIndex === undefined) {
      return res.status(400).json({ error: "CourseId and moduleIndex are required" });
    }

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check if module exists in the course
    if (!course.modules[moduleIndex]) {
      return res.status(404).json({ error: "Module not found in this course" });
    }

    // Check if study material exists for this module
    const studyMaterial = await StudyMaterial.findOne({ courseId, moduleIndex: parseInt(moduleIndex, 10) });
    if (!studyMaterial) {
      return res.status(404).json({ error: "Study material not found for this module" });
    }

    // Check if assessment already exists
    const existingAssessment = await Assessment.findOne({ courseId, moduleIndex: parseInt(moduleIndex, 10) });
    if (existingAssessment) {
      return res.status(400).json({
        error: "Assessment already exists for this module",
        assessmentId: existingAssessment._id
      });
    }

    // Generate assessment using local AI
    const moduleTitle = course.modules[moduleIndex].title;
    const moduleContent = studyMaterial.content;

    // Prepare prompt for AI to generate MCQs with stronger formatting requirements
    const prompt = `
    Create a multiple-choice assessment based on this study material for "${moduleTitle}".
    
    Here's the content to base questions on:
    ${moduleContent.substring(0, 5000)}
    
    Instructions:
    1. Generate 10 multiple-choice questions that test understanding of key concepts
    2. Each question should have 4 options with EXACTLY ONE correct answer per question
    3. Include a brief explanation for each correct answer
    4. Format your response as a valid JSON object with the following structure:

    {
      "questions": [
        {
          "questionText": "Question here?",
          "options": [
            {"text": "Option A", "isCorrect": false},
            {"text": "Option B", "isCorrect": true},
            {"text": "Option C", "isCorrect": false},
            {"text": "Option D", "isCorrect": false}
          ],
          "explanation": "Explanation of the correct answer"
        }
      ]
    }
    
    CRITICAL: You must follow these exact requirements:
    - Return ONLY pure JSON with NO additional text, comments, or code blocks
    - EXACTLY ONE option must have "isCorrect": true for each question
    - All other options MUST have "isCorrect": false
    - Make sure the JSON is properly formatted with correct syntax`;

    // Call your local AI service
    const aiResponse = await axios.post("http://localhost:5001/api/generate", {
      model: "mistral",
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 4096,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    });

    let questionsData;
    try {
      // Extract and clean JSON from the AI response
      let responseText = aiResponse.data.response;
      
      // Log the raw response for debugging
      console.log("Raw AI response:", responseText);

      // Clean up the response to get valid JSON
      // Remove any markdown code block markers
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '');
      
      // Find the first { and the last } to extract the JSON object
      const startIdx = responseText.indexOf('{');
      const endIdx = responseText.lastIndexOf('}');
      
      if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
        throw new Error("Could not identify valid JSON structure in response");
      }
      
      let jsonString = responseText.substring(startIdx, endIdx + 1);
      
      // Initial attempt to parse
      try {
        questionsData = JSON.parse(jsonString);
      } catch (parseError) {
        console.log("Initial parse failed:", parseError.message);
        
        // Try to fix the JSON before parsing again
        jsonString = jsonString
          // Fix common JSON issues
          .replace(/}(\s*){/g, '},\n{') // Add missing commas between objects
          .replace(/,(\s*[\]}])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted keys
          
        // Try parsing again
        try {
          questionsData = JSON.parse(jsonString);
        } catch (secondParseError) {
          console.log("Second parse failed:", secondParseError.message);
          
          // Manual inspection to find problematic questions
          // Split into questions to fix individual issues
          const questionPattern = /"questionText".*?"explanation"\s*:\s*"[^"]*"/gs;
          const questionMatches = [...jsonString.matchAll(questionPattern)];
          
          // Rebuild a clean questions array
          const cleanQuestions = [];
          
          for (const questionMatch of questionMatches) {
            try {
              // Extract the options part of this question
              const optionsMatch = questionMatch[0].match(/"options"\s*:\s*\[(.*?)\]/s);
              
              if (optionsMatch) {
                const optionsStr = optionsMatch[1];
                
                // Check for multiple true values
                const trueCount = (optionsStr.match(/"isCorrect"\s*:\s*true/g) || []).length;
                
                if (trueCount > 1) {
                  // Fix by replacing all but the first occurrence
                  let fixedOptionsStr = optionsStr;
                  let replaced = false;
                  
                  fixedOptionsStr = fixedOptionsStr.replace(/"isCorrect"\s*:\s*true/g, (match) => {
                    if (!replaced) {
                      replaced = true;
                      return match; // Keep the first occurrence
                    }
                    return '"isCorrect": false'; // Replace all others
                  });
                  
                  // Replace in the original question
                  const fixedQuestion = questionMatch[0].replace(optionsStr, fixedOptionsStr);
                  
                  // Try to parse this fixed question
                  try {
                    // Create a mini JSON object with just this question
                    const miniJson = `{"question": {${fixedQuestion}}}`;
                    const parsed = JSON.parse(miniJson);
                    cleanQuestions.push(parsed.question);
                  } catch (e) {
                    console.log("Could not parse fixed question:", e.message);
                  }
                } else {
                  // This question seems okay, try to parse it directly
                  try {
                    const miniJson = `{"question": {${questionMatch[0]}}}`;
                    const parsed = JSON.parse(miniJson);
                    cleanQuestions.push(parsed.question);
                  } catch (e) {
                    console.log("Could not parse question:", e.message);
                  }
                }
              }
            } catch (e) {
              console.log("Error processing question:", e.message);
            }
          }
          
          // If we managed to parse any questions, use them
          if (cleanQuestions.length > 0) {
            questionsData = { questions: cleanQuestions };
          } else {
            // If all attempts failed, throw error to use fallback
            throw new Error("Could not parse any valid questions");
          }
        }
      }
      
      // Process the questions to ensure validity
      const validatedQuestions = [];
      
      if (questionsData && questionsData.questions && Array.isArray(questionsData.questions)) {
        for (const question of questionsData.questions) {
          // Skip invalid questions
          if (!question.questionText || !Array.isArray(question.options)) {
            continue;
          }
          
          // Ensure valid options
          const validOptions = question.options.filter(opt => 
            opt && typeof opt === 'object' && typeof opt.text === 'string');
          
          if (validOptions.length < 2) {
            continue;
          }
          
          // Ensure exactly one correct answer
          const correctCount = validOptions.filter(opt => opt.isCorrect === true).length;
          
          if (correctCount !== 1) {
            // Fix by ensuring exactly one correct answer
            let hasSetCorrect = false;
            
            validOptions.forEach(opt => {
              if (correctCount === 0 && !hasSetCorrect) {
                // If no correct answers, mark the first one as correct
                opt.isCorrect = true;
                hasSetCorrect = true;
              } else if (correctCount > 1) {
                // If multiple correct answers, mark all as false first
                opt.isCorrect = false;
              }
            });
            
            // If we needed to fix multiple correct answers, ensure one is set to true
            if (correctCount > 1 && !hasSetCorrect) {
              validOptions[0].isCorrect = true;
            }
          }
          
          // Ensure all options have the isCorrect property explicitly set
          validOptions.forEach(opt => {
            if (typeof opt.isCorrect !== 'boolean') {
              opt.isCorrect = false;
            }
          });
          
          // Add explanation if missing
          if (!question.explanation) {
            question.explanation = "See the course material for the answer explanation.";
          }
          
          // Add the validated question
          validatedQuestions.push({
            questionText: question.questionText,
            options: validOptions,
            explanation: question.explanation
          });
        }
      }
      
      // Make sure we have at least one valid question
      if (validatedQuestions.length === 0) {
        throw new Error("No valid questions could be extracted from the AI response");
      }
      
      // Create the questions data object
      questionsData = {
        questions: validatedQuestions
      };
      
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.log("Original AI response:", aiResponse.data.response);

      // Create a fallback assessment with a clearer message
      questionsData = {
        questions: [
          {
            questionText: "The AI couldn't generate valid assessment questions. What should you do?",
            options: [
              { text: "Ignore this and continue", isCorrect: false },
              { text: "Try regenerating the assessment", isCorrect: true },
              { text: "Contact support about this issue", isCorrect: false },
              { text: "Delete the course module", isCorrect: false }
            ],
            explanation: "Regenerating the assessment will give the AI another chance to create valid questions based on your content."
          }
        ]
      };
    }

    // Create new assessment
    const newAssessment = new Assessment({
      courseId,
      moduleIndex: parseInt(moduleIndex, 10),
      questions: questionsData.questions,
      timeLimit: 15, // Default 15 minutes
      passPercentage: 70 // Default 70% passing score
    });

    await newAssessment.save();

    res.status(201).json({
      message: "Assessment generated successfully",
      assessment: {
        _id: newAssessment._id,
        courseId: newAssessment.courseId,
        moduleIndex: newAssessment.moduleIndex,
        questionCount: newAssessment.questions.length,
        timeLimit: newAssessment.timeLimit,
        passPercentage: newAssessment.passPercentage
      }
    });
  } catch (error) {
    console.error("Error generating assessment:", error.stack || error);
    res.status(500).json({
      error: "Failed to generate assessment",
      details: error.message
    });
  }
});

// Check if user can get a certificate
app.get("/course/:courseId/certificate/check", async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.query;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's progress for this course
    let courseProgress;
    if (user.courseProgress instanceof Map) {
      courseProgress = user.courseProgress.get(courseId);
    } else if (typeof user.courseProgress === 'object') {
      courseProgress = user.courseProgress[courseId];
    }

    if (!courseProgress) {
      return res.status(200).json({
        eligible: false,
        message: "No progress found for this course",
        completedModules: 0,
        totalModules: course.modules.length,
        completedAssessments: 0
      });
    }

    // Check if all modules are completed
    const completedModulesCount = courseProgress.completedModules.length;

    // Get all assessment attempts
    const assessmentAttempts = [];
    courseProgress.moduleData.forEach(module => {
      if (module.quizScores && module.quizScores.length > 0) {
        // Find highest score for each module
        const highestScore = Math.max(...module.quizScores.map(quiz => quiz.score));
        assessmentAttempts.push({
          moduleIndex: module.moduleIndex,
          highestScore
        });
      }
    });

    // Check if all assessments are completed and passed
    const passedAssessments = assessmentAttempts.filter(attempt => attempt.highestScore >= 70).length;

    // Determine if eligible for certificate
    const eligible = completedModulesCount === course.modules.length &&
      passedAssessments === course.modules.length;

    // If already has certificate, return that info
    if (courseProgress.certificateIssued) {
      return res.status(200).json({
        eligible: true,
        certificateIssued: true,
        message: "Certificate already issued for this course",
        completedModules: completedModulesCount,
        totalModules: course.modules.length,
        completedAssessments: passedAssessments
      });
    }

    res.status(200).json({
      eligible,
      certificateIssued: false,
      message: eligible ?
        "Eligible for certificate" :
        `Missing ${course.modules.length - completedModulesCount} modules and ${course.modules.length - passedAssessments} assessments`,
      completedModules: completedModulesCount,
      totalModules: course.modules.length,
      completedAssessments: passedAssessments,
      assessmentDetails: assessmentAttempts
    });
  } catch (error) {
    console.error("Error checking certificate eligibility:", error);
    res.status(500).json({ error: "Failed to check certificate eligibility" });
  }
});

// Issue certificate
app.post("/course/:courseId/certificate/issue", async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check eligibility first
    const eligibilityCheck = await axios.get(
      `${req.protocol}://${req.get('host')}/course/${courseId}/certificate/check?userId=${userId}`
    );

    if (!eligibilityCheck.data.eligible) {
      return res.status(400).json({
        error: "Not eligible for certificate",
        details: eligibilityCheck.data
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update certificate status
    if (user.courseProgress instanceof Map) {
      const progress = user.courseProgress.get(courseId);
      if (progress) {
        progress.certificateIssued = true;
        progress.certificateIssuedAt = new Date();
        user.courseProgress.set(courseId, progress);
      }
    } else if (typeof user.courseProgress === 'object') {
      if (user.courseProgress[courseId]) {
        user.courseProgress[courseId].certificateIssued = true;
        user.courseProgress[courseId].certificateIssuedAt = new Date();
      }
    }

    await user.save();

    // Find course details for certificate
    const course = await Course.findById(courseId);

    res.status(200).json({
      message: "Certificate issued successfully",
      certificateDetails: {
        courseId,
        courseTitle: course.title,
        studentName: user.name,
        issueDate: new Date(),
        certificateId: `CERT-${courseId.substring(0, 6)}-${userId.substring(0, 6)}-${Date.now().toString(36)}`
      }
    });
  } catch (error) {
    console.error("Error issuing certificate:", error);
    res.status(500).json({ error: "Failed to issue certificate" });
  }
});



//---------------------------Assessment----------------------------------



//-----------------------------Progress--------------------------------





// Get enhanced progress data for a course
app.get("/user/:userId/progress/:courseId", async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    console.log(`Fetching progress for user: ${userId}, course: ${courseId}`);

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Initialize empty progress object for response
    const emptyProgress = {
      completedModules: [],
      moduleData: [],
      lastAccessed: null,
      totalTimeSpent: 0,
      startedAt: null
    };

    // Check if courseProgress exists
    if (!user.courseProgress) {
      console.log("User has no course progress");
      return res.status(200).json({
        courseProgress: emptyProgress
      });
    }

    // Check if courseProgress is a Map
    if (user.courseProgress instanceof Map) {
      // Get progress from Map
      if (user.courseProgress.has(courseId)) {
        const progress = user.courseProgress.get(courseId);
        // console.log(`Found progress in Map: ${JSON.stringify(progress)}`);
        return res.status(200).json({
          courseProgress: progress
        });
      } else {
        console.log(`No progress found for course: ${courseId} in Map`);
        return res.status(200).json({
          courseProgress: emptyProgress
        });
      }
    } else {
      // Handle as object instead of Map
      console.log("Course progress is not a Map, treating as object");

      if (user.courseProgress[courseId]) {
        console.log(`Found progress in object: ${JSON.stringify(user.courseProgress[courseId])}`);
        return res.status(200).json({
          courseProgress: user.courseProgress[courseId]
        });
      } else {
        console.log(`No progress found for course: ${courseId} in object`);
        return res.status(200).json({
          courseProgress: emptyProgress
        });
      }
    }
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({
      error: "Failed to fetch progress: " + error.message,
      courseProgress: {
        completedModules: [],
        moduleData: [],
        lastAccessed: null,
        totalTimeSpent: 0,
        startedAt: null
      }
    });
  }
});

// Update module completion with detailed tracking
app.post("/user/progress", async (req, res) => {
  try {
    const { userId, courseId, moduleId, moduleIndex, completed } = req.body;

    // Validation
    if (!userId || !courseId || (!moduleId && moduleIndex === undefined)) {
      return res.status(400).json({
        error: "User ID, Course ID, and either Module ID or Module Index are required"
      });
    }

    console.log(`Updating progress - User: ${userId}, Course: ${courseId}, Module: ${moduleId}, ModuleIndex: ${moduleIndex}, Completed: ${completed}`);

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ensure user is enrolled in the course
    if (!user.enrolledCourses?.includes(courseId)) {
      return res.status(403).json({ error: "Not enrolled in this course" });
    }

    // Initialize courseProgress if needed
    if (!user.courseProgress) {
      user.courseProgress = new Map();
    }

    // Convert to Map if needed
    if (!(user.courseProgress instanceof Map)) {
      const tempProgress = new Map();
      if (typeof user.courseProgress === 'object') {
        Object.keys(user.courseProgress).forEach(key => {
          tempProgress.set(key, user.courseProgress[key]);
        });
      }
      user.courseProgress = tempProgress;
    }

    // Create course entry if needed
    if (!user.courseProgress.has(courseId)) {
      user.courseProgress.set(courseId, {
        completedModules: [],
        moduleData: [],
        startedAt: new Date(),
        lastAccessed: new Date()
      });
    }

    // Get course progress
    const courseProgress = user.courseProgress.get(courseId);

    // Update completed modules array
    if (completed) {
      if (!courseProgress.completedModules.includes(moduleId)) {
        courseProgress.completedModules.push(moduleId);
      }
    } else {
      courseProgress.completedModules = courseProgress.completedModules.filter(id => id !== moduleId);
    }

    // Basic module data tracking (without time tracking)
    if (!courseProgress.moduleData) {
      courseProgress.moduleData = [];
    }

    // Find or create module data entry
    let moduleDataIndex = courseProgress.moduleData.findIndex(
      m => (m.moduleId === moduleId) || (m.moduleIndex === moduleIndex)
    );

    if (moduleDataIndex === -1) {
      courseProgress.moduleData.push({
        moduleIndex: moduleIndex !== undefined ? moduleIndex : null,
        moduleId: moduleId,
        completed: completed,
        lastAccessed: new Date()
      });
    } else {
      courseProgress.moduleData[moduleDataIndex].completed = completed;
      courseProgress.moduleData[moduleDataIndex].lastAccessed = new Date();
    }

    // Update last accessed time
    courseProgress.lastAccessed = new Date();

    // Save changes
    await user.save();

    // Return updated progress
    res.status(200).json({
      message: "Progress updated successfully",
      courseProgress: user.courseProgress.get(courseId)
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ error: "Failed to update progress: " + error.message });
  }
});



//-----------------------------Progress--------------------------------

//-------------------------------podcast--------------------------------

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads/podcasts');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow audio files
const fileFilter = (req, file, cb) => {
  // Accept only audio files
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 50MB max file size
  }
});

// Endpoint to upload podcast
app.post("/upload-podcast", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const { title, description, courseId, moduleIndex } = req.body;

    // Validate required fields
    if (!title || !description || !courseId || moduleIndex === undefined) {
      // Remove uploaded file if validation fails
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    // Check if course exists
    const courseExists = await Course.findById(courseId);
    if (!courseExists) {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "Course not found" });
    }

    // Get file URL (in a real-world app, this might be a CDN URL)
    const fileUrl = `/uploads/podcasts/${req.file.filename}`;

    // Create new podcast
    const newPodcast = new Podcast({
      courseId,
      moduleIndex: parseInt(moduleIndex, 10),
      title,
      description,
      fileUrl,
      // You could extract audio duration here with a library like music-metadata
    });

    await newPodcast.save();

    res.status(201).json({
      message: "Podcast uploaded successfully",
      podcast: {
        id: newPodcast._id,
        title: newPodcast.title,
        description: newPodcast.description,
        fileUrl: newPodcast.fileUrl
      }
    });
  } catch (error) {
    console.error("Error uploading podcast:", error);
    // Clean up file if error occurs
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload podcast" });
  }
});

// Get podcasts by course and module
app.get("/podcasts/:courseId/:moduleIndex", async (req, res) => {
  try {
    const { courseId, moduleIndex } = req.params;

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    // Find podcasts for this course and module
    const podcasts = await Podcast.find({
      courseId,
      moduleIndex: parseInt(moduleIndex, 10)
    }).sort({ createdAt: -1 });

    res.status(200).json(podcasts);
  } catch (error) {
    console.error("Error fetching podcasts:", error);
    res.status(500).json({ error: "Failed to fetch podcasts" });
  }
});

// Delete podcast
app.delete("/podcasts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid podcast ID format" });
    }

    // Find podcast to get file path
    const podcast = await Podcast.findById(id);

    if (!podcast) {
      return res.status(404).json({ error: "Podcast not found" });
    }

    // Delete file from storage
    const filePath = path.join(__dirname, podcast.fileUrl.replace(/^\/+/, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await Podcast.findByIdAndDelete(id);

    res.status(200).json({ message: "Podcast deleted successfully" });
  } catch (error) {
    console.error("Error deleting podcast:", error);
    res.status(500).json({ error: "Failed to delete podcast" });
  }
});


//-------------------------------podcast--------------------------------

app.get("/study-materials/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid study material ID format" });
    }

    const material = await StudyMaterial.findById(id);

    if (!material) {
      return res.status(404).json({ error: "Study material not found" });
    }

    res.status(200).json(material);
  } catch (error) {
    console.error("Error fetching study material:", error);
    res.status(500).json({ error: "Failed to fetch study material" });
  }
});

// Update study material
app.put("/study-materials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid study material ID format" });
    }

    // Validate required fields
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const updatedMaterial = await StudyMaterial.findByIdAndUpdate(
      id,
      {
        content,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedMaterial) {
      return res.status(404).json({ error: "Study material not found" });
    }

    res.status(200).json(updatedMaterial);
  } catch (error) {
    console.error("Error updating study material:", error);
    res.status(500).json({ error: "Failed to update study material" });
  }
});

// Create study material
app.post("/study-materials", async (req, res) => {
  try {
    const { courseId, moduleIndex, content } = req.body;

    // Validate required fields
    if (!courseId || moduleIndex === undefined || !content) {
      return res.status(400).json({
        error: "CourseId, moduleIndex, and content are required"
      });
    }

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    // Check if course exists
    const courseExists = await Course.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check if this module exists in the course
    if (!courseExists.modules[moduleIndex]) {
      return res.status(404).json({ error: "Module not found in this course" });
    }

    // Check if study material already exists for this module
    const existingMaterial = await StudyMaterial.findOne({
      courseId,
      moduleIndex: parseInt(moduleIndex, 10)
    });

    if (existingMaterial) {
      return res.status(400).json({
        error: "Study material already exists for this module. Use PUT to update."
      });
    }

    // Create new study material
    const newMaterial = new StudyMaterial({
      courseId,
      moduleIndex: parseInt(moduleIndex, 10),
      content
    });

    await newMaterial.save();

    res.status(201).json({
      message: "Study material created successfully",
      material: newMaterial
    });
  } catch (error) {
    console.error("Error creating study material:", error);
    res.status(500).json({ error: "Failed to create study material" });
  }
});

// Delete study material
app.delete("/study-materials/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid study material ID format" });
    }

    const deletedMaterial = await StudyMaterial.findByIdAndDelete(id);

    if (!deletedMaterial) {
      return res.status(404).json({ error: "Study material not found" });
    }

    res.status(200).json({ message: "Study material deleted successfully" });
  } catch (error) {
    console.error("Error deleting study material:", error);
    res.status(500).json({ error: "Failed to delete study material" });
  }
});





//-------------------------------------New-------------------------------




// ------------ USER ENROLLMENT ENDPOINTS ------------

app.get("/study-materials/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    // Convert moduleIndex to number if present, otherwise leave as undefined
    const moduleIndex = req.query.moduleIndex !== undefined ?
      parseInt(req.query.moduleIndex, 10) : undefined;

    // Log the input parameters for debugging
    console.log(`Fetching study materials for courseId: ${courseId}, moduleIndex: ${moduleIndex !== undefined ? moduleIndex : 'all modules'}`);

    // Input validation
    if (!courseId || courseId === "undefined") {
      return res.status(400).json({ error: "Course ID is required" });
    }

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    // Build query - either for specific module or all modules
    const query = { courseId: courseId };
    if (moduleIndex !== undefined && !isNaN(moduleIndex)) {
      query.moduleIndex = moduleIndex;
    }

    // First check if the course exists
    const courseExists = await Course.findById(courseId);

    if (!courseExists) {
      return res.status(404).json({
        error: "Course not found"
      });
    }

    // Fetch materials
    const materials = await StudyMaterial.find(query).sort({ moduleIndex: 1 });

    // If no materials found, return empty array with 200 status (not an error)
    if (materials.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch podcasts for each module and attach them to the study materials
    const materialWithPodcasts = await Promise.all(materials.map(async (material) => {
      // Convert to plain object so we can add the podcasts property
      const materialObj = material.toObject();

      // Fetch podcasts for this module
      const podcasts = await Podcast.find({
        courseId: courseId,
        moduleIndex: material.moduleIndex
      }).sort({ createdAt: -1 });

      // Attach podcasts to material
      materialObj.podcasts = podcasts;

      return materialObj;
    }));

    res.status(200).json(materialWithPodcasts);
  } catch (error) {
    console.error("Error fetching study materials:", error);
    res.status(500).json({ error: "Failed to fetch study materials" });
  }
});

marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function (code, language) {
    return code;
  },
  pedantic: false,
  gfm: true,
  breaks: true,
  sanitize: false,
  smartypants: true,
  xhtml: false
});

// PDF generation endpoint
app.post("/generate-pdf", async (req, res) => {
  try {
    const { courseId, moduleIndex } = req.body;

    // Validate parameters
    if (!courseId || moduleIndex === undefined) {
      return res.status(400).json({ error: "courseId and moduleIndex are required" });
    }

    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    // Fetch course and study material


    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const material = await StudyMaterial.findOne({
      courseId,
      moduleIndex: parseInt(moduleIndex, 10)
    });

    if (!material) {
      return res.status(404).json({ error: "Study material not found" });
    }

    // Get module details
    const module = course.modules[moduleIndex];
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    // Get current date for the footer
    const currentDate = new Date().toLocaleDateString();

    // Convert markdown to HTML with marked
    const marked = require('marked');
    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      breaks: true,
      sanitize: false
    });

    // Process the markdown content to fix syntax tree representation
    let processedContent = material.content;

    // Fix syntax tree presentation
    if (processedContent.includes("```") || processedContent.includes("mat") && processedContent.includes("/ \\") && processedContent.includes("sat")) {
      processedContent = processedContent.replace(/```[\s\S]*?```/g, (match) => {
        return '<pre class="code-block">' + match.replace(/```/g, '') + '</pre>';
      });
    }

    // Convert to HTML
    const htmlContent = marked.parse(processedContent);

    // Create CSS for better styling
    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        
        body {
          font-family: 'Roboto', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          font-size: 11pt;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #0066cc;
        }
        
        .course-title {
          font-size: 24pt;
          margin: 0;
          color: #0066cc;
          font-weight: 700;
        }
        
        .module-title {
          font-size: 18pt;
          margin: 10px 0;
          color: #444;
        }
        
        .course-info {
          font-size: 10pt;
          color: #666;
          margin: 10px 0;
        }
        
        .content {
          margin-top: 30px;
        }
        
        h1 {
          font-size: 16pt;
          margin-top: 25px;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
          color: #0066cc;
        }
        
        h2 {
          font-size: 14pt;
          margin-top: 20px;
          margin-bottom: 12px;
          color: #444;
        }
        
        h3 {
          font-size: 12pt;
          margin-top: 18px;
          margin-bottom: 10px;
          color: #555;
        }
        
        p {
          margin: 10px 0;
        }
        
        ul, ol {
          margin: 12px 0;
          padding-left: 25px;
        }
        
        li {
          margin-bottom: 6px;
        }
        
        code {
          background-color: #f6f8fa;
          border-radius: 3px;
          padding: 2px 5px;
          font-family: monospace;
          font-size: 90%;
        }
        
        pre {
          background-color: #f6f8fa;
          border-radius: 5px;
          padding: 12px;
          margin: 15px 0;
          overflow: auto;
          font-family: monospace;
          font-size: 90%;
          white-space: pre-wrap;
        }
        
        .code-block {
          background-color: #f9f9f9;
          border: 1px solid #eee;
          padding: 12px;
          font-family: monospace;
          white-space: pre-wrap;
        }
        
        blockquote {
          border-left: 4px solid #0066cc;
          padding: 10px 15px;
          margin: 15px 0;
          background-color: #f8f9fa;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        th {
          background-color: #f6f8fa;
        }
        
        .section-divider {
          border-top: 1px solid #eee;
          margin: 30px 0;
        }
        
        /* Don't include the note in the main content - will be in the footer */
        .note-to-students {
          display: none;
        }
      `;

    // Create HTML template
    const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${course.title} - ${module.title}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="course-title">${course.title}</h1>
              <h2 class="module-title">${module.title}</h2>
              <p class="course-info">
                Level: ${course.level} | Category: ${course.category} | Created by: ${course.instructor || 'Course Instructor'}
              </p>
            </div>
            
            <div class="content">
              ${htmlContent}
            </div>
          </div>
        </body>
        </html>
      `;

    // Create a temporary file to store HTML
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const htmlPath = path.join(tempDir, `${courseId}_${moduleIndex}.html`);
    const pdfPath = path.join(tempDir, `${courseId}_${moduleIndex}.pdf`);

    // Write HTML to file
    fs.writeFileSync(htmlPath, htmlTemplate);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Generate PDF with proper footer using pageFooter template
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1.5cm',
        left: '1cm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Empty header
      footerTemplate: `
          <div style="width: 100%; font-size: 9pt; color: #666; padding: 0 1cm; display: flex; justify-content: space-between; text-align: center;">
            <div style="width: 33%; text-align: left;">© ${new Date().getFullYear()} Your Learning Platform</div>
            <div style="width: 33%; text-align: center;"></div>
            <div style="width: 33%; text-align: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>
        `
    });

    await browser.close();

    // Send PDF to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${course.title.replace(/[^a-z0-9]/gi, '_')}_${module.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);

    const pdfBuffer = fs.readFileSync(pdfPath);
    res.send(pdfBuffer);

    // Clean up temporary files
    try {
      fs.unlinkSync(htmlPath);
      fs.unlinkSync(pdfPath);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF", details: error.message });
  }
});


app.post("/generate-content", async (req, res) => {
  try {
    const { title, description, category, level, duration } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ error: "Title, description, and category are required" });
    }

    console.log(`Generating course structure for: ${title}`);

    // First, generate just the course structure
    const structurePrompt = `Create a well-structured outline for a ${level} level course titled "${title}" in the category "${category}" with a duration of ${duration} hours.
      
      Course Description: ${description}
      
      Instructions:
      1. Create 4-5 logical modules that build upon each other
      2. For each module, provide a descriptive title and detailed description
      3. Each module should cover a specific aspect of the subject
      
      Return a JSON object with the following format ONLY:
      {
        "modules": [
          {
            "title": "Module Title",
            "description": "Detailed module description (2-3 sentences)",
            "order": 1
          }
        ]
      }`;

    // Get course structure from Ollama
    const structureResponse = await axios.post("http://localhost:5001/api/generate", {
      model: "mistral",
      prompt: structurePrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2048,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    });

    // Clean and parse response
    let structureText = structureResponse.data.response;

    // Modified JSON extraction logic to handle extra text
    let courseStructure;
    try {
      // Look for JSON pattern - find the first { and the matching closing }
      const jsonStart = structureText.indexOf('{');
      if (jsonStart === -1) {
        throw new Error("No JSON object found in response");
      }

      let openBraces = 0;
      let jsonEnd = -1;

      // Parse through the text to find the matching closing brace
      for (let i = jsonStart; i < structureText.length; i++) {
        if (structureText[i] === '{') openBraces++;
        if (structureText[i] === '}') openBraces--;

        // When we've found the matching closing brace
        if (openBraces === 0) {
          jsonEnd = i + 1; // Include the closing brace
          break;
        }
      }

      if (jsonEnd === -1) {
        throw new Error("Incomplete JSON object in response");
      }

      // Extract just the JSON part
      const jsonString = structureText.substring(jsonStart, jsonEnd);
      courseStructure = JSON.parse(jsonString);

      if (!courseStructure.modules || !Array.isArray(courseStructure.modules)) {
        throw new Error("Invalid course structure format - no modules array found");
      }

      console.log(`Generated ${courseStructure.modules.length} modules for the course`);
    } catch (parseError) {
      console.error("Error parsing course structure:", parseError);
      return res.status(500).json({
        error: "Failed to generate course structure",
        rawResponse: structureText
      });
    }

    // Step 2: Generate detailed study materials for each module
    const modulesWithMaterials = [];

    // Process each module sequentially with await to not overwhelm the API
    for (let i = 0; i < courseStructure.modules.length; i++) {
      const module = courseStructure.modules[i];
      console.log(`Generating detailed study materials for module ${i + 1}: ${module.title}`);

      // Create a clear outline for the module content first
      const outlinePrompt = `Create a detailed section outline for a module titled "${module.title}" in a ${level} level course about ${title}.
        
        Module Description: ${module.description}
        Course Category: ${category}
        
        Create a comprehensive outline with 4-6 main sections that will guide the complete content creation.
        Each section should have a clear title and 2-3 bullet points describing what will be covered.
        
        Do NOT write the full content yet, just create the outline.`;

      const outlineResponse = await axios.post("http://localhost:5001/api/generate", {
        model: "mistral",
        prompt: outlinePrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      });

      const outlineContent = outlineResponse.data.response.trim();

      // Now generate the full content based on the outline
      const contentPrompt = `Create complete, comprehensive study materials for a module in a ${level} level course about ${title}.
        
        Module Title: "${module.title}"
        Module Description: "${module.description}"
        
        Use this content outline as your guide:
        ${outlineContent}
        
        IMPORTANT INSTRUCTIONS:
        1. Write COMPLETE educational content that covers the ENTIRE outline above
        2. Include all sections mentioned in the outline with detailed explanations
        3. For each section:
           - Provide thorough explanations of concepts
           - Include practical examples and applications
           - Add code samples or diagrams (using markdown) where relevant
        4. DO NOT use placeholders or references to future sections like "Continue with Section X" or "To be covered in part Y"
        5. DO NOT truncate or abbreviate the content - each section must be fully developed
        6. Use proper markdown formatting with headings (# for main sections, ## for subsections)
        7. Write approximately 2000 words of substantial educational content
        8. The content should be complete and self-contained - no "Part 1" or "to be continued" references
        
        Return ONLY the complete study materials content in markdown format.`;

      try {
        // Get the full content with higher token limit
        const contentResponse = await axios.post("http://localhost:5001/api/generate", {
          model: "mistral",
          prompt: contentPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 8192, // Higher token limit for detailed content
            top_k: 40,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        });

        let studyMaterials = contentResponse.data.response.trim();

        // Check for incomplete content markers
        const incompleteMarkers = [
          "to be continued",
          "continue with",
          "continued in",
          "part 1",
          "section 1",
          "next section will",
          "will cover in the next",
          "further details in"
        ];

        let hasIncompleteMarkers = false;
        for (const marker of incompleteMarkers) {
          if (studyMaterials.toLowerCase().includes(marker)) {
            hasIncompleteMarkers = true;
            console.warn(`Warning: Possible incomplete content detected in module ${i + 1}. Found: "${marker}"`);
            break;
          }
        }

        // If incomplete markers found, add a note at the end
        if (hasIncompleteMarkers) {
          studyMaterials += "\n\n---\n\n**Note to Students**: This module contains all necessary content. Any references to 'continued' or 'next section' are formatting artifacts and can be ignored.";
        }

        // Add the module with its study materials to our results
        modulesWithMaterials.push({
          title: module.title,
          description: module.description,
          order: module.order || i + 1,
          studyMaterials: studyMaterials
        });

        // Log content size
        const wordCount = studyMaterials.split(' ').length;
        console.log(`Module ${i + 1} study materials generated: ${wordCount} words`);

      } catch (moduleError) {
        console.error(`Error generating study materials for module ${i + 1}:`, moduleError);
        // Continue with other modules even if one fails
        modulesWithMaterials.push({
          title: module.title,
          description: module.description,
          order: module.order || i + 1,
          studyMaterials: "# " + module.title + "\n\n" +
            "We apologize, but the study materials for this module are currently being prepared. Please check back soon."
        });
      }
    }

    // Return the complete structure with study materials
    res.status(200).json({
      modules: modulesWithMaterials
    });

  } catch (error) {
    console.error("Error in generate-content endpoint:", error);
    res.status(500).json({
      error: "Failed to generate course content",
      message: error.message
    });
  }
});

app.post("/add", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      instructor,
      duration,
      level,
      isPublished,
      thumbnail,
      modules,
      generateContentWithAI
    } = req.body;

    // Basic validation
    if (!title || !description || !category) {
      return res.status(400).json({ error: "Title, description, and category are required" });
    }

    let courseModules = modules || [];
    let studyMaterials = [];

    // If AI generation is requested and no modules are provided
    if (generateContentWithAI && (!modules || modules.length === 0)) {
      try {
        console.log("Generating content with AI for course:", title);

        // Call our AI content generation endpoint
        const aiResponse = await axios.post(`${req.protocol}://${req.get('host')}/generate-content`, {
          title,
          description,
          category,
          level: level || "Beginner",
          duration: duration || 0
        });

        // Extract the generated modules and study materials
        if (aiResponse.data && aiResponse.data.modules) {
          courseModules = aiResponse.data.modules.map(module => ({
            title: module.title,
            description: module.description,
            order: module.order
          }));

          // Prepare study materials for later storage
          studyMaterials = aiResponse.data.modules.map((module, index) => ({
            moduleIndex: index,
            content: module.studyMaterials || "# Study Materials\n\nTo be added."
          }));

          console.log(`Generated ${courseModules.length} modules and ${studyMaterials.length} study materials`);
        }
      } catch (aiError) {
        console.error("Error generating content with AI:", aiError);
        // Continue with course creation even if AI generation fails
      }
    }

    // Create and save the course
    const newCourse = new Course({
      title,
      description,
      category,
      instructor: instructor || "Admin",
      duration: duration || 0,
      level: level || "Beginner",
      isPublished: isPublished || false,
      thumbnail: thumbnail || "",
      modules: courseModules
    });

    await newCourse.save();

    console.log("New course created with ID:", newCourse._id);

    // If we have generated study materials, save them
    if (studyMaterials.length > 0) {


      // Create study material documents with course ID
      const materialDocuments = studyMaterials.map(material => ({
        courseId: newCourse._id,
        moduleIndex: material.moduleIndex,
        content: material.content
      }));

      // Log the material documents for debugging
      console.log("Saving study materials:", JSON.stringify(materialDocuments.map(doc => ({
        courseId: doc.courseId,
        moduleIndex: doc.moduleIndex
      }))));

      // Save all study materials
      const savedMaterials = await StudyMaterial.insertMany(materialDocuments);
      console.log(`${savedMaterials.length} study materials saved successfully`);
    }

    res.status(201).json({
      message: "Course added successfully",
      course: newCourse
    });
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(500).json({ error: "Failed to add course" });
  }
});

// Get all courses
app.get("/all", async (req, res) => {
  try {
    // Allow filtering by query parameters
    const { category, level, search } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (level) {
      query.level = level;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Get published courses only
app.get("/published", async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true }).sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching published courses:", error);
    res.status(500).json({ error: "Failed to fetch published courses" });
  }
});
app.get("/categories", async (req, res) => {
  try {
    const categories = await Course.distinct("category");
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get a single course by ID
app.get("/course/:id", async (req, res) => {
  try {
    const courseId = req.params.id;

    // Log the requested ID for debugging
    console.log(`Fetching course with ID: ${courseId}`);

    // Input validation
    if (!courseId || courseId === "undefined") {
      return res.status(400).json({ error: "Course ID is required" });
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID format" });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

// Update a course
app.put("/update/:id", async (req, res) => {
  try {
    const courseId = req.params.id;
    const courseExists = await Course.findById(courseId);

    if (!courseExists) {
      return res.status(404).json({ error: "Course not found" });
    }

    const {
      title,
      description,
      category,
      instructor,
      duration,
      level,
      isPublished,
      thumbnail,
      modules
    } = req.body;

    // Basic validation
    if (!title || !description || !category) {
      return res.status(400).json({ error: "Title, description, and category are required" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      {
        title,
        description,
        category,
        instructor,
        duration,
        level,
        isPublished,
        thumbnail,
        modules,
        updatedAt: Date.now()
      },
      { new: true } // Return the updated document
    );

    res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// Toggle course publish status
app.patch("/toggle-publish/:id", async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    course.isPublished = !course.isPublished;
    course.updatedAt = Date.now();

    await course.save();

    res.status(200).json({
      message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`,
      isPublished: course.isPublished
    });
  } catch (error) {
    console.error("Error toggling course publish status:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// Delete a course
app.delete("/delete/:id", async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    await Course.findByIdAndDelete(courseId);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});




/**********************************Courses**************************************/


/**********************************AI Interactions**********************************/
// Fixed getContextFromDB function to properly handle caching
async function getContextFromDB(userId, question) {
  try {
    console.log("Retrieving relevant context...");

    // Try to get profile from cache first
    let userProfile = profileCache.get(`profile-${userId}`);
    let personalContext = "";
    let userName = ""; // Store user name separately for explicit use

    if (!userProfile) {
      // If not in cache, get from database
      const dbProfile = await UserProfile.findOne({ userId });

      // Cache the profile for future requests (as a plain object)
      if (dbProfile) {
        userProfile = dbProfile.toObject ? dbProfile.toObject() : JSON.parse(JSON.stringify(dbProfile));
        profileCache.set(`profile-${userId}`, userProfile);
      }
    }

    if (userProfile && userProfile.personalDetails) {
      const details = userProfile.personalDetails;
      
      // Extract user name with validation
      if (details.preferredName && details.preferredName.length > 1) {
        // Check if it starts with a capital letter (more likely to be a name)
        if (/^[A-Z]/.test(details.preferredName)) {
          userName = details.preferredName;
        }
      }
      
      if (!userName && details.name && details.name.length > 1) {
        // Check if it starts with a capital letter (more likely to be a name)
        if (/^[A-Z]/.test(details.name)) {
          userName = details.name;
        }
      }

      // Build personal context string
      const nameInfo = details.name ? `The user's name is ${details.name}.` : "";
      const preferredNameInfo = details.preferredName ? `They prefer to be called ${details.preferredName}.` : "";

      const interestsInfo = details.interests && details.interests.length > 0
        ? `Their interests include: ${details.interests.join(', ')}.`
        : "";

      const backgroundInfo = details.background
        ? `Their background is in ${details.background}.`
        : "";

      const goalsInfo = details.goals && details.goals.length > 0
        ? `Their learning goals include: ${details.goals.join(', ')}.`
        : "";

      // Relevant subjects - find subjects most relevant to current question
      const relevantSubjects = userProfile.subjects
        .sort((a, b) => b.confidenceLevel - a.confidenceLevel)
        .slice(0, 3) // Top 3 subjects
        .map(s => s.name);

      const subjectsInfo = relevantSubjects.length > 0
        ? `They have previously shown knowledge in: ${relevantSubjects.join(', ')}.`
        : "";

      personalContext = `User Profile: ${nameInfo} ${preferredNameInfo} ${interestsInfo} ${backgroundInfo} ${goalsInfo} ${subjectsInfo}`.trim();

      if (personalContext) {
        personalContext = "Personal Context: " + personalContext + "\n\n";
      }
    }

    // Find related conversations in MongoDB
    const relatedConversations = await Conversation.findRelevantConversations(userId, question);

    if ((relatedConversations && relatedConversations.length > 0) || personalContext) {
      // Format conversations as context
      const conversationTexts = relatedConversations.map(conv => {
        // Convert mongoose document to plain object if needed
        const convObj = conv.toObject ? conv.toObject() : conv;
        return `Topic: ${convObj.topic || 'General'}\nKey Points: ${convObj.keyPoints.join(', ')}\nSummary: ${convObj.condensedAnswer}`;
      });

      const context = personalContext +
        (relatedConversations.length > 0 ? "Previous relevant information:\n" +
          conversationTexts.join("\n---\n") : "");

      return { context, hasContext: true, userName }; // Return userName separately
    }
  } catch (dbError) {
    console.warn("Error retrieving context:", dbError.message);
  }

  return { context: "", hasContext: false, userName: "" };
}

// Enhanced function to store and process conversation
async function storeConversationAsync(userId, question, answer, isIntroduction, hasContext) {
  try {
    if (isIntroduction) {
      // Extract key personal details
      const personalDetails = Conversation.extractPersonalInfo(question + " " + answer);
      const summary = "User introduction: " + Object.values(personalDetails).flat().join(", ");

      const newConversation = new Conversation({
        userId,
        keyPoints: Object.values(personalDetails).flat(),
        summary,
        originalQuestion: question,
        condensedAnswer: summary,
        topic: "personal_info",
        hasContext
      });
      await newConversation.save();

      // Update user profile with personal details
      await updateUserProfile(userId, personalDetails, question, answer);
    } else {
      // For regular educational exchanges
      const keyPoints = Conversation.extractKeyPoints(question, answer);
      const summary = Conversation.generateSummary(question, answer);
      const condensedAnswer = Conversation.condenseAnswer(answer);

      // Detect likely topic from the combined text
      const fullText = (question + " " + answer).toLowerCase();
      const topicKeywords = {
        math: ['equation', 'formula', 'calculation', 'math', 'algebra', 'geometry', 'calculus'],
        programming: ['code', 'program', 'function', 'algorithm', 'programming', 'javascript', 'python'],
        science: ['science', 'physics', 'chemistry', 'biology', 'experiment', 'molecule', 'theory'],
        history: ['history', 'century', 'ancient', 'civilization', 'war', 'kingdom', 'empire']
      };

      let topic = 'general';
      for (const [t, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(k => fullText.includes(k))) {
          topic = t;
          break;
        }
      }

      const newConversation = new Conversation({
        userId,
        keyPoints,
        summary,
        originalQuestion: question,
        condensedAnswer,
        topic,
        hasContext
      });
      await newConversation.save();

      // Extract and update personal info and subjects
      const personalInfo = Conversation.extractPersonalInfo(question + " " + answer);
      if (Object.keys(personalInfo).length > 0) {
        await updateUserProfile(userId, personalInfo, question, answer);
      }
    }
  } catch (saveError) {
    console.warn("Error saving to MongoDB:", saveError.message);
    throw saveError;
  }
}

// New helper function to update user profile
async function updateUserProfile(userId, personalInfo, question, answer) {
  try {
    // Find or create user profile
    let userProfile = await UserProfile.findOne({ userId });

    if (!userProfile) {
      userProfile = new UserProfile({
        userId,
        personalDetails: {},
        subjects: []
      });
    }

    // Initialize personalDetails if not exists
    if (!userProfile.personalDetails) {
      userProfile.personalDetails = {};
    }

    // Update personal details
    Object.entries(personalInfo).forEach(([field, value]) => {
      if (field === "interests" || field === "goals") {
        // For array fields, merge without duplicates
        if (!userProfile.personalDetails[field]) {
          userProfile.personalDetails[field] = [];
        }

        const existingItems = new Set(userProfile.personalDetails[field]);
        value.forEach(item => existingItems.add(item));
        userProfile.personalDetails[field] = Array.from(existingItems);
      } else {
        userProfile.personalDetails[field] = value;
      }
    });

    // Detect and update subject engagement
    const subjects = Conversation.detectSubjects(question + " " + answer);
    subjects.forEach(subject => {
      const existingSubject = userProfile.subjects.find(s => s.name === subject);
      if (existingSubject) {
        existingSubject.confidenceLevel = Math.min(10, existingSubject.confidenceLevel + 1);
        existingSubject.lastEngaged = new Date();
      } else {
        userProfile.subjects.push({
          name: subject,
          confidenceLevel: 1,
          lastEngaged: new Date()
        });
      }
    });

    userProfile.lastActive = new Date();
    await userProfile.save();

    // Convert to plain object before caching - this is the key fix!
    const plainProfile = userProfile.toObject ? userProfile.toObject() : JSON.parse(JSON.stringify(userProfile));
    profileCache.set(`profile-${userId}`, plainProfile);

    return plainProfile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}


// New endpoint to get user profile
app.get("/user/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;

    // Try to get from cache first
    let userProfile = profileCache.get(`profile-${userId}`);

    if (!userProfile) {
      const dbProfile = await UserProfile.findOne({ userId });

      if (dbProfile) {
        // Convert to plain object before caching
        userProfile = dbProfile.toObject ? dbProfile.toObject() : JSON.parse(JSON.stringify(dbProfile));
        profileCache.set(`profile-${userId}`, userProfile);
      } else {
        // Create empty profile object for response
        userProfile = {
          userId,
          personalDetails: {},
          subjects: []
        };
      }
    }

    res.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Enhanced /ask endpoint with improved user name handling
app.post("/ask", async (req, res) => {
  const { userId, question } = req.body;

  try {
    // Set headers for SSE only once
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Check if the question is a simple greeting or chitchat
    const trimmedQuestion = question.trim().toLowerCase();
    const isGreeting = /^(hi|hello|hey|greetings|howdy|hola|good morning|good afternoon|good evening)[\s!.?]*$/i.test(trimmedQuestion);
    const isChitChat = /^(how are you|how's it going|what's up|nice to meet you|thank you|thanks|appreciate|good job)[\s!.?]*$/i.test(trimmedQuestion);
    const isIntroduction = /^(i am|i'm|my name is|call me|i work|let me introduce)[\s!.?]*$/i.test(trimmedQuestion);
    const isAskingName = /^(do you (know|remember) my name|what('s| is) my name|who am i)[\s!.?]*$/i.test(trimmedQuestion);

    // Initialize variables
    let hasContext = false;
    let fullResponse = "";
    let responseEnded = false;  // Track if the response has ended
    let userName = "";

    // Batching variables
    let accumulatedChunk = "";
    const BATCH_SIZE = 20; // Adjust this value to control batching (larger = fewer, bigger updates)
    let tokenCount = 0;

    // Helper function to safely write to the response
    const safeWrite = (data) => {
      if (!responseEnded) {
        try {
          res.write(data);
        } catch (err) {
          console.error("Error writing to response:", err);
        }
      }
    };

    // Helper function to safely end the response
    const safeEnd = () => {
      if (!responseEnded) {
        responseEnded = true;
        try {
          res.end();
        } catch (err) {
          console.error("Error ending response:", err);
        }
      }
    };

    // Helper function to send accumulated chunk
    const sendAccumulatedChunk = () => {
      if (accumulatedChunk && !responseEnded) {
        const sseData = `data: ${JSON.stringify({
          chunk: accumulatedChunk,
          hasContext: hasContext
        })}\n\n`;

        safeWrite(sseData);
        accumulatedChunk = "";
        tokenCount = 0;
      }
    };

    // Send an initial empty message to establish the connection
    safeWrite(`data: ${JSON.stringify({
      chunk: "",
      hasContext: false
    })}\n\n`);

    // Prepare prompt based on question type
    let prompt;
    
    // For direct name queries, get the name right away
    if (isAskingName) {
      try {
        // Get profile to check for name
        let userProfile = profileCache.get(`profile-${userId}`);
        
        if (!userProfile) {
          const dbProfile = await UserProfile.findOne({ userId });
          if (dbProfile) {
            userProfile = dbProfile.toObject ? dbProfile.toObject() : JSON.parse(JSON.stringify(dbProfile));
            profileCache.set(`profile-${userId}`, userProfile);
          }
        }
        
        if (userProfile && userProfile.personalDetails) {
          // Validate name fields - prevent common words from being used as names
          const potentialName = userProfile.personalDetails.preferredName || userProfile.personalDetails.name;
          const commonWords = ["glad", "excited", "happy", "pleased", "sure", "sorry", "here"];
          
          if (potentialName && 
              potentialName.length > 1 && 
              !commonWords.includes(potentialName.toLowerCase()) &&
              /^[A-Z]/.test(potentialName)) { // Check if starts with capital letter
            userName = potentialName;
            
            prompt = `You are an AI tutor. The user is asking if you know their name. Their name is "${userName}". 
                      Respond in a friendly, personalized way confirming you know their name is ${userName}.`;
          } else {
            prompt = `You are an AI tutor. The user is asking if you know their name, but you don't have a valid name in your records yet. 
                      Politely explain that you're not sure of their name and ask for it.`;
          }
        } else {
          prompt = `You are an AI tutor. The user is asking if you know their name, but you don't have this information yet. 
                    Politely explain that you don't have their name in your records yet and ask for it.`;
        }
      } catch (error) {
        console.error("Error retrieving user profile for name query:", error);
        prompt = `You are an AI tutor. The user is asking if you know their name, but there was an error retrieving their information. 
                  Politely explain that you're having trouble accessing your records and ask for their name.`;
      }
    } else if (isGreeting || isChitChat) {
      try {
        // Try to get name for greetings
        let userProfile = profileCache.get(`profile-${userId}`);
        
        if (!userProfile) {
          const dbProfile = await UserProfile.findOne({ userId });
          if (dbProfile) {
            userProfile = dbProfile.toObject ? dbProfile.toObject() : JSON.parse(JSON.stringify(dbProfile));
            profileCache.set(`profile-${userId}`, userProfile);
          }
        }
        
        if (userProfile && userProfile.personalDetails) {
          // Validate name fields
          const potentialName = userProfile.personalDetails.preferredName || userProfile.personalDetails.name;
          const commonWords = ["glad", "excited", "happy", "pleased", "sure", "sorry", "here"];
          
          if (potentialName && 
              potentialName.length > 1 && 
              !commonWords.includes(potentialName.toLowerCase()) &&
              /^[A-Z]/.test(potentialName)) {
            userName = potentialName;
          }
        }
        
        // Use name in greeting if available
        const nameGreeting = userName ? `, ${userName}` : "";
        
        prompt = isGreeting
          ? `The user has greeted you with: "${question}". Respond with a friendly greeting as an AI tutor${nameGreeting}.`
          : `The user is engaging in casual conversation: "${question}". Respond briefly and politely as an AI tutor${nameGreeting}.`;
      } catch (error) {
        console.error("Error retrieving user profile for greeting:", error);
        prompt = isGreeting
          ? `The user has greeted you with: "${question}". Respond with a friendly greeting as an AI tutor.`
          : `The user is engaging in casual conversation: "${question}". Respond briefly and politely as an AI tutor.`;
      }
    } else {
      // For normal questions, fetch context
      let contextPromise = Promise.resolve({ context: "", hasContext: false, userName: "" });

      if (!isIntroduction) {
        contextPromise = getContextFromDB(userId, question);
      }

      // Wait for context to be retrieved
      try {
        const { context, hasContext: contextExists, userName: contextUserName } = await contextPromise;
        hasContext = contextExists;
        userName = contextUserName || ""; // Use name from context if available
        
        if (userName) {
          // If we have the user's name, explicitly instruct the AI to use it
          prompt = context
            ? `You are an AI tutor talking to ${userName}. Here's relevant context from previous conversations:\n${context}\n
              IMPORTANT INSTRUCTION: Always address the user directly as "${userName}" (never use generic terms like "user" or "[User's Name]").
              Current Question: ${question}\n
              Provide a helpful educational response to ${userName}:`
            : `You are an AI tutor talking to ${userName}. 
              IMPORTANT INSTRUCTION: Always address the user directly as "${userName}" (never use generic terms like "user" or "[User's Name]").
              Question from ${userName}: ${question}\n
              Provide a helpful educational response to ${userName}:`;
        } else {
          // If we don't have a name, use the standard prompts
          prompt = context
            ? `You are an AI tutor. Here's relevant context from previous conversations:\n${context}\n
              Current Question: ${question}\n
              Provide a helpful educational response:`
            : `You are an AI tutor. Question: ${question}\n\nProvide a helpful educational response:`;
        }
      } catch (contextError) {
        console.error("Error retrieving context:", contextError);
        prompt = `You are an AI tutor. Question: ${question}\n\nProvide a helpful educational response:`;
      }
    }

    console.log("Sending prompt to Ollama:", prompt);

    // Call Ollama API with streaming enabled
    const response = await axios.post("http://localhost:5001/api/generate", {
      model: "mistral",
      prompt: prompt,
      stream: true,
      options: {
        temperature: 0.7,      // Slightly higher temperature for more fluent responses
        num_predict: 2048,     // Increased max tokens
        top_k: 40,             // More diversity in token selection
        top_p: 0.9,            // Higher sampling probability
        repeat_penalty: 1.1    // Reduce repetition
      }
    }, {
      responseType: 'stream'
    });

    // Set up a timer to ensure chunks are sent even if they don't reach batch size
    let batchTimer = null;

    const setupBatchTimer = () => {
      // Clear any existing timer
      if (batchTimer) clearTimeout(batchTimer);

      // Set a new timer to flush accumulated chunks after a delay
      batchTimer = setTimeout(() => {
        if (accumulatedChunk) {
          sendAccumulatedChunk();
        }
        // Reset timer
        batchTimer = null;
      }, 100); // 100ms delay
    };

    // Process the streamed response chunk by chunk
    response.data.on('data', (chunk) => {
      if (responseEnded) return; // Skip if response already ended

      try {
        const chunkText = chunk.toString().trim();

        if (chunkText) {
          try {
            // Parse the JSON from Ollama
            const data = JSON.parse(chunkText);

            // Handle the response chunk
            if (data.response !== undefined) {
              // Accumulate the full response
              fullResponse += data.response;

              // Add to batch
              accumulatedChunk += data.response;
              tokenCount++;

              // Set up a timer to ensure regular updates
              setupBatchTimer();

              // Send batch if it's reached the size threshold or this is the final chunk
              if (tokenCount >= BATCH_SIZE || data.done || data.response.includes("\n")) {
                sendAccumulatedChunk();
              }

              // Check if this is the final chunk
              if (data.done === true) {
                // Send any remaining accumulated content
                if (accumulatedChunk) {
                  sendAccumulatedChunk();
                }

                console.log("Received done:true, ending response");
                safeWrite(`data: [DONE]\n\n`);
                safeEnd();

                // Clear batch timer
                if (batchTimer) {
                  clearTimeout(batchTimer);
                  batchTimer = null;
                }

                // Store conversation in background
                if (!isGreeting && !isChitChat) {
                  storeConversationAsync(userId, question, fullResponse, isIntroduction, hasContext)
                    .catch(saveError => console.warn("Error saving to MongoDB:", saveError.message));
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing JSON chunk:", parseError, "Raw chunk:", chunkText);
          }
        }
      } catch (error) {
        console.error("Error processing stream chunk:", error);
        if (!responseEnded) {
          safeWrite(`data: ${JSON.stringify({
            chunk: " Error processing response.",
            hasContext: false
          })}\n\n`);
          safeWrite(`data: [DONE]\n\n`);
          safeEnd();

          // Clear batch timer
          if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
          }
        }
      }
    });

    // Handling for when response has fully ended
    response.data.on('end', () => {
      console.log("Ollama stream ended");

      // Send any remaining accumulated content
      if (accumulatedChunk) {
        sendAccumulatedChunk();
      }

      // Only send final DONE message if we haven't already ended the response
      if (!responseEnded) {
        safeWrite(`data: [DONE]\n\n`);
        safeEnd();

        // Clear batch timer
        if (batchTimer) {
          clearTimeout(batchTimer);
          batchTimer = null;
        }

        // Store conversation in background (only for non-trivial exchanges)
        if (!isGreeting && !isChitChat && fullResponse) {
          storeConversationAsync(userId, question, fullResponse, isIntroduction, hasContext)
            .catch(saveError => console.warn("Error saving to MongoDB:", saveError.message));
        }
      }
    });

    // Handle errors in the stream
    response.data.on('error', (error) => {
      console.error("Stream error:", error);
      if (!responseEnded) {
        safeWrite(`data: ${JSON.stringify({
          chunk: " An error occurred while generating the response.",
          hasContext: false
        })}\n\n`);
        safeWrite(`data: [DONE]\n\n`);
        safeEnd();

        // Clear batch timer
        if (batchTimer) {
          clearTimeout(batchTimer);
          batchTimer = null;
        }
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log("Client disconnected from stream");
      responseEnded = true;

      // Clear batch timer
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
    });

  } catch (error) {
    console.error("Error processing request:", error);

    // If headers haven't been sent yet, send a JSON error
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      // Otherwise send error in SSE format and end
      try {
        res.write(`data: ${JSON.stringify({
          chunk: "Internal Server Error. Please try again later.",
          hasContext: false
        })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (err) {
        console.error("Error sending error response:", err);
      }
    }
  }
});
/**********************************AI Interactions**********************************/


app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();

    // Send welcome email
    const mailOptions = {
      from: '"NeuraleLearn" <neuralearnhelp@gmail.com>',
      to: email,
      subject: "Welcome to NeuraleLearn! 🎉",
      html: generateWelcomeEmail(name)
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Welcome email sent:", info.response);
      }
    });

    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
});

// Email template generator function
function generateWelcomeEmail(userName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to NeuraleLearn</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Poppins', sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          color: #333333;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          background: linear-gradient(135deg, #6e8efb, #a777e3);
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        
        .logo {
          max-width: 180px;
          margin-bottom: 20px;
        }
        
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        
        .content {
          background-color: #ffffff;
          padding: 30px;
          border-left: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0;
        }
        
        .welcome-message {
          font-size: 18px;
          margin-bottom: 25px;
          color: #4a4a4a;
        }
        
        .highlight {
          color: #6e8efb;
          font-weight: 600;
        }
        
        .benefits {
          margin: 25px 0;
          padding: 0;
        }
        
        .benefit-item {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .benefit-icon {
          background-color: #f0f4ff;
          color: #6e8efb;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          font-size: 18px;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #6e8efb, #a777e3);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 600;
          margin: 20px 0;
          transition: transform 0.3s ease;
        }
        
        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(110, 142, 251, 0.4);
        }
        
        .footer {
          background-color: #f7f9fc;
          padding: 20px;
          text-align: center;
          border-radius: 0 0 10px 10px;
          border: 1px solid #e0e0e0;
          border-top: none;
          color: #8a8a8a;
          font-size: 14px;
        }
        
        .social-links {
          margin: 15px 0;
        }
        
        .social-icon {
          display: inline-block;
          margin: 0 10px;
          width: 32px;
          height: 32px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <!-- If you have a logo, uncomment this line and add your logo URL -->
          <!-- <img src="your-logo-url.png" alt="NeuraleLearn Logo" class="logo"> -->
          <h1>NeuraleLearn</h1>
        </div>
        
        <div class="content">
          <p class="welcome-message">Hello <span class="highlight">${userName}</span>, and welcome to NeuraleLearn!</p>
          
          <p>We're thrilled to have you join our learning community. Your account has been successfully created, and you're now ready to begin your educational journey with us.</p>
          
          <div class="benefits">
            <div class="benefit-item">
              <div class="benefit-icon">📚</div>
              <div>Access to comprehensive learning modules</div>
            </div>
            <div class="benefit-item">
              <div class="benefit-icon">🔍</div>
              <div>In-depth study materials for every topic</div>
            </div>
            <div class="benefit-item">
              <div class="benefit-icon">🏆</div>
              <div>Track your progress and earn completion certificates</div>
            </div>
          </div>
          
          <p>Get started by exploring our course library and enrolling in your first course today!</p>
          
          <center>
            <a href="http://localhost:3000/courses" class="cta-button">Start Learning Now</a>
          </center>
          
          <p>If you have any questions or need assistance, don't hesitate to contact our support team.</p>
          
          <p>Happy learning!<br>The NeuraleLearn Team</p>
        </div>
        
        <div class="footer">
          <p>© 2025 NeuraleLearn. All rights reserved.</p>
          
          <div class="social-links">
            <!-- Add your social media icons/links here -->
            <!-- Example:
            <a href="#"><img src="facebook-icon.png" alt="Facebook" class="social-icon"></a>
            <a href="#"><img src="twitter-icon.png" alt="Twitter" class="social-icon"></a>
            <a href="#"><img src="instagram-icon.png" alt="Instagram" class="social-icon"></a>
            -->
          </div>
          
          <p>
            You received this email because you signed up for NeuraleLearn.<br>
            If you prefer not to receive emails, you can <a href="#">unsubscribe</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ✅ Login Endpoint (Signin)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: "1h" });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
});

// ✅ Get User Details
app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user details", error });
  }
});

// ✅ Get AI Query History
app.get("/user/history/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history", error });
  }
});

// ✅ Admin - Get User Statistics
app.get("/admin/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "admin" });
    const userCount = totalUsers - adminCount;

    res.json({ totalUsers, adminCount, userCount });
  } catch (error) {
    res.status(500).json({ message: "Error fetching statistics", error });
  }
});

// ✅ Admin - Get Recent Users
app.get("/admin/recent-users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(5);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching recent users", error });
  }
});

// ✅ Start Server
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
