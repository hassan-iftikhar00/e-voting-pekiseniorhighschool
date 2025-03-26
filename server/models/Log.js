import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Change to Mixed type to allow objects
    default: {},
    trim: true,
  },
  resourceId: {
    type: String,
  },
  resourceType: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    default: null,
  },
  ipAddress: {
    type: String,
    default: "",
  },
  userAgent: {
    type: String,
    default: "",
  },
});

const Log = mongoose.model("Log", LogSchema);
export default Log;
