import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { adminAuthRequired } from '../../auth.js';
import { query, queryOne, insert, transaction } from '../../db.js';
import { recordLog } from '../../services/audit-log.service.js';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/workspace/uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uid = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${uid}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

const router = Router();

router.post('/', adminAuthRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ code: 400, message: '请选择文件' });
    
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) return res.json({ code: 400, message: '不支持的文件类型' });

    const fileRecord = await insert('upload_files', {
      original_name: req.file.originalname,
      file_name: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploader_id: req.adminId,
    });

    res.json({
      code: 0,
      data: { id: fileRecord.id, url: `/uploads/${req.file.filename}`, name: req.file.originalname, size: req.file.size }
    });
  } catch (error) {
    console.error('[UPLOAD]', error.message);
    res.status(500).json({ code: 500, message: '文件上传失败' });
  }
});

export default router;