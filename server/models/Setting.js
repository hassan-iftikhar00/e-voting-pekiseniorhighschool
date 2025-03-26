import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: "",
  },
  schoolName: {
    type: String,
    default: "",
  },
  companyLogo: {
    type: String,
    default: "",
  },
  schoolLogo: {
    type: String,
    default: "",
  },
  electionTitle: {
    type: String,
    default: "Student Council Election",
  },
  autoBackupEnabled: {
    type: Boolean,
    default: true,
  },
  autoBackupInterval: {
    type: String,
    default: "24",
  },
  lastBackupDate: {
    type: Date,
  },
  lastRestoreDate: {
    type: Date,
  },
});

const Setting = mongoose.model("Setting", SettingSchema);
export default Setting;
