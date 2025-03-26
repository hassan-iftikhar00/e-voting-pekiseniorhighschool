import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Voter",
    required: true,
  },
  position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Position",
    required: true,
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate votes
voteSchema.index({ voter: 1, position: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);

export default Vote;
