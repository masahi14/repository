const express = require('express');
const path    = require('path');
const { read, write } = require('./db');

const app  = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== 個人タスク ==========
app.get('/api/personal-tasks', (req, res) => {
  const { user } = req.query;
  if (!user) return res.status(400).json({ error: 'user required' });
  const tasks = read('personal_tasks').filter(t => t.user_name === user);
  res.json(tasks);
});

app.post('/api/personal-tasks', (req, res) => {
  const tasks = read('personal_tasks');
  tasks.push(req.body);
  write('personal_tasks', tasks);
  res.json({ ok: true });
});

app.patch('/api/personal-tasks/:id/complete', (req, res) => {
  const tasks = read('personal_tasks');
  const t = tasks.find(t => t.id === req.params.id);
  if (t) t.completed = true;
  write('personal_tasks', tasks);
  res.json({ ok: true });
});

app.delete('/api/personal-tasks/:id', (req, res) => {
  write('personal_tasks', read('personal_tasks').filter(t => t.id !== req.params.id));
  res.json({ ok: true });
});

// ========== 委任タスク ==========
app.get('/api/delegated-tasks', (req, res) => {
  res.json(read('delegated_tasks'));
});

app.post('/api/delegated-tasks', (req, res) => {
  const tasks = read('delegated_tasks');
  tasks.push(req.body);
  write('delegated_tasks', tasks);
  res.json({ ok: true });
});

app.patch('/api/delegated-tasks/:id/complete', (req, res) => {
  const tasks = read('delegated_tasks');
  const t = tasks.find(t => t.id === req.params.id);
  if (t) t.completed = true;
  write('delegated_tasks', tasks);
  res.json({ ok: true });
});

app.delete('/api/delegated-tasks/:id', (req, res) => {
  write('delegated_tasks', read('delegated_tasks').filter(t => t.id !== req.params.id));
  res.json({ ok: true });
});

// ========== 院長指示 ==========
app.get('/api/director-tasks', (req, res) => {
  const tasks    = read('director_tasks');
  const subtasks = read('subtasks');
  res.json(tasks.map(t => ({
    ...t,
    subtasks: subtasks.filter(s => s.parent_id === t.id),
  })));
});

app.post('/api/director-tasks', (req, res) => {
  const tasks = read('director_tasks');
  tasks.push(req.body);
  write('director_tasks', tasks);
  res.json({ ok: true });
});

app.patch('/api/director-tasks/:id/complete', (req, res) => {
  const tasks = read('director_tasks');
  const t = tasks.find(t => t.id === req.params.id);
  if (t) t.completed = true;
  write('director_tasks', tasks);
  res.json({ ok: true });
});

app.delete('/api/director-tasks/:id', (req, res) => {
  write('director_tasks', read('director_tasks').filter(t => t.id !== req.params.id));
  write('subtasks',       read('subtasks').filter(s => s.parent_id !== req.params.id));
  res.json({ ok: true });
});

app.post('/api/director-tasks/:parentId/subtasks', (req, res) => {
  const subs = read('subtasks');
  subs.push({ ...req.body, parent_id: req.params.parentId });
  write('subtasks', subs);
  res.json({ ok: true });
});

app.patch('/api/director-tasks/:parentId/subtasks/:subId/complete', (req, res) => {
  const subs = read('subtasks');
  const s = subs.find(s => s.id === req.params.subId);
  if (s) s.completed = true;
  write('subtasks', subs);
  res.json({ ok: true });
});

app.delete('/api/director-tasks/:parentId/subtasks/:subId', (req, res) => {
  write('subtasks', read('subtasks').filter(s => s.id !== req.params.subId));
  res.json({ ok: true });
});

// ========== 医療券 ==========
app.get('/api/certs', (req, res) => {
  res.json(read('certs'));
});

app.post('/api/certs', (req, res) => {
  const certs = read('certs');
  certs.push(req.body);
  write('certs', certs);
  res.json({ ok: true });
});

app.patch('/api/certs/:id/received', (req, res) => {
  const certs = read('certs');
  const c = certs.find(c => c.id === req.params.id);
  if (c) { c.received = true; c.received_date = new Date().toISOString().slice(0, 10); }
  write('certs', certs);
  res.json({ ok: true });
});

app.delete('/api/certs/:id', (req, res) => {
  write('certs', read('certs').filter(c => c.id !== req.params.id));
  res.json({ ok: true });
});

// ========== 月次完了管理 ==========
app.get('/api/monthly-completions', (req, res) => {
  const { month } = req.query;
  const all = read('monthly_completions');
  res.json(all.filter(r => r.month === month).map(r => r.task_id));
});

app.post('/api/monthly-completions/toggle', (req, res) => {
  const { task_id, month } = req.body;
  let all = read('monthly_completions');
  const idx = all.findIndex(r => r.task_id === task_id && r.month === month);
  if (idx >= 0) all.splice(idx, 1);
  else all.push({ task_id, month });
  write('monthly_completions', all);
  res.json({ ok: true });
});

// ========== 起動 ==========
app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  let localIP = 'このPCのIPアドレス';
  for (const iface of Object.values(networkInterfaces())) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log('========================================');
  console.log('  松信業務管理 サーバー起動中');
  console.log('========================================');
  console.log(`  このPC:   http://localhost:${PORT}`);
  console.log(`  他のPC:   http://${localIP}:${PORT}`);
  console.log('  終了: Ctrl + C');
  console.log('========================================');
});
