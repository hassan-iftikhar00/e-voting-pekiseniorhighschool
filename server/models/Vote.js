import mongoose from "mongoose";
const { Schema } = mongoose;

const voteSchema = new Schema(
  {
    voter: {
      type: Schema.Types.ObjectId,
      ref: "Voter",
      required: true,
    },
    election: {
      type: Schema.Types.ObjectId,
      ref: "Election",
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    candidate: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      // Not required for abstention votes
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isAbstention: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Add an index to prevent duplicate votes for the same position by the same voter
voteSchema.index({ voter: 1, election: 1, position: 1 }, { unique: true });

export default mongoose.model("Vote", voteSchema);
