import multer from 'multer';
import { stripOperators } from './sanitize.js';

// Detects the real file type from its first bytes. The browser-supplied
// mimetype/extension is never trusted, and SVG/HTML are never accepted
// (they could run scripts when opened).
const SIGNATURES = [
  { type: 'image/png', ext: 'png', test: (b) => b.length > 8 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' },
  { type: 'image/jpeg', ext: 'jpg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/gif', ext: 'gif', test: (b) => b.length > 6 && b.toString('ascii', 0, 4) === 'GIF8' },
  { type: 'image/webp', ext: 'webp', test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { type: 'application/pdf', ext: 'pdf', test: (b) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-' },
];

export const detectFileType = (buffer) => SIGNATURES.find((s) => s.test(buffer)) || null;

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export const safeFilename = (name, ext) => {
  const base = String(name || 'file').replace(/\.[^.]*$/, '').replace(/[^\w.-]+/g, '_').slice(0, 80) || 'file';
  return `${base}.${ext}`;
};

// Multipart parser for one route. Turns multer errors (too big, too many
// files) into clean 400 responses, then re-sanitizes the multipart text
// fields (the global sanitizer ran before multer filled req.body).
export const acceptUpload = ({ field, maxFiles = 1, maxBytes }) => {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: maxFiles, fields: 20, fieldSize: 10_000 },
  });
  const handler = maxFiles === 1 ? parser.single(field) : parser.array(field, maxFiles);
  return (req, res, next) => {
    handler(req, res, (error) => {
      if (error) {
        const message = error.code === 'LIMIT_FILE_SIZE'
          ? `Each file must be at most ${Math.round(maxBytes / 1024 / 1024)} MB.`
          : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
            ? `You can attach at most ${maxFiles} file(s).`
            : 'Could not read the uploaded file.';
        return res.status(400).json({ message });
      }
      if (req.body) req.body = stripOperators(req.body);
      next();
    });
  };
};

// Serves a stored file safely (no content sniffing, no script execution).
export const sendStoredFile = (res, file, { cacheSeconds = 0, privateCache = true } = {}) => {
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Length', file.size);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
  res.setHeader('Cache-Control', `${privateCache ? 'private' : 'public'}, max-age=${cacheSeconds}`);
  res.end(file.data);
};
