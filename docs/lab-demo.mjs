import { empty, mutate } from './lab-core.mjs';

export function sample() {
  const s = empty();
  s.users = [
    { id: 'demo-super', name: '林晓', email: 'lin@example.test', role: 'super', owner: true },
    { id: 'demo-admin', name: '何明', email: 'he@example.test', role: 'admin' },
    { id: 'demo-member', name: '陈宇', email: 'chen@example.test', role: 'member' },
    { id: 'demo-zhou', name: '周宁', email: 'zhou@example.test', role: 'member' },
    { id: 'demo-wu', name: '吴婷', email: 'wu@example.test', role: 'member' },
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
  for (const [title, buyer, count, location, project, note] of assets) {
    mutate(s, admin, 'add', { title, buyer, count, location, project, note });
  }
  s.devices.reverse();
  const offset = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString();
  for (const [index, holder, days] of [[0, member, 0], [2, zhou, 1], [3, wu, 1], [5, admin, 2], [7, zhou, 3]]) {
    const unit = s.devices[index].units[0];
    Object.assign(unit, { state: 'use', userId: holder.id, since: offset(days, 2) });
  }
  s.devices[0].units[1].location = 'A区 · 试验台 02';
  s.devices[0].units[1].note = '已完成校准';
  Object.assign(s.devices[4].units[0], { state: 'fault', issue: '运行时出现异常振动，待检查泵体。' });
  Object.assign(s.devices[6].units[0], { state: 'fault', issue: '目镜调焦卡滞，待维护。' });
  for (const h of s.history) h.time = offset(6);
  mutate(s, wu, 'request', { kind: 'add', payload: { title: '移液器', buyer: wu.name, count: 2, location: 'B区 · 样品制备室', project: '溶液制备', note: '10–100 μL', reason: '新购入实验室耗材与仪器' } });
  const d = s.devices[1];
  mutate(s, zhou, 'request', { kind: 'edit', payload: { ...d, deviceId: d.id, count: 4, reason: '同型号新采购一台，补充设备数量' } });
  const balance = s.devices[0];
  mutate(s, member, 'request', { kind: 'borrow', payload: { deviceId: balance.id, unitId: balance.units[1].id, reason: '称量材料表征实验样品' } });
  return s;
}
