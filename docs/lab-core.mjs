export const roles = { member: '普通用户', admin: '管理员', super: '超级管理员' };
export const states = { idle: '空闲', use: '使用中', fault: '异常' };
export const kinds = { borrow: '使用申请', add: '新增设备', edit: '修改设备', unit: '修改单件', return: '归还申请', fault: '异常申报' };
export const outcomes = { pending: '待审核', approved: '已通过', rejected: '已驳回', cancelled: '已撤回' };
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

function details(p) {
  const count = Number(p.count);
  if (!Number.isInteger(count) || count < 1 || count > 200) fail('数量须为 1 至 200 的整数');
  return {
    title: field(p.title, '设备名称', 100), buyer: field(p.buyer, '购买人', 60),
    count, location: field(p.location, '存放位置', 100), project: field(p.project, '所属项目', 100),
    note: field(p.note, '备注', 600, false),
  };
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
  for (const key of ['title', 'buyer', 'location', 'project', 'note']) d[key] = p[key];
  d.version++;
}

function audit(s, user, action, target, detail = '') {
  s.history.unshift({ ...stamp(), actor: user.name, actorId: user.id, action, target, detail });
}

function notice(s, recipient, title, detail, requestId) {
  s.notices.unshift({ ...stamp(), recipient, title, detail, requestId, read: false });
}

function targetOf(d, u) {
  return d ? d.title + (u ? ' / ' + u.code : '') : '';
}

function apply(s, user, kind, payload) {
  const p = payload;
  if (kind === 'add') return { target: targetOf(writeDevice(s, p)), detail: '登记 ' + p.count + ' 件 · ' + p.location };
  const d = getDevice(s, p.deviceId);
  if (kind === 'edit') {
    const before = { ...d, count: units(d).length };
    changeDevice(d, p);
    const labels = { title: '名称', buyer: '购买人', count: '数量', location: '位置', project: '项目', note: '备注' };
    const changes = Object.keys(labels).filter(key => before[key] !== p[key]);
    return { target: targetOf(d), detail: changes.map(key => labels[key] + '：' + (before[key] || '—') + ' → ' + (p[key] || '—')).join('；') || '保存设备资料' };
  }
  const unit = getUnit(d, p.unitId);
  const prior = states[unit.state] + (unit.userId ? ' · ' + name(s, unit.userId) : '') + (unit.issue ? ' · ' + unit.issue : '');
  if (kind === 'borrow') {
    if (unit.state !== 'idle') fail('这件设备已不可领用，请选择其他空闲单件', 409);
    Object.assign(unit, { state: 'use', userId: user.id, issue: '', since: now() });
  } else if (kind === 'return') {
    if (unit.state !== 'use' || unit.userId !== user.id) fail('该设备已不在你的领用名下', 409);
    Object.assign(unit, { state: 'idle', userId: '', issue: '', since: '' });
  } else if (kind === 'fault') {
    if (unit.version !== p.version) fail('单件信息已变更，请核对后重新提交异常申报', 409);
    Object.assign(unit, { state: 'fault', userId: '', issue: p.issue, since: '' });
  } else if (kind === 'unit') {
    if (unit.version !== p.version) fail('单件信息已变更，请按当前状态重新提交', 409);
    const before = { location: unit.location, note: unit.note };
    Object.assign(unit, { location: p.location, note: p.note });
    unit.version++;
    const changes = [];
    if (before.location !== p.location) changes.push('位置：' + (before.location || '随组') + ' → ' + (p.location || '随组'));
    if (before.note !== p.note) changes.push('备注：' + (before.note || '—') + ' → ' + (p.note || '—'));
    return { target: targetOf(d, unit), detail: changes.join('；') || '保存单件资料' };
  } else {
    fail('不支持的申请类型');
  }
  unit.version++;
  const current = states[unit.state] + (unit.userId ? ' · ' + name(s, unit.userId) : '') + (unit.issue ? ' · ' + unit.issue : '');
  return { target: targetOf(d, unit), detail: prior + ' → ' + current };
}

