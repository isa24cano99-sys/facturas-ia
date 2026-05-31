'use strict';

const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');

router.post('/', async (req, res) => {
  try {
    // por ahora recibimos archivo simulado (después conectamos multer)
    const fileBuffer = req.body.file;

    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const db = req.app.get('db');

    // ejemplo básico de inserción (branches)
    for (const row of data) {
      if (row.branch_id) {
        db.prepare(`
          INSERT OR IGNORE INTO branches (
            branch_id,
            branch_name,
            branch_manager_name,
            branch_manager_email
          ) VALUES (?, ?, ?, ?)
        `).run(
          row.branch_id,
          row.branch_name,
          row.branch_manager_name,
          row.branch_manager_email
        );
      }
    }

    res.json({
      ok: true,
      message: 'File processed',
      rows: data.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
