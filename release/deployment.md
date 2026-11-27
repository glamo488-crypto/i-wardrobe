# i衣柜内测部署

运行环境需要 Node.js 24 和持久化目录 server/data。Dockerfile 提供可部署容器配置。
构建命令 docker build -t i-wardrobe .
启动时通过环境变量传入 PUBLIC_URL、MAIL_FROM、RESEND_API_KEY，并挂载持久化卷到 /app/server/data。
以平台提供的 HTTPS 入口访问。初始管理员资料在持久化卷的 admin-login.txt 中。

Linux 部署可使用账户、衣库、收藏、后台审核。Apple Vision 识别仅支持 macOS，Linux 上返回不可用，前端可手动录入。

上线前验收
- 真实邮箱收到验证邮件，链接可使用一次。
- 注册、验证、登录、上传、保存到账号后刷新找回。
- 第二账号无法读取第一账号数据。
- 管理员可以查看上传并保存审核结果。
- 密码找回成功，旧会话失效。
- 公网入口可在手机访问。

容器配置已准备，尚未在云主机执行或部署。
