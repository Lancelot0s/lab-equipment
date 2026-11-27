import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { empty, fail, mutate, view } from './docs/lab-core.mjs';

const host = process.env.LAB_HOST || '127.0.0.1';
const port = Number(process.env.LAB_PORT || 8787);
const origin = process.env.LAB_ORIGIN || 'http://' + host + ':' + port;
const secure = origin.startsWith('https://');
const loopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
if (!loopback && !secure) throw new Error('使用非本机地址时，请配置 HTTPS 反向代理并设置 LAB_ORIGIN。');
const dataDir = process.env.LAB_DATA_DIR ? resolve(process.env.LAB_DATA_DIR) : fileURLToPath(new URL('./data', import.meta.url));
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(dataDir + '/lab.sqlite');
db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
db.exec('CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);');
db.prepare('INSERT OR IGNORE INTO workspace (id, data) VALUES (1, ?)').run(JSON.stringify(empty()));
const get = db.prepare('SELECT data FROM workspace WHERE id = 1');
const save = db.prepare('UPDATE workspace SET data = ? WHERE id = 1');
const fetchSession = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires > ?');
const removeSession = db.prepare('DELETE FROM sessions WHERE token = ?');
const before = () => JSON.parse(get.get().data);
const digest = value => createHash('sha256').update(value).digest('hex');
const setupCode = randomBytes(12).toString('hex');
const sessionAge = 86_400;
const attempts = new Map();

function records(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const state = before();
    const result = fn(state);
    save.run(JSON.stringify(state));
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail('密码长度须为 10 至 128 个字符');
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}

const fallbackHash = passwordHash(randomBytes(16).toString('hex'));
function verify(password, credential = fallbackHash) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [salt, hashed] = credential.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hashed, 'hex'));
}

function throttle(req) {
  const now = Date.now();
  for (const [key, item] of attempts) {
    if (now - item.start >= 15 * 60_000) attempts.delete(key);
  }
  const key = req.socket.remoteAddress || 'unknown';
  const item = attempts.get(key) || { start: now, count: 0 };
  if (item.count >= 20) fail('尝试次数过多，请稍后再试', 429);
  item.count++;
  attempts.set(key, item);
}

function setSession(res, user) {
  db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)')
    .run(digest(token), user.id, Date.now() + sessionAge * 1000);
  res.setHeader('Set-Cookie', 'lab_sid=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + sessionAge + (secure ? '; Secure' : ''));
}

function current(req, state) {
  const token = req.headers.cookie?.match(/(?:^|; *)lab_sid=([a-f0-9]{64})(?:;|$)/)?.[1];
  const session = token && fetchSession.get(digest(token), Date.now());
  return session && state.users.find(user => !user.disabled && user.id === session.user_id);
}

async function body(req) {
  if (req.headers.origin && req.headers.origin !== origin) fail('请从系统页面发起操作', 403);
  if (req.headers['sec-fetch-site'] === 'cross-site') fail('请从系统页面发起操作', 403);
  if (!req.headers['content-type']?.startsWith('application/json')) fail('无效的请求格式', 415);
  const buffers = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 24_000) fail('提交内容过长', 413);
    buffers.push(chunk);
  }
  const parsed = JSON.parse(Buffer.concat(buffers).toString('utf8'));
  if (!parsed || typeof parsed.action !== 'string') fail('无效的操作');
  return parsed;
}

function response(res, data, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function api(req, res) {
  const mode = 'local';
  if (req.method === 'GET') {
    const state = before();
    const user = current(req, state);
    if (!user) return response(res, { mode, setup: !state.users.length }, 401);
    return response(res, { mode, ...view(state, user) });
  }
  if (req.method !== 'POST') return response(res, { error: '不支持的请求方式' }, 405);
  const { action, body: p = {} } = await body(req);
  if (action === 'setup') {
    throttle(req);
    if (p.code !== setupCode) fail('初始化代码不正确', 403);
    const result = records(state => {
      if (state.users.length) fail('该系统已完成初始化', 409);
      const provisional = { id: 'bootstrap', name: '系统初始化', role: 'super' };
      mutate(state, provisional, 'account', { name: p.name, email: p.email, username: p.username, role: 'super', credential: passwordHash(p.password) });
      const user = state.users[0];
      user.owner = true;
      setSession(res, user);
      return view(state, user);
    });
    return response(res, { mode, ...result });
  }
  if (action === 'login') {
    throttle(req);
    const state = before();
    const entered = p.username ?? p.email;
    const username = typeof entered === 'string' ? entered.trim().toLowerCase() : '';
    const user = state.users.find(u => (u.username || u.email) === username);
    if (!verify(p.password, user?.credential) || !user || user.disabled || !user.credential) fail('用户名或密码不正确，或账号已停用', 401);
    attempts.delete(req.socket.remoteAddress || 'unknown');
    setSession(res, user);
    return response(res, { mode, ...view(state, user) });
  }
  if (action === 'logout') {
    const token = req.headers.cookie?.match(/(?:^|; *)lab_sid=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (token) removeSession.run(digest(token));
    res.setHeader('Set-Cookie', 'lab_sid=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + (secure ? '; Secure' : ''));
    return response(res, { mode });
  }
  const result = records(state => {
    const user = current(req, state);
    if (!user) fail('请重新登录', 401);
    const parameters = { ...p, credential: undefined };
    if (action === 'account' && user.role === 'super') {
      if (!p.id || p.password) parameters.credential = passwordHash(p.password);
    }
    mutate(state, user, action, parameters);
    if (action === 'account' && p.id && (p.disabled || parameters.credential)) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(p.id);
    }
    return view(state, user);
  });
  return response(res, { mode, ...result });
}

const paths = {
  '/': ['lab.html', 'text/html'],
  '/lab.css': ['lab.css', 'text/css'],
  '/lab.mjs': ['lab.mjs', 'text/javascript'],
  '/lab-core.mjs': ['lab-core.mjs', 'text/javascript'],
  '/lab-demo.mjs': ['lab-demo.mjs', 'text/javascript'],
  '/lab-mark.svg': ['lab-mark.svg', 'image/svg+xml'],
};

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  try {
    const pathname = new URL(req.url, origin).pathname;
    if (pathname === '/api/workspace') return await api(req, res);
    const file = paths[pathname];
    if (!file || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'content-type': file[1] + '; charset=utf-8', 'cache-control': 'no-store' });
    const asset = pathname === '/' ? './lab.html' : './docs/' + file[0];
    return res.end(req.method === 'GET' ? readFileSync(new URL(asset, import.meta.url)) : undefined);
  } catch (error) {
    if (error instanceof SyntaxError) return response(res, { error: '提交内容格式不正确' }, 400);
    if (!error.status) console.error(error);
    return response(res, { error: error.status ? error.message : '服务暂时不可用，请稍后重试', mode: 'local' }, error.status || 500);
  }
});

server.listen(port, host, () => {
  console.log('仪器台账  ' + origin);
  if (!before().users.length) console.log('首次初始化代码  ' + setupCode);
});
