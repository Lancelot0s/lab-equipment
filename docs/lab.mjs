import { roles, states, kinds, outcomes, canReview, canReviewRequest, mutate, view, deviceLabels, purchaseLabels, loanKinds, priceText, statDay } from './lab-core.mjs';
import { sample } from './lab-demo.mjs';

const glyphs = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  file: '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"/><path d="M13 3v7h7M8 14h8m-8 3h5"/>',
  checkList: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="8" y="3" width="8" height="4" rx="1.5"/><path d="m9 14 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  history: '<path d="M3 12a9 9 0 1 1 2.8 6.5M3 7v5h5m4-5v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m2-15a3 3 0 0 1 0 6m4 9v-2a4 4 0 0 0-3-4"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4m-11 5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.3l8 4.5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  chart: '<path d="M4 4v16h16M8 16v-4m4 4V8m4 8V5"/>',
  alert: '<path d="M10.4 4.8 3.3 17a2 2 0 0 0 1.7 3h14a2 2 0 0 0 1.7-3L13.6 4.8a1.8 1.8 0 0 0-3.2 0Z"/><path d="M12 9v4m0 3h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  balance: '<path d="M12 3v17M8 21h8M4 7h16M6 7l-3 7a3.2 3.2 0 0 0 6 0Zm12 0-3 7a3.2 3.2 0 0 0 6 0Z"/>',
  centrifuge: '<path d="M5 12h14l1.5 6a1.5 1.5 0 0 1-1.5 2H5a1.5 1.5 0 0 1-1.5-2zM6 12V8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4m-8 4h4"/>',
  optical: '<path d="M5 17 10 6l5 11zm10 0h5M3 12h4m6 0h7"/>',
  oven: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16m-11 4c2 1-2 3 0 4m6-4c2 1-2 3 0 4M8 7h.01m3 0h.01"/>',
  pump: '<path d="M7 18v-7a4 4 0 1 1 8 0v3h4v4m-15 2h16m-9-7v-2m4 3v4"/>',
  stir: '<path d="M4 18h16v3H4zM8 4h8m-7 0v7l-2 7m8-14v7l2 7m-8-4h6"/>',
  scope: '<path d="m9 4 3-2 3 5-3 2zm2 5-2 1m7 0a5 5 0 0 1 2 4c0 4-3 6-7 6m-6 1h15m-14-6h7m-2 0v5"/>',
  meter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M6 12h2l2-3 3 6 2-3h3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m4-12 4 4-4 4m-5-4h9"/>',
  switch: '<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8m-9 4h4"/>',
  pencil: '<path d="m5 16-1 4 4-1L19 8l-3-3zm9-9 3 3"/>',
};

const icon = (key, size = 20) => '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + glyphs[key] + '</svg>';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const root = document.querySelector('#app');
const dialog = document.createElement('dialog');
const toastRegion = document.createElement('div');
dialog.className = 'modal';
dialog.setAttribute('aria-labelledby', 'dialog-title');
toastRegion.className = 'toasts';
toastRegion.setAttribute('role', 'status');
document.body.append(dialog, toastRegion);
const pages = document.documentElement.dataset.hosting === 'github-pages';
const demo = pages || new URLSearchParams(location.search).get('demo') === '1';
const workspaceLink = document.querySelector('meta[name=lab-workspace-url]')?.content.trim() || '';
const workspaceUrl = pages ? (/^https:\/\//i.test(workspaceLink) ? workspaceLink : '') : '/';
const demoKey = 'lab-equipment-demo-v3';
const userKey = 'lab-equipment-demo-user-v1';
let demoData;
let data;
let auth;
let busy = false;
let refreshSerial = 0;
let loadError = '';
let profileOpen = false;
let mobileOpen = false;
let dialogData = null;
let dialogAnchor = null;
let viewPage = 1;
let secondaryPage = 1;
const expanded = new Set();
const filters = { q: '', state: '', project: '', location: '', archived: false };
const listFilter = { q: '', status: 'all' };
const usageFilters = { period: '30', project: '', scope: 'all' };
const pageSize = 8;
const titles = { devices: '设备台账', mine: '我的申请', approvals: '审批中心', usage: '使用统计', history: '历史记录', accounts: '账号管理', notices: '站内通知' };
const rowTime = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const fullTime = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const dateLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' });
const prettyTime = (date, full = false) => date ? (full ? fullTime : rowTime).format(new Date(date)) : '—';
const byName = new Intl.Collator('zh-CN-u-co-stroke');
const page = () => {
  const choice = location.hash.slice(1) || 'devices';
  if (!Object.hasOwn(titles, choice) || (choice === 'accounts' && data?.user.role !== 'super')
    || (choice === 'approvals' && data && !canReview(data.user))) return 'devices';
  return choice;
};

function navigate(where) {
  profileOpen = false;
  mobileOpen = false;
  if (location.hash === '#' + where || (!location.hash && where === 'devices')) render();
  else location.hash = where;
}

function toast(text, error = false) {
  const item = document.createElement('div');
  item.className = 'toast' + (error ? ' danger' : '');
  item.innerHTML = icon(error ? 'alert' : 'check', 17) + '<span>' + esc(text) + '</span>';
  toastRegion.append(item);
  setTimeout(() => item.remove(), 4600);
}

async function api(action, body) {
  const response = await fetch('/api/workspace', action ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, body }),
  } : { cache: 'no-store' });
  const output = await response.json();
  return { ok: response.ok, status: response.status, ...output };
}

function demoView() {
  const user = demoData.users.find(u => u.id === sessionStorage.getItem(userKey) && !u.disabled)
    || demoData.users.find(u => u.owner);
  return { ...view(demoData, user), mode: 'demo' };
}

async function load(quiet = false) {
  if (demo) {
    try {
      demoData = JSON.parse(sessionStorage.getItem(demoKey)) || sample();
      sessionStorage.setItem(demoKey, JSON.stringify(demoData));
      data = demoView();
    } catch {
      demoData = sample();
      data = { ...view(demoData, demoData.users[0]), mode: 'demo' };
    }
    return render();
  }
  const serial = ++refreshSerial;
  try {
    const result = await api();
    if (serial !== refreshSerial) return;
    if (result.ok) {
      const next = JSON.stringify(result);
      const changed = !data || next !== JSON.stringify(data);
      data = result;
      auth = null;
      loadError = '';
      if (changed && (!quiet || (!dialog.open && !composing))) render();
    } else if (!quiet || data) {
      data = null;
      auth = result;
      if (dialog.open) dialog.close();
      render();
    }
  } catch {
    if (quiet) return;
    loadError = '工作台连接失败，请检查服务是否已启动后重试。';
    render();
  }
}

async function write(action, body, message, done) {
  if (busy) return;
  busy = true;
  refreshSerial++;
  const form = dialog.open ? dialog.querySelector('form') : root.querySelector('form[data-auth]');
  const submit = form?.querySelector('button[type=submit]');
  const errorBox = form?.querySelector('.form-error');
  if (submit) submit.disabled = true;
  if (errorBox) errorBox.textContent = '';
  try {
    if (demo) {
      const proposed = structuredClone(demoData);
      const user = proposed.users.find(u => u.id === data.user.id);
      mutate(proposed, user, action, body);
      demoData = proposed;
      sessionStorage.setItem(demoKey, JSON.stringify(demoData));
      data = demoView();
    } else {
      const result = await api(action, body);
      if (!result.ok) throw new Error(result.error || '操作失败，请稍后重试');
      data = result.user ? result : null;
      auth = result.user ? null : { mode: 'local' };
    }
    if (dialog.open) dialog.close();
    if (done) done();
    render();
    if (message) toast(message);
  } catch (error) {
    if (errorBox) errorBox.textContent = error.message;
    else toast(error.message, true);
  } finally {
    busy = false;
    if (submit) submit.disabled = false;
  }
}

const button = (label, glyph, action, attr = '', style = '') =>
  '<button type="button" class="btn ' + style + '" data-action="' + action + '" ' + attr + '>'
    + (glyph ? icon(glyph, 16) : '') + esc(label) + '</button>';
