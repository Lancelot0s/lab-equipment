export const roles = { member: '普通用户', admin: '管理员', super: '超级管理员' };
export const states = { idle: '空闲', use: '使用中', fault: '异常' };
export const kinds = { borrow: '长期使用申请', add: '新增设备', edit: '修改设备', unit: '修改单件', return: '归还申请', fault: '异常申报' };
export const outcomes = { pending: '待审核', approved: '已通过', rejected: '已驳回', cancelled: '已撤回' };
export const purchaseLabels = { buyer: '购买人', purchasedOn: '购买日期', purchaseApprover: '购买审批人',
  fundingProject: '采购经费项目', unitPriceCents: '单价（元）' };
export const deviceLabels = { title: '设备名称', count: '数量', location: '存放位置', project: '所属项目',
  managerId: '设备管理员', quickUse: '临时取用', note: '备注', ...purchaseLabels };
export const loanKinds = { quick: '临时取用', long: '长期使用', manual: '管理员登记' };
export const priceText = cents => Number.isSafeInteger(cents) && cents >= 0
  ? Math.floor(cents / 100) + '.' + String(cents % 100).padStart(2, '0') : '';
export function statDay(at) {
  const time = typeof at === 'number' ? at : Date.parse(at);
  return Number.isFinite(time) ? new Date(time + 8 * 3_600_000).toISOString().slice(0, 10) : '';
}
export const canReview = user => user.role === 'admin' || user.role === 'super';
export const empty = () => ({ users: [], devices: [], requests: [], notices: [], history: [], seq: 0 });
export const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const stamp = () => ({ id: id(), time: now() });
const person = (s, who) => s.users.find(u => u.id === who);
const name = (s, who) => person(s, who)?.name || '';
const getDevice = (s, key) => s.devices.find(d => d.id === key && !d.archived) || fail('设备已移出当前台账', 409);
const getUnit = (d, key) => d.units.find(u => u.id === key && !u.retired) || fail('这件设备已移出当前台账', 409);
const units = d => d.units.filter(u => !u.retired);
const own = (value, key) => Object.hasOwn(value, key);

function field(value, label, max, required = true) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') fail(label + '格式错误');
  const result = value.trim();
  if (required && !result) fail('请填写' + label);
  if (result.length > max) fail(label + '最多填写 ' + max + ' 个字符');
  return result;
}

function dateField(value, label) {
  const date = field(value, label, 10, false);
  if (!date) return '';
  const time = Date.parse(date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) {
    fail(label + '须为有效日期');
  }
  return date;
}

function unitPrice(value) {
  const text = field(typeof value === 'number' ? String(value) : value, '单价', 21, false);
  if (!text) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) fail('单价须为非负数字，最多保留两位小数');
  const [integer, fraction = ''] = text.split('.');
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) fail('单价超出可记录范围');
  return cents;
}

function procurement(p, defaults = {}) {
  return {
    buyer: field(p.buyer ?? defaults.buyer, purchaseLabels.buyer, 60),
    purchasedOn: dateField(p.purchasedOn ?? defaults.purchasedOn, purchaseLabels.purchasedOn),
    purchaseApprover: field(p.purchaseApprover ?? defaults.purchaseApprover, purchaseLabels.purchaseApprover, 60, false),
    fundingProject: field(p.fundingProject ?? defaults.fundingProject, purchaseLabels.fundingProject, 100, false),
    unitPriceCents: own(p, 'unitPrice') ? unitPrice(p.unitPrice) : defaults.unitPriceCents ?? null,
  };
}

function checkManager(s, managerId, previous) {
  if (!managerId || managerId === previous) return;
  const manager = person(s, managerId);
  if (!manager || manager.disabled || !canReview(manager)) fail('请选择已启用的管理员作为设备管理员', 409);
}

function details(s, p, d = {}) {
  const count = Number(p.count);
  if (!Number.isInteger(count) || count < 1 || count > 200) fail('数量须为 1 至 200 的整数');
  const managerId = field(p.managerId ?? d.managerId, '设备管理员', 80, false);
  checkManager(s, managerId, d.managerId);
  if (own(p, 'quickUse') && typeof p.quickUse !== 'boolean') fail('请选择临时取用规则');
  return {
    title: field(p.title, '设备名称', 100), ...procurement(p, d),
    count, location: field(p.location, '存放位置', 100), project: field(p.project, '所属项目', 100),
    note: field(p.note, '备注', 600, false), managerId, quickUse: p.quickUse ?? Boolean(d.quickUse),
  };
}

