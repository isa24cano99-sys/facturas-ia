'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const db = req.app.get('db');
    const branches = db.prepare('SELECT * FROM branches').all();
    res.json({ ok: true, branches });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = req.app.get('db');
    const branch = db.prepare('SELECT * FROM branches WHERE branch_id = ?').get(req.params.id);
    if (!branch) {
      return res.status(404).json({ ok: false, error: 'Branch not found' });
    }
    res.json({ ok: true, branch });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
