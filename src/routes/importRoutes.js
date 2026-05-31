const express = require('express');
const multer = require('multer');
const path = require('path');
const { parseExcelFile } = require('../services/excelParser');

const router = express.Router();

// almacenamiento temporal
const upload = multer({ dest: 'tmp/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const db = req.app.get('db');

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await parseExcelFile(req.file.path, db);

    res.json({
      ok: true,
      message: 'Import completed',
      result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
