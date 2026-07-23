// controllers/resumeController.js
const { getAuth } = require('@clerk/express');
const path = require('path');
const fs = require('fs');
const { put, del } = require('@vercel/blob');
const resumeModel = require('../models/resumeModel');

// Helper: Delete resume file from Blob or Local Storage
async function deletePhysicalFile(filePath) {
  if (!filePath) return;
  try {
    if (filePath.startsWith('http') || filePath.includes('vercel-storage.com')) {
      await del(filePath);
    } else {
      const fullPath = path.join(__dirname, '..', 'public', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (err) {
    console.error('Physical file deletion error:', err.message);
  }
}

// Helper: Save resume file to Blob or Local Storage
async function saveResumeFile(file) {
  if (!file) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(file.originalname, file.buffer, { access: 'public' });
    return blob.url;
  } else {
    const filename = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    const localDir = path.join(__dirname, '..', 'public', 'uploads', 'resumes');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const fullPath = path.join(localDir, filename);
    fs.writeFileSync(fullPath, file.buffer);
    return '/uploads/resumes/' + filename;
  }
}

// REST API: GET /api/resumes
exports.getResumesAPI = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const resumes = await resumeModel.getUserResumes(userId);
    res.json({ success: true, resumes });
  } catch (err) {
    console.error('getResumesAPI error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// REST API: GET /api/resumes/:id
exports.getResumeAPI = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const resume = await resumeModel.getResumeById(req.params.id, userId);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const applications = await resumeModel.getApplicationsUsingResume(req.params.id, userId);
    res.json({ success: true, resume, applications });
  } catch (err) {
    console.error('getResumeAPI error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// REST API: POST /api/resumes
exports.createResumeAPI = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, version } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Resume title is required.' });
    }
    if (!version || !version.trim()) {
      return res.status(400).json({ error: 'Resume version is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required.' });
    }

    // Check duplicate version
    const isDup = await resumeModel.findDuplicate(userId, title, version);
    if (isDup) {
      return res.status(400).json({
        error: `A resume with title "${title.trim()}" and version "${version.trim()}" already exists.`
      });
    }

    const filePath = await saveResumeFile(req.file);
    const newId = await resumeModel.createResume({
      userId,
      title: title.trim(),
      version: version.trim(),
      fileName: req.file.originalname,
      filePath
    });

    const newResume = await resumeModel.getResumeById(newId, userId);
    res.status(201).json({ success: true, message: 'Resume uploaded successfully', resume: newResume });
  } catch (err) {
    console.error('createResumeAPI error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// REST API: PUT /api/resumes/:id
exports.updateResumeAPI = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, version } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Resume title is required.' });
    }
    if (!version || !version.trim()) {
      return res.status(400).json({ error: 'Resume version is required.' });
    }

    const existing = await resumeModel.getResumeById(req.params.id, userId);
    if (!existing) return res.status(404).json({ error: 'Resume not found' });

    const isDup = await resumeModel.findDuplicate(userId, title, version, req.params.id);
    if (isDup) {
      return res.status(400).json({
        error: `A resume with title "${title.trim()}" and version "${version.trim()}" already exists.`
      });
    }

    await resumeModel.updateResume({
      id: req.params.id,
      userId,
      title: title.trim(),
      version: version.trim()
    });

    const updated = await resumeModel.getResumeById(req.params.id, userId);
    res.json({ success: true, message: 'Resume updated successfully', resume: updated });
  } catch (err) {
    console.error('updateResumeAPI error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// REST API: DELETE /api/resumes/:id
exports.deleteResumeAPI = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const resume = await resumeModel.getResumeById(req.params.id, userId);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    // Check if linked to any applications
    const linkedCount = await resumeModel.getLinkedApplicationsCount(req.params.id, userId);
    if (linkedCount > 0) {
      return res.status(400).json({
        error: `Cannot delete resume because it is currently linked to ${linkedCount} application(s).`
      });
    }

    // Delete physical file
    await deletePhysicalFile(resume.file_path);

    // Delete DB record
    await resumeModel.deleteResume(req.params.id, userId);

    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (err) {
    console.error('deleteResumeAPI error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Render Page: GET /resumes
exports.renderManageResumesPage = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.redirect('/sign-in');

    const resumesWithStats = await resumeModel.getResumesWithAnalytics(userId);

    // Summary calculations
    const totalResumes = resumesWithStats.length;
    let topResume = null;
    if (totalResumes > 0) {
      topResume = [...resumesWithStats].sort((a, b) => parseFloat(b.success_rate) - parseFloat(a.success_rate))[0];
    }

    res.render('resumes', {
      resumes: resumesWithStats,
      totalResumes,
      topResume,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error('renderManageResumesPage error:', err);
    res.status(500).send('Server error');
  }
};

// Render Page: GET /resumes/:id/details
exports.renderResumeDetailsPage = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.redirect('/sign-in');

    const resume = await resumeModel.getResumeById(req.params.id, userId);
    if (!resume) return res.status(404).send('Resume not found');

    const applications = await resumeModel.getApplicationsUsingResume(req.params.id, userId);

    const stats = {
      total: applications.length,
      applied: applications.filter(a => a.status === 'Applied').length,
      interview: applications.filter(a => a.status === 'Interview').length,
      offer: applications.filter(a => a.status === 'Offer').length,
      rejected: applications.filter(a => a.status === 'Rejected').length,
    };
    stats.success_rate = stats.total > 0
      ? (((stats.interview + stats.offer) / stats.total) * 100).toFixed(1)
      : '0.0';

    res.render('resume-details', {
      resume,
      applications,
      stats
    });
  } catch (err) {
    console.error('renderResumeDetailsPage error:', err);
    res.status(500).send('Server error');
  }
};
