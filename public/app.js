// Frontend CRUD logic. Talks to the Express API via fetch().

// ---- helpers ------------------------------------------------------------

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = isError ? 'show error' : 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 2200);
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formToObject(form) {
  const obj = {};
  new FormData(form).forEach((v, k) => { obj[k] = v === '' ? null : v; });
  return obj;
}

// ---- tab switching ------------------------------------------------------

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    // Refresh views that depend on data changed in other tabs
    // (e.g. deleting a patient cascades to their appointments).
    if (btn.dataset.tab === 'dashboard') loadDashboard();
    if (btn.dataset.tab === 'reports') loadReports();
    if (btn.dataset.tab === 'patients') patients.load();
    if (btn.dataset.tab === 'doctors') doctors.load();
    if (btn.dataset.tab === 'appointments') {
      appointments.load();
      fillAppointmentSelects();
    }
  });
});

// Fill a read-only table body from rows; cells(row) returns the cell values.
function fillTable(sel, rows, cells, colspan) {
  const tbody = document.querySelector(`${sel} tbody`);
  tbody.innerHTML = rows.length
    ? rows.map((r) => `<tr>${cells(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
    : `<tr><td class="empty" colspan="${colspan}">No records.</td></tr>`;
}

// ---- generic entity controller -----------------------------------------

function makeEntity({ name, formId, tbodySel, columns, toForm }) {
  const form = document.getElementById(formId);
  const tbody = document.querySelector(tbodySel);
  const search = document.querySelector(`[data-search="${name}"]`);

  async function load() {
    try {
      const q = search.value.trim();
      const rows = await api(`/${name}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      render(rows);
      return rows;
    } catch (err) {
      toast(err.message, true);
      return [];
    }
  }

  function render(rows) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td class="empty" colspan="${columns.length + 2}">No matching records.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.id}</td>
        ${columns.map((c) => `<td>${esc(c.get ? c.get(r) : r[c.key])}</td>`).join('')}
        <td>
          <button class="row-btn btn-edit" data-edit="${r.id}">Edit</button>
          <button class="row-btn btn-delete" data-del="${r.id}">Delete</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        const row = rows.find((x) => String(x.id) === b.dataset.edit);
        toForm(form, row);
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));

    tbody.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => remove(b.dataset.del)));
  }

  async function remove(id) {
    if (!confirm('Delete this record?')) return;
    try {
      await api(`/${name}/${id}`, { method: 'DELETE' });
      toast('Deleted');
      if (form.id.value === id) clearForm();
      await load();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // form.reset() does not clear hidden inputs (assigning .value to a hidden
  // input sets its default), so clear the id explicitly or the next "create"
  // would update the previously edited record.
  function clearForm() {
    form.reset();
    form.id.value = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = formToObject(form);
    const id = body.id;
    delete body.id;
    try {
      if (id) {
        await api(`/${name}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Updated');
      } else {
        await api(`/${name}`, { method: 'POST', body: JSON.stringify(body) });
        toast('Created');
      }
      clearForm();
      await load();
    } catch (err) {
      toast(err.message, true);
    }
  });

  form.querySelector('[data-reset]').addEventListener('click', clearForm);

  let searchTimer;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 250);
  });

  return { load, form };
}

// ---- entity definitions -------------------------------------------------

const patients = makeEntity({
  name: 'patients',
  formId: 'patient-form',
  tbodySel: '#patients-table tbody',
  columns: [
    { key: 'name' }, { key: 'age' }, { key: 'gender' },
    { key: 'phone' }, { key: 'address' },
  ],
  toForm: (form, r) => {
    form.id.value = r.id;
    form.name.value = r.name ?? '';
    form.age.value = r.age ?? '';
    form.gender.value = r.gender ?? '';
    form.phone.value = r.phone ?? '';
    form.address.value = r.address ?? '';
  },
});

const doctors = makeEntity({
  name: 'doctors',
  formId: 'doctor-form',
  tbodySel: '#doctors-table tbody',
  columns: [{ key: 'name' }, { key: 'specialty' }, { key: 'phone' }, { key: 'consultation_fee' }],
  toForm: (form, r) => {
    form.id.value = r.id;
    form.name.value = r.name ?? '';
    form.specialty.value = r.specialty ?? '';
    form.phone.value = r.phone ?? '';
    form.consultation_fee.value = r.consultation_fee ?? '';
  },
});

const appointments = makeEntity({
  name: 'appointments',
  formId: 'appointment-form',
  tbodySel: '#appointments-table tbody',
  columns: [
    { key: 'patient_name' },
    { key: 'doctor_name' },
    { get: (r) => (r.appt_date ? r.appt_date.slice(0, 10) : '') },
    { key: 'reason' },
    { key: 'status' },
  ],
  toForm: (form, r) => {
    form.id.value = r.id;
    form.patient_id.value = r.patient_id ?? '';
    form.doctor_id.value = r.doctor_id ?? '';
    form.appt_date.value = r.appt_date ? r.appt_date.slice(0, 10) : '';
    form.reason.value = r.reason ?? '';
    form.status.value = r.status ?? 'scheduled';
  },
});

// Populate appointment dropdowns from patients + doctors.
async function fillAppointmentSelects() {
  try {
    const [ps, ds] = await Promise.all([api('/patients'), api('/doctors')]);
    const pSel = appointments.form.patient_id;
    const dSel = appointments.form.doctor_id;
    pSel.innerHTML = '<option value="">Patient *</option>' +
      ps.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    dSel.innerHTML = '<option value="">Doctor *</option>' +
      ds.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  } catch (err) {
    toast(err.message, true);
  }
}

// ---- dashboard ----------------------------------------------------------

async function loadDashboard() {
  try {
    const { totals, byStatus, upcoming } = await api('/reports/summary');
    document.getElementById('stats').innerHTML = [
      ['Patients', totals.patients],
      ['Doctors', totals.doctors],
      ['Appointments', totals.appointments],
      ['Upcoming', totals.upcoming],
    ].map(([label, value]) =>
      `<div class="stat"><div class="value">${value}</div><div class="label">${label}</div></div>`).join('');
    fillTable('#status-table', byStatus, (r) => [r.status, r.count], 2);
    fillTable('#upcoming-table', upcoming,
      (r) => [r.appt_date, r.patient_name, r.doctor_name, r.reason], 4);
  } catch (err) {
    toast(err.message, true);
  }
}

// ---- reports ------------------------------------------------------------

const workloadMin = document.getElementById('workload-min');

async function loadReports() {
  try {
    const [workload, pats] = await Promise.all([
      api(`/reports/doctor-workload?min=${encodeURIComponent(workloadMin.value || 0)}`),
      api('/reports/patients'),
    ]);
    fillTable('#workload-table', workload, (r) => [
      r.name, r.specialty, r.consultation_fee, r.total,
      r.completed, r.scheduled, r.cancelled, r.revenue,
    ], 8);
    fillTable('#inactive-table', pats.inactive, (r) => [r.name, r.age, r.phone], 3);
    fillTable('#above-avg-table', pats.aboveAvg, (r) => [r.name, r.age], 2);
    document.getElementById('avg-age').textContent =
      pats.aboveAvg.length ? `(avg ${pats.aboveAvg[0].avg_age})` : '';
  } catch (err) {
    toast(err.message, true);
  }
}

workloadMin.addEventListener('input', loadReports);

// ---- boot ---------------------------------------------------------------

async function init() {
  await Promise.all([patients.load(), doctors.load(), appointments.load(), loadDashboard()]);
  await fillAppointmentSelects();
}

init();
