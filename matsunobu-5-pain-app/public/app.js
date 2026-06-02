// ========== 状態管理 ==========
let currentUser = null;
const PANE_COUNT = 5;

// ========== スタッフリスト ==========
const STAFF_LIST = [
  '篠田','石山','菅谷','東郷','溝口','橋本','藤','ゆきな','宮内','松信',
  '横瀬','白田','箕輪','深沢','仙波','郡司','日向寺','飯田','篠原','澤野',
  '前野','小林','浅井','諸谷',
];

// ========== APIヘルパー ==========
const api = {
  get:   url       => fetch(url).then(r => r.json()),
  post:  (url, d)  => fetch(url, { method:'POST',  headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }).then(r => r.json()),
  patch: url       => fetch(url, { method:'PATCH'  }).then(r => r.json()),
  del:   url       => fetch(url, { method:'DELETE' }).then(r => r.json()),
};

// ========== 共通ユーティリティ ==========
function getDeadlineSignal(task) {
  if (task.completed || task.received) return 'done';
  if (!task.deadline) return 'green';
  const daysLeft = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'black';
  if (task.red_days    != null && daysLeft <= task.red_days)    return 'red';
  if (task.yellow_days != null && daysLeft <= task.yellow_days) return 'yellow';
  return 'green';
}

