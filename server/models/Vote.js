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

// Replace with simpler indexes without uniqueness
voteSchema.index({ voter: 1, election: 1 });
voteSchema.index({ election: 1, position: 1 });
voteSchema.index({ isAbstention: 1 });

// Use this function to run on server start to drop the problematic index
export const dropVoteUniqueIndex = async () => {
  try {
    // Check if collection exists
    const collections = await mongoose.connection.db
      .listCollections({ name: "votes" })
      .toArray();
    if (collections.length > 0) {
      console.log("Attempting to drop problematic index on votes collection");
      await mongoose.connection.db
        .collection("votes")
        .dropIndex("voterId_1_positionId_1_electionId_1");
      console.log("Successfully dropped problematic index");
    }
  } catch (error) {
    console.log("Index drop error (might not exist):", error.message);
  }
};

const VoteModel = mongoose.model("Vote", voteSchema);
export default VoteModel;
