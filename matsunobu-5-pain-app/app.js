// ========== 状態管理 ==========
let currentUser = null;
const PANE_COUNT = 5;

// ========== スタッフリスト ==========
const STAFF_LIST = [
  '篠田','石山','菅谷','東郷','溝口','橋本','藤','ゆきな','宮内','松信',
  '横瀬','白田','箕輪','深沢','仙波','郡司','日向寺','飯田','篠原','澤野',
  '前野','小林','浅井','諸谷',
];

// ========== 個人タスク（ペイン1）==========
function getPersonalTasks() {
  return JSON.parse(localStorage.getItem('personal-tasks') || '[]');
}

function savePersonalTasks(tasks) {
  localStorage.setItem('personal-tasks', JSON.stringify(tasks));
}

function getPersonalSignal(task) {
  if (task.completed) return 'done';
  if (!task.deadline) return 'green';
  const now = new Date();
  const due = new Date(task.deadline);
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'black';
  if (task.red_days != null && daysLeft <= task.red_days) return 'red';
  if (task.yellow_days != null && daysLeft <= task.yellow_days) return 'yellow';
  return 'green';
}

function renderPersonalTasks() {
  const container = document.getElementById('pane-1-content');
  if (!container) return;

  const tasks = getPersonalTasks();
  const signalLabel = { green: '🟢', yellow: '🟡', red: '🔴', black: '⚫', done: '✅' };
  const signalOrder = { black: 0, red: 1, yellow: 2, green: 3, done: 4 };

  const sorted = [...tasks].sort((a, b) =>
    (signalOrder[getPersonalSignal(a)] ?? 5) - (signalOrder[getPersonalSignal(b)] ?? 5)
  );

  if (sorted.length === 0) {
    container.innerHTML = '<div style="color:#bdbdbd;font-size:13px;text-align:center;padding:24px 0;">タスクはありません</div>';
    return;
  }

  container.innerHTML = sorted.map(task => {
    const sig = getPersonalSignal(task);
    const isDone = sig === 'done';
    const now = new Date();
    let metaText = '';
    if (isDone) {
      metaText = '完了済';
    } else if (task.deadline) {
      const daysLeft = Math.ceil((new Date(task.deadline) - now) / (1000 * 60 * 60 * 24));
      metaText = `期限: ${task.deadline} ｜ 残り${daysLeft}日`;
    } else {
      metaText = `作成: ${task.created_date}`;
    }

    return `
      <div class="task-card signal-${sig}">
        <div class="task-signal">${signalLabel[sig]}</div>
        <div class="task-body">
          <div class="task-title ${isDone ? 'task-done-text' : ''}">${task.name}</div>
          <div class="task-meta">${metaText}</div>
          ${task.description ? `<div class="task-deadline-label">${task.description}</div>` : ''}
        </div>
        <div class="task-actions">
          ${isDone
            ? `<button class="delete-btn" onclick="deletePersonalTask('${task.id}')">🗑</button>`
            : `<button class="complete-btn" onclick="completePersonalTask('${task.id}')">✓</button>`}
        </div>
      </div>
    `;
  }).join('');
}

function completePersonalTask(id) {
  const tasks = getPersonalTasks();
  const t = tasks.find(t => t.id === id);
  if (t) t.completed = true;
  savePersonalTasks(tasks);
  renderPersonalTasks();
}

function deletePersonalTask(id) {
  savePersonalTasks(getPersonalTasks().filter(t => t.id !== id));
  renderPersonalTasks();
}

// ========== 月次定期タスク ==========
const MONTHLY_TASKS = [
  { id: 'mt1',  name: '訪問請求書',                          deadline_day: 14, yellow_day: 1,  red_day: 11 },
  { id: 'mt2',  name: '訪問領収書',                          deadline_day: 19, yellow_day: 19, red_day: 23 },
  { id: 'mt3',  name: 'ダウンロード領収書',                  deadline_day: 25, yellow_day: 1,  red_day: 7  },
  { id: 'mt4',  name: 'カード3社明細書調べ',                 deadline_day: 15, yellow_day: 5,  red_day: 10 },
  { id: 'mt5',  name: 'KO・ヘンリー・向後etc 請求書Scan+mail', deadline_day: 15, yellow_day: 5,  red_day: 10 },
  { id: 'mt6',  name: 'レセプト：オンラインダウンロード',    deadline_day: null, yellow_day: null, red_day: 5 },
  { id: 'mt7',  name: '保険種別・振込 Scan+mail',            deadline_day: 15, yellow_day: 10, red_day: 15 },
  { id: 'mt8',  name: '介護請求',                            deadline_day: 8,  yellow_day: 5,  red_day: 7  },
  { id: 'mt9',  name: '国保・社保レセプト',                  deadline_day: 9,  yellow_day: 6,  red_day: 8  },
  { id: 'mt10', name: '市の歯周病検診請求',                  deadline_day: 8,  yellow_day: 1,  red_day: 5  },
];

