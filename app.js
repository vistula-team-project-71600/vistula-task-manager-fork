let config;
let editingId = null;
let tasks = [];

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-description');
const submitBtn = document.getElementById('task-submit');
const listEl = document.getElementById('task-list');
const statusEl = document.getElementById('status-message');

function showStatus(msg) { statusEl.textContent = msg || ''; }

async function api(path, options = {}) {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${config.tableName}${path}`, {
    ...options,
    headers: {
      apikey: config.supabasePublishableKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadTasks() {
  try {
    tasks = await api('?select=*&order=id.asc');
    render();
    showStatus('');
  } catch (e) { showStatus('Could not load tasks. ' + e.message); }
}

function render() {
  listEl.innerHTML = '';
  tasks.forEach(t => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.completed ? ' done' : '');
    item.dataset.id = t.id;

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = t.title;

    const desc = document.createElement('span');
    desc.className = 'task-description';
    desc.textContent = t.description || '';

    const status = document.createElement('span');
    status.className = 'task-status';
    status.textContent = t.completed ? 'Completed' : 'Not completed';

    const toggle = document.createElement('button');
    toggle.className = 'toggle-task';
    toggle.textContent = t.completed ? 'Mark incomplete' : 'Mark complete';
    toggle.onclick = () => toggleTask(t);

    const edit = document.createElement('button');
    edit.className = 'edit-task';
    edit.textContent = 'Edit';
    edit.onclick = () => startEdit(t);

    const del = document.createElement('button');
    del.className = 'delete-task';
    del.textContent = 'Delete';
    del.onclick = () => deleteTask(t.id);

    item.append(title, desc, status, document.createElement('br'), toggle, edit, del);
    listEl.appendChild(item);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  const body = { title, description: descInput.value.trim() };
  try {
    if (editingId === null) {
      await api('', { method: 'POST', body: JSON.stringify({ ...body, completed: false }) });
    } else {
      await api(`?id=eq.${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
    }
    resetForm();
    await loadTasks();
  } catch (err) { showStatus('Could not save task. ' + err.message); }
});

function startEdit(t) {
  editingId = t.id;
  titleInput.value = t.title;
  descInput.value = t.description || '';
  submitBtn.textContent = 'Save changes';
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  submitBtn.textContent = 'Add task';
}

async function toggleTask(t) {
  try {
    await api(`?id=eq.${t.id}`, { method: 'PATCH', body: JSON.stringify({ completed: !t.completed }) });
    await loadTasks();
  } catch (err) { showStatus('Could not update status. ' + err.message); }
}

async function deleteTask(id) {
  try {
    await api(`?id=eq.${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    await loadTasks();
  } catch (err) { showStatus('Could not delete task. ' + err.message); }
}

(async function init() {
  try {
    config = await (await fetch('config.json')).json();
    await loadTasks();
  } catch (e) { showStatus('Could not load configuration. ' + e.message); }
})();
