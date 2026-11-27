"""Run the laboratory workspace with Python and the system JavaScriptCore library."""
import ctypes
import ctypes.util
import hashlib
import hmac
import http.cookies
import json
import os
import re
import secrets
import sqlite3
import ssl
import sys
import threading
import time
import traceback
import uuid
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get("LAB_DATA_DIR", ROOT / "data")).resolve()
HOST = os.environ.get("LAB_HOST", "127.0.0.1")
PORT = int(os.environ.get("LAB_PORT", "18787"))
ORIGIN = os.environ.get("LAB_ORIGIN", f"http://127.0.0.1:{PORT}").rstrip("/")
AUTHORITY = urlsplit(ORIGIN).netloc
SECURE = ORIGIN.startswith("https://")
SESSION_SECONDS = 86400
LIMIT = 24_000
SETUP = DATA / "first-run-code"
PASSWORD_COST = {"n": 16384, "r": 8, "p": 1, "dklen": 64}

CORE = re.sub(r"(?m)^export (const|function) ", r"\1 ", (ROOT / "docs/lab-core.mjs").read_text(encoding="utf-8"))
BRIDGE = """
(() => {
  const input = JSON.parse(INPUT_TEXT);
  if (!Object.hasOwn) {
    Object.hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
  }
  const crypto = {randomUUID: () => {
    const value = input.uuids.pop();
    if (!value) throw new Error('UUID allocation exhausted');
    return value;
  }};
  CORE_TEXT
  try {
    const state = input.state || empty();
    const actor = input.actor || state.users.find(user => user.id === input.userId);
    if (!actor || actor.disabled) fail('请重新登录', 401);
    if (input.action) mutate(state, actor, input.action, input.fields);
    return JSON.stringify({state, result: view(state, actor)});
  } catch (error) {
    return JSON.stringify({error: error.status ? error.message : '服务暂时不可用，请稍后重试',
      status: error.status || 500});
  }
})()
"""
BRIDGE = BRIDGE.replace("CORE_TEXT", CORE)

ASSETS = {
    "/": ("lab.html", "text/html"),
    "/lab.css": ("docs/lab.css", "text/css"),
    "/lab.mjs": ("docs/lab.mjs", "text/javascript"),
    "/lab-core.mjs": ("docs/lab-core.mjs", "text/javascript"),
    "/lab-demo.mjs": ("docs/lab-demo.mjs", "text/javascript"),
    "/lab-mark.svg": ("docs/lab-mark.svg", "image/svg+xml"),
}

class LabError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


class JavaScriptCore:
    """Evaluate only the installed business rules, passing request data as JSON."""
    def __init__(self):
        name = ctypes.util.find_library("javascriptcoregtk-4.0")
        if not name:
            raise RuntimeError("系统缺少 JavaScriptCore 4.0 运行库")
        self.lib = ctypes.CDLL(name)
        pointer = ctypes.c_void_p
        size = ctypes.c_size_t
        for symbol, result, parameters in (
            ("JSGlobalContextCreate", pointer, [pointer]),
            ("JSGlobalContextRelease", None, [pointer]),
            ("JSStringCreateWithUTF8CString", pointer, [ctypes.c_char_p]),
            ("JSStringRelease", None, [pointer]),
            ("JSEvaluateScript", pointer, [pointer, pointer, pointer, pointer, ctypes.c_int, ctypes.POINTER(pointer)]),
            ("JSValueToStringCopy", pointer, [pointer, pointer, ctypes.POINTER(pointer)]),
            ("JSStringGetMaximumUTF8CStringSize", size, [pointer]),
            ("JSStringGetUTF8CString", size, [pointer, pointer, size]),
        ):
            function = getattr(self.lib, symbol)
            function.restype = result
            function.argtypes = parameters

    def as_string(self, context, value):
        text = self.lib.JSValueToStringCopy(context, value, None)
        if not text:
            raise RuntimeError("JavaScriptCore returned no result")
        try:
            size = self.lib.JSStringGetMaximumUTF8CStringSize(text)
            buffer = ctypes.create_string_buffer(size)
            self.lib.JSStringGetUTF8CString(text, buffer, size)
            return buffer.value.decode("utf-8")
        finally:
            self.lib.JSStringRelease(text)

    def evaluate(self, source):
        context = self.lib.JSGlobalContextCreate(None)
        script = self.lib.JSStringCreateWithUTF8CString(source.encode("utf-8"))
        try:
            exception = ctypes.c_void_p()
            value = self.lib.JSEvaluateScript(context, script, None, None, 1, ctypes.byref(exception))
            if exception:
                raise RuntimeError(self.as_string(context, exception))
            return json.loads(self.as_string(context, value))
        finally:
            self.lib.JSStringRelease(script)
            self.lib.JSGlobalContextRelease(context)


