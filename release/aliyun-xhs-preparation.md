# i衣柜 香港部署与小红书申请准备

部署目标为阿里云中国香港 Linux 主机，首批邀请10人。
建议起点为2核2GB、40GB磁盘，实际购买以控制台套餐、库存与费用确认为准。
主机需安装 Docker 与 Compose，域名 A 记录指向公网 IP，开放 TCP 80/443；SSH按实际维护来源限制。

部署步骤
1. 拉取 GitHub 仓库，进入 deploy/aliyun。
2. 复制 .env.example 为 .env，填写域名、PUBLIC_URL和真实发信配置。
3. 执行 docker compose up -d --build。
4. 检查 https://域名/api/health 和注册、邮件验证、上传、保存、后台审核。
5. 持久化数据在 wardrobe-data 卷。升级与备份时保留该卷。
初始管理员资料在 app 容器 /app/server/data/admin-login.txt。

小红书登录申请草稿
- 应用名称 i衣柜
- 类型 Web
- 用途 为数字衣橱用户提供小红书账号登录，建立独立的私人衣物与收藏记录。
- 授权范围 basic_info，仅申请身份识别及昵称、头像。
- 用户群体 喜欢穿搭、衣物较多的成年用户，男女均可。
- 内测规模 首批10人。
- 官网与回调域名 待香港部署后的HTTPS域名确定。
- 隐私说明 明确基本资料、上传衣物、后台审核和删除联系渠道。
- 主体资料 使用申请人的真实主体信息，个人主体资格需在控制台实际核实。

待审核通过后再配置 app_id/app_secret，密钥仅存服务端。
待实现账户绑定、扫码授权、身份映射、撤销与失败回退，不把“申请准备”视为已接通登录。
官方入口 https://openaccount.xiaohongshu.com/docs/quick-start
