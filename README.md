# 仪器台账

实验室设备台账支持单件领用、审批、异常记录、搜索和三种用户权限。GitHub Pages 演示可直接访问，使用示例数据。点击设备名称可展开单件，右上角头像可切换演示角色。

[打开仪器台账](https://lancelot0s.github.io/lab-equipment/)

## 运行正式台账

安装 Node.js 24 或更新版本。在 Windows 双击 `Start.cmd`，或执行 `node local.mjs`，然后访问 `http://127.0.0.1:8787`。首次启动时，用服务窗口显示的初始化代码创建超级管理员。之后由超级管理员为成员创建账号，成员使用邮箱和分配的密码登录。

正式数据库位于 `data/lab.sqlite`。多人共用时，将服务运行在一台常开电脑或服务器上，用 HTTPS 反向代理转发到服务端口，并将服务的 `LAB_ORIGIN` 设置为完整的 HTTPS 源地址。备份时先停止服务，再复制 `data` 目录。

## 发布 GitHub Pages

以 `main` 分支的 `/docs` 为发布来源。把 `docs/index.html` 中 `lab-workspace-url` 的值填写为正式服务的 HTTPS 地址，演示页面的头像菜单会显示「进入正式工作台」。
