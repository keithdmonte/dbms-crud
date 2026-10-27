-- Hospital Management System schema + seed data.
-- Run: psql -d postgres -f schema.sql      (or: npm run initdb)
-- Re-runnable: creates the database if missing, then drops + recreates tables.

-- DDL: CREATE DATABASE ----------------------------------------------------
-- CREATE DATABASE has no IF NOT EXISTS in PostgreSQL, so build it
-- conditionally and execute it with psql's \gexec.
SELECT 'CREATE DATABASE hospital'
 WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hospital')\gexec

\c hospital

-- Dropping in FK-safe order so the script is re-runnable.
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS doctors;

-- DDL: CREATE TABLE -------------------------------------------------------

CREATE TABLE patients (
  id      SERIAL       PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  age     INT          CHECK (age BETWEEN 0 AND 150),
  gender  VARCHAR(10)  CHECK (gender IN ('Male', 'Female', 'Other')),
  phone   VARCHAR(15)  UNIQUE,                 -- candidate key
  address VARCHAR(255)
);

CREATE TABLE doctors (
  id        SERIAL       PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  specialty VARCHAR(50),
  phone     VARCHAR(15)  UNIQUE                -- candidate key
);

CREATE TABLE appointments (
  id         SERIAL      PRIMARY KEY,
  patient_id INT         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id  INT         NOT NULL REFERENCES doctors(id)  ON DELETE CASCADE,
  appt_date  DATE        NOT NULL,
  reason     VARCHAR(255),
  status     VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

-- DDL: ALTER TABLE --------------------------------------------------------

ALTER TABLE doctors
  ADD COLUMN consultation_fee NUMERIC(8, 2) NOT NULL DEFAULT 500
             CHECK (consultation_fee >= 0);

-- A doctor cannot be booked twice by the same patient on the same day.
ALTER TABLE appointments
  ADD CONSTRAINT uq_patient_doctor_date UNIQUE (patient_id, doctor_id, appt_date);

-- DML: seed data ----------------------------------------------------------

INSERT INTO patients (name, age, gender, phone, address) VALUES
  ('Anita Rao',      34, 'Female', '9876500001', '12 MG Road, Bengaluru'),
  ('Rahul Mehta',    52, 'Male',   '9876500002', '44 Park Street, Kolkata'),
  ('Sara Khan',      27, 'Female', '9876500003', '9 Marine Drive, Mumbai'),
  ('Vikram Joshi',   61, 'Male',   '9876500004', '7 FC Road, Pune'),
  ('Neha Gupta',     19, 'Female', '9876500005', '21 Civil Lines, Jaipur'),
  ('Karan Malhotra', 45, 'Male',   '9876500006', '3 Sector 17, Chandigarh'),
  ('Fatima Sheikh',  38, 'Female', '9876500007', '58 Banjara Hills, Hyderabad'),
  ('Rohan Das',      8,  'Male',   '9876500008', '15 Salt Lake, Kolkata'),
  ('Lakshmi Pillai', 70, 'Female', '9876500009', '2 Anna Nagar, Chennai'),
  ('Aditya Verma',   29, 'Male',   '9876500010', '66 Hazratganj, Lucknow');

INSERT INTO doctors (name, specialty, phone, consultation_fee) VALUES
  ('Dr. Priya Nair',    'Cardiology',  '9811100001', 1200),
  ('Dr. Arjun Singh',   'Orthopedics', '9811100002', 900),
  ('Dr. Meera Iyer',    'Dermatology', '9811100003', 700),
  ('Dr. Sameer Kulkarni','Pediatrics', '9811100004', 600),
  ('Dr. Kavita Reddy',  'Neurology',   '9811100005', 1500),
  ('Dr. Imran Qureshi', 'General Medicine', '9811100006', 400);

INSERT INTO appointments (patient_id, doctor_id, appt_date, reason, status) VALUES
  (1, 1, '2026-09-25', 'Chest pain follow-up',     'completed'),
  (2, 2, '2026-09-26', 'Knee X-ray review',        'completed'),
  (3, 3, '2026-09-27', 'Skin rash consult',        'completed'),
  (4, 1, '2026-10-02', 'ECG and BP check',         'completed'),
  (8, 4, '2026-10-05', 'Fever and cough',          'completed'),
  (6, 6, '2026-10-08', 'Annual health check',      'completed'),
  (9, 5, '2026-10-10', 'Migraine evaluation',      'cancelled'),
  (2, 1, '2026-10-14', 'Palpitations',             'completed'),
  (7, 3, '2026-10-18', 'Acne treatment',           'completed'),
  (4, 2, '2026-10-21', 'Back pain',                'cancelled'),
  (1, 1, '2026-10-28', 'Medication review',        'scheduled'),
  (9, 5, '2026-10-30', 'Migraine follow-up',       'scheduled'),
  (8, 4, '2026-11-02', 'Vaccination',              'scheduled'),
  (6, 2, '2026-11-04', 'Shoulder stiffness',       'scheduled'),
  (7, 6, '2026-11-06', 'Blood test results',       'scheduled');

-- Patients 5 (Neha) and 10 (Aditya) intentionally have no appointments,
-- so the "patients without appointments" report has rows to show.
