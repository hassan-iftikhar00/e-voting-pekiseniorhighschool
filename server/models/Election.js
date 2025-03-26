import mongoose from "mongoose";

const ElectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["not-started", "active", "ended"],
    default: "not-started",
  },
  isCurrent: {
    type: Boolean,
    default: false,
  },
  hasData: {
    type: Boolean,
    default: false,
  },
  totalVoters: {
    type: Number,
    default: 0,
  },
  votedCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Election = mongoose.model("Election", ElectionSchema);
export default Election;