function getCertSignal(cert) {
  if (cert.received) return 'done';
  if (!cert.deadline) return 'green';
  const daysLeft = Math.ceil((new Date(cert.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'black';
  if (cert.red_days    != null && daysLeft <= cert.red_days)    return 'red';
  if (cert.yellow_days != null && daysLeft <= cert.yellow_days) return 'yellow';
  return 'green';
}

const SIGNAL_LABEL = { green:'🟢', yellow:'🟡', red:'🔴', black:'⚫', done:'✅' };
const SIGNAL_ORDER = { black:0, red:1, yellow:2, green:3, done:4 };

function daysLeftText(deadline) {
  return `残り${Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))}日`;
}

function getMonthlyKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

// ========== 個人タスク（ペイン1）==========
async function renderPersonalTasks() {
  const container = document.getElementById('pane-1-content');
  if (!container || !currentUser) return;

  const tasks = await api.get(`/api/personal-tasks?user=${encodeURIComponent(currentUser.name)}`);
  const sorted = [...tasks].sort((a,b) => (SIGNAL_ORDER[getDeadlineSignal(a)]??5) - (SIGNAL_ORDER[getDeadlineSignal(b)]??5));

  if (sorted.length === 0) { container.innerHTML = '<div class="empty-msg">タスクはありません</div>'; return; }

  container.innerHTML = sorted.map(task => {
    const sig = getDeadlineSignal(task);
    const isDone = sig === 'done';
    const meta = isDone ? '完了済'
      : task.deadline ? `期限: ${task.deadline} ｜ ${daysLeftText(task.deadline)}`
      : `作成: ${task.created_date}`;
    return `
      <div class="task-card signal-${sig}">
        <div class="task-signal">${SIGNAL_LABEL[sig]}</div>
        <div class="task-body">
          <div class="task-title ${isDone?'task-done-text':''}">${task.name}</div>
          <div class="task-meta">${meta}</div>
          ${task.description ? `<div class="task-deadline-label">${task.description}</div>` : ''}
        </div>
        <div class="task-actions">
          ${isDone
            ? `<button class="delete-btn"   onclick="deletePersonalTask('${task.id}')">🗑</button>`
            : `<button class="complete-btn" onclick="completePersonalTask('${task.id}')">✓</button>`}
        </div>
      </div>`;
  }).join('');
}

async function completePersonalTask(id) {
  await api.patch(`/api/personal-tasks/${id}/complete`);
  renderPersonalTasks();
}
async function deletePersonalTask(id) {
  await api.del(`/api/personal-tasks/${id}`);
  renderPersonalTasks();
}

// ========== 委任タスク（ペイン2）==========
async function renderDelegatedTasks() {
  const container = document.getElementById('pane-2-content');
  if (!container) return;

  const tasks = await api.get('/api/delegated-tasks');
  const sorted = [...tasks].sort((a,b) => (SIGNAL_ORDER[getDeadlineSignal(a)]??5) - (SIGNAL_ORDER[getDeadlineSignal(b)]??5));

  if (sorted.length === 0) { container.innerHTML = '<div class="empty-msg">委任タスクはありません</div>'; return; }

  container.innerHTML = sorted.map(task => {
    const sig = getDeadlineSignal(task);
    const isDone = sig === 'done';
    const astr = task.assignees?.length ? `→ ${task.assignees.join('・')}` : '';
    const meta = isDone
      ? `完了済${astr ? ' ｜ '+astr : ''}`
      : task.deadline
        ? `期限: ${task.deadline}${astr?' ｜ '+astr:''} ｜ ${daysLeftText(task.deadline)}`
        : astr || `作成: ${task.created_date}`;
    return `
      <div class="task-card signal-${sig}">
        <div class="task-signal">${SIGNAL_LABEL[sig]}</div>
        <div class="task-body">
          <div class="task-title ${isDone?'task-done-text':''}">${task.name}</div>
          <div class="task-meta">${meta}</div>
          ${task.description ? `<div class="task-deadline-label">${task.description}</div>` : ''}
        </div>
        <div class="task-actions">
          ${isDone
            ? `<button class="delete-btn"   onclick="deleteDelegatedTask('${task.id}')">🗑</button>`
            : `<button class="complete-btn" onclick="completeDelegatedTask('${task.id}')">✓</button>`}
        </div>
      </div>`;
  }).join('');
}

async function completeDelegatedTask(id) {
  await api.patch(`/api/delegated-tasks/${id}/complete`);
  renderDelegatedTasks();
}
async function deleteDelegatedTask(id) {
  await api.del(`/api/delegated-tasks/${id}`);
  renderDelegatedTasks();
}

// ========== 院長指示（ペイン3）==========
async function renderDirectorTasks() {
  const container = document.getElementById('pane-3-content');
  if (!container) return;

  const tasks = await api.get('/api/director-tasks');
  const sorted = [...tasks].sort((a,b) => (SIGNAL_ORDER[getDeadlineSignal(a)]??5) - (SIGNAL_ORDER[getDeadlineSignal(b)]??5));

  if (sorted.length === 0) { container.innerHTML = '<div class="empty-msg">院長指示はありません</div>'; return; }

  let html = '';
  sorted.forEach(task => {
    const sig = getDeadlineSignal(task);
    const isDone = sig === 'done';
    const astr = task.assignees?.length ? `→ ${task.assignees.join('・')}` : '';
    const meta = isDone
      ? `完了済${astr?' ｜ '+astr:''}`
      : task.deadline
        ? `期限: ${task.deadline}${astr?' ｜ '+astr:''} ｜ ${daysLeftText(task.deadline)}`
        : `院長指示${astr?' ｜ '+astr:''}`;

    html += `
      <div class="task-card signal-${sig}">
        <div class="task-signal">${SIGNAL_LABEL[sig]}</div>
        <div class="task-body">
          <div class="task-title ${isDone?'task-done-text':''}">${task.name}</div>
          <div class="task-meta">${meta}</div>
          ${task.description ? `<div class="task-deadline-label">${task.description}</div>` : ''}
        </div>
        <div class="task-actions">
          ${!isDone ? `<button class="sub-add-btn" onclick="openSubtaskModal('${task.id}')" title="サブタスク追加">＋</button>` : ''}
          ${isDone
            ? `<button class="delete-btn"   onclick="deleteDirectorTask('${task.id}')">🗑</button>`
            : `<button class="complete-btn" onclick="completeDirectorTask('${task.id}')">✓</button>`}
        </div>
      </div>`;

    (task.subtasks || []).forEach(sub => {
      const ss = getDeadlineSignal(sub);
      const sd = ss === 'done';
      const sa = sub.assignees?.length ? `→ ${sub.assignees.join('・')}` : '';
      const sm = sd
        ? `完了済${sa?' ｜ '+sa:''}`
        : sub.deadline
          ? `期限: ${sub.deadline}${sa?' ｜ '+sa:''} ｜ ${daysLeftText(sub.deadline)}`
          : sa;
      html += `
        <div class="task-card subtask signal-${ss}">
          <div class="task-signal">${SIGNAL_LABEL[ss]}</div>
          <div class="task-body">
            <div class="task-title ${sd?'task-done-text':''}">└ ${sub.name}</div>
            <div class="task-meta">${sm}</div>
          </div>
          <div class="task-actions">
            ${sd
              ? `<button class="delete-btn"   onclick="deleteSubtask('${task.id}','${sub.id}')">🗑</button>`
              : `<button class="complete-btn" onclick="completeSubtask('${task.id}','${sub.id}')">✓</button>`}
          </div>
        </div>`;
    });
  });
  container.innerHTML = html;
}

async function completeDirectorTask(id) {
  await api.patch(`/api/director-tasks/${id}/complete`);
  renderDirectorTasks();
}
async function deleteDirectorTask(id) {
  await api.del(`/api/director-tasks/${id}`);
  renderDirectorTasks();
}
async function completeSubtask(parentId, subId) {
  await api.patch(`/api/director-tasks/${parentId}/subtasks/${subId}/complete`);
  renderDirectorTasks();
}
async function deleteSubtask(parentId, subId) {
  await api.del(`/api/director-tasks/${parentId}/subtasks/${subId}`);
  renderDirectorTasks();
}

function openSubtaskModal(parentId) {
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = 'サブタスクを追加';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label>サブタスク内容 <span style="color:#E53935">*</span></label>
      <input type="text" id="f-title" placeholder="例: 関連資料の収集">
    </div>
    <div class="form-group">
      <label>担当者（複数選択可）</label>
      ${staffCheckboxGrid()}
    </div>
    <div class="form-group">
      <label>期限</label>
      <input type="date" id="f-deadline">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>黄色にする日数</label>
        <input type="number" id="f-yellow" value="3" min="0">
        <div class="form-hint">期限の何日前から</div>
      </div>
      <div class="form-group">
        <label>赤にする日数</label>
        <input type="number" id="f-red" value="1" min="0">
        <div class="form-hint">期限の何日前から</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">キャンセル</button>
      <button class="btn-primary" onclick="saveSubtask('${parentId}')">追加する</button>
    </div>`;
  modal.classList.remove('hidden');
}

async function saveSubtask(parentId) {
  const title = document.getElementById('f-title')?.value.trim();
  if (!title) { alert('サブタスク内容を入力してください'); return; }
  const deadline   = document.getElementById('f-deadline')?.value || null;
  const yellowDays = parseInt(document.getElementById('f-yellow')?.value) || null;
  const redDays    = parseInt(document.getElementById('f-red')?.value) || null;
  const assignees  = [...document.querySelectorAll('input[name="assignee"]:checked')].map(cb => cb.value);

  await api.post(`/api/director-tasks/${parentId}/subtasks`, {
    id: 'dst_' + Date.now(), name: title, deadline,
    yellow_days: yellowDays, red_days: redDays, assignees,
  });
  renderDirectorTasks();
  closeModal();
}

// ========== 医療券（ペイン4）==========
async function renderCerts() {
  const container = document.getElementById('pane-4-content');
  if (!container) return;

  const certs = await api.get('/api/certs');
  const sorted = [...certs].sort((a,b) => (SIGNAL_ORDER[getCertSignal(a)]??5) - (SIGNAL_ORDER[getCertSignal(b)]??5));

  if (sorted.length === 0) { container.innerHTML = '<div class="empty-msg">医療券はありません</div>'; return; }

  container.innerHTML = sorted.map(cert => {
    const sig = getCertSignal(cert);
    const isDone = sig === 'done';
    const meta = isDone
      ? `到着済: ${cert.received_date}`
      : cert.deadline
        ? `期限: ${cert.deadline} ｜ ${daysLeftText(cert.deadline)} ｜ <span class="not-received">未到着</span>`
        : '<span class="not-received">未到着</span>';
    return `
      <div class="cert-card signal-${sig}">
        <div class="cert-signal">${SIGNAL_LABEL[sig]}</div>
        <div class="cert-body">
          <div class="cert-id">ID: ${cert.patient_id}</div>
          <div class="cert-type ${isDone?'task-done-text':''}">${cert.cert_type}</div>
          <div class="cert-meta">${meta}${cert.notes ? ` ｜ ${cert.notes}` : ''}</div>
        </div>
        <div class="cert-actions">
          ${isDone
            ? `<button class="delete-btn"  onclick="deleteCert('${cert.id}')">🗑</button>`
            : `<button class="received-btn" onclick="markCertReceived('${cert.id}')">到着✓</button>`}
        </div>
      </div>`;
  }).join('');
}

async function markCertReceived(id) {
  await api.patch(`/api/certs/${id}/received`);
  renderCerts();
}
async function deleteCert(id) {
  await api.del(`/api/certs/${id}`);
  renderCerts();
}

// ========== 月次定期タスク ==========
const MONTHLY_TASKS = [
  { id:'mt1',  name:'訪問請求書',                            deadline_day:14, yellow_day:1,  red_day:11 },
  { id:'mt2',  name:'訪問領収書',                            deadline_day:19, yellow_day:19, red_day:23 },
  { id:'mt3',  name:'ダウンロード領収書',                    deadline_day:25, yellow_day:1,  red_day:7  },
  { id:'mt4',  name:'カード3社明細書調べ',                   deadline_day:15, yellow_day:5,  red_day:10 },
  { id:'mt5',  name:'KO・ヘンリー・向後etc 請求書Scan+mail', deadline_day:15, yellow_day:5,  red_day:10 },
  { id:'mt6',  name:'レセプト：オンラインダウンロード',      deadline_day:null, yellow_day:null, red_day:5 },
  { id:'mt7',  name:'保険種別・振込 Scan+mail',              deadline_day:15, yellow_day:10, red_day:15 },
  { id:'mt8',  name:'介護請求',                              deadline_day:8,  yellow_day:5,  red_day:7  },
  { id:'mt9',  name:'国保・社保レセプト',                    deadline_day:9,  yellow_day:6,  red_day:8  },
  { id:'mt10', name:'市の歯周病検診請求',                    deadline_day:8,  yellow_day:1,  red_day:5  },
];

async function renderMonthlyTasks() {
  const container = document.getElementById('pane-5-content');
  if (!container) return;

  const now = new Date();
  const monthKey = getMonthlyKey();
  const completedList = await api.get(`/api/monthly-completions?month=${monthKey}`);

  function sig(task) {
    if (completedList.includes(task.id)) return 'done';
    const d = now.getDate();
    if (task.deadline_day && d > task.deadline_day) return 'black';
    if (task.red_day    && d >= task.red_day)    return 'red';
    if (task.yellow_day && d >= task.yellow_day) return 'yellow';
    return 'green';
  }

  const signalDeadline = { green:'余裕あり', yellow:'注意', red:'至急', black:'期限超過', done:'完了済' };
  const sorted = [...MONTHLY_TASKS].sort((a,b) => (SIGNAL_ORDER[sig(a)]??5) - (SIGNAL_ORDER[sig(b)]??5));

  container.innerHTML = `
    <div class="month-header">${now.getFullYear()}年 ${now.getMonth()+1}月 （本日 ${now.getDate()}日）</div>
    ${sorted.map(task => {
      const s = sig(task);
      const isDone = s === 'done';
      const deadlineText = task.deadline_day ? `期限: 毎月${task.deadline_day}日` : '期限: なし';
      const signalText = [];
      if (task.yellow_day) signalText.push(`🟡${task.yellow_day}日〜`);
      if (task.red_day)    signalText.push(`🔴${task.red_day}日〜`);
      return `
        <div class="monthly-task-card signal-${s}">
          <div class="task-signal">${SIGNAL_LABEL[s]}</div>
          <div class="task-body">
            <div class="task-title ${isDone?'task-done-text':''}">${task.name}</div>
            <div class="task-meta">${deadlineText} ｜ ${signalText.join(' ')}</div>
            <div class="task-deadline-label">${signalDeadline[s]}</div>
          </div>
          <div class="task-actions">
            ${isDone
              ? `<button class="delete-btn"   onclick="toggleMonthlyComplete('${task.id}')">戻す</button>`
              : `<button class="complete-btn" onclick="toggleMonthlyComplete('${task.id}')">✓</button>`}
          </div>
        </div>`;
    }).join('')}`;
}

async function toggleMonthlyComplete(taskId) {
  await api.post('/api/monthly-completions/toggle', { task_id: taskId, month: getMonthlyKey() });
  renderMonthlyTasks();
}

// ========== 初期化 ==========
window.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  setupResizeHandles();
  restorePaneState();
});

async function renderAll() {
  await Promise.all([
    renderPersonalTasks(),
    renderDelegatedTasks(),
    renderDirectorTasks(),
    renderCerts(),
    renderMonthlyTasks(),
  ]);
}

// ========== ログイン ==========
function loadUsers() {
  const list = document.getElementById('user-list');
  list.innerHTML = '';
  STAFF_LIST.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'user-btn';
    btn.textContent = name;
    btn.onclick = () => login(name);
    list.appendChild(btn);
  });
}

function login(name) {
  currentUser = { name };
  document.getElementById('current-user-name').textContent = name;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderAll();
}

function logout() {
  currentUser = null;
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function addUser() {
  const input = document.getElementById('new-user-input');
  const name = input.value.trim();
  if (!name) return;
  const list = document.getElementById('user-list');
  const btn = document.createElement('button');
  btn.className = 'user-btn';
  btn.textContent = name;
  btn.onclick = () => login(name);
  list.appendChild(btn);
  input.value = '';
}

// ========== ペイン表示切り替え ==========
function togglePane(paneNum) {
  const pane = document.getElementById(`pane-${paneNum}`);
  const btn  = document.querySelector(`.toggle-btn[data-pane="${paneNum}"]`);
  const isCollapsed = pane.classList.contains('collapsed');
  if (isCollapsed) {
    pane.classList.remove('collapsed');
    pane.style.flex = '1';
    btn.classList.add('active');
  } else {
    pane.classList.add('collapsed');
    pane.style.flex = '0 0 48px';
    btn.classList.remove('active');
  }
  savePaneState();
}

function savePaneState() {
  const state = {};
  for (let i = 1; i <= PANE_COUNT; i++) {
    state[i] = !document.getElementById(`pane-${i}`).classList.contains('collapsed');
  }
  localStorage.setItem('pane-visible', JSON.stringify(state));
}

function restorePaneState() {
  const saved = localStorage.getItem('pane-visible');
  if (!saved) return;
  const state = JSON.parse(saved);
  for (let i = 1; i <= PANE_COUNT; i++) {
    if (state[i] === false) {
      const pane = document.getElementById(`pane-${i}`);
      const btn  = document.querySelector(`.toggle-btn[data-pane="${i}"]`);
      pane.classList.add('collapsed');
      pane.style.flex = '0 0 48px';
      btn.classList.remove('active');
    }
  }
}

// ========== リサイズハンドル ==========
function setupResizeHandles() {
  [
    { id:'handle-1-2', left:'pane-1', right:'pane-2' },
    { id:'handle-2-3', left:'pane-2', right:'pane-3' },
    { id:'handle-3-4', left:'pane-3', right:'pane-4' },
    { id:'handle-4-5', left:'pane-4', right:'pane-5' },
  ].forEach(({ id, left, right }) => {
    const handle    = document.getElementById(id);
    const leftPane  = document.getElementById(left);
    const rightPane = document.getElementById(right);
    let startX, startL, startR;

    handle.addEventListener('mousedown', e => {
      startX = e.clientX;
      startL = leftPane.getBoundingClientRect().width;
      startR = rightPane.getBoundingClientRect().width;
      handle.classList.add('dragging');

      const onMove = e => {
        const dx = e.clientX - startX;
        leftPane.style.flex  = `0 0 ${Math.max(48, startL+dx)}px`;
        rightPane.style.flex = `0 0 ${Math.max(48, startR-dx)}px`;
      };
      const onUp = () => {
        handle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',  onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
      e.preventDefault();
    });
  });
}

// ========== モーダル ==========
function staffCheckboxGrid() {
  return `<div class="staff-checkbox-grid">
    ${STAFF_LIST.map(name => `
      <label class="staff-checkbox-item">
        <input type="checkbox" name="assignee" value="${name}">
        <span>${name}</span>
      </label>`).join('')}
  </div>`;
}

function taskFormHTML(type) {
  const assigneeField = type !== 'personal' ? `
    <div class="form-group">
      <label>${type === 'director' ? '担当者（院長から誰へ）' : '担当者（複数選択可）'}</label>
      ${staffCheckboxGrid()}
    </div>` : '';
  return `
    <div class="form-group">
      <label>タスク内容 <span style="color:#E53935">*</span></label>
      <input type="text" id="f-title" placeholder="例: MRC評価・訪問カルテ記載など">
    </div>
    <div class="form-group">
      <label>メモ</label>
      <textarea id="f-desc" rows="2" placeholder="補足があれば"></textarea>
    </div>
    ${assigneeField}
    <div class="form-group">
      <label>期限</label>
      <input type="date" id="f-deadline">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>黄色にする日数</label>
        <input type="number" id="f-yellow" value="3" min="0">
        <div class="form-hint">期限の何日前から</div>
      </div>
      <div class="form-group">
        <label>赤にする日数</label>
        <input type="number" id="f-red" value="1" min="0">
        <div class="form-hint">期限の何日前から</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">キャンセル</button>
      <button class="btn-primary" onclick="saveTask('${type}')">追加する</button>
    </div>`;
}

function openTaskModal(type) {
  const labels = { personal:'自分のタスクを追加', delegated:'委任タスクを追加', director:'院長指示を追加' };
  document.getElementById('modal-title').textContent = labels[type] || 'タスクを追加';
  document.getElementById('modal-body').innerHTML = taskFormHTML(type);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function openCertModal() {
  document.getElementById('modal-title').textContent = '医療券を追加';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label>患者ID <span style="color:#E53935">*</span></label>
      <input type="text" id="f-pid" placeholder="例: 10045">
    </div>
    <div class="form-group">
      <label>種類</label>
      <select id="f-ctype">
        <option>医療券</option>
        <option>生活保護 医療券</option>
        <option>介護保険証</option>
        <option>その他</option>
      </select>
    </div>
    <div class="form-group">
      <label>到着期限</label>
      <input type="date" id="f-deadline">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>黄色にする日数</label>
        <input type="number" id="f-yellow" value="7" min="0">
      </div>
      <div class="form-group">
        <label>赤にする日数</label>
        <input type="number" id="f-red" value="3" min="0">
      </div>
    </div>
    <div class="form-group">
      <label>メモ</label>
      <input type="text" id="f-notes" placeholder="備考">
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">キャンセル</button>
      <button class="btn-primary" onclick="saveCert()">追加する</button>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function openEventModal() {
  document.getElementById('modal-title').textContent = '月次タスクを追加';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label>タスク名 <span style="color:#E53935">*</span></label>
      <input type="text" id="f-title" placeholder="例: ○○請求">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>期限（毎月何日）</label>
        <input type="number" id="f-deadline-day" min="1" max="31" placeholder="例: 14">
        <div class="form-hint">なければ空欄</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>黄色になる日</label>
        <input type="number" id="f-yellow-day" min="1" max="31" placeholder="例: 1">
      </div>
      <div class="form-group">
        <label>赤になる日</label>
        <input type="number" id="f-red-day" min="1" max="31" placeholder="例: 7">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">キャンセル</button>
      <button class="btn-primary" onclick="saveMonthlyTask()">追加する</button>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function saveMonthlyTask() {
  const name = document.getElementById('f-title')?.value.trim();
  if (!name) { alert('タスク名を入力してください'); return; }
  MONTHLY_TASKS.push({
    id: 'mt_' + Date.now(),
    name,
    deadline_day: parseInt(document.getElementById('f-deadline-day')?.value) || null,
    yellow_day:   parseInt(document.getElementById('f-yellow-day')?.value)   || null,
    red_day:      parseInt(document.getElementById('f-red-day')?.value)      || null,
  });
  closeModal();
  renderMonthlyTasks();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

async function saveTask(type) {
  const title = document.getElementById('f-title')?.value.trim();
  if (!title) { alert('タスク内容を入力してください'); return; }

  const deadline   = document.getElementById('f-deadline')?.value || null;
  const yellowDays = parseInt(document.getElementById('f-yellow')?.value) || null;
  const redDays    = parseInt(document.getElementById('f-red')?.value) || null;
  const desc       = document.getElementById('f-desc')?.value.trim() || '';
  const assignees  = type !== 'personal'
    ? [...document.querySelectorAll('input[name="assignee"]:checked')].map(cb => cb.value)
    : [];

  const base = {
    id: `${type}_${Date.now()}`,
    name: title, description: desc, deadline,
    yellow_days: yellowDays, red_days: redDays,
    created_date: new Date().toISOString().slice(0, 10),
  };

  if (type === 'personal') {
    await api.post('/api/personal-tasks', { ...base, user_name: currentUser.name });
    renderPersonalTasks();
  } else if (type === 'delegated') {
    await api.post('/api/delegated-tasks', { ...base, assignees });
    renderDelegatedTasks();
  } else if (type === 'director') {
    await api.post('/api/director-tasks', { ...base, assignees });
    renderDirectorTasks();
  }
  closeModal();
}

async function saveCert() {
  const pid = document.getElementById('f-pid')?.value.trim();
  if (!pid) { alert('患者IDを入力してください'); return; }

  await api.post('/api/certs', {
    id: 'cert_' + Date.now(),
    patient_id:  pid,
    cert_type:   document.getElementById('f-ctype')?.value || '医療券',
    deadline:    document.getElementById('f-deadline')?.value || null,
    yellow_days: parseInt(document.getElementById('f-yellow')?.value) || null,
    red_days:    parseInt(document.getElementById('f-red')?.value) || null,
    notes:       document.getElementById('f-notes')?.value.trim() || '',
  });
  renderCerts();
  closeModal();
}