function unitDetails(p) {
  const info = { location: field(p.location, '单件位置', 100, false), note: field(p.note, '单件备注', 600, false) };
  if (p.purchaseMode === undefined) return info;
  if (p.purchaseMode === 'group') return { ...info, purchase: null };
  if (p.purchaseMode === 'unit') return { ...info, purchase: procurement(p) };
  return fail('请选择单件采购记录方式');
}

function addUnits(d, amount) {
  for (let n = 0; n < amount; n++) {
    d.lastUnit++;
    d.units.push({
      id: id(), code: d.code + '-' + String(d.lastUnit).padStart(2, '0'),
      state: 'idle', userId: '', issue: '', location: '', note: '', since: '', version: 1,
    });
  }
}

function writeDevice(s, p) {
  s.seq++;
  const { count, ...data } = p;
  const d = { ...data, id: id(), code: 'EQ-' + String(s.seq).padStart(3, '0'), version: 1, lastUnit: 0, units: [], archived: false };
  addUnits(d, count);
  s.devices.unshift(d);
  return d;
}

function changeDevice(d, p) {
  if (p.version !== d.version) fail('设备信息已更新，请刷新后重新提交修改', 409);
  const current = units(d);
  const delta = p.count - current.length;
  if (delta < 0) {
    const removable = current.filter(u => u.state === 'idle');
    if (removable.length < -delta) fail('可移出的空闲单件不足，请先处理在用或异常设备', 409);
    for (const unit of removable.slice(delta)) {
      unit.retired = true;
      unit.version++;
    }
  }
  if (delta > 0) addUnits(d, delta);
  for (const key of Object.keys(deviceLabels)) if (key !== 'count' && own(p, key)) d[key] = p[key];
  d.version++;
}

function audit(s, user, action, target, detail = '', usage) {
  s.history.unshift({ ...stamp(), actor: user.name, actorId: user.id, action, target, detail, ...(usage ? { usage } : {}) });
}

function notice(s, recipient, title, detail, requestId) {
  s.notices.unshift({ ...stamp(), recipient, title, detail, requestId, read: false });
}

function targetOf(d, u) {
  return d ? d.title + (u ? ' / ' + u.code : '') : '';
}

function unitDetailChanges(d, unit, changes) {
  const labels = { location: '位置', note: '备注' };
  const detail = Object.keys(labels).filter(key => (unit[key] || '') !== changes[key])
    .map(key => labels[key] + '：' + (unit[key] || '—') + ' → ' + (changes[key] || '—'));
  if (own(changes, 'purchase')) {
    if (Boolean(unit.purchase) !== Boolean(changes.purchase)) {
      detail.push(changes.purchase ? '改为单件采购信息' : '改用整组采购信息');
    }
    const before = unit.purchase || d;
    const after = changes.purchase || d;
    for (const [key, label] of Object.entries(purchaseLabels)) {
      const previous = key === 'unitPriceCents' ? priceText(before[key]) : before[key] || '';
      const next = key === 'unitPriceCents' ? priceText(after[key]) : after[key] || '';
      if (previous !== next) {
        detail.push(label + '：' + (previous || '—') + ' → ' + (next || '—'));
      }
    }
  }
  return detail;
}