const tool = (label, glyph, action, attr = '') =>
  '<button type="button" class="tool" title="' + esc(label) + '" aria-label="' + esc(label) + '" data-action="' + action + '" ' + attr + '>' + icon(glyph, 19) + '</button>';
const badge = (type, value) => '<span class="badge ' + type + '"><i></i>' + esc(value) + '</span>';
const options = (choices, selected) => choices.map(([value, label]) =>
  '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
const initial = name => esc(Array.from(name?.trim() || 'U')[0]);
const findDevice = key => data.devices.find(d => d.id === key);
const findUnit = (d, key) => d?.units.find(u => u.id === key);
const keyed = (device, unit) => 'data-id="' + esc(device.id) + '"' + (unit ? ' data-unit="' + esc(unit.id) + '"' : '');

function navItem(key, symbol, count) {
  return '<a href="#' + key + '" class="nav-item' + (page() === key ? ' selected' : '') + '" '
    + (page() === key ? 'aria-current="page"' : '') + '>' + icon(symbol, 19) + '<span>' + titles[key] + '</span>'
    + (count > 0 ? '<b class="nav-count">' + count + '</b>' : '') + '</a>';
}
function shell(content) {
  const user = data.user;
  const pending = data.requests.filter(r => r.status === 'pending' && canReviewRequest(user, r)).length;
  const unread = data.notices.filter(n => !n.read).length;
  return '<div class="layout"><aside class="sidebar' + (mobileOpen ? ' mobile-open' : '') + '">'
    + '<a class="brand" href="#devices" aria-label="常志勇课题组资产与耗材数字化管理平台"><img src="./lab-mark.svg" width="42" height="42" alt="">'
    + '<span><small>常志勇课题组</small><strong>资产与耗材数字化管理平台</strong></span></a>'
    + '<nav aria-label="主导航"><div class="nav-group"><div class="nav-label">工作台</div>'
    + navItem('devices', 'grid') + navItem('mine', 'file') + (canReview(user) ? navItem('approvals', 'checkList', pending) : '') + navItem('usage', 'chart')
    + '</div><div class="nav-group"><div class="nav-label">管理</div>' + navItem('history', 'history')
    + (user.role === 'super' ? navItem('accounts', 'users') : '') + '</div></nav>'
    + '<div class="sidebar-bottom"><span class="workspace-icon">' + icon('box', 17) + '</span><span><strong>' + (demo ? '演示工作台' : '实验室工作台') + '</strong>'
    + (demo ? '<small>示例数据空间</small>' : '') + '</span></div></aside>'
    + (mobileOpen ? '<button class="mobile-scrim" data-action="mobile" aria-label="关闭导航"></button>' : '')
    + '<div class="main-shell"><header class="topbar"><div class="breadcrumbs">'
    + '<span class="mobile-toggle">' + tool('打开导航', 'menu', 'mobile') + '</span><span class="crumb-home">工作台</span>'
    + '<span class="crumb-separator">/</span><strong>' + titles[page()] + '</strong></div>'
    + '<div class="top-actions"><div class="date-label">' + icon('clock', 16) + esc(dateLabel.format(new Date())) + '</div>'
    + '<button class="bell tool" type="button" data-action="notices" title="站内通知" aria-label="站内通知' + (unread ? '，' + unread + ' 条未读' : '') + '">' + icon('bell', 21)
    + (unread ? '<span class="bell-dot"></span>' : '') + '</button><span class="top-divider"></span>'
    + '<div class="profile-wrap"><button class="profile" type="button" data-action="profile" aria-expanded="' + profileOpen + '">'
    + '<span class="avatar">' + initial(user.name) + '</span><span class="profile-text"><strong>' + esc(user.name) + '</strong><small>' + roles[user.role] + '</small></span>'
    + icon('chevron', 15) + '</button>' + (profileOpen ? profileMenu() : '') + '</div></div></header>'
    + '<main id="main" class="content">' + content + '</main></div></div>';
}
function profileMenu() {
  if (demo) {
    return '<div class="profile-menu"><p>切换演示身份</p>' + demoData.users.slice(0, 3)
      .map(u => '<button type="button" data-action="demo-role" data-id="' + esc(u.id) + '"><span>' + roles[u.role] + '</span>'
        + (u.id === data.user.id ? icon('check', 17) : '<small>' + esc(u.name) + '</small>') + '</button>').join('')
      + (workspaceUrl ? '<div class="menu-divider"></div><a href="' + esc(workspaceUrl) + '">' + icon('switch', 16) + '进入正式工作台</a>' : '') + '</div>';
  }
  return '<div class="profile-menu"><p>' + esc(data.user.username) + '</p><a href="/?demo=1">' + icon('switch', 16) + '打开演示工作台</a>'
    + '<button type="button" data-action="logout">' + icon('logout', 16) + '退出登录</button></div>';
}
function titleBlock(title, subtitle, actions = '') {
  return '<div class="page-title"><div><h1>' + title + '</h1><p>' + subtitle + '</p></div><div class="page-actions">' + actions + '</div></div>';
}
function emptyBlock(sym, title, detail, extra = '') {
  return '<div class="empty"><span class="empty-icon">' + icon(sym, 25) + '</span><strong>' + title + '</strong><p>' + detail + '</p>' + extra + '</div>';
}
function selectFilter(key, label, values) {
  return '<label class="select-wrap"><span class="visually-hidden">' + label + '</span><select data-filter="' + key + '">'
    + options(values, filters[key]) + '</select>' + icon('chevron', 15) + '</label>';
}
function searchBox(key, query, placeholder) {
  return '<label class="search-wrap">' + icon('search', 19) + '<span class="visually-hidden">搜索</span><input type="text" role="searchbox" inputmode="search" data-search="' + key
    + '" placeholder="' + placeholder + '" value="' + esc(query) + '"></label>';
}
function filteredDevices() {
  const query = filters.q.trim().toLowerCase();
  return data.devices.filter(d => Boolean(d.archived) === filters.archived
    && (!(filters.state || filters.location) || d.units.some(u => (!filters.state || u.state === filters.state)
      && (!filters.location || (u.location || d.location) === filters.location)))
    && (!filters.project || d.project === filters.project)
    && (!query || [d.title, d.code, d.buyer, d.location, d.project, d.note, d.managerName, d.purchaseApprover,
      d.fundingProject, d.purchasedOn, ...d.units.flatMap(u => [u.code, u.location, u.userName, u.issue, u.note,
        ...Object.values(u.purchase || {})])].some(value => String(value ?? '').toLowerCase().includes(query))));
}
function summary() {
  const available = data.devices.filter(d => !d.archived);
  const metrics = available.flatMap(d => d.units).reduce((m, u) => {
    m[u.state]++;
    m.total++;
    return m;
  }, { total: 0, idle: 0, use: 0, fault: 0 });
  return '<div class="metrics" aria-label="台账概览">'
    + [['total', '设备总数', 'box', available.length + ' 种设备'], ['idle', '空闲', 'check', '可取用或申请'],
      ['use', '使用中', 'activity', '已分配使用人'], ['fault', '异常', 'alert', '待检查或维护']].map(([key, label, sym, hint]) =>
      '<button type="button" class="metric' + (filters.state === key ? ' metric-active' : '') + '" data-action="metric" data-id="' + key + '">'
      + '<div class="metric-top"><span class="metric-icon ' + key + '">' + icon(sym, 21) + '</span><span>' + label + '</span></div>'
      + '<div class="metric-number">' + metrics[key] + '<span> 件</span></div><div class="metric-hint">' + hint + '</div></button>').join('') + '</div>';
}

function equipmentGlyph(title) {
  if (/天平|称/.test(title)) return 'balance';
  if (/离心/.test(title)) return 'centrifuge';
  if (/光度|光谱/.test(title)) return 'optical';
  if (/干燥|箱|炉/.test(title)) return 'oven';
  if (/泵/.test(title)) return 'pump';
  if (/搅拌|反应/.test(title)) return 'stir';
  if (/显微|镜/.test(title)) return 'scope';
  if (/采集|电表|测量/.test(title)) return 'meter';
  return 'box';
}
function groupedStatus(d) {
  const counts = { idle: 0, use: 0, fault: 0 };
  for (const u of d.units) counts[u.state]++;
  const present = Object.keys(counts).filter(key => counts[key] > 0);
  return present.map(key => badge(key, states[key] + (present.length > 1 ? ' ' + counts[key] : ''))).join('');
}
function unitAction(d, u) {
  if (d.archived) return '';
  const attrs = keyed(d, u);
  if (u.state === 'idle') return button('申请', null, 'borrow', attrs, 'btn-flat');
  if (u.state !== 'use' || u.userId !== data.user.id) return '';
  return u.loanMode === 'quick' ? button('直接归还', null, 'quick-return', attrs, 'btn-flat')
    : button('申请归还', null, 'return', attrs, 'btn-flat');
}
function loanLabel(u) {
  return u.loanMode === 'quick' ? '临时取用' : u.loanMode === 'long' ? '长期使用' : '领用';
}
function unitRows(d) {
  return '<tr class="expanded-row"><td colspan="8"><div class="unit-panel"><p class="units-title">单件明细 <span>' + d.units.length + ' 件</span></p>'
    + d.units.map(u =>
      '<div class="unit-row"><span class="unit-code">' + esc(u.code) + '</span><span>' + badge(u.state, states[u.state]) + '</span>'
      + '<div class="unit-context"><strong>' + esc(u.state === 'use' ? u.userName : u.state === 'fault' ? u.issue : u.location || d.location) + '</strong>'
      + '<small>' + esc([u.state === 'use' ? loanLabel(u) + ' ' + prettyTime(u.since) : '', u.dueOn ? '预计归还 ' + u.dueOn : '',
        u.state !== 'idle' ? (u.location || d.location) : '', u.note].filter(Boolean).join(' · ')) + '</small></div>'
      + '<div class="unit-actions">' + unitAction(d, u) + tool('单件详情与操作', 'more', 'unit-menu', keyed(d, u))
      + '</div></div>').join('') + '</div></td></tr>';
}
function deviceRow(d) {
  const open = expanded.has(d.id);
  return '<tr class="device-row"><td class="expander-cell"><button type="button" class="expander' + (open ? ' open' : '') + '" data-action="expand" '
    + keyed(d) + ' aria-expanded="' + open + '" aria-label="' + (open ? '收起' : '展开') + esc(d.title) + '单件">' + icon('right', 15) + '</button></td>'
    + '<td><button type="button" class="device-name" data-action="expand" ' + keyed(d) + '><span class="device-icon">' + icon(equipmentGlyph(d.title), 20) + '</span>'
    + '<span><strong>' + esc(d.title) + '</strong><small>' + esc(d.code + (d.managerName ? ' · 管理员 ' + d.managerName : '')) + '</small></span></button></td>'
    + '<td data-label="状态"><div class="table-badges">' + groupedStatus(d) + '</div></td><td data-label="数量"><span class="count-cell">' + d.units.length + '</span></td>'
    + '<td data-label="购买人"><button type="button" class="purchase-link" data-action="purchase" ' + keyed(d)
    + ' title="查看采购详情" aria-label="' + esc(d.title + '采购详情 · 购买人 ' + d.buyer) + '">' + esc(d.buyer) + '</button></td>'
    + '<td data-label="位置">' + esc(d.location) + '</td><td data-label="项目"><span class="project-tag">' + esc(d.project) + '</span></td>'
    + '<td class="row-action">' + tool('设备详情与操作', 'more', 'device-menu', keyed(d)) + '</td></tr>' + (open ? unitRows(d) : '');
}
function pagination(count, current, action, unit = '条记录') {
  const max = Math.max(1, Math.ceil(count / pageSize));
  return '<div class="pagination"><span>共 <strong>' + count + '</strong> ' + unit + (count > 0 ? ' <i>·</i> 显示 ' + ((current - 1) * pageSize + 1) + '–' + Math.min(current * pageSize, count) : '') + '</span>'
    + '<div>' + tool('上一页', 'left', action, 'data-id="' + (current - 1) + '"' + (current <= 1 ? ' disabled' : ''))
    + '<span class="current-page">' + current + '</span>' + tool('下一页', 'right', action, 'data-id="' + (current + 1) + '"' + (current >= max ? ' disabled' : '')) + '</div></div>';
}

function devicesPage() {
  const visible = filteredDevices();
  viewPage = Math.max(1, Math.min(viewPage, Math.ceil(visible.length / pageSize)));
  const inArchive = filters.archived;
  const active = data.devices.filter(d => Boolean(d.archived) === inArchive);
  const projectOptions = [...new Set(active.map(d => d.project))].sort((a, b) => a.localeCompare(b, 'zh'));
  const locations = [...new Set(active.flatMap(d => [d.location, ...d.units.map(u => u.location).filter(Boolean)]))].sort((a, b) => a.localeCompare(b, 'zh'));
  const workspace = pages ? '<a class="btn" href="' + esc(workspaceUrl || './connection.html') + '">' + icon('switch', 16) + '正式台账</a>'
    + (workspaceUrl ? '<a class="btn btn-flat" href="./connection.html">首次访问</a>' : '') : '';
  const actions = workspace + button('导出清单', 'download', 'export') + button('申请新增设备', 'plus', 'new-device', '', 'primary');
  const hasFilters = filters.q || filters.state || filters.project || filters.location;
  return titleBlock('设备台账', '查看设备存量、单件状态和当前使用情况。', actions) + summary()
    + '<section class="panel inventory" aria-label="设备清单"><div class="panel-heading"><div><h2>' + (inArchive ? '已归档设备' : '设备清单')
    + '</h2><span class="small-count">' + visible.length + ' 种</span></div>'
    + (data.user.role === 'super' ? button(inArchive ? '返回设备清单' : '查看归档', 'archive', 'archive-toggle', '', 'btn-flat') : '') + '</div>'
    + '<div class="filters">' + searchBox('devices', filters.q, '搜索设备、人员、项目…') + '<div class="filter-selects">'
    + selectFilter('state', '状态', [['', '全部状态'], ...Object.entries(states)])
    + selectFilter('project', '项目', [['', '全部项目'], ...projectOptions.map(v => [v, v])])
    + selectFilter('location', '位置', [['', '全部位置'], ...locations.map(v => [v, v])])
    + (hasFilters ? button('清除', null, 'clear', '', 'btn-flat') : '') + '</div></div>'
    + (visible.length ? '<div class="table-scroll"><table class="inventory-table"><thead><tr><th></th><th>设备名称</th><th>状态</th><th>数量</th><th>购买人</th><th>存放位置</th><th>所属项目</th><th>操作</th></tr></thead><tbody>'
      + visible.slice((viewPage - 1) * pageSize, viewPage * pageSize).map(deviceRow).join('') + '</tbody></table></div>'
      : emptyBlock('box', hasFilters ? '没有匹配的设备' : inArchive ? '暂无归档设备' : '台账还没有设备',
        hasFilters ? '可更换搜索词或清除筛选条件。' : inArchive ? '归档后的设备会出现在这里。' : '登记第一项设备后，即可开始追踪单件状态。',
        hasFilters ? button('清除筛选', null, 'clear') : inArchive ? '' : button('申请新增设备', 'plus', 'new-device', '', 'primary')))
    + pagination(visible.length, viewPage, 'device-page', '种设备') + '</section>';
}
function matches(query, values) {
  return !query || values.some(v => String(v ?? '').toLowerCase().includes(query));
}
function tab(key, label) {
  return '<button type="button" class="tab' + (listFilter.status === key ? ' current' : '') + '" data-action="list-tab" data-id="' + key + '">' + label + '</button>';
}
function genericRows(records, table, symbols, noDataText) {
  secondaryPage = Math.max(1, Math.min(secondaryPage, Math.ceil(records.length / pageSize)));
  return (records.length ? '<div class="table-scroll">' + table(records.slice((secondaryPage - 1) * pageSize, secondaryPage * pageSize)) + '</div>'
    : emptyBlock(symbols, noDataText, listFilter.q ? '试试其他搜索词。' : '有匹配的记录时会显示在这里。'))
    + pagination(records.length, secondaryPage, 'list-page');
}
function requestsPage(isApproval) {
  const query = listFilter.q.trim().toLowerCase();
  const records = data.requests.filter(r => (isApproval || r.authorId === data.user.id)
    && (listFilter.status === 'all' || (listFilter.status === 'closed' ? r.status !== 'pending' : r.status === listFilter.status))
    && matches(query, [r.target, r.author, r.reason, kinds[r.kind]]));
  const table = rows => '<table class="standard-table"><thead><tr><th>设备 / 单件</th><th>申请类型</th>'
    + (isApproval ? '<th>申请人</th>' : '') + '<th>提交时间</th><th>状态</th><th>操作</th></tr></thead><tbody>'
    + rows.map(r => '<tr><td><strong>' + esc(r.target) + '</strong><small>' + esc(r.reason || r.payload.issue || '—') + '</small></td><td>' + kinds[r.kind] + '</td>'
    + (isApproval ? '<td>' + esc(r.author) + '</td>' : '') + '<td class="nowrap">' + prettyTime(r.time, true) + '</td>'
    + '<td>' + badge(r.status, outcomes[r.status]) + '</td><td>' + button(isApproval && r.status === 'pending'
      && canReviewRequest(data.user, r) ? '审核' : '查看', null, 'request-detail', 'data-id="' + esc(r.id) + '"', 'btn-flat') + '</td></tr>').join('')
    + '</tbody></table>';
  return titleBlock(isApproval ? '审批中心' : '我的申请', isApproval ? '查看和处理设备领用、归还、入库及修改申请。' : '查看提交记录与审核意见，可撤回待审核申请。',
    isApproval ? '' : button('前往设备台账', 'grid', 'to-devices')) + '<section class="panel"><div class="list-toolbar"><div class="tabs">'
    + tab('all', '全部') + tab('pending', '待审核') + tab('closed', '已处理') + '</div>'
    + searchBox('list', listFilter.q, '搜索设备、申请类型…') + '</div>'
    + genericRows(records, table, 'checkList', '暂无相关申请') + '</section>';
}
const dayMillis = 24 * 3_600_000;
const periodOptions = [['7', '近 7 天'], ['30', '近 30 天'], ['90', '近 90 天'], ['all', '全部时间']];

function usageSelect(key, label, choices) {
  return '<label class="usage-select"><span>' + label + '</span><span class="select-wrap">'
    + '<select data-usage-filter="' + key + '">' + options(choices, usageFilters[key]) + '</select>'
    + icon('chevron', 15) + '</span></label>';
}

function usageSummary() {
  const active = data.devices.filter(d => !d.archived);
  const projects = [...new Set(active.map(d => d.project))].sort((a, b) => a.localeCompare(b, 'zh'));
  if (!projects.includes(usageFilters.project)) usageFilters.project = '';
  const current = Date.now();
  const until = statDay(current);
  const from = usageFilters.period === 'all' ? '' : statDay(current - (Number(usageFilters.period) - 1) * dayMillis);
  const mine = usageFilters.scope === 'mine';
  const rows = active.filter(d => !usageFilters.project || d.project === usageFilters.project).map(d => ({
    device: d, total: 0, quick: 0, long: 0, manual: 0, last: '',
    inUse: d.units.filter(u => u.state === 'use' && (!mine || u.userId === data.user.id)).length,
    faults: d.units.filter(u => u.state === 'fault').length,
  }));
  const lookup = new Map(rows.map(row => [row.device.id, row]));
  const days = new Map(Array.from({ length: 7 }, (_, i) => [statDay(current - (6 - i) * dayMillis), 0]));
  const total = { all: 0, quick: 0, long: 0, manual: 0 };
  for (const record of data.usage || []) {
    const row = lookup.get(record.deviceId);
    const amount = mine ? record.mine : record.count;
    if (!row || !amount || record.day < from || record.day > until || !Object.hasOwn(loanKinds, record.mode)) continue;
    row.total += amount;
    row[record.mode] += amount;
    if (record.day > row.last) row.last = record.day;
    if (days.has(record.day)) days.set(record.day, days.get(record.day) + amount);
    total.all += amount;
    total[record.mode] += amount;
  }
  rows.sort((a, b) => b.total - a.total || b.last.localeCompare(a.last) || a.device.title.localeCompare(b.device.title, 'zh'));
  return { projects, rows, days, total, mine, from, until };
}

function usageMeter(value, largest) {
  return '<meter class="usage-meter" value="' + value + '" max="' + Math.max(1, largest) + '" aria-hidden="true"></meter>';
}

function usagePage() {
  const { projects, rows, days, total, mine, from, until } = usageSummary();
  const used = rows.filter(row => row.total > 0).length;
  const currentCount = rows.reduce((sum, row) => sum + row.inUse, 0);
  const faults = rows.reduce((sum, row) => sum + row.faults, 0);
  const metrics = [
    ['使用次数', total.all, '次', 'chart', 'total', '临时 ' + total.quick + ' · 长期 ' + total.long + ' · 登记 ' + total.manual],
    ['有使用记录', used, '种', 'check', 'idle', '统计期间 · 共 ' + rows.length + ' 种设备'],
    ['无使用记录', rows.length - used, '种', 'box', 'fault', '统计期间'],
    [mine ? '我当前在用' : '当前在用', currentCount, '件', 'activity', 'use', mine ? '实时状态' : '实时状态 · 异常 ' + faults + ' 件'],
  ];
  const overview = '<div class="metrics usage-overview">' + metrics.map(([label, value, unit, symbol, color, hint]) =>
    '<div class="metric usage-card"><div class="metric-top"><span class="metric-icon ' + color + '">' + icon(symbol, 20)
    + '</span>' + label + '</div><div class="metric-number">' + value + '<span> ' + unit + '</span></div>'
    + '<p class="metric-hint">' + hint + '</p></div>').join('') + '</div>';
  const controls = '<div class="usage-filters">'
    + usageSelect('period', '统计时间', periodOptions)
    + usageSelect('project', '所属项目', [['', '全部项目'], ...projects.map(p => [p, p])])
    + usageSelect('scope', '使用范围', [['all', '全部成员'], ['mine', '我的使用']])
    + (from ? '<span class="usage-dates">' + from + ' 至 ' + until + '</span>' : '') + '</div>';
  const dailyPeak = Math.max(1, ...days.values());
  const trend = '<section class="panel usage-panel"><div class="panel-heading"><h2>近 7 天每日使用</h2></div><div class="usage-series">'
    + [...days].map(([day, count]) => '<div class="usage-series-row"><time datetime="' + day + '">' + day.slice(5).replace('-', '/')
      + '</time>' + usageMeter(count, dailyPeak) + '<strong>' + count + ' 次</strong></div>').join('') + '</div></section>';
  const peak = rows[0]?.total || 1;
  const ranking = '<section class="panel usage-ranking"><div class="panel-heading"><h2>设备使用排行</h2></div>'
    + genericRows(rows, slice => '<table class="standard-table usage-table"><thead><tr><th>设备 / 所属项目</th><th>使用次数</th>'
      + '<th>临时取用</th><th>长期使用</th><th>管理员登记</th><th>最近使用</th></tr></thead><tbody>'
      + slice.map(({ device, total: count, quick, long, manual, last }) => '<tr><td><button class="purchase-link" type="button" data-action="device-menu" '
        + keyed(device) + '>' + esc(device.title) + '</button><small>' + esc(device.project) + '</small></td>'
        + '<td class="usage-total"><strong>' + count + ' 次</strong>' + usageMeter(count, peak) + '</td><td>' + quick + '</td><td>'
        + long + '</td><td>' + manual + '</td><td class="nowrap">' + (last || '—') + '</td></tr>').join('') + '</tbody></table>',
    'chart', '当前台账暂无设备') + '</section>';
  return titleBlock('使用统计', '汇总当前台账设备的临时取用、已批准长期使用和管理员登记。')
    + controls + overview + '<div class="usage-panels">' + ranking + trend + '</div>';
}

function historyPage() {
  const query = listFilter.q.trim().toLowerCase();
  const records = data.history.filter(h => matches(query, [h.actor, h.action, h.target, h.detail]));
  const table = rows => '<table class="standard-table"><thead><tr><th>时间</th><th>操作人</th><th>操作</th><th>设备 / 对象</th><th>变更内容</th></tr></thead><tbody>'
    + rows.map(h => '<tr><td class="nowrap">' + prettyTime(h.time, true) + '</td><td>' + esc(h.actor) + '</td><td><strong>' + esc(h.action)
      + '</strong></td><td>' + esc(h.target) + '</td><td class="detail-cell">' + esc(h.detail || '—') + '</td></tr>').join('') + '</tbody></table>';
  return titleBlock('历史记录', canReview(data.user) ? '追溯设备登记、状态变更、审批及其他管理操作。' : '查看自己提交和处理的历史操作。')
    + '<section class="panel"><div class="list-toolbar">' + searchBox('list', listFilter.q, '搜索设备、操作人、变更内容…') + '</div>'
    + genericRows(records, table, 'history', '暂无历史记录') + '</section>';
}
function accountsPage() {
  const query = listFilter.q.trim().toLowerCase();
  const records = data.accounts.filter(u => matches(query, [u.name, u.username, roles[u.role]]));
  const table = rows => '<table class="standard-table"><thead><tr><th>姓名</th><th>用户名</th><th>角色</th><th>账号状态</th><th>操作</th></tr></thead><tbody>'
    + rows.map(u => '<tr><td><span class="account-name"><span class="avatar">' + initial(u.name) + '</span><strong>' + esc(u.name) + '</strong></span></td>'
      + '<td>' + esc(u.username) + '</td><td>' + roles[u.role] + (u.owner ? '<small>系统所有者</small>' : '') + '</td><td>'
      + badge(u.disabled ? 'fault' : 'idle', u.disabled ? '已停用' : '已启用') + '</td><td>'
      + button('编辑', null, 'account-edit', 'data-id="' + esc(u.id) + '"', 'btn-flat') + '</td></tr>').join('') + '</tbody></table>';
  return titleBlock('账号管理', '创建账号、分配角色、停用账号或重置密码。',
    button('添加账号', 'plus', 'account-new', '', 'primary')) + '<section class="panel"><div class="list-toolbar">'
    + searchBox('list', listFilter.q, '搜索姓名、用户名、角色…') + '</div>'
    + genericRows(records, table, 'users', '暂无账号') + '</section>';
}
function noticesPage() {
  const unread = data.notices.filter(n => !n.read).length;
  return titleBlock('站内通知', unread ? '你有 ' + unread + ' 条未读通知。' : '查看待审提醒和申请审核结果。',
    unread ? button('全部标为已读', 'check', 'mark-all') : '') + '<section class="panel notice-list">'
    + (data.notices.length ? data.notices.slice(0, Math.max(20, secondaryPage * 20)).map(n =>
      '<button class="notice-row' + (!n.read ? ' unread' : '') + '" type="button" data-action="notice-open" data-id="' + esc(n.id) + '">'
      + '<span class="metric-icon ' + (n.pending ? 'total' : 'idle') + '">' + icon(n.pending ? 'checkList' : 'bell', 19) + '</span>'
      + '<span class="notice-text"><strong>' + esc(n.title) + '</strong><small>' + esc(n.detail) + '</small></span><span class="notice-time">'
      + prettyTime(n.time) + '</span>' + (n.read ? '' : '<i></i>') + icon('right', 16) + '</button>').join('')
      + (data.notices.length > secondaryPage * 20 ? '<div class="notice-more">' + button('加载更多', null, 'notices-more') + '</div>' : '')
      : emptyBlock('bell', '暂无通知', '收到审核提醒或结果后，会显示在这里。')) + '</section>';
}

function field(label, name, value = '', config = {}) {
  const required = config.required === false ? '' : ' required';
  const placeholder = config.placeholder ? ' placeholder="' + esc(config.placeholder) + '"' : '';
  const control = config.choices ? '<span class="form-select"><select name="' + name + '"' + required + '>'
    + options(config.choices, value) + '</select>' + icon('chevron', 16) + '</span>'
    : config.area ? '<textarea name="' + name + '" rows="3" maxlength="' + (config.max || 600) + '"' + required + placeholder + '>' + esc(value) + '</textarea>'
    : '<input name="' + name + '" type="' + (config.type || 'text') + '" value="' + esc(value) + '"' + required + placeholder
      + (config.type === 'number' ? ' min="1" max="200"' : ' maxlength="' + (config.max || 160) + '"')
      + (config.autocomplete ? ' autocomplete="' + config.autocomplete + '"' : '')
      + (config.inputMode ? ' inputmode="' + config.inputMode + '"' : '') + (config.readonly ? ' readonly' : '') + '>';
  return '<label class="form-field ' + (config.wide ? 'wide' : '') + '"><span>' + label + (config.required === false ? ' <small>选填</small>' : '') + '</span>' + control + '</label>';
}
function definition(rows) {
  return '<dl class="definition">' + rows.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v || '—') + '</dd></div>').join('') + '</dl>';
}
function modal(title, description, content, footer = '', form = '') {
  if (!dialog.open) dialogAnchor = document.activeElement;
  dialog.innerHTML = '<div class="modal-heading"><div><h2 id="dialog-title">' + esc(title) + '</h2>'
    + (description ? '<p>' + esc(description) + '</p>' : '') + '</div>' + tool('关闭', 'close', 'close-modal') + '</div>'
    + (form ? '<form data-form="' + form + '">' : '') + '<div class="modal-body">' + content
    + (form ? '<p class="form-error" role="alert"></p>' : '') + '</div>' + (footer ? '<div class="modal-footer">' + footer + '</div>' : '') + (form ? '</form>' : '');
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
const confirmButton = label => '<button type="submit" class="btn primary">' + esc(label) + '</button>';
const cancelButton = button('取消', null, 'close-modal');
function procurementFields(p = {}) {
  return field(purchaseLabels.buyer, 'buyer', p.buyer, { max: 60 })
    + field(purchaseLabels.purchasedOn, 'purchasedOn', p.purchasedOn, { type: 'date', required: false })
    + field(purchaseLabels.purchaseApprover, 'purchaseApprover', p.purchaseApprover, { max: 60, required: false })
    + field(purchaseLabels.fundingProject, 'fundingProject', p.fundingProject, { max: 100, required: false })
    + field(purchaseLabels.unitPriceCents, 'unitPrice', priceText(p.unitPriceCents), { max: 21, required: false, inputMode: 'decimal', placeholder: '例如 125.50' });
}
function procurementRows(p) {
  return Object.entries(purchaseLabels).map(([key, label]) => [label, key === 'unitPriceCents' ? priceText(p[key]) : p[key]]);
}
function purchaseDetails(d, u) {
  const overrides = u ? [] : d.units.filter(unit => unit.purchase);
  const details = definition([...procurementRows(u?.purchase || d), ['所属项目', d.project],
    ...(u ? [['记录来源', u.purchase ? '单件采购记录' : '整组采购记录']] : [])]);
  const separate = overrides.length ? '<section class="purchase-overrides"><h3>另有单件采购记录</h3><div>'
    + overrides.map(unit => button(unit.code, 'file', 'purchase', keyed(d, unit), 'btn-flat')).join('') + '</div></section>' : '';
  modal(u ? '单件采购详情' : '采购详情', d.title + ' · ' + (u?.code || d.code), details + separate,
    (u ? button('整组采购详情', 'file', 'purchase', keyed(d)) : '') + button('关闭', null, 'close-modal'));
}
function deviceForm(d) {
  dialogData = { d };
  const adding = !d;
  const direct = !adding && data.user.role === 'super';
  const title = adding ? '申请新增设备' : direct ? '编辑设备' : '申请修改设备';
  const candidates = [...(data.managers || [])].sort((a, b) => Number(canReview(b)) - Number(canReview(a))
    || byName.compare(a.name, b.name) || a.id.localeCompare(b.id));
  const managers = [['', '暂未指定'], ...candidates.map(manager => [manager.id, manager.name])];
  if (d?.managerId && !managers.some(([id]) => id === d.managerId)) {
    managers.push([d.managerId, '保留当前负责人']);
  }
  const content = '<div class="form-grid">'
    + field('设备名称', 'title', d?.title, { max: 100, wide: true, placeholder: '填写型号或常用名称' })
    + field('数量', 'count', d?.units.length || 1, { type: 'number' })
    + field('存放位置', 'location', d?.location, { max: 100, placeholder: '如 A区 · 试验台 01' })
    + field('所属项目', 'project', d?.project, { max: 100, placeholder: '填写所属项目' })
    + field('设备管理员', 'managerId', d?.managerId, { choices: managers, required: false })
    + field('备注', 'note', d?.note, { area: true, wide: true, required: false })
    + '<section class="wide record-fields"><h3>采购信息</h3><div class="form-grid">'
    + procurementFields({ ...d, buyer: d?.buyer || data.user.name }) + '</div></section>'
    + (!direct ? field('申请说明', 'reason', '', { area: true, wide: true, max: 350, required: !adding }) : '')
    + '</div>' + (!adding ? '<p class="form-hint">增加数量会生成新的单件编号。减少数量会按编号由大到小移出空闲单件。</p>' : '');
  modal(title, adding ? '审核通过后，设备入库并生成单件编号。' : d.code + ' · ' + d.title, content,
    cancelButton + confirmButton(direct ? '保存设备' : '提交申请'), 'device');
}
function deviceMenu(d) {
  const attrs = keyed(d);
  const items = button('采购详情', 'file', 'purchase', attrs) + (d.archived
    ? button('删除设备', null, 'delete-device', attrs, 'warn') + button('恢复设备', 'archive', 'restore-device', attrs, 'primary')
    : button(data.user.role === 'super' ? '编辑设备' : '申请修改', 'pencil', 'edit-device', attrs)
      + (data.user.role === 'super' ? button('归档', 'archive', 'archive-device', attrs) : '')
      + (d.units.some(u => u.state === 'idle') ? button('申请', null, 'borrow', attrs, 'primary') : ''));
  modal(d.title, d.code, definition([['购买人', d.buyer], ['数量', String(d.units.length) + ' 件'], ['存放位置', d.location],
    ['所属项目', d.project], ['设备管理员', d.managerName], ['备注', d.note]])
    + '<div class="detail-badges">' + groupedStatus(d) + '</div>', items);
}
function unitMenu(d, u) {
  const attrs = keyed(d, u);
  const items = button('采购详情', 'file', 'purchase', attrs) + (d.archived ? '' :
    button(data.user.role === 'super' ? '编辑单件' : '申请修改单件', 'pencil', 'unit-edit', attrs)
    + button('申报异常', 'alert', 'fault', attrs)
    + (u.state === 'idle' ? button('申请', null, 'borrow', attrs, 'primary') : unitAction(d, u)));
  modal(u.code, d.title, definition([['状态', states[u.state]], ['存放位置', u.location || d.location],
    ...(u.state === 'use' ? [['使用人', u.userName], ['使用方式', loanLabel(u)], ['开始时间', prettyTime(u.since, true)],
      ...(u.dueOn ? [['预计归还日期', u.dueOn]] : [])] : []),
    ...(u.state === 'fault' ? [['异常情况', u.issue]] : []), ['备注', u.note]]), items);
}
function unitForm(kind, d, u) {
  const direct = kind === 'unit' && data.user.role === 'super';
  let content = '';
  dialogData = { d, u, kind, direct };
  if (kind === 'borrow') {
    const idle = d.units.filter(x => x.state === 'idle');
    const held = new Set(data.requests.filter(r => r.kind === 'borrow' && r.status === 'pending' && r.authorId === data.user.id).map(r => r.payload.unitId));
    const available = idle.filter(x => !held.has(x.id));
    if (!available.length || (u && !available.some(x => x.id === u.id))) {
      modal('当前单件不可重复申请', d.title, '<p class="form-hint">可在「我的申请」查看待审核的使用申请。</p>', button('我知道了', null, 'close-modal', '', 'primary'));
      return;
    }
    content += field('领用单件', 'unitId', u?.id || '', { wide: true, choices: [['', '请选择空闲单件'], ...available.map(x => [x.id, x.code + ' · ' + (x.location || d.location)])] });
    content += field('预计归还日期', 'dueOn', '', { wide: true, type: 'date', required: false });
  }
  if (kind === 'unit') {
    content += field('单件位置', 'location', u.location, { wide: true, required: false, placeholder: '留空时沿用整组设备位置', max: 100 })
      + field('单件备注', 'note', u.note, { area: true, wide: true, required: false })
      + field('采购记录', 'purchaseMode', u.purchase ? 'unit' : 'group', { wide: true, choices: [['group', '沿用整组采购信息'], ['unit', '填写单件采购信息']] })
      + '<div class="form-grid wide needs-purchase">' + procurementFields(u.purchase || d) + '</div>';
    if (direct) {
      content += field('状态', 'state', u.state, { wide: true, choices: Object.entries(states) })
        + '<div class="wide needs-holder" ' + (u.state === 'use' ? '' : 'hidden') + '>'
        + field('使用人', 'userId', u.userId, { wide: true, choices: [['', '请选择使用人'], ...data.accounts
          .filter(x => !x.disabled || x.id === u.userId).map(x => [x.id, x.name])] }) + '</div>'
        + '<div class="wide needs-issue" ' + (u.state === 'fault' ? '' : 'hidden') + '>'
        + field('异常情况', 'issue', u.issue, { wide: true, area: true, max: 350 }) + '</div>';
    }
  }
  if (kind === 'fault') content += field('异常情况', 'issue', '', { area: true, wide: true, max: 350, placeholder: '描述异常现象及发生条件' });
  if (!direct && kind !== 'fault') content += field('申请说明', 'reason', '', { area: true, wide: true, max: 350,
    placeholder: kind === 'borrow' ? '填写实验用途' : kind === 'return' ? '填写归还说明，例如已清洁并放回原位' : '说明需要修改的原因' });
  modal(direct ? '编辑单件' : kinds[kind], d.title + (u ? ' · ' + u.code : ''), '<div class="form-grid">' + content + '</div>',
    cancelButton + confirmButton(direct ? '保存修改' : '提交申请'), 'unit');
  if (kind === 'unit') syncUnitForm();
}
function syncUnitForm() {
  const state = dialog.querySelector('select[name=state]')?.value;
  for (const [key, selected, name] of [['holder', 'use', 'userId'], ['issue', 'fault', 'issue']]) {
    const box = dialog.querySelector('.needs-' + key);
    if (box) {
      box.hidden = state !== selected;
      box.querySelector('[name=' + name + ']').disabled = box.hidden;
    }
  }
  const purchaseBox = dialog.querySelector('.needs-purchase');
  if (purchaseBox) {
    purchaseBox.hidden = dialog.querySelector('[name=purchaseMode]').value !== 'unit';
    for (const control of purchaseBox.querySelectorAll('input')) control.disabled = purchaseBox.hidden;
  }
}

function quickReturnForm(d, u) {
  dialogData = { d, u };
  modal('归还', d.title, definition([['单件编号', u.code], ['存放位置', u.location || d.location]]),
    cancelButton + confirmButton('确认归还'), 'quick-return');
}

function requestDetail(r) {
  const d = findDevice(r.payload.deviceId);
  const isOwn = r.authorId === data.user.id;
  const canAct = canReviewRequest(data.user, r);
  const pending = r.status === 'pending';
  let fields = [['申请人', r.author], ['提交时间', prettyTime(r.time, true)], ['审核状态', outcomes[r.status]]];
  if (d?.managerName && r.kind !== 'edit') fields.push(['设备管理员', d.managerName]);
  if (r.kind === 'borrow' && r.payload.dueOn) fields.push(['预计归还日期', r.payload.dueOn]);
  if (r.reason) fields.push(['申请说明', r.reason]);
  if (r.comment || r.reviewer) fields.push(['审核人', r.reviewer], ['审核意见', r.comment], ['处理时间', prettyTime(r.closed, true)]);
  if (r.kind === 'add' || r.kind === 'edit') {
    const p = r.payload;
    const before = d ? { ...d, count: d.units.length } : null;
    const display = (key, value) => {
      if (key === 'unitPriceCents') return priceText(value) || '—';
      if (key === 'managerId') return (data.managers || []).find(manager => manager.id === value)?.name
        || (value && value === d?.managerId ? d.managerName : '') || '—';
      return value || '—';
    };
    const formFields = Object.entries(deviceLabels).filter(([key]) => Object.hasOwn(p, key)
      && (r.kind === 'add' || !pending || !before || display(key, before[key]) !== display(key, p[key])));
    fields = fields.concat(formFields.map(([key, label]) => [label,
      r.kind === 'edit' && pending && before ? display(key, before[key]) + ' → ' + display(key, p[key]) : display(key, p[key])]));
  }
  if (r.kind === 'fault') fields.push(['异常情况', r.payload.issue]);
  if (r.kind === 'unit') fields.push(['拟修改位置', r.payload.location || '沿用整组位置'], ['拟修改备注', r.payload.note]);
  if (r.kind === 'unit' && Object.hasOwn(r.payload, 'purchase')) {
    fields.push(['采购记录', r.payload.purchase ? '单件采购信息' : '沿用整组采购信息']);
    if (r.payload.purchase) fields.push(...procurementRows(r.payload.purchase));
  }
  const revoke = pending && (isOwn || data.user.role === 'super') ? button('撤回申请', null, 'request-cancel', 'data-id="' + esc(r.id) + '"') : '';
  dialogData = { r };
  modal(kinds[r.kind], r.target, definition(fields) + (canAct && pending ? '<div class="form-grid review-field">'
    + field('审核意见', 'comment', '', { wide: true, area: true, required: false, max: 350, placeholder: '驳回时请填写原因' }) + '</div>' : ''),
    canAct && pending ? revoke + '<button type="submit" class="btn warn" name="result" value="rejected">驳回</button>'
      + '<button type="submit" class="btn primary" name="result" value="approved">通过申请</button>' : revoke || button('关闭', null, 'close-modal'), canAct && pending ? 'review' : '');
}
function accountForm(u) {
  dialogData = { u };
  const local = data.mode === 'local';
  modal(u ? '编辑账号' : '添加账号', '', '<div class="form-grid">'
    + field('姓名', 'name', u?.name, { max: 60, wide: true })
    + field('用户名', 'username', u?.username, { readonly: !!u, wide: true, placeholder: '例如 zhang_san' })
    + field('角色', 'role', u?.role || 'member', { choices: Object.entries(roles).filter(([k]) => !u?.owner || k === 'super') })
    + field('账号状态', 'enabled', u?.disabled ? 'no' : 'yes', { choices: u?.owner ? [['yes', '启用']] : [['yes', '启用'], ['no', '停用']] })
    + (local ? field(u ? '新密码' : '初始密码', 'password', '', { type: 'password', wide: true, max: 128, required: !u, autocomplete: 'new-password',
      placeholder: u ? '留空保留原密码' : '至少 10 个字符' }) : '') + '</div>', cancelButton + confirmButton('保存账号'), 'account');
}
function confirmation(action, d, details, label) {
  dialogData = { d, action };
  modal(label, d.title, '<p class="confirm-detail">' + esc(details) + '</p>', cancelButton + confirmButton(label), 'confirm');
}
function deleteForm(d) {
  dialogData = { d };
  modal('删除归档设备', d.title + ' · ' + d.code, '<p class="confirm-detail">删除后无法恢复。历史操作和审批记录会保留。</p>'
    + '<div class="form-grid review-field">' + field('输入设备编号确认', 'code', '', { wide: true, placeholder: d.code }) + '</div>',
    cancelButton + '<button type="submit" class="btn warn">确认删除</button>', 'delete-device');
}
function signedOut() {
  const setup = auth?.setup;
  const needsPassword = data?.passwordChangeRequired;
  const headline = needsPassword ? '设置新密码' : loadError ? '暂时无法连接' : setup ? '初始化工作台' : '登录工作台';
  const content = needsPassword ? '<p>首次登录，请为 ' + esc(data.user.username) + ' 设置新密码。</p>'
    + '<form data-auth="password-change"><div class="form-grid">'
    + field('新密码', 'password', '', { wide: true, type: 'password', autocomplete: 'new-password', placeholder: '至少 10 个字符' })
    + field('确认新密码', 'confirmation', '', { wide: true, type: 'password', autocomplete: 'new-password' })
    + '</div><p class="form-error" role="alert"></p>' + confirmButton('保存并进入台账') + ' '
    + button('退出登录', 'logout', 'logout', '', 'btn-flat') + '</form>'
    : loadError ? '<p>' + esc(loadError) + '</p>' + button('重新连接', null, 'reload', '', 'primary')
    : '<form data-auth="' + (setup ? 'setup' : 'login') + '"><div class="form-grid">'
      + (setup ? field('初始化代码', 'code', '', { wide: true, placeholder: '复制服务启动窗口中的代码' }) + field('姓名', 'name', '', { wide: true, max: 60 }) : '')
      + field('用户名', 'username', '', { wide: true, autocomplete: 'username' })
      + field('密码', 'password', '', { wide: true, type: 'password', autocomplete: setup ? 'new-password' : 'current-password', placeholder: setup ? '至少 10 个字符' : '' })
      + '</div><p class="form-error" role="alert"></p>' + confirmButton(setup ? '创建超级管理员' : '登录') + '</form>';
  return '<div class="login-layout"><section class="login-brand"><img src="./lab-mark.svg" width="54" height="54" alt="">'
    + '<div><span>常志勇课题组</span><strong>资产与耗材<wbr>数字化管理平台</strong><p>设备登记、单件领用和审批记录。</p></div>'
    + '<div class="login-glyph">' + icon('grid', 285) + '</div></section><main class="login-main"><div class="login-card"><h1>' + headline + '</h1>'
    + content + '<a class="demo-link" href="/?demo=1">' + icon('switch', 17) + ' 进入演示工作台</a></div></main></div>';
}
function render() {
  const active = document.activeElement;
  const search = active?.dataset?.search;
  const caret = search ? [active.selectionStart, active.selectionEnd] : null;
  root.removeAttribute('aria-busy');
  if (!data || data.passwordChangeRequired) {
    root.innerHTML = signedOut();
    return;
  }
  const pages = { devices: devicesPage, mine: () => requestsPage(false), approvals: () => requestsPage(true), usage: usagePage,
    history: historyPage, accounts: accountsPage, notices: noticesPage };
  root.innerHTML = shell(pages[page()]());
  if (search) {
    const next = root.querySelector('[data-search="' + search + '"]');
    next?.focus({ preventScroll: true });
    if (next && caret) next.setSelectionRange(...caret);
  }
}
function exportCsv() {
  const records = filteredDevices();
  if (!records.length) return toast('当前筛选条件下没有可导出的设备', true);
  const cell = value => {
    const plain = String(value ?? '');
    return '"' + (/^[\s]*[=+\-@\t\r]/.test(plain) ? "'" + plain : plain).replaceAll('"', '""') + '"';
  };
  const rows = [['设备名称', '设备组编号', '组内数量', '单件编号', '购买人', '状态', '使用人', '异常情况', '存放位置', '所属项目',
    '设备备注', '单件备注', '购买日期', '购买审批人', '采购经费项目', '设备管理员', '使用方式', '预计归还日期', '单价（元）']];
  for (const d of records) {
    for (const u of d.units) {
      if (filters.state && u.state !== filters.state) continue;
      if (filters.location && (u.location || d.location) !== filters.location) continue;
      const p = u.purchase || d;
      rows.push([d.title, d.code, d.units.length, u.code, p.buyer, states[u.state], u.userName, u.issue, u.location || d.location,
        d.project, d.note, u.note, p.purchasedOn, p.purchaseApprover, p.fundingProject, d.managerName,
        u.state === 'use' ? loanLabel(u) : '', u.dueOn, priceText(p.unitPriceCents)]);
    }
  }
  if (rows.length === 1) return toast('当前筛选条件下没有可导出的单件', true);
  const blob = new Blob(['\ufeff', rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '实验室设备清单-' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('已导出 ' + (rows.length - 1) + ' 件设备');
}

const clear = () => { Object.assign(filters, { q: '', state: '', project: '', location: '' }); viewPage = 1; };
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor && root.contains(anchor)) {
    event.preventDefault();
    navigate(anchor.hash.slice(1));
    return;
  }
  const clicked = event.target.closest('[data-action]');
  if (!clicked) {
    if (profileOpen && !event.target.closest('.profile-wrap')) { profileOpen = false; render(); }
    return;
  }
  const action = clicked.dataset.action;
  const key = clicked.dataset.id;
  if (action === 'close-modal') return dialog.close();
  if (action === 'reload') return load();
  if (action === 'logout') return write('logout', {});
  if (!data) return;
  const d = findDevice(key);
  const u = findUnit(d, clicked.dataset.unit);
  switch (action) {
    case 'mobile': mobileOpen = !mobileOpen; render(); break;
    case 'profile': profileOpen = !profileOpen; render(); break;
    case 'demo-role': {
      const user = demoData.users.find(x => x.id === key);
      if (user.disabled) { toast('该演示账号已停用', true); return; }
      sessionStorage.setItem(userKey, key);
      data = demoView();
      navigate('devices');
      toast('已切换为' + roles[user.role]);
      break;
    }
    case 'to-devices': navigate('devices'); break;
    case 'notices': navigate('notices'); break;
    case 'mark-all': write('notice', { all: true }, '已标为已读'); break;
    case 'notices-more': secondaryPage++; render(); break;
    case 'notice-open': {
      const n = data.notices.find(x => x.id === key);
      const open = () => {
        const r = data.requests.find(x => x.id === n.requestId);
        if (r) requestDetail(r);
      };
      if (n.read) open();
      else write('notice', { id: key }, '', open);
      break;
    }
    case 'new-device': deviceForm(); break;
    case 'edit-device': deviceForm(d); break;
    case 'device-menu': deviceMenu(d); break;
    case 'unit-menu': unitMenu(d, u); break;
    case 'purchase': purchaseDetails(d, u); break;
    case 'quick-return': quickReturnForm(d, u); break;
    case 'borrow': case 'return': case 'fault': unitForm(action, d, u); break;
    case 'unit-edit': unitForm('unit', d, u); break;
    case 'archive-device': confirmation('archive', d, '归档后设备将移出当前清单，可在归档页恢复。', '归档设备'); break;
    case 'restore-device': confirmation('restore', d, '恢复后设备会重新出现在当前清单中。', '恢复设备'); break;
    case 'delete-device': deleteForm(d); break;
    case 'archive-toggle': filters.archived = !filters.archived; clear(); render(); break;
    case 'request-detail': requestDetail(data.requests.find(r => r.id === key)); break;
    case 'request-cancel': {
      dialogData = { r: data.requests.find(r => r.id === key), action: 'cancel' };
      modal('撤回申请', dialogData.r.target, '<p class="confirm-detail">撤回后，这条申请将结束审核流程。</p>', cancelButton + confirmButton('确认撤回'), 'confirm');
      break;
    }
    case 'account-new': accountForm(); break;
    case 'account-edit': accountForm(data.accounts.find(x => x.id === key)); break;
    case 'expand': if (expanded.has(key)) expanded.delete(key); else expanded.add(key); render(); break;
    case 'metric': filters.archived = false; filters.state = key === 'total' || filters.state === key ? '' : key; viewPage = 1; render(); break;
    case 'export': exportCsv(); break;
    case 'clear': clear(); render(); break;
    case 'device-page': viewPage = Number(key); render(); break;
    case 'list-page': secondaryPage = Number(key); render(); break;
    case 'list-tab': listFilter.status = key; secondaryPage = 1; render(); break;
  }
});

