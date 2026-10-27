// CRUD routes for doctors.
const express = require('express');
const db = require('../db');

const router = express.Router();

// READ all (optional ?q= search on name / specialty)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM doctors
        WHERE $1::text IS NULL
           OR name ILIKE '%' || $1 || '%'
           OR specialty ILIKE '%' || $1 || '%'
        ORDER BY id`,
      [req.query.q || null]
    );
    res.json(rows);
  } catch (err) {
    db.sendError(res, err);
  }
});

// READ one
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// CREATE
router.post('/', async (req, res) => {
  const { name, specialty, phone, consultation_fee } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO doctors (name, specialty, phone, consultation_fee)
       VALUES ($1, $2, $3, COALESCE($4::numeric, 500)) RETURNING *`,
      [name, specialty || null, phone || null, consultation_fee ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { name, specialty, phone, consultation_fee } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `UPDATE doctors
         SET name = $1, specialty = $2, phone = $3,
             consultation_fee = COALESCE($4, consultation_fee)
       WHERE id = $5 RETURNING *`,
      [name, specialty || null, phone || null, consultation_fee ?? null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM doctors WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    db.sendError(res, err);
  }
});

module.exports = router;
