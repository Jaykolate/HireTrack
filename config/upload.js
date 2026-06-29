// config/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use /tmp on Vercel (read-only filesystem), local uploads dir otherwise
const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel
  ? path.join(os.tmpdir(), 'uploads', 'resumes')
  : path.join(__dirname, '..', 'public', 'uploads', 'resumes');

try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (err) {
  console.error('Could not create upload dir:', err.message);
}

// Save files to disk with unique names
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  },
});

module.exports = upload;