function apply(s, user, kind, payload) {
  const p = payload;
  if (kind === 'add') {
    checkManager(s, p.managerId);
    return { target: targetOf(writeDevice(s, p)), detail: '登记 ' + p.count + ' 件 · ' + p.location };
  }
  const d = getDevice(s, p.deviceId);
  if (kind === 'edit') {
    checkManager(s, p.managerId, d.managerId);
    const before = { ...d, count: units(d).length };
    changeDevice(d, p);
    const display = (key, value) => {
      if (key === 'quickUse') return value ? '免审批' : '需审批';
      if (key === 'managerId') return name(s, value) || '—';
      if (key === 'unitPriceCents') return priceText(value) || '—';
      return value || '—';
    };
    const changes = Object.keys(deviceLabels).filter(key => own(p, key) && display(key, before[key]) !== display(key, p[key]));
    return { target: targetOf(d), detail: changes.map(key => deviceLabels[key] + '：' + display(key, before[key]) + ' → ' + display(key, p[key])).join('；') || '保存设备资料' };
  }
  const unit = getUnit(d, p.unitId);
  const prior = states[unit.state] + (unit.userId ? ' · ' + name(s, unit.userId) : '') + (unit.issue ? ' · ' + unit.issue : '');
  if (kind === 'borrow' || kind === 'quick-borrow') {
    if (kind === 'quick-borrow' && !d.quickUse) fail('此设备需提交长期使用申请', 403);
    if (unit.state !== 'idle') fail('这件设备已不可领用，请选择其他空闲单件', 409);
    Object.assign(unit, { state: 'use', userId: user.id, issue: '', since: now(),
      loanMode: kind === 'quick-borrow' ? 'quick' : 'long', dueOn: kind === 'borrow' ? p.dueOn || '' : '' });
  } else if (kind === 'return' || kind === 'quick-return') {
    if (unit.state !== 'use' || unit.userId !== user.id) fail('该设备已不在你的领用名下', 409);
    if (kind === 'quick-return' && unit.loanMode !== 'quick') fail('长期领用请提交归还申请', 403);
    Object.assign(unit, { state: 'idle', userId: '', issue: '', since: '', loanMode: '', dueOn: '' });
  } else if (kind === 'fault') {
    if (unit.version !== p.version) fail('单件信息已变更，请核对后重新提交异常申报', 409);
    Object.assign(unit, { state: 'fault', userId: '', issue: p.issue, since: '', loanMode: '', dueOn: '' });
  } else if (kind === 'unit') {
    if (unit.version !== p.version) fail('单件信息已变更，请按当前状态重新提交', 409);
    const changes = unitDetailChanges(d, unit, p);
    Object.assign(unit, { location: p.location, note: p.note }, own(p, 'purchase') ? { purchase: p.purchase } : {});
    unit.version++;
    return { target: targetOf(d, unit), detail: changes.join('；') || '保存单件资料' };
  } else {
    fail('不支持的申请类型');
  }
  unit.version++;
  const current = states[unit.state] + (unit.userId ? ' · ' + name(s, unit.userId) : '') + (unit.issue ? ' · ' + unit.issue : '');
  return { target: targetOf(d, unit), detail: prior + ' → ' + current + (unit.dueOn ? '；预计归还：' + unit.dueOn : '') };
}

function requestPayload(s, user, kind, input) {
  if (kind === 'add') return details(s, input);
  const d = getDevice(s, input.deviceId);
  if (kind === 'edit') {
    if (input.version !== d.version) fail('设备信息已更新，请重新打开表单', 409);
    return { ...details(s, input, d), deviceId: d.id, version: d.version };
  }
  const u = getUnit(d, input.unitId);
  if (kind === 'borrow' && u.state !== 'idle') fail('请选择空闲单件');
  if (kind === 'return' && (u.state !== 'use' || u.userId !== user.id)) fail('请选择你正在使用的设备');
  if (['unit', 'fault'].includes(kind) && input.version !== u.version) fail('单件信息已更新，请重新打开表单', 409);
  const keys = { deviceId: d.id, unitId: u.id, version: u.version };
  if (kind === 'fault') return { ...keys, issue: field(input.issue, '异常情况', 350) };
  if (kind === 'unit') return { ...keys, ...unitDetails(input) };
  if (kind === 'borrow') return { ...keys, dueOn: dateField(input.dueOn, '预计归还日期') };
  return keys;
}

function submit(s, user, kind, input) {
  if (!own(kinds, kind)) fail('请选择有效的申请类型');
  const payload = requestPayload(s, user, kind, input);
  const reason = field(input.reason, '申请说明', 350, kind !== 'add' && kind !== 'fault');
  if (s.requests.some(r => r.status === 'pending' && r.authorId === user.id && r.kind === kind &&
    (payload.unitId ? r.payload.unitId === payload.unitId : payload.deviceId ? r.payload.deviceId === payload.deviceId : r.payload.title === payload.title))) {
    fail('已有同类申请在等待审核', 409);
  }
  const d = payload.deviceId && getDevice(s, payload.deviceId);
  const target = d ? targetOf(d, payload.unitId ? getUnit(d, payload.unitId) : null) : payload.title;
  const req = { ...stamp(), kind, payload, reason, target, authorId: user.id, author: user.name, status: 'pending' };
  s.requests.unshift(req);
  audit(s, user, '提交' + kinds[kind], target, payload.issue || reason);
  const reviewers = s.users.filter(u => !u.disabled && canReview(u) && (u.id !== user.id || u.role === 'super'));
  const assigned = d ? d.managerId : payload.managerId;
  const recipients = reviewers.some(u => u.id === assigned)
    ? reviewers.filter(u => u.id === assigned || u.role === 'super') : reviewers;
  for (const reviewer of recipients) {
    notice(s, reviewer.id, '待审核 · ' + kinds[kind], user.name + ' · ' + target, req.id);
  }
}