function requestPayload(s, user, kind, input) {
  if (kind === 'add') return details(input);
  const d = getDevice(s, input.deviceId);
  if (kind === 'edit') {
    if (input.version !== d.version) fail('设备信息已更新，请重新打开表单', 409);
    return { ...details(input), deviceId: d.id, version: d.version };
  }
  const u = getUnit(d, input.unitId);
  if (kind === 'borrow' && u.state !== 'idle') fail('请选择空闲单件');
  if (kind === 'return' && (u.state !== 'use' || u.userId !== user.id)) fail('请选择你正在使用的设备');
  if (['unit', 'fault'].includes(kind) && input.version !== u.version) fail('单件信息已更新，请重新打开表单', 409);
  const keys = { deviceId: d.id, unitId: u.id, version: u.version };
  if (kind === 'fault') return { ...keys, issue: field(input.issue, '异常情况', 350) };
  if (kind === 'unit') return { ...keys, location: field(input.location, '单件位置', 100, false), note: field(input.note, '单件备注', 600, false) };
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
  for (const reviewer of s.users.filter(u => !u.disabled && canReview(u) && (u.id !== user.id || u.role === 'super'))) {
    notice(s, reviewer.id, '待审核 · ' + kinds[kind], user.name + ' · ' + target, req.id);
  }
}

export function mutate(s, user, action, body = {}) {
  const p = body || {};
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
    const result = apply(s, user, 'add', details(p));
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
    const location = field(p.location, '单件位置', 100, false);
    const note = field(p.note, '单件备注', 600, false);
    const issue = p.state === 'fault' ? field(p.issue, '异常情况', 350) : '';
    const detail = [];
    if (u.location !== location) detail.push('位置：' + (u.location || '随组') + ' → ' + (location || '随组'));
    if (u.note !== note) detail.push('备注：' + (u.note || '—') + ' → ' + (note || '—'));
    const since = p.state === 'use' ? u.userId === holder.id && u.since ? u.since : now() : '';
    Object.assign(u, { state: p.state, userId: holder?.id || '', issue, since, location, note, version: u.version + 1 });
    const current = states[u.state] + (holder ? ' · ' + holder.name : '') + (issue ? ' · ' + issue : '');
    if (previous !== current) detail.unshift(previous + ' → ' + current);
    audit(s, user, '修改单件', targetOf(d, u), detail.join('；') || '保存单件资料');
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
    const email = field(p.email, '登录账号', 160).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('请输入有效的电子邮箱');
    const displayName = field(p.name, '姓名', 60);
    if (!own(roles, p.role)) fail('请选择有效的用户角色');
    const account = p.id ? person(s, p.id) : null;
    if (p.id && !account) fail('找不到该账号', 404);
    if (!account && s.users.some(u => u.email === email)) fail('该邮箱已经存在', 409);
    if (account && email !== account.email) fail('已有账号的登录邮箱不可修改');
    const disabled = p.disabled === true;
    if (account?.id === user.id && (disabled || p.role !== 'super')) fail('请由其他超级管理员调整你的账号', 409);
    if (account?.owner && (disabled || p.role !== 'super')) fail('系统所有者须保留超级管理员权限', 409);
    const values = { name: displayName, role: p.role, disabled };
    if (p.credential) values.credential = p.credential;
    if (account) {
      Object.assign(account, values);
    } else {
      s.users.push({ ...values, id: id(), email });
    }
    audit(s, user, account ? '更新账号' : '添加账号', displayName, roles[p.role] + (disabled ? ' · 停用' : ' · 启用') + (account && p.credential ? ' · 重置密码' : ''));
    return;
  }
  fail('不支持的操作');
}

export function view(s, user) {
  if (user.disabled) fail('该账号已停用', 403);
  const staff = canReview(user);
  return {
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
    devices: s.devices.filter(d => !d.archived || user.role === 'super')
      .map(d => ({ ...d, units: units(d).map(u => ({ ...u, userName: name(s, u.userId) })) })),
    requests: s.requests.filter(r => staff || r.authorId === user.id),
    history: s.history.filter(h => staff || h.actorId === user.id),
    notices: s.notices.filter(n => n.recipient === user.id).map(n => ({
      ...n, pending: s.requests.some(r => r.id === n.requestId && r.status === 'pending'),
    })),
    accounts: user.role === 'super' ? s.users.map(({ id, email, name, role, disabled, owner }) => (
      { id, email, name, role, disabled: Boolean(disabled), owner: Boolean(owner) }
    )) : [],
  };
}
