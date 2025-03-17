// models/userConnection.js
const mongoose = require("mongoose");

const UserConnectionSchema = new mongoose.Schema({
  // User who sent the connection request
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // User who received the connection request
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Status: pending, accepted, rejected, or blocked
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "blocked"],
    default: "pending"
  },
  // Visibility preferences - what recipient can see of requester's data
  visibility: {
    progressVisible: { type: Boolean, default: true },
    coursesVisible: { type: Boolean, default: true },
    streakVisible: { type: Boolean, default: true },
    questionsVisible: { type: Boolean, default: false }
  },
  // When the connection request was sent
  requestDate: {
    type: Date,
    default: Date.now
  },
  // When the status was last updated
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Optional note/message with connection request
  message: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Compound index to ensure uniqueness (one connection between two users)
UserConnectionSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

// Add an index for faster user-based lookups
UserConnectionSchema.index({ requesterId: 1, status: 1 });
UserConnectionSchema.index({ recipientId: 1, status: 1 });

// Pre-save hook to update lastUpdated field
UserConnectionSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Methods to get connection status
UserConnectionSchema.statics.getConnectionStatus = async function(userId1, userId2) {
  const connection = await this.findOne({
    $or: [
      { requesterId: userId1, recipientId: userId2 },
      { requesterId: userId2, recipientId: userId1 }
    ]
  });
  
  return connection ? connection.status : null;
};

// Add method to get all connections for a user
UserConnectionSchema.statics.getUserConnections = async function(userId) {
  const connections = await this.find({
    $or: [
      { requesterId: userId, status: 'accepted' },
      { recipientId: userId, status: 'accepted' }
    ]
  }).populate('requesterId recipientId', 'name email');
  
  return connections.map(conn => {
    const isRequester = conn.requesterId._id.toString() === userId.toString();
    const otherUser = isRequester ? conn.recipientId : conn.requesterId;
    return {
      connectionId: conn._id,
      user: otherUser,
      status: conn.status,
      visibility: conn.visibility,
      since: conn.requestDate
    };
  });
};

module.exports = mongoose.model("UserConnection", UserConnectionSchema);