export function mutate(s, user, action, body = {}) {
  const p = body || {};
  if (action === 'quick-borrow' || action === 'quick-return') {
    const result = apply(s, user, action, p);
    const usage = action === 'quick-borrow' ? { deviceId: p.deviceId, userId: user.id, mode: 'quick' } : undefined;
    audit(s, user, action === 'quick-borrow' ? '登记临时取用' : '登记临时归还', result.target, result.detail, usage);
    return;
  }
  if (action === 'request') {
    submit(s, user, p.kind, p.payload || {});
    return;
  }
  if (action === 'review' || action === 'cancel') {
    const r = s.requests.find(item => item.id === p.id);
    if (!r || r.status !== 'pending') fail('这条申请已处理或已撤回', 409);
    if (action === 'cancel') {
      if (r.authorId !== user.id && user.role !== 'super') fail('没有撤回权限', 403);
      r.status = 'cancelled';
      r.closed = now();
      audit(s, user, '撤回' + kinds[r.kind], r.target);
      return;
    }
    if (!canReview(user) || (r.authorId === user.id && user.role !== 'super')) fail('没有审核这条申请的权限', 403);
    if (!['approved', 'rejected'].includes(p.result)) fail('请选择审核结果');
    const comment = field(p.comment, '审核意见', 350, p.result === 'rejected');
    let applied;
    if (p.result === 'approved') {
      const author = person(s, r.authorId);
      if (!author || (r.kind === 'borrow' && author.disabled)) fail('申请人的账户已停用，请驳回申请', 409);
      applied = apply(s, author, r.kind, r.payload);
    }
    Object.assign(r, { status: p.result, comment, reviewer: user.name, closed: now() });
    audit(s, user, outcomes[p.result] + ' · ' + kinds[r.kind], applied?.target || r.target, [applied?.detail, comment].filter(Boolean).join('；'));
    notice(s, r.authorId, outcomes[p.result] + ' · ' + kinds[r.kind], [r.target, comment].filter(Boolean).join(' · '), r.id);
    return;
  }
  if (action === 'notice') {
    for (const n of s.notices) if (n.recipient === user.id && (p.all === true || n.id === p.id)) n.read = true;
    return;
  }
  if (action === 'add' && canReview(user)) {
    const result = apply(s, user, 'add', details(s, p));
    audit(s, user, '登记设备', result.target, result.detail);
    return;
  }
  if (user.role !== 'super') fail('没有执行此操作的权限', 403);
  if (action === 'edit') {
    const result = apply(s, user, 'edit', requestPayload(s, user, 'edit', p));
    audit(s, user, '修改设备', result.target, result.detail);
    return;
  }
  if (action === 'unit') {
    const d = getDevice(s, p.deviceId);
    const u = getUnit(d, p.unitId);
    if (p.version !== u.version) fail('单件信息已更新，请重新打开表单', 409);
    if (!own(states, p.state)) fail('请选择有效的设备状态');
    const holder = p.state === 'use' ? person(s, p.userId) : null;
    if (p.state === 'use' && (!holder || (holder.disabled && holder.id !== u.userId))) fail('请选择有效的使用人');
    const previous = states[u.state] + (u.userId ? ' · ' + name(s, u.userId) : '') + (u.issue ? ' · ' + u.issue : '');
    const info = unitDetails(p);
    const issue = p.state === 'fault' ? field(p.issue, '异常情况', 350) : '';
    const detail = unitDetailChanges(d, u, info);
    const sameLoan = p.state === 'use' && u.state === 'use' && u.userId === holder.id;
    const since = p.state === 'use' ? (sameLoan && u.since) || now() : '';
    Object.assign(u, info, { state: p.state, userId: holder?.id || '', issue, since, version: u.version + 1,
      loanMode: sameLoan ? u.loanMode || '' : '', dueOn: sameLoan ? u.dueOn || '' : '' });
    const current = states[u.state] + (holder ? ' · ' + holder.name : '') + (issue ? ' · ' + issue : '');
    if (previous !== current) detail.unshift(previous + ' → ' + current);
    const usage = holder && !sameLoan ? { deviceId: d.id, userId: holder.id, mode: 'manual' } : undefined;
    audit(s, user, '修改单件', targetOf(d, u), detail.join('；') || '保存单件资料', usage);
    return;
  }
  if (action === 'archive') {
    const d = getDevice(s, p.id);
    if (d.version !== p.version) fail('设备信息已更新，请刷新后重试', 409);
    if (units(d).some(u => u.state === 'use')) fail('请先归还或调整在用单件的状态', 409);
    d.archived = true;
    d.version++;
    audit(s, user, '归档设备', d.title, '归档 ' + units(d).length + ' 件设备');
    return;
  }
  if (action === 'restore') {
    const d = s.devices.find(item => item.id === p.id && item.archived);
    if (!d) fail('找不到这组已归档设备', 409);
    d.archived = false;
    d.version++;
    audit(s, user, '恢复设备', d.title, '恢复 ' + units(d).length + ' 件设备');
    return;
  }
  if (action === 'account') {
    const displayName = field(p.name, '姓名', 60);
    if (!own(roles, p.role)) fail('请选择有效的用户角色');
    const account = p.id ? person(s, p.id) : null;
    if (p.id && !account) fail('找不到该账号', 404);
    const loginField = p.username === undefined ? 'email' : 'username';
    const login = field(p[loginField], loginField === 'username' ? '用户名' : '登录邮箱', 160).toLowerCase();
    if (account && login !== (account.username || account.email)) fail('已有账号的用户名不可修改');
    if (!account) {
      if (loginField === 'username' && !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(login)) {
        fail('用户名须为 2 至 64 个字符，以字母或数字开头，可包含点、下划线或连字符');
      }
      if (loginField === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) fail('请输入有效的电子邮箱');
      if (s.users.some(u => (u.username || u.email) === login)) fail('该用户名已存在', 409);
    }
    const disabled = p.disabled === true;
    if (account?.id === user.id && (disabled || p.role !== 'super')) fail('请由其他超级管理员调整你的账号', 409);
    if (account?.owner && (disabled || p.role !== 'super')) fail('系统所有者须保留超级管理员权限', 409);
    const values = { name: displayName, role: p.role, disabled };
    if (p.credential) values.credential = p.credential;
    if (account) {
      Object.assign(account, values);
    } else {
      s.users.push({ ...values, id: id(), [loginField]: login });
    }
    audit(s, user, account ? '更新账号' : '添加账号', displayName, roles[p.role] + (disabled ? ' · 停用' : ' · 启用') + (account && p.credential ? ' · 重置密码' : ''));
    return;
  }
  fail('不支持的操作');
}

