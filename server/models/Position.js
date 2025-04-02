import mongoose from "mongoose";

const PositionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true,
  },
  maxCandidates: {
    type: Number,
    default: 1,
  },
  maxSelections: {
    type: Number,
    default: 1,
  },
  priority: {
    type: Number,
    default: 0,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Position = mongoose.model("Position", PositionSchema);
export default Position;
