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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    position: {
      type: Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Candidate", candidateSchema);
