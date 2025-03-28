import mongoose from "mongoose";

const ElectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    // Add start and end date fields
    startDate: {
      type: String,
      default: function () {
        return this.date; // Default to the main date
      },
    },
    endDate: {
      type: String,
      default: function () {
        return this.date; // Default to the main date
      },
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    totalVoters: {
      type: Number,
      default: 0,
    },
    votedCount: {
      type: Number,
      default: 0,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["not-started", "active", "ended"],
      default: "not-started",
    },
    resultsPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Make sure status is properly synchronized with isActive in pre-save middleware
ElectionSchema.pre("save", function (next) {
  // If isActive is true, ensure status is 'active'
  if (this.isActive === true && this.status !== "active") {
    this.status = "active";
  }

  // If a direct database update left these fields out of sync, correct it
  if (this.isActive === false && this.status === "active") {
    this.status = "not-started";
  }

  next();
});

const Election = mongoose.model("Election", ElectionSchema);
export default Election;
