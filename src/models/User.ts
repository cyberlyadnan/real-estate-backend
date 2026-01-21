import mongoose, { Schema, Model, HydratedDocument,Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// IUser interface with all fields and instance methods
// Note: In Mongoose 9+, interfaces don't need to extend Document
// The Model<IUser> typing handles the Document methods
export interface IUser extends Document{
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  refreshToken?: string;
  refreshTokenExpiry?: Date;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Instance method defined in schema.methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenExpiry: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// Mongoose 9+ uses async functions without next() callback
// Errors are thrown instead of passed to next()
userSchema.pre('save', async function (this: HydratedDocument<IUser>) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Compare password method - properly typed to match IUser interface
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function (this: IUser) {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.refreshTokenExpiry;
  return obj;
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
