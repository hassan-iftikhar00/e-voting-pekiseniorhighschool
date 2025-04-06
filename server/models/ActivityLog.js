import mongoose from "mongoose";
const { Schema } = mongoose;

const activityLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    user: {
      type: Schema.Types.Mixed,
      ref: "User",
    },
    entity: {
      type: String,
      default: "",
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    electionId: {
      type: Schema.Types.ObjectId,
      ref: "Election",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Add indexes for common searches
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ entity: 1, action: 1 });
activityLogSchema.index({ "details.voterId": 1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
