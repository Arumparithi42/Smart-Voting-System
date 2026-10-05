import crypto from 'crypto';
import User from '../models/User.js';
import VoterIdentity from '../models/VoterIdentity.js';
import StoredFile from '../models/StoredFile.js';
import { detectFileType, IMAGE_TYPES, safeFilename, sendStoredFile } from '../middleware/upload.js';

const maskPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `******${digits.slice(-4)}` : null;
};

// The only profile fields a user may change themselves. Identity fields
// (email, voter ID, phone, Aadhaar binding) and role are deliberately
// absent: they come from Clerk / the trusted voter registry and changing
// them here would let someone alter their voter identity.
const EDITABLE = {
  firstName: { max: 50, required: true },
  lastName: { max: 50 },
  bio: { max: 300 },
  profileUrl: { max: 500, url: true },
};

const buildProfile = (user, voter) => ({
  firstName: user.firstName,
  lastName: user.lastName || '',
  email: user.email,
  bio: user.bio || '',
  profileUrl: user.profileUrl || '',
  // Uploaded photo, served from /api/media/profile/<random token>. The
  // frontend prefers it over profileUrl / the Clerk image.
  photoPath: user.profilePhoto?.token ? `/api/media/profile/${user.profilePhoto.token}` : null,
  role: user.role,
  memberSince: user.createdAt,
  // Read-only voter identity summary. Never includes aadhaarHash, OTP
  // state or the full phone number.
  voterIdentity: voter
    ? {
        voterId: voter.voterId,
        registeredEmail: voter.email,
        maskedPhone: maskPhone(voter.phoneNumber),
        registryVerified: !!voter.isVerified,
        otpVerified: !!voter.otpVerified,
      }
    : null,
});

export const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) return res.status(404).json({ message: 'Profile not found. Please sign in again.' });
    const voter = await VoterIdentity.findOne({ clerkId: req.clerkId });
    res.status(200).json(buildProfile(user, voter));
  } catch (error) {
    res.status(500).json({ message: 'Error loading profile', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    const forbidden = Object.keys(body).filter((k) => !(k in EDITABLE));
    if (forbidden.length) {
      return res.status(400).json({ message: `These fields cannot be changed here: ${forbidden.join(', ')}` });
    }

    const set = {};
    for (const [field, rule] of Object.entries(EDITABLE)) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== 'string') {
        return res.status(400).json({ message: `${field} must be text` });
      }
      const value = body[field].trim();
      if (rule.required && !value) return res.status(400).json({ message: `${field} cannot be empty` });
      if (value.length > rule.max) return res.status(400).json({ message: `${field} must be at most ${rule.max} characters` });
      if (rule.url && value && !/^https:\/\/[^\s<>"']+$/i.test(value)) {
        return res.status(400).json({ message: 'Profile image must be an https:// URL' });
      }
      set[field] = value;
    }
    if (!Object.keys(set).length) return res.status(400).json({ message: 'Nothing to update' });

    const user = await User.findOneAndUpdate({ clerkId: req.clerkId }, { $set: set }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'Profile not found. Please sign in again.' });
    const voter = await VoterIdentity.findOne({ clerkId: req.clerkId });
    res.status(200).json({ message: 'Profile updated successfully.', profile: buildProfile(user, voter) });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

// Upload / replace the profile photo (PNG, JPEG, GIF or WebP up to 2 MB).
export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please choose an image to upload.' });
    const detected = detectFileType(req.file.buffer);
    if (!detected || !IMAGE_TYPES.includes(detected.type)) {
      return res.status(400).json({ message: 'Profile photo must be a PNG, JPEG, GIF or WebP image.' });
    }

    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) return res.status(404).json({ message: 'Profile not found. Please sign in again.' });

    const file = await StoredFile.create({
      kind: 'profile-photo',
      ownerClerkId: req.clerkId,
      filename: safeFilename(req.file.originalname, detected.ext),
      contentType: detected.type,
      size: req.file.size,
      data: req.file.buffer,
      publicToken: crypto.randomBytes(24).toString('hex'),
    });

    const previous = user.profilePhoto?.fileId;
    user.profilePhoto = { fileId: file._id, token: file.publicToken };
    await user.save();
    if (previous) await StoredFile.deleteOne({ _id: previous, ownerClerkId: req.clerkId }).catch(() => {});

    const voter = await VoterIdentity.findOne({ clerkId: req.clerkId });
    res.status(200).json({ message: 'Profile photo updated.', profile: buildProfile(user, voter) });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading photo', error: error.message });
  }
};

export const deleteProfilePhoto = async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.clerkId });
    if (!user) return res.status(404).json({ message: 'Profile not found. Please sign in again.' });
    const previous = user.profilePhoto?.fileId;
    user.profilePhoto = undefined;
    await user.save();
    if (previous) await StoredFile.deleteOne({ _id: previous, ownerClerkId: req.clerkId });
    const voter = await VoterIdentity.findOne({ clerkId: req.clerkId });
    res.status(200).json({ message: 'Profile photo removed.', profile: buildProfile(user, voter) });
  } catch (error) {
    res.status(500).json({ message: 'Error removing photo', error: error.message });
  }
};

// Public (unauthenticated) so <img> tags can load it; addressed only by a
// random 48-hex-char token, and only ever serves profile photos.
export const serveProfilePhoto = async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).end();
    const file = await StoredFile.findOne({ publicToken: token, kind: 'profile-photo' });
    if (!file) return res.status(404).end();
    sendStoredFile(res, file, { cacheSeconds: 86400, privateCache: false });
  } catch {
    res.status(500).end();
  }
};
