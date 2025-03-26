import mongoose from "mongoose";

const CandidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  positionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Position",
    required: true,
  },
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true,
  },
  image: {
    type: String,
    default: "",
  },
  biography: {
    type: String,
    default: "",
  },
  year: {
    type: String,
    default: "",
  },
  class: {
    type: String,
    default: "",
  },
  house: {
    type: String,
    default: "",
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

const Candidate = mongoose.model("Candidate", CandidateSchema);
export default Candidate;
