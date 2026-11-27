import { empty, mutate } from './lab-core.mjs';

export function sample() {
  const s = empty();
  s.users = [
    { id: 'demo-super', name: '林晓', username: 'lin_xiao', role: 'super', owner: true },
    { id: 'demo-admin', name: '何明', username: 'he_ming', role: 'admin' },
    { id: 'demo-member', name: '陈宇', username: 'chen_yu', role: 'member' },
    { id: 'demo-zhou', name: '周宁', username: 'zhou_ning', role: 'member' },
    { id: 'demo-wu', name: '吴婷', username: 'wu_ting', role: 'member' },
  ];
  const [superuser, admin, member, zhou, wu] = s.users;
  const assets = [
    ['电子天平', '陈宇', 4, 'A区 · 试验台 01', '材料表征', '分析天平，精度 0.1 mg'],
    ['高速离心机', '周宁', 3, 'B区 · 样品制备室', '样品前处理', '使用后擦拭转子内壁'],
    ['紫外可见分光光度计', '何明', 2, 'A区 · 光学测量室', '光谱分析', '配备石英比色皿'],
    ['恒温干燥箱', '林晓', 5, 'C区 · 热处理室', '材料表征', '试验后记录箱内温度'],
    ['真空泵', '吴婷', 2, 'B区 · 通风柜 02', '样品前处理', '检查油位后再启动'],
    ['数显磁力搅拌器', '陈宇', 3, 'B区 · 试验台 03', '溶液制备', ''],
    ['光学显微镜', '周宁', 2, 'A区 · 光学测量室', '光谱分析', ''],
    ['便携式数据采集仪', '何明', 3, 'C区 · 仪器柜 01', '材料表征', '配套信号线存放在仪器柜'],
  ];
  for (const [index, [title, buyer, count, location, project, note]] of assets.entries()) {
    mutate(s, admin, 'add', { title, buyer, count, location, project, note,
      purchasedOn: '2026-09-' + String(10 + index), purchaseApprover: superuser.name,
      fundingProject: index === 0 ? '实验室仪器平台建设' : project,
      managerId: admin.id, quickUse: index === 5, unitPrice: [2900, 6900, 16200, 3750, 1300, 280, 5200, 4880][index] });
  }
  s.devices.reverse();
  const offset = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString();
  const historicalUse = (d, unit, holder, time) => {
    const target = d.title + ' / ' + unit.code;
    if (d.quickUse) {
      s.history.unshift({ id: crypto.randomUUID(), time, actor: holder.name, actorId: holder.id, action: '登记临时取用', target,
        detail: '空闲 → 使用中 · ' + holder.name, usage: { deviceId: d.id, userId: holder.id, mode: 'quick' } });
      return;
    }
    s.requests.unshift({ id: crypto.randomUUID(), kind: 'borrow', time, closed: time, target, status: 'approved',
      author: holder.name, authorId: holder.id, reviewer: admin.name, reason: '实验样品测试',
      payload: { deviceId: d.id, unitId: unit.id } });
  };
  for (const [index, days] of [[0, [33, 22, 16, 9, 6, 5, 4, 2, 1]], [1, [20, 8, 5, 3]], [2, [16, 7, 4]],
    [3, [19, 8, 3, 1]], [4, [43, 30, 11]], [5, [16, 13, 6, 4, 3, 2, 1, 0]], [7, [25, 12, 4]]]) {
    const d = s.devices[index];
    for (const [i, day] of days.entries()) historicalUse(d, d.units[i % d.units.length], [member, zhou, wu][i % 3], offset(day, 1));
  }
  for (const [index, holder, days] of [[0, member, 0], [2, zhou, 1], [3, wu, 1], [5, admin, 2], [7, zhou, 3]]) {
    const d = s.devices[index];
    const unit = d.units[0];
    Object.assign(unit, { state: 'use', userId: holder.id, since: offset(days, 2),
      loanMode: index === 5 ? 'quick' : 'long', dueOn: index === 5 ? '' : offset(-7).slice(0, 10) });
    historicalUse(d, unit, holder, unit.since);
  }
  s.devices[0].units[1].location = 'A区 · 试验台 02';
  s.devices[0].units[1].note = '已完成校准';
  s.devices[0].units[1].purchase = { buyer: '周宁', purchasedOn: '2026-10-12',
    purchaseApprover: superuser.name, fundingProject: '材料测试补充经费', unitPriceCents: 298_050 };
  Object.assign(s.devices[4].units[0], { state: 'fault', issue: '运行时出现异常振动，待检查泵体。' });
  Object.assign(s.devices[6].units[0], { state: 'fault', issue: '目镜调焦卡滞，待维护。' });
  for (const h of s.history.filter(entry => entry.action === '登记设备')) h.time = offset(60);
  s.history.sort((a, b) => b.time.localeCompare(a.time));
  s.requests.sort((a, b) => b.time.localeCompare(a.time));
  mutate(s, wu, 'request', { kind: 'add', payload: { title: '移液器', buyer: wu.name, count: 2, location: 'B区 · 样品制备室', project: '溶液制备', note: '10–100 μL', reason: '新购入实验室耗材与仪器' } });
  const d = s.devices[1];
  mutate(s, zhou, 'request', { kind: 'edit', payload: { ...d, deviceId: d.id, count: 4, reason: '同型号新采购一台，补充设备数量' } });
  const balance = s.devices[0];
  mutate(s, member, 'request', { kind: 'borrow', payload: { deviceId: balance.id, unitId: balance.units[1].id,
    reason: '称量材料表征实验样品', dueOn: offset(-4).slice(0, 10) } });
  return s;
}
