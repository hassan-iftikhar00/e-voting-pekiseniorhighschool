import mongoose from "mongoose";

const VoterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  voterId: {
    type: String,
    required: true,
    unique: true,
  },
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
  },
  class: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  house: {
    type: String,
    required: true,
  },
  hasVoted: {
    type: Boolean,
    default: false,
  },
  votedAt: {
    type: Date,
  },
});

const Voter = mongoose.model("Voter", VoterSchema);
export default Voter;