function usageByDay(s, user) {
  const active = s.devices.filter(d => !d.archived);
  const visible = new Set(active.map(d => d.id));
  const deviceCode = new Map(active.map(d => [d.code, d.id]));
  const buckets = new Map();
  function count(deviceId, time, mode, holder) {
    if (!visible.has(deviceId)) return;
    const day = statDay(time);
    if (!day) return;
    const key = [deviceId, day, mode].join('|');
    const row = buckets.get(key) || { deviceId, day, mode, count: 0, mine: 0 };
    row.count++;
    if (holder === user.id) row.mine++;
    buckets.set(key, row);
  }
  for (const r of s.requests) {
    if (r.kind === 'borrow' && r.status === 'approved') count(r.payload.deviceId, r.closed, 'long', r.authorId);
  }
  for (const entry of s.history) {
    if (entry.usage) {
      count(entry.usage.deviceId, entry.time, entry.usage.mode, entry.usage.userId);
    } else if (entry.action === '登记临时取用') {
      const group = entry.target?.match(/ \/ (EQ-\d+)-\d+$/)?.[1];
      count(deviceCode.get(group), entry.time, 'quick', entry.actorId);
    }
  }
  return [...buckets.values()];
}

export function view(s, user) {
  if (user.disabled) fail('该账号已停用', 403);
  const staff = canReview(user);
  return {
    user: { id: user.id, name: user.name, role: user.role, username: user.username || user.email },
    managers: s.users.filter(u => !u.disabled && canReview(u)).map(({ id, name }) => ({ id, name })),
    devices: s.devices.filter(d => !d.archived || user.role === 'super')
      .map(d => ({ ...d, managerName: d.managerId ? name(s, d.managerId) : '', units: units(d).map(u => ({ ...u, userName: name(s, u.userId) })) })),
    usage: usageByDay(s, user),
    requests: s.requests.filter(r => staff || r.authorId === user.id),
    history: s.history.filter(h => staff || h.actorId === user.id).map(({ usage, ...entry }) => entry),
    notices: s.notices.filter(n => n.recipient === user.id).map(n => ({
      ...n, pending: s.requests.some(r => r.id === n.requestId && r.status === 'pending'),
    })),
    accounts: user.role === 'super' ? s.users.map(({ id, username, email, name, role, disabled, owner }) => (
      { id, username: username || email, name, role, disabled: Boolean(disabled), owner: Boolean(owner) }
    )) : [],
  };
}
