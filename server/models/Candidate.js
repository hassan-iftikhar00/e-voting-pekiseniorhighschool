import mongoose from "mongoose";
const { Schema } = mongoose;

const candidateSchema = new Schema(
  {
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
    voterCategory: {
      type: {
        type: String,
        enum: ["all", "year", "class", "house"],
        default: "all",
      },
      values: [
        {
          type: String,
        },
      ],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    position: {
      type: Schema.Types.ObjectId,
      ref: "Position",
    },
  },
  { timestamps: true }
);

// Add indexes to improve query performance
candidateSchema.index({ positionId: 1, electionId: 1, isActive: 1 });
candidateSchema.index({ electionId: 1, isActive: 1 });

// Make position field optional to fix compatibility issues
candidateSchema.pre("save", function (next) {
  // Default position to positionId if not set
  if (!this.position && this.positionId) {
    this.position = this.positionId;
  }
  next();
});

export default mongoose.model("Candidate", candidateSchema);