// ========== 初期化 ==========
window.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  setupResizeHandles();
  restorePaneState();
  renderMonthlyTasks();
  renderPersonalTasks();
});

// ========== 月次タスク：信号計算 ==========
function getMonthlySignal(task, today) {
  const key = getMonthlyCompletedKey();
  const completed = JSON.parse(localStorage.getItem(key) || '[]');
  if (completed.includes(task.id)) return 'done';

  const d = today.getDate();

  if (task.deadline_day && d > task.deadline_day) return 'black';
  if (task.red_day && d >= task.red_day) return 'red';
  if (task.yellow_day && d >= task.yellow_day) return 'yellow';
  return 'green';
}

function getMonthlyCompletedKey() {
  const now = new Date();
  return `monthly-completed-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toggleMonthlyComplete(taskId) {
  const key = getMonthlyCompletedKey();
  const completed = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = completed.indexOf(taskId);
  if (idx >= 0) {
    completed.splice(idx, 1);
  } else {
    completed.push(taskId);
  }
  localStorage.setItem(key, JSON.stringify(completed));
  renderMonthlyTasks();
}

// ========== 月次タスク：描画 ==========
function renderMonthlyTasks() {
  const container = document.getElementById('pane-5-content');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const signalLabel = { green: '🟢', yellow: '🟡', red: '🔴', black: '⚫', done: '✅' };
  const signalDeadline = {
    green: '余裕あり', yellow: '注意', red: '至急', black: '期限超過', done: '完了済'
  };

  const sorted = [...MONTHLY_TASKS].sort((a, b) => {
    const sa = getMonthlySignal(a, now);
    const sb = getMonthlySignal(b, now);
    if (sa === 'done' && sb !== 'done') return 1;
    if (sb === 'done' && sa !== 'done') return -1;
    const da = a.deadline_day ?? 99;
    const db = b.deadline_day ?? 99;
    return da - db;
  });

  const signalOrder = { black: 0, red: 1, yellow: 2, green: 3, done: 4 };
  sorted.sort((a, b) => signalOrder[getMonthlySignal(a, now)] - signalOrder[getMonthlySignal(b, now)]);

  container.innerHTML = `
    <div class="month-header">${year}年 ${month}月 （本日 ${day}日）</div>
    ${sorted.map(task => {
      const sig = getMonthlySignal(task, now);
      const isDone = sig === 'done';

      const deadlineText = task.deadline_day
        ? `期限: 毎月${task.deadline_day}日`
        : '期限: なし';

      const signalText = [];
      if (task.yellow_day) signalText.push(`🟡${task.yellow_day}日〜`);
      if (task.red_day)    signalText.push(`🔴${task.red_day}日〜`);

      return `
        <div class="monthly-task-card signal-${sig}" id="mt-card-${task.id}">
          <div class="task-signal">${signalLabel[sig]}</div>
          <div class="task-body">
            <div class="task-title ${isDone ? 'task-done-text' : ''}">${task.name}</div>
            <div class="task-meta">${deadlineText} ｜ ${signalText.join(' ')}</div>
            <div class="task-deadline-label">${signalDeadline[sig]}</div>
          </div>
          <div class="task-actions">
            ${isDone
              ? `<button class="delete-btn" onclick="toggleMonthlyComplete('${task.id}')">戻す</button>`
              : `<button class="complete-btn" onclick="toggleMonthlyComplete('${task.id}')">✓</button>`
            }
          </div>
        </div>
      `;
    }).join('')}
  `;
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
  renderMonthlyTasks();
  renderPersonalTasks();
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
  const btn = document.querySelector(`.toggle-btn[data-pane="${paneNum}"]`);
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
    const pane = document.getElementById(`pane-${i}`);
    state[i] = !pane.classList.contains('collapsed');
  }
  localStorage.setItem('pane-visible', JSON.stringify(state));
}

function restorePaneState() {
  const saved = localStorage.getItem('pane-visible');
  if (!saved) return;
  const state = JSON.parse(saved);
  for (let i = 1; i <= PANE_COUNT; i++) {
    const pane = document.getElementById(`pane-${i}`);
    const btn = document.querySelector(`.toggle-btn[data-pane="${i}"]`);
    if (state[i] === false) {
      pane.classList.add('collapsed');
      pane.style.flex = '0 0 48px';
      btn.classList.remove('active');
    }
  }
}

// ========== リサイズハンドル ==========
function setupResizeHandles() {
  const handles = [
    { id: 'handle-1-2', left: 'pane-1', right: 'pane-2' },
    { id: 'handle-2-3', left: 'pane-2', right: 'pane-3' },
    { id: 'handle-3-4', left: 'pane-3', right: 'pane-4' },
    { id: 'handle-4-5', left: 'pane-4', right: 'pane-5' },
  ];

  handles.forEach(({ id, left, right }) => {
    const handle = document.getElementById(id);
    const leftPane = document.getElementById(left);
    const rightPane = document.getElementById(right);
    let startX, startLeftWidth, startRightWidth;

    handle.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startLeftWidth = leftPane.getBoundingClientRect().width;
      startRightWidth = rightPane.getBoundingClientRect().width;
      handle.classList.add('dragging');

      const onMove = (e) => {
        const dx = e.clientX - startX;
        const newLeft = Math.max(48, startLeftWidth + dx);
        const newRight = Math.max(48, startRightWidth - dx);
        leftPane.style.flex = `0 0 ${newLeft}px`;
        rightPane.style.flex = `0 0 ${newRight}px`;
      };

      const onUp = () => {
        handle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
  });
}

// ========== モーダル ==========
function taskFormHTML(type) {
  const assigneeField = type !== 'personal' ? `
    <div class="form-group">
      <label>担当者（複数選択可）</label>
      <div class="staff-checkbox-grid">
        ${STAFF_LIST.map(name => `
          <label class="staff-checkbox-item">
            <input type="checkbox" name="assignee" value="${name}">
            <span>${name}</span>
          </label>
        `).join('')}
      </div>
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
    </div>
  `;
}

function openTaskModal(type) {
  const modal = document.getElementById('modal-overlay');
  const labels = { personal: '自分のタスクを追加', delegated: '委任タスクを追加', director: '院長指示を追加' };
  document.getElementById('modal-title').textContent = labels[type] || 'タスクを追加';
  document.getElementById('modal-body').innerHTML = taskFormHTML(type);
  modal.classList.remove('hidden');
}

function openCertModal() {
  const modal = document.getElementById('modal-overlay');
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
    </div>
  `;
  modal.classList.remove('hidden');
}

