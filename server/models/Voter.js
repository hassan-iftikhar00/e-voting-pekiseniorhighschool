import mongoose from "mongoose";
import crypto from "crypto";

const voterSchema = new mongoose.Schema(
  {
    voterId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
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
      default: null,
    },
    voteToken: {
      type: String,
      default: null,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Election",
    },
  },
  {
    timestamps: true,
  }
);

// Generate a unique VoterID
voterSchema.pre("save", function (next) {
  if (this.isNew && !this.voterId) {
    // Generate a unique voter ID with standardized prefix "VOTER"
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const prefix = "VOTER";
    this.voterId = `${prefix}${randomDigits}`;
  }
  next();
});

const Voter = mongoose.model("Voter", voterSchema);

export default Voter;
