// PostgreSQL connection pool. All routes query through here.
require('dotenv').config();
const { Pool, types } = require('pg');

// Return DATE columns as plain 'YYYY-MM-DD' strings. The default parses them
// into a local-midnight JS Date, which shifts the day when serialized to UTC.
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

// Map PG errors caused by bad client input to 4xx; everything else is a 500.
const CLIENT_ERRORS = {
  '23505': 409, // unique_violation
  '23503': 400, // foreign_key_violation
  '23502': 400, // not_null_violation
  '23514': 400, // check_violation
  '22P02': 400, // invalid_text_representation (e.g. id = 'abc')
  '22007': 400, // invalid_datetime_format
  '22008': 400, // datetime_field_overflow
  '22003': 400, // numeric_value_out_of_range
  '22001': 400, // string_data_right_truncation
};

function sendError(res, err) {
  res.status(CLIENT_ERRORS[err.code] || 500).json({ error: err.message });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  sendError,
};
