const express = require('express');
const path    = require('path');
const { read, write, initDb } = require('./db');

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== 個人タスク ==========
app.get('/api/personal-tasks', async (req, res) => {
  try {
    const { user } = req.query;
    if (!user) return res.status(400).json({ error: 'user required' });
    const tasks = await read('personal_tasks');
    res.json(tasks.filter(t => t.user_name === user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/personal-tasks', async (req, res) => {
  try {
    const tasks = await read('personal_tasks');
    tasks.push(req.body);
    await write('personal_tasks', tasks);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/personal-tasks/:id/complete', async (req, res) => {
  try {
    const tasks = await read('personal_tasks');
    const t = tasks.find(t => t.id === req.params.id);
    if (t) t.completed = true;
    await write('personal_tasks', tasks);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/personal-tasks/:id', async (req, res) => {
  try {
    const tasks = await read('personal_tasks');
    await write('personal_tasks', tasks.filter(t => t.id !== req.params.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== 委任タスク ==========
app.get('/api/delegated-tasks', async (req, res) => {
  try { res.json(await read('delegated_tasks')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/delegated-tasks', async (req, res) => {
  try {
    const tasks = await read('delegated_tasks');
    tasks.push(req.body);
    await write('delegated_tasks', tasks);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/delegated-tasks/:id/complete', async (req, res) => {
  try {
    const tasks = await read('delegated_tasks');
    const t = tasks.find(t => t.id === req.params.id);
    if (t) t.completed = true;
    await write('delegated_tasks', tasks);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/delegated-tasks/:id', async (req, res) => {
  try {
    const tasks = await read('delegated_tasks');
    await write('delegated_tasks', tasks.filter(t => t.id !== req.params.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== 院長指示 ==========
app.get('/api/director-tasks', async (req, res) => {
  try {
    const [tasks, subtasks] = await Promise.all([read('director_tasks'), read('subtasks')]);
    res.json(tasks.map(t => ({ ...t, subtasks: subtasks.filter(s => s.parent_id === t.id) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/director-tasks', async (req, res) => {
  try {
    const tasks = await read('director_tasks');
    tasks.push(req.body);
    await write('director_tasks', tasks);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/director-tasks/:id/complete', async (req, res) => {
  try {
    const tasks = await read('director_tasks');
    const t = tasks.find(t => t.id === req.params.id);
    if (t) t.completed = true;
    await write('director_tasks', tasks);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/director-tasks/:id', async (req, res) => {
  try {
    const [tasks, subs] = await Promise.all([read('director_tasks'), read('subtasks')]);
    await Promise.all([
      write('director_tasks', tasks.filter(t => t.id !== req.params.id)),
      write('subtasks', subs.filter(s => s.parent_id !== req.params.id)),
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/director-tasks/:parentId/subtasks', async (req, res) => {
  try {
    const subs = await read('subtasks');
    subs.push({ ...req.body, parent_id: req.params.parentId });
    await write('subtasks', subs);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/director-tasks/:parentId/subtasks/:subId/complete', async (req, res) => {
  try {
    const subs = await read('subtasks');
    const s = subs.find(s => s.id === req.params.subId);
    if (s) s.completed = true;
    await write('subtasks', subs);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/director-tasks/:parentId/subtasks/:subId', async (req, res) => {
  try {
    const subs = await read('subtasks');
    await write('subtasks', subs.filter(s => s.id !== req.params.subId));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== 医療券 ==========
app.get('/api/certs', async (req, res) => {
  try { res.json(await read('certs')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/certs', async (req, res) => {
  try {
    const certs = await read('certs');
    certs.push(req.body);
    await write('certs', certs);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/certs/:id/received', async (req, res) => {
  try {
    const certs = await read('certs');
    const c = certs.find(c => c.id === req.params.id);
    if (c) { c.received = true; c.received_date = new Date().toISOString().slice(0, 10); }
    await write('certs', certs);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/certs/:id', async (req, res) => {
  try {
    const certs = await read('certs');
    await write('certs', certs.filter(c => c.id !== req.params.id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== 月次完了管理 ==========
app.get('/api/monthly-completions', async (req, res) => {
  try {
    const { month } = req.query;
    const all = await read('monthly_completions');
    res.json(all.filter(r => r.month === month).map(r => r.task_id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/monthly-completions/toggle', async (req, res) => {
  try {
    const { task_id, month } = req.body;
    const all = await read('monthly_completions');
    const idx = all.findIndex(r => r.task_id === task_id && r.month === month);
    if (idx >= 0) all.splice(idx, 1);
    else all.push({ task_id, month });
    await write('monthly_completions', all);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== 起動 ==========
if (require.main === module) {
  initDb().then(() => {
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
  });
}

module.exports = app;
