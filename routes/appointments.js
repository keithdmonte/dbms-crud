// CRUD routes for appointments. List uses JOINs to show patient + doctor names.
const express = require('express');
const db = require('../db');

const router = express.Router();

const LIST_SQL = `
  SELECT a.id, a.patient_id, a.doctor_id, a.appt_date, a.reason, a.status,
         p.name AS patient_name,
         d.name AS doctor_name
    FROM appointments a
    LEFT JOIN patients p ON p.id = a.patient_id
    LEFT JOIN doctors  d ON d.id = a.doctor_id
`;

// READ all (with joined names; optional ?q= search on names / reason / status)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${LIST_SQL}
        WHERE $1::text IS NULL
           OR p.name ILIKE '%' || $1 || '%'
           OR d.name ILIKE '%' || $1 || '%'
           OR a.reason ILIKE '%' || $1 || '%'
           OR a.status ILIKE '%' || $1 || '%'
        ORDER BY a.id`,
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
    const { rows } = await db.query(`${LIST_SQL} WHERE a.id = $1`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// CREATE
router.post('/', async (req, res) => {
  const { patient_id, doctor_id, appt_date, reason, status } = req.body;
  if (!patient_id || !doctor_id || !appt_date) {
    return res.status(400).json({ error: 'patient_id, doctor_id and appt_date are required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appt_date, reason, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patient_id, doctor_id, appt_date || null, reason || null, status || 'scheduled']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { patient_id, doctor_id, appt_date, reason, status } = req.body;
  if (!patient_id || !doctor_id || !appt_date) {
    return res.status(400).json({ error: 'patient_id, doctor_id and appt_date are required' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE appointments
         SET patient_id = $1, doctor_id = $2, appt_date = $3, reason = $4, status = $5
       WHERE id = $6 RETURNING *`,
      [patient_id, doctor_id, appt_date || null, reason || null, status || 'scheduled', req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    db.sendError(res, err);
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    db.sendError(res, err);
  }
});

module.exports = router;