let composing = false;
function searchInput(event) {
  if (event.isComposing || composing) return;
  const element = event.target;
  if (element.dataset.search === 'devices' && filters.q !== element.value) { filters.q = element.value; viewPage = 1; render(); }
  if (element.dataset.search === 'list' && listFilter.q !== element.value) { listFilter.q = element.value; secondaryPage = 1; render(); }
}
document.addEventListener('input', searchInput);
document.addEventListener('compositionstart', event => { if (event.target.dataset.search) composing = true; });
document.addEventListener('compositionend', event => {
  if (event.target.dataset.search) { composing = false; searchInput(event); }
});
document.addEventListener('change', event => {
  const element = event.target;
  const usageKey = element.dataset.usageFilter;
  if (usageKey && Object.hasOwn(usageFilters, usageKey)) {
    usageFilters[usageKey] = element.value;
    secondaryPage = 1;
    render();
  }
  if (element.dataset.filter) {
    filters[element.dataset.filter] = element.value;
    viewPage = 1;
    render();
  }
  if (['state', 'purchaseMode'].includes(element.name) && element.closest('dialog')) syncUnitForm();
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (!form.dataset.form && !form.dataset.auth) return;
  event.preventDefault();
  const p = Object.fromEntries(new FormData(form));
  if (form.dataset.auth === 'password-change') {
    if (p.password !== p.confirmation) {
      form.querySelector('.form-error').textContent = '两次密码输入不一致';
      return;
    }
    return write('password-change', { password: p.password }, '新密码已保存');
  }
  if (form.dataset.auth) return write(form.dataset.auth, p, form.dataset.auth === 'setup' ? '已创建超级管理员' : '');
  const { d, u, r, kind, direct, action } = dialogData;
  if (form.dataset.form === 'device') {
    if (d) Object.assign(p, { deviceId: d.id, version: d.version });
    return d && data.user.role === 'super' ? write('edit', p, '设备台账已更新')
      : write('request', { kind: d ? 'edit' : 'add', payload: p }, '申请已提交，等待审核');
  }
  if (form.dataset.form === 'unit') {
    Object.assign(p, { deviceId: d.id, unitId: p.unitId || u?.id, version: u?.version });
    return direct ? write('unit', p, '单件信息已保存')
      : write('request', { kind, payload: p }, '申请已提交，等待审核');
  }
  if (form.dataset.form === 'quick-return') {
    return write('quick-return', { deviceId: d.id, unitId: u.id }, '已归还');
  }
  if (form.dataset.form === 'delete-device') {
    return write('delete-device', { id: d.id, version: d.version, code: p.code.trim() }, '已删除归档设备');
  }
  if (form.dataset.form === 'review') {
    const result = event.submitter?.value;
    if (result === 'rejected' && !p.comment.trim()) {
      form.querySelector('.form-error').textContent = '请填写驳回原因';
      form.elements.comment.focus();
      return;
    }
    return write('review', { id: r.id, result: result || 'approved', comment: p.comment }, '审核结果已发送');
  }
  if (form.dataset.form === 'account') return write('account', { ...p, id: u?.id, disabled: p.enabled === 'no' }, '账号已保存');
  if (form.dataset.form === 'confirm') {
    if (action === 'cancel') return write('cancel', { id: r.id }, '申请已撤回');
    return write(action, { id: d.id, version: d.version }, action === 'archive' ? '设备已归档' : '设备已恢复');
  }
});
dialog.addEventListener('close', () => {
  if (!dialog.open && dialogAnchor?.isConnected) dialogAnchor.focus({ preventScroll: true });
});
window.addEventListener('hashchange', () => {
  listFilter.q = '';
  listFilter.status = 'all';
  secondaryPage = 1;
  mobileOpen = false;
  profileOpen = false;
  render();
  window.scrollTo(0, 0);
});
load();
if (!demo) setInterval(() => {
  if (data && document.visibilityState === 'visible' && !busy) load(true);
}, 7000);
if (!demo) document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !busy) load(true);
});
