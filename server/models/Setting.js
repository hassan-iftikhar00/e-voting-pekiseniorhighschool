import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    isActive: {
      type: Boolean,
      default: false,
    },
    electionTitle: {
      type: String,
      default: "Student Council Election 2025",
    },
    votingStartDate: {
      type: String,
      default: function () {
        return new Date().toISOString().split("T")[0]; // Today
      },
    },
    votingEndDate: {
      type: String,
      default: function () {
        const date = new Date();
        date.setDate(date.getDate() + 7); // Default: 1 week from now
        return date.toISOString().split("T")[0];
      },
    },
    votingStartTime: {
      type: String,
      default: "08:00",
    },
    votingEndTime: {
      type: String,
      default: "17:00",
    },
    resultsPublished: {
      type: Boolean,
      default: false,
    },
    allowVoterRegistration: {
      type: Boolean,
      default: false,
    },
    requireEmailVerification: {
      type: Boolean,
      default: true,
    },
    maxVotesPerVoter: {
      type: Number,
      default: 1,
    },
    systemName: {
      type: String,
      default: "Peki Senior High School Elections",
    },
    systemLogo: {
      type: String,
      default: "",
    },
    companyName: {
      type: String,
      default: "",
    },
    companyLogo: {
      type: String,
      default: "",
    },
    schoolName: {
      type: String,
      default: "",
    },
    schoolLogo: {
      type: String,
      default: "",
    },
    // Additional settings can be added here
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", SettingSchema);
export default Setting;