function openEventModal() {
  const modal = document.getElementById('modal-overlay');
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
    </div>
  `;
  modal.classList.remove('hidden');
}

function saveMonthlyTask() {
  const name = document.getElementById('f-title')?.value.trim();
  if (!name) { alert('タスク名を入力してください'); return; }
  const deadlineDay = parseInt(document.getElementById('f-deadline-day')?.value) || null;
  const yellowDay   = parseInt(document.getElementById('f-yellow-day')?.value)   || null;
  const redDay      = parseInt(document.getElementById('f-red-day')?.value)       || null;

  const newId = 'mt_' + Date.now();
  MONTHLY_TASKS.push({ id: newId, name, deadline_day: deadlineDay, yellow_day: yellowDay, red_day: redDay });
  closeModal();
  renderMonthlyTasks();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function saveTask(type) {
  const title = document.getElementById('f-title')?.value.trim();
  if (!title) { alert('タスク内容を入力してください'); return; }

  const deadline   = document.getElementById('f-deadline')?.value || null;
  const yellowDays = parseInt(document.getElementById('f-yellow')?.value) || null;
  const redDays    = parseInt(document.getElementById('f-red')?.value) || null;
  const desc       = document.getElementById('f-desc')?.value.trim() || '';

  if (type === 'personal') {
    const tasks = getPersonalTasks();
    tasks.push({
      id: 'pt_' + Date.now(),
      name: title,
      description: desc,
      deadline,
      yellow_days: yellowDays,
      red_days: redDays,
      created_date: new Date().toISOString().slice(0, 10),
      completed: false,
    });
    savePersonalTasks(tasks);
    renderPersonalTasks();
  }
  closeModal();
}

function saveCert() {
  const pid = document.getElementById('f-pid')?.value.trim();
  if (!pid) { alert('患者IDを入力してください'); return; }
  alert(`患者ID ${pid} の医療券を追加しました（デモ表示）`);
  closeModal();
}