def run_core(state, user_id="", action="", fields=None, actor=None):
    pool = [str(uuid.uuid4()) for _ in range(max(256, len(state["users"]) + 8))] if action else []
    entry = {"state": state, "userId": user_id, "action": action, "fields": fields or {}, "actor": actor, "uuids": pool}
    # Encode the payload twice so it is a JavaScript string argument to JSON.parse.
    program = BRIDGE.replace("INPUT_TEXT", json.dumps(json.dumps(entry, ensure_ascii=True)), 1)
    result = ENGINE.evaluate(program)
    if "error" in result:
        raise LabError(result["error"], result["status"])
    return result["state"], result["result"]


def database():
    return closing(sqlite3.connect(str(DATA / "lab.sqlite"), timeout=8, isolation_level=None))


def current_state(db):
    return json.loads(db.execute("SELECT data FROM workspace WHERE id = 1").fetchone()[0])


def write_state(db, state):
    db.execute("UPDATE workspace SET data = ? WHERE id = 1", (json.dumps(state, ensure_ascii=False),))


def token_digest(token):
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def make_password(password):
    if not isinstance(password, str) or not 10 <= len(password) <= 128:
        raise LabError("密码长度须为 10 至 128 个字符")
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("ascii"), **PASSWORD_COST)
    return f"{salt}:{digest.hex()}"


def verify_password(password, credential):
    if not isinstance(password, str) or len(password) > 128:
        return False
    salt, claimed = (credential or DUMMY_PASSWORD).split(":", 1)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("ascii"), **PASSWORD_COST)
    return hmac.compare_digest(digest.hex(), claimed) and bool(credential)


