import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { authRequired } from '../auth.js';
import { insert } from '../db.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/workspace/uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uid = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${uid}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) return cb(new Error('UNSUPPORTED_TYPE'));
    if (!ALLOWED_MIMES.includes(file.mimetype)) return cb(new Error('UNSUPPORTED_MIME'));
    cb(null, true);
  },
});

const router = Router();

router.post('/', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ code: 400, message: '请选择文件' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) return res.json({ code: 400, message: '不支持的文件类型' });

    const fileRecord = await insert('upload_files', {
      original_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      user_id: req.userId,
    });

    res.json({
      code: 0,
      data: {
        id: fileRecord.id,
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('[Upload]', error.message);
    if (error.message === 'UNSUPPORTED_TYPE' || error.message === 'UNSUPPORTED_MIME') {
      return res.status(400).json({ code: 400, message: '不支持的文件类型' });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: 400, message: '文件大小超过限制（5MB）' });
    }
    res.status(500).json({ code: 500, message: '文件上传失败' });
  }
});

// 多文件上传
router.post('/multiple', authRequired, upload.array('files', 9), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.json({ code: 400, message: '请选择文件' });

    const results = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_TYPES.includes(ext)) continue;

      const fileRecord = await insert('upload_files', {
        original_name: file.originalname,
        file_path: `/uploads/${file.filename}`,
        file_size: file.size,
        mime_type: file.mimetype,
        user_id: req.userId,
      });

      results.push({
        id: fileRecord.id,
        url: `/uploads/${file.filename}`,
        name: file.originalname,
      });
    }

    res.json({ code: 0, data: results });
  } catch (error) {
    console.error('[Upload Multiple]', error.message);
    if (error.message === 'UNSUPPORTED_TYPE' || error.message === 'UNSUPPORTED_MIME') {
      return res.status(400).json({ code: 400, message: '不支持的文件类型' });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: 400, message: '文件大小超过限制（5MB）' });
    }
    res.status(500).json({ code: 500, message: '文件上传失败' });
  }
});

export default router;