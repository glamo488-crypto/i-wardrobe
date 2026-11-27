# 衣库 YIKU

本地 Web MVP。使用 Node.js 22.18 以上版本和 npm，在项目目录执行：

```sh
npm install
npm run dev
```

访问终端给出的地址，默认是 http://localhost:5173。执行 `npm run build` 做类型检查及生产构建。

试用流程：灵感瀑布流 → 单品搭配或衣橱搭配 → 上传或选择衣物 → 查看结果 → 收藏 → 我的衣库管理和复用。

预置衣物使用 AI 生成的写实棚拍图。新建衣物使用轮廓示意图。搭配由本地规则生成。衣物和收藏通过浏览器 localStorage 保存。搭配规则、浏览器存储和 React 页面各自独立，便于后续接入后端或更换界面。

## 本机衣物识别

在 macOS 安装 Xcode Command Line Tools 后，于项目目录运行：

```sh
clang -fobjc-arc -framework Foundation -framework Vision -framework ImageIO -framework CoreGraphics server/recognize.m -o server/recognize
npm run dev
```

选择单件衣物照片，再点「识别类别和主色」。类别由 Apple Vision 在本机识别，主色从照片中心估算。请核对或手动修改建议后保存。上传的照片不发送给外部服务。本地识别端点由 Vite 开发服务器提供，静态部署需另行配置服务。

## 构建后运行

执行 npm run build，再执行 npm start，访问 http://127.0.0.1:4173 。
同一服务提供页面、健康检查 /api/health 和本机识别接口。
可通过 PORT、HOST 配置监听地址。识别程序需按上文在目标 macOS 主机编译。
浏览器衣物与收藏仍保存在本机，账户和跨设备同步待实现。

## 账户与管理后台

启动生产服务后，在「我的衣库」注册邮箱账号。修改衣物或收藏后点击「保存到账号」。
服务端使用 SQLite 保存用户资料、衣物和收藏，密码采用 scrypt 哈希，会话使用 HttpOnly Cookie。
后台地址为 /admin，只有管理员账号能够访问。
首次启动会生成管理员登录资料 server/data/admin-login.txt，该文件只在本机保存。
请保护 server/data 目录并定期备份。当前邮箱登录尚未提供邮箱验证与找回密码。
公开部署需配置 HTTPS 并设置 COOKIE_SECURE=1。