def initial_data():
    DATA.mkdir(parents=True, exist_ok=True, mode=0o700)
    with database() as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.execute("CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, data TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)")
        blank = {"users": [], "devices": [], "requests": [], "notices": [], "history": [], "seq": 0}
        db.execute("INSERT OR IGNORE INTO workspace (id, data) VALUES (1, ?)", (json.dumps(blank),))
        if not current_state(db)["users"] and not SETUP.exists():
            stream = os.open(str(SETUP), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(stream, "w", encoding="utf-8") as file:
                file.write(secrets.token_hex(12) + "\n")


attempts = {}
attempt_lock = threading.Lock()


def throttle(key):
    now = time.monotonic()
    with attempt_lock:
        for old_key, (start, _) in list(attempts.items()):
            if now - start >= 900:
                del attempts[old_key]
        start, count = attempts.get(key, (now, 0))
        if count >= 20:
            raise LabError("尝试次数过多，请稍后再试", 429)
        attempts[key] = (start, count + 1)


class LabHandler(BaseHTTPRequestHandler):
    def setup(self):
        self.request.settimeout(12)
        super().setup()

    def log_message(self, format_string, *args):
        if args and len(args) > 1 and str(args[1]).startswith("5"):
            super().log_message(format_string, *args)

    def finish_response(self, content, status, content_type, cookie=None):
        self.send_response(status)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)

    def reply(self, data, status=200, cookie=None):
        self.finish_response(json.dumps(data, ensure_ascii=False).encode("utf-8"), status, "application/json", cookie)

    def session_cookie(self, token, max_age):
        secure = "; Secure" if SECURE else ""
        return f"lab_sid={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={max_age}{secure}"

    def new_session(self, db, user):
        stamp = int(time.time())
        token = secrets.token_hex(32)
        db.execute("DELETE FROM sessions WHERE expires <= ?", (stamp,))
        db.execute("INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)",
                   (token_digest(token), user["id"], stamp + SESSION_SECONDS))
        return self.session_cookie(token, SESSION_SECONDS)

    def token(self):
        try:
            cookies = http.cookies.SimpleCookie(self.headers.get("Cookie", ""))
            value = cookies.get("lab_sid")
            return value.value if value and re.fullmatch(r"[0-9a-f]{64}", value.value) else None
        except http.cookies.CookieError:
            return None

    def current_user(self, db, state, token):
        if not token:
            return None
        session = db.execute("SELECT user_id FROM sessions WHERE token = ? AND expires > ?",
                             (token_digest(token), int(time.time()))).fetchone()
        if session:
            return next((u for u in state["users"] if u["id"] == session[0] and not u.get("disabled")), None)
        return None

    def read_request(self):
        source = self.headers.get("Origin")
        if (source and source != ORIGIN) or self.headers.get("Sec-Fetch-Site") == "cross-site":
            raise LabError("请从系统页面发起操作", 403)
        if self.headers.get_content_type() != "application/json":
            raise LabError("无效的请求格式", 415)
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise LabError("无效的请求长度")
        if not 0 < size <= LIMIT:
            raise LabError("提交内容为空或过长", 413)
        request = json.loads(self.rfile.read(size))
        if not isinstance(request, dict) or not isinstance(request.get("action"), str):
            raise LabError("无效的操作")
        fields = request.get("body", {})
        if not isinstance(fields, dict):
            raise LabError("无效的操作参数")
        return request["action"], fields

    def read_workspace(self, db, token):
        state = current_state(db)
        user = self.current_user(db, state, token)
        if not user:
            return self.reply({"mode": "local", "setup": not state["users"]}, 401)
        _, result = run_core(state, user_id=user["id"])
        self.reply({"mode": "local", **result})

    def setup_account(self, db, state, p):
        throttle("setup:" + self.client_address[0])
        if state["users"]:
            raise LabError("该系统已完成初始化", 409)
        supplied = p.get("code")
        if not isinstance(supplied, str) or not supplied.isascii() or not hmac.compare_digest(supplied, SETUP.read_text().strip()):
            raise LabError("初始化代码不正确", 403)
        actor = {"id": "bootstrap", "name": "系统初始化", "role": "super"}
        login_field = "username" if "username" in p else "email"
        fields = {"name": p.get("name"), login_field: p.get(login_field), "role": "super", "credential": make_password(p.get("password"))}
        new_state, _ = run_core(state, action="account", fields=fields, actor=actor)
        user = new_state["users"][0]
        user["owner"] = True
        write_state(db, new_state)
        _, result = run_core(new_state, user_id=user["id"])
        return result, self.new_session(db, user)

    def api(self, token):
        with database() as db:
            if self.command == "GET":
                return self.read_workspace(db, token)
            action, p = self.read_request()
            if action == "logout":
                if token:
                    db.execute("DELETE FROM sessions WHERE token = ?", (token_digest(token),))
                return self.reply({"mode": "local"}, cookie=self.session_cookie("", 0))
            db.execute("BEGIN IMMEDIATE")
            state = current_state(db)
            cookie = None
            if action == "setup":
                result, cookie = self.setup_account(db, state, p)
            elif action == "login":
                entered = p.get("username", p.get("email"))
                username = entered.strip().lower() if isinstance(entered, str) and len(entered) <= 160 else ""
                attempt_key = f"login:{self.client_address[0]}:{username}"
                throttle(attempt_key)
                user = next((u for u in state["users"] if (u.get("username") or u.get("email")) == username), None)
                if not verify_password(p.get("password"), user.get("credential") if user else None) or user.get("disabled"):
                    raise LabError("用户名或密码不正确，或账号已停用", 401)
                _, result = run_core(state, user_id=user["id"])
                cookie = self.new_session(db, user)
                with attempt_lock:
                    attempts.pop(attempt_key, None)
            else:
                user = self.current_user(db, state, token)
                if not user:
                    raise LabError("请重新登录", 401)
                if user.get("mustChangePassword"):
                    if action != "password-change":
                        raise LabError("请先修改初始密码", 403)
                    if verify_password(p.get("password"), user.get("credential")):
                        raise LabError("请选择不同于初始密码的新密码")
                    user["credential"] = make_password(p.get("password"))
                    user.pop("mustChangePassword")
                    write_state(db, state)
                    db.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))
                    _, result = run_core(state, user_id=user["id"])
                    cookie = self.new_session(db, user)
                else:
                    fields = dict(p)
                    fields.pop("credential", None)
                    password = fields.pop("password", None)
                    if action == "account" and user["role"] == "super" and (not p.get("id") or password):
                        fields["credential"] = make_password(password)
                    new_state, result = run_core(state, user_id=user["id"], action=action, fields=fields)
                    write_state(db, new_state)
                    if action == "account" and p.get("id") and (p.get("disabled") or fields.get("credential")):
                        db.execute("DELETE FROM sessions WHERE user_id = ?", (p["id"],))
            db.execute("COMMIT")
            if action == "setup":
                SETUP.unlink(missing_ok=True)
            self.reply({"mode": "local", **result}, cookie=cookie)

    def serve(self):
        try:
            if self.headers.get("Host", "").lower() != AUTHORITY.lower():
                raise LabError("请通过正式网址访问工作台", 400)
            path = urlsplit(self.path).path
            if path == "/api/workspace" and self.command in ("GET", "POST"):
                return self.api(self.token())
            if path in ASSETS and self.command in ("GET", "HEAD"):
                asset, category = ASSETS[path]
                return self.finish_response((ROOT / asset).read_bytes(), 200, category)
            self.reply({"error": "找不到页面"}, 404)
        except LabError as error:
            self.reply({"error": str(error), "mode": "local"}, error.status)
        except (ValueError, UnicodeError):
            self.reply({"error": "提交内容格式不正确", "mode": "local"}, 400)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        except Exception:
            traceback.print_exc()
            self.reply({"error": "服务暂时不可用，请稍后重试", "mode": "local"}, 500)

    do_GET = serve
    do_POST = serve
    do_HEAD = serve


if __name__ == "__main__":
    os.umask(0o077)
    cert, key = os.environ.get("LAB_TLS_CERT"), os.environ.get("LAB_TLS_KEY")
    if HOST not in ("127.0.0.1", "localhost") and not (SECURE and cert and key):
        sys.exit("非本机地址需要配置 HTTPS 证书和私钥")
    ENGINE = JavaScriptCore()
    DUMMY_PASSWORD = make_password(secrets.token_hex(16))
    initial_data()
    with database() as database_connection:
        checked = current_state(database_connection)
    _, quick_check = run_core(checked, actor={"id": "check", "name": "检查", "role": "member"})
    if quick_check["user"]["role"] != "member":
        sys.exit("业务运行时检查失败")
    with ThreadingHTTPServer((HOST, PORT), LabHandler) as server:
        if cert or key:
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.load_cert_chain(certfile=cert, keyfile=key)
            server.socket = context.wrap_socket(server.socket, server_side=True)
        print(f"仪器台账 {ORIGIN}", flush=True)
        server.serve_forever()
