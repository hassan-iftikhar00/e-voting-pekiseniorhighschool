import mongoose from "mongoose";

const YearSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Only one year can be active at a time
YearSchema.pre("save", async function (next) {
  // If this year is being set to active, deactivate all others
  if (this.active) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { active: false } }
    );
  }
  next();
});

const Year = mongoose.model("Year", YearSchema);
export default Year;
