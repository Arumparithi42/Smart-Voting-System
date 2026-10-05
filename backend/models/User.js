import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        clerkId: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        firstName: { type: String, required: true },
        lastName: { type: String },
        profileUrl: { type: String },
        // Optional, user-editable "about me" line (see profileController).
        bio: { type: String, maxlength: 300 },
        // Uploaded profile photo (see profileController.uploadProfilePhoto).
        profilePhoto: {
            fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredFile' },
            token: { type: String },
        },
        // 'officer' = Election Officer: can propose elections to an admin and
        // monitor approved ones, but never creates official elections or
        // publishes results itself. Roles are only ever changed server-side
        // (see adminController.updateUserRole) - never from a client body.
        role: { type: String, enum: ['user', 'officer', 'admin'], default: 'user' },
    },
    { timestamps: true } 
);

// Export the User model
export default mongoose.model('User', userSchema);
