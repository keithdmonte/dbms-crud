// Read-only dashboard + report queries (aggregates, GROUP BY, HAVING, subqueries).
const express = require('express');
const db = require('../db');

const router = express.Router();

// Dashboard: totals (scalar subqueries), status breakdown (GROUP BY), upcoming list.
router.get('/summary', async (req, res) => {
  try {
    const [totals, byStatus, upcoming] = await Promise.all([
      db.query(`
        SELECT (SELECT COUNT(*) FROM patients)::int     AS patients,
               (SELECT COUNT(*) FROM doctors)::int      AS doctors,
               (SELECT COUNT(*) FROM appointments)::int AS appointments,
               (SELECT COUNT(*) FROM appointments
                 WHERE status = 'scheduled' AND appt_date >= CURRENT_DATE)::int AS upcoming
      `),
      db.query(`
        SELECT status, COUNT(*)::int AS count
          FROM appointments
         GROUP BY status
         ORDER BY status
      `),
      db.query(`
        SELECT a.id, a.appt_date, a.reason, p.name AS patient_name, d.name AS doctor_name
          FROM appointments a
          JOIN patients p ON p.id = a.patient_id
          JOIN doctors  d ON d.id = a.doctor_id
         WHERE a.status = 'scheduled' AND a.appt_date >= CURRENT_DATE
         ORDER BY a.appt_date
         LIMIT 5
      `),
    ]);
    res.json({ totals: totals.rows[0], byStatus: byStatus.rows, upcoming: upcoming.rows });
  } catch (err) {
    db.sendError(res, err);
  }
});

// Report 1: doctor workload + revenue. JOIN, GROUP BY, COUNT/SUM, HAVING.
// ?min=N keeps only doctors with at least N appointments.
router.get('/doctor-workload', async (req, res) => {
  const min = Number.parseInt(req.query.min, 10) || 0;
  try {
    const { rows } = await db.query(
      `SELECT d.id, d.name, d.specialty, d.consultation_fee,
              COUNT(a.id)::int                                         AS total,
              COUNT(a.id) FILTER (WHERE a.status = 'completed')::int   AS completed,
              COUNT(a.id) FILTER (WHERE a.status = 'scheduled')::int   AS scheduled,
              COUNT(a.id) FILTER (WHERE a.status = 'cancelled')::int   AS cancelled,
              COALESCE(SUM(d.consultation_fee) FILTER (WHERE a.status = 'completed'), 0) AS revenue
         FROM doctors d
         LEFT JOIN appointments a ON a.doctor_id = d.id
        GROUP BY d.id
       HAVING COUNT(a.id) >= $1
        ORDER BY revenue DESC, total DESC`,
      [min]
    );
    res.json(rows);
  } catch (err) {
    db.sendError(res, err);
  }
});

// Report 2: patients with no appointments (NOT EXISTS subquery) and
// patients older than the average age (nested aggregate subquery).
router.get('/patients', async (req, res) => {
  try {
    const [inactive, aboveAvg] = await Promise.all([
      db.query(`
        SELECT p.id, p.name, p.age, p.phone
          FROM patients p
         WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id)
         ORDER BY p.name
      `),
      db.query(`
        SELECT id, name, age,
               (SELECT ROUND(AVG(age), 1) FROM patients) AS avg_age
          FROM patients
         WHERE age > (SELECT AVG(age) FROM patients)
         ORDER BY age DESC
      `),
    ]);
    res.json({ inactive: inactive.rows, aboveAvg: aboveAvg.rows });
  } catch (err) {
    db.sendError(res, err);
  }
});

module.exports = router;
