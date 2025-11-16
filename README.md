# up-actions

一个用于从 GitHub Releases 下载资源并部署到 FTP 服务器的 GitHub Action 工具。

## 功能特点

- 📦 自动下载 GitHub Release 资产
- 🗂️ 解压缩 ZIP 文件
- ☁️ 通过 FTP/S 部署文件
- 🔁 支持增量更新，仅传输变更文件
- 🔐 安全处理敏感信息（使用 GitHub Secrets）

## 快速使用

### 基础配置

在你的仓库中创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy via FTP
on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Deploy to FTP Server
        uses: supbose/up-actions@latest
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ftp-server: ${{ secrets.FTP_SERVER }}
          ftp-username: ${{ secrets.FTP_USERNAME }}
          ftp-password: ${{ secrets.FTP_PASSWORD }}
          repository: 'owner/repository'
          tag-name: ${{ github.event.release.tag_name }}
```

### 必需参数

| 参数名 | 描述 |
|--------|------|
| `github-token` | GitHub 访问令牌（推荐使用内置 [GITHUB_TOKEN](file://d:\WorkspaceProject\github\up-actions\src\main.ts#L30-L30)） |
| `ftp-server` | FTP 服务器地址 |
| `ftp-username` | FTP 用户名 |
| `ftp-password` | FTP 密码 |

### 可选参数

| 参数名 | 默认值 | 描述 |
|--------|--------|------|
| `repository` | 当前仓库 | 格式为 `owner/repo` |
| `tag-name` | latest | Release 标签名 |
| `local-dir` | ./ | 本地待上传目录 |
| `remote-dir` | / | FTP 目标目录 |

## 设置 Secrets

为了保护敏感信息，你需要在仓库设置中添加以下 Secrets：

1. 进入仓库 Settings > Secrets and variables > Actions
2. 点击 "New repository secret" 添加以下内容：
   - `FTP_SERVER`: 你的 FTP 服务器地址
   - `FTP_USERNAME`: FTP 用户名
   - `FTP_PASSWORD`: FTP 密码

## 工作流程说明

1. 当发布新的 Release 时触发 Action
2. Action 自动下载对应 Release 的第一个 ZIP 资产
3. 解压 ZIP 文件到临时目录
4. 通过 FTP 将文件同步到指定目录
5. 部署完成后清理临时文件

## 开发指南

### 项目结构

```
.
├── src/
│   └── main.ts         # 主入口文件
├── dist/               # 编译输出目录
├── action.yml          # Action 配置文件
├── package.json        # 项目依赖和脚本定义
└── tsconfig.json       # TypeScript 配置
```

### 构建命令

```bash
# 安装依赖
pnpm install

# 编译 TypeScript
pnpm build

# 打包为单一可执行文件
pnpm package

# 完整构建流程（编译 + 打包 + 版本升级）
pnpm build:full

# 开发模式（监听文件变化）
pnpm dev

# 清理构建产物
pnpm clean
```

### 核心依赖

- [@actions/core](https://github.com/actions/toolkit/tree/main/packages/core): Action 输入/输出和日志处理
- [@actions/github](https://github.com/actions/toolkit/tree/main/packages/github): GitHub API 客户端
- [@samkirkland/ftp-deploy](https://github.com/SamKirkland/FTP-Deploy-Action): FTP 部署功能
- [@octokit/core](https://github.com/octokit/core.js): GitHub REST API SDK

### 自定义开发

1. 修改 [src/main.ts](file://d:\WorkspaceProject\github\up-actions\src\main.ts) 实现业务逻辑
2. 更新 [action.yml](file://d:\WorkspaceProject\github\up-actions\action.yml) 添加新输入参数
3. 运行 `pnpm build` 编译代码
4. 使用 `pnpm package` 生成生产可用的 bundle 文件

### 版本管理

使用 [mbump](file://d:\WorkspaceProject\github\up-actions\node_modules\@mznjs\mbump) 管理版本：

```bash
pnpm mbump patch     # 补丁版本 (1.0.3 -> 1.0.4)
pnpm mbump minor     # 次版本 (1.0.3 -> 1.1.0)
pnpm mbump major     # 主版本 (1.0.3 -> 2.0.0)
```

## 故障排除

### 常见问题

1. **权限错误**: 确保 [GITHUB_TOKEN](file://d:\WorkspaceProject\github\up-actions\src\main.ts#L30-L30) 有足够权限访问 Release
2. **FTP连接失败**: 检查服务器地址、端口、用户名和密码
3. **资产下载失败**: 验证 Release 是否存在 ZIP 资产
4. **部署缓慢**: 首次部署会上传所有文件，后续部署仅上传变更文件

### 调试模式

添加环境变量启用详细日志：

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

## 许可证

本项目采用 ISC 许可证，详见 [LICENSE](./LICENSE) 文件。
