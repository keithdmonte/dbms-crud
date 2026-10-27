// CRUD routes for patients.
const express = require('express');
const db = require('../db');

const router = express.Router();

// READ all (optional ?q= search on name / phone / address)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM patients
        WHERE $1::text IS NULL
           OR name ILIKE '%' || $1 || '%'
           OR phone ILIKE '%' || $1 || '%'
           OR address ILIKE '%' || $1 || '%'
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
    const { rows } = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// CREATE
router.post('/', async (req, res) => {
  const { name, age, gender, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO patients (name, age, gender, phone, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, age ?? null, gender || null, phone || null, address || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { name, age, gender, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `UPDATE patients
         SET name = $1, age = $2, gender = $3, phone = $4, address = $5
       WHERE id = $6 RETURNING *`,
      [name, age ?? null, gender || null, phone || null, address || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    db.sendError(res, err);
  }
});

module.exports = router;
