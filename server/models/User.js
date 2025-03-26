import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId reference or string
      ref: "Role",
      default: "viewer", // Default role
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords with better error handling
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword) {
    console.error("No password provided for comparison");
    return false;
  }

  if (!this.password) {
    console.error(`User ${this.username} has no password stored`);
    return false;
  }

  console.log("Comparing passwords for user:", this.username);
  try {
    const result = await bcrypt.compare(candidatePassword, this.password);
    console.log("Password match result:", result);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    // Return false instead of throwing to avoid crashing the login process
    return false;
  }
};

// Helper method to safely get role permissions
UserSchema.methods.getPermissions = async function () {
  try {
    // Handle case where role is a string (role name)
    if (typeof this.role === "string") {
      const Role = mongoose.model("Role");
      const role = await Role.findOne({ name: this.role });
      return role?.permissions || {};
    }

    // If role is already populated
    if (this.role && typeof this.role === "object" && this.role.permissions) {
      return this.role.permissions;
    }

    // If role is an ObjectId, populate it
    if (this.role) {
      await this.populate("role");
      return this.role?.permissions || {};
    }

    return {};
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return {};
  }
};

const User = mongoose.model("User", UserSchema);
export default User;
