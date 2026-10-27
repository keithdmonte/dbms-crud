# Hospital Management System — CRUD

Full-stack CRUD demo. Focus: frontend ↔ backend ↔ PostgreSQL wiring.

Manages **Patients**, **Doctors**, **Appointments** (3 tables, foreign keys).

## Stack

| Layer     | Tech                           |
|-----------|--------------------------------|
| Frontend  | Vanilla HTML/CSS/JS, `fetch()` |
| Backend   | Node.js + Express              |
| DB driver | `pg` (node-postgres)           |
| Database  | PostgreSQL 18                  |
| GUI (opt) | pgAdmin                        |

## Structure

```
dbms-crud/
├── server.js          # Express app: JSON API + static frontend
├── db.js              # pg Pool connection
├── schema.sql         # CREATE DATABASE, CREATE/ALTER TABLE, constraints, seed data
├── routes/
│   ├── patients.js    # CRUD + search
│   ├── doctors.js     # CRUD + search
│   ├── appointments.js# CRUD + search (+ JOIN for names)
│   └── reports.js     # dashboard + reports (GROUP BY, HAVING, subqueries)
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js         # fetch() CRUD calls
├── .env               # DB credentials (gitignored)
└── .env.example
```

## Prerequisites

- Node.js 20+
- PostgreSQL 18 running: `brew services start postgresql@18`
- pgAdmin (optional GUI)

## Setup

```bash
# 1. install deps
npm install

# 2. create database + load schema + seed data (re-runnable; drops tables!)
psql -d postgres -f schema.sql      # or: npm run initdb

# 3. set credentials (default works for Homebrew Postgres)
cp .env.example .env

# 4. run
npm start                           # http://localhost:3000
```

`.env`:

```
DATABASE_URL=postgresql://localhost:5432/hospital
PORT=3000
```

Homebrew Postgres has no password by default and the DB user is your macOS
username. If yours differs, use `postgresql://USER:PASSWORD@localhost:5432/hospital`.

## Database Schema

- **patients** (10 rows) — id PK, name NOT NULL, age CHECK 0–150, gender CHECK, phone UNIQUE, address
- **doctors** (6 rows) — id PK, name NOT NULL, specialty, phone UNIQUE,
  consultation_fee (added via `ALTER TABLE`, CHECK ≥ 0)
- **appointments** (15 rows) — id PK, patient_id → patients, doctor_id → doctors (both NOT NULL,
  `ON DELETE CASCADE`), appt_date NOT NULL, reason, status CHECK (scheduled/completed/cancelled),
  UNIQUE (patient_id, doctor_id, appt_date) added via `ALTER TABLE`

## API

Each entity has full CRUD:

| Method | Path                | Action   |
|--------|---------------------|----------|
| GET    | `/api/patients`     | list all |
| GET    | `/api/patients/:id` | get one  |
| POST   | `/api/patients`     | create   |
| PUT    | `/api/patients/:id` | update   |
| DELETE | `/api/patients/:id` | delete   |

Same pattern for `/api/doctors` and `/api/appointments`.
Appointment list responses include `patient_name` + `doctor_name` (SQL JOIN).
List endpoints accept `?q=` for search (`ILIKE` on names, phone, specialty, reason, status).

Reports (read-only):

| Path                                   | SQL concepts                                   |
|----------------------------------------|------------------------------------------------|
| `/api/reports/summary`                 | scalar subqueries, COUNT, GROUP BY, JOIN       |
| `/api/reports/doctor-workload?min=N`   | LEFT JOIN, GROUP BY, COUNT/SUM, HAVING         |
| `/api/reports/patients`                | NOT EXISTS subquery, AVG nested subquery       |

## pgAdmin

Connect: host `localhost`, port `5432`, database `hospital`, user = your macOS
username. Browse tables and watch rows change as the UI does CRUD.

## Verify

1. Open `http://localhost:3000` — Dashboard shows totals, status breakdown, upcoming list.
2. **Create** a patient via the form → row appears.
3. **Read** — refresh; data persists from the DB.
4. **Update** a row via Edit → values change.
5. **Delete** a row → it disappears.
6. Repeat for doctors + appointments (appointment shows joined names).
7. API check: `curl localhost:3000/api/patients` returns a JSON array.
8. Cascade: delete a patient who has appointments → their appointments vanish too.
9. Search: type in a tab's search box → table filters.
10. Reports tab: doctor workload (change "Min. appointments" to see HAVING), patients
    without appointments, patients older than average.
