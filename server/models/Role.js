import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema({
  view: {
    type: Boolean,
    default: false,
  },
  edit: {
    type: Boolean,
    default: false,
  },
  delete: {
    type: Boolean,
    default: false,
  },
  add: {
    type: Boolean,
    default: false,
  },
});

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  permissions: {
    type: Map,
    of: PermissionSchema,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
RoleSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Role = mongoose.model("Role", RoleSchema);
export default Role;
