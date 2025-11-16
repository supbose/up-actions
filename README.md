# up-actions - 智能版本化文件部署 GitHub Action

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

## 📋 项目概述

`up-actions` 是一个专门为 Tauri 应用程序设计的智能版本化文件部署 GitHub Action。该工具不仅能够自动提取版本号并复制构建文件到版本化目录，还提供了完整的 FTP 部署和 CDN 更新功能，是现代应用发布流程的核心组件。

### 🎯 核心价值

- **🚀 自动化版本管理**: 自动从配置文件提取版本号，创建结构化的发布目录
- **📦 智能文件复制**: 高效复制构建产物，支持平铺目录结构
- **🌐 远程部署能力**: 内置 FTP 部署功能，支持自定义服务器目录
- **🔄 CDN 集成**: 自动更新 latest.json 并上传到 CDN 源站
- **⚙️ 灵活配置**: 支持多种工作模式，适应不同部署需求
- **🛡️ 全面验证**: 内置输入验证和错误处理机制

## ✨ 功能特性

### 🎯 核心功能

- **🔍 智能版本提取**: 
  - 支持从 `tauri.conf.json` 根级别 `version` 字段提取
  - 支持从 `package.version` 字段提取
  - 自动回退机制，版本不存在时使用默认值 `0.0.0`

- **📂 版本化目录管理**:
  - 自动创建 `v{version}` 格式的目录结构
  - 支持自定义根目录路径
  - 递归创建目录，自动处理路径冲突

- **📋 批量文件处理**:
  - 递归扫描源目录，收集所有文件
  - 平铺复制结构，所有文件复制到目标目录根级别
  - 支持大型项目和批量文件处理

- **📊 详细日志系统**:
  - 完整的操作日志记录
  - 文件复制状态跟踪
  - 错误信息和警告提示

### 🌐 高级功能

#### FTP 部署系统
- **三种工作模式**:
  - `disabled`: 完全禁用 FTP 功能
  - `ci`: 为外部 CI 步骤启用 FTP 触发
  - `use`: 使用内置 FTP 客户端进行部署

- **FTP 配置选项**:
  - 自定义服务器主机和端口
  - 安全用户名/密码认证
  - 灵活的远程目录结构
  - 自动排除敏感文件和目录

#### CDN 更新系统
- **GitHub Release 集成**:
  - 自动获取最新 GitHub Release
  - 解析 release assets 和 latest.json
  - 支持私有仓库访问（需要 token 认证）

- **CDN 源站更新**:
  - 自动替换 base URL 为 CDN 地址
  - 更新 latest.json 并上传到 FTP 服务器
  - 支持自定义 CDN 域名和路径结构

#### 智能工作流程
- **模块化执行**: 支持独立的版本处理、文件复制和远程部署
- **错误恢复**: 完善的错误处理和状态报告
- **输出参数**: 为下游步骤提供丰富的状态信息

## 🛠️ 技术规格

### 运行环境要求
- **Node.js**: >= 16.0.0
- **操作系统**: Linux, Windows, macOS
- **GitHub Actions**: 运行时环境 Node16

### 核心技术栈
- **TypeScript**: 类型安全的开发体验
- **@actions/core**: GitHub Actions 核心库
- **@actions/github**: GitHub API 集成
- **@octokit/core**: GitHub REST API 客户端
- **@samkirkland/ftp-deploy**: 专业 FTP 部署解决方案
- **dotenv**: 环境变量管理

### 依赖包详情
```json
{
  "@actions/core": "^1.11.1",
  "@actions/github": "^6.0.1", 
  "@octokit/core": "^7.0.6",
  "@samkirkland/ftp-deploy": "^1.2.5",
  "dotenv": "^17.2.3"
}
```

## 📦 安装和配置

### 1. 基本安装

将 action 添加到你的 GitHub 工作流：

```yaml
name: 应用构建和部署
on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      # ... 构建步骤 ...

      - name: 版本化文件部署
        uses: ./
        id: deploy
        with:
          source-dir: 'src-tauri/target/release/bundle/'
          target-root: 'releases/'
          config-file: 'src-tauri/tauri.conf.json'
```

### 2. 高级配置（FTP + CDN）

```yaml
name: 完整部署流程
on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      # ... 构建步骤 ...

      - name: 智能版本化部署
        uses: ./
        id: deploy
        with:
          source-dir: 'src-tauri/target/release/bundle/'
          target-root: 'releases/'
          config-file: 'src-tauri/tauri.conf.json'
          enable-ftp: 'use'
          ftp-host: 'your-ftp-server.com'
          ftp-username: ${{ secrets.FTP_USERNAME }}
          ftp-password: ${{ secrets.FTP_PASSWORD }}
          ftp-server-dir: '/app/releases/'
          upload-latest: 'use'
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: 部署状态检查
        run: |
          echo "版本: ${{ steps.deploy.outputs.version }}"
          echo "FTP部署: ${{ steps.deploy.outputs.ftp-upload-success }}"
          echo "CDN更新: ${{ steps.deploy.outputs.latest-upload-success }}"
```

## ⚙️ API 参考

### 输入参数 (Inputs)

| 参数名 | 类型 | 必需 | 默认值 | 描述 |
|--------|------|------|--------|------|
| `source-dir` | string | 否 | `src-tauri/target/release/bundle/` | 源目录路径，包含要复制的文件 |
| `target-root` | string | 否 | `src-tauri/target/release/fabu/` | 目标根目录，将创建版本化子目录 |
| `config-file` | string | 否 | `src-tauri/tauri.conf.json` | 配置文件路径，用于提取版本号 |
| `enable-ftp` | enum | 否 | `disabled` | FTP模式：disabled/ci/use |
| `ftp-host` | string | 否 | - | FTP服务器地址 |
| `ftp-username` | string | 否 | - | FTP用户名 |
| `ftp-password` | string | 否 | - | FTP密码 |
| `ftp-server-dir` | string | 否 | - | FTP远程目录 |
| `upload-latest` | enum | 否 | `disabled` | CDN更新模式：disabled/ci/use |
| `github-token` | string | 否 | - | GitHub访问令牌 |

### 输出参数 (Outputs)

| 输出名 | 类型 | 描述 |
|--------|------|------|
| `version` | string | 从配置文件提取的版本号 |
| `target-dir` | string | 完整的目标目录路径 |
| `enable-ftp` | string | 当前FTP模式 |
| `ftp-upload-success` | string | FTP部署结果状态 |
| `latest-upload-success` | string | CDN更新结果状态 |
| `latest-json-path` | string | latest.json文件路径 |

### 配置模式详解

#### FTP 模式 (enable-ftp)

**disabled 模式**:
```yaml
enable-ftp: 'disabled'
# 功能: 完全禁用FTP功能，仅进行本地文件操作
# 适用: 本地测试、CICD流程中的中间步骤
```

**ci 模式**:
```yaml
enable-ftp: 'ci'
# 功能: 启用FTP配置但不执行，用于外部FTP步骤
# 适用: 需要自定义FTP部署逻辑的复杂场景
```

**use 模式**:
```yaml
enable-ftp: 'use'
ftp-host: 'server.example.com'
ftp-username: 'user'
ftp-password: 'pass'
# 功能: 使用内置FTP客户端进行部署
# 适用: 标准FTP部署需求
```

#### CDN 更新模式 (upload-latest)

**disabled 模式**:
```yaml
upload-latest: 'disabled'
# 功能: 不进行CDN更新
# 适用: 本地版本管理、内部测试
```

**ci 模式**:
```yaml
upload-latest: 'ci'
# 功能: 配置CDN更新参数，使用外部步骤执行
# 适用: 需要自定义CDN更新逻辑的场景
```

**use 模式**:
```yaml
upload-latest: 'use'
github-token: 'ghp_xxxxx'
# 功能: 自动获取GitHub Release，更新latest.json并上传CDN
# 适用: 完整的自动发布流程
```

## 📋 配置示例

### 1. Tauri 项目配置 (tauri.conf.json)

```json
{
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist",
    "withGlobalTauri": false
  },
  "package": {
    "productName": "MyAwesomeApp",
    "version": "1.5.2"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      }
    },
    "bundle": {
      "active": true,
      "category": "DeveloperTool",
      "copyright": "",
      "deb": {
        "depends": []
      },
      "externalBin": [],
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png", 
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.example.myawesomeapp",
      "longDescription": "一个令人惊叹的Tauri应用程序",
      "macos": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": ["config.json", "assets/*"],
      "shortDescription": "令人惊叹的应用",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": "",
        "wix": {
          "language": ["en-US", "zh-CN"],
          "template": "main.wxs"
        }
      }
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": true,
      "endpoints": [
        "https://cdn.example.com/download/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "your-public-key-here"
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 800,
        "resizable": true,
        "title": "MyAwesomeApp",
        "width": 1200,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

### 2. GitHub Actions 工作流示例

#### 基础版本
```yaml
name: 构建和基础部署
on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8
      
      - name: 安装依赖
        run: pnpm install --frozen-lockfile
      
      - name: 构建应用
        run: pnpm tauri build
      
      - name: 部署文件
        uses: ./
        id: deploy
        with:
          source-dir: 'src-tauri/target/release/bundle/'
          target-root: 'dist/releases/'
          config-file: 'src-tauri/tauri.conf.json'
      
      - name: 显示结果
        run: |
          echo "版本: ${{ steps.deploy.outputs.version }}"
          echo "目录: ${{ steps.deploy.outputs.target-dir }}"
          ls -la "${{ steps.deploy.outputs.target-dir }}"
```

#### 完整版本（FTP + CDN）
```yaml
name: 完整发布流程
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      
      - name: 设置开发环境
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 8
      
      - name: 安装依赖
        run: pnpm install --frozen-lockfile
      
      - name: 构建应用
        run: pnpm tauri build
      
      - name: 智能版本化部署
        uses: ./
        id: deploy
        with:
          source-dir: 'src-tauri/target/release/bundle/'
          target-root: 'dist/releases/'
          config-file: 'src-tauri/tauri.conf.json'
          enable-ftp: 'use'
          ftp-host: ${{ secrets.FTP_HOST }}
          ftp-username: ${{ secrets.FTP_USERNAME }}
          ftp-password: ${{ secrets.FTP_PASSWORD }}
          ftp-server-dir: '/apps/releases/'
          upload-latest: 'use'
          github-token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: 创建 GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            ${{ steps.deploy.outputs.target-dir }}/*
          tag_name: v${{ steps.deploy.outputs.version }}
          name: Release v${{ steps.deploy.outputs.version }}
          body: |
            ## 🚀 Release v${{ steps.deploy.outputs.version }}
            
            ### ✨ 新功能
            - 新版本发布
            
            ### 📦 文件列表
            ${{ steps.deploy.outputs.target-dir }}
            
            ### 📊 部署状态
            - FTP部署: ${{ steps.deploy.outputs.ftp-upload-success }}
            - CDN更新: ${{ steps.deploy.outputs.latest-upload-success }}
          draft: false
          prerelease: false
      
      - name: 部署状态通知
        run: |
          echo "🎉 发布完成!"
          echo "版本: ${{ steps.deploy.outputs.version }}"
          echo "目标: ${{ steps.deploy.outputs.target-dir }}"
          echo "FTP: ${{ steps.deploy.outputs.ftp-upload-success }}"
          echo "CDN: ${{ steps.deploy.outputs.latest-upload-success }}"
```

### 3. 手动触发工作流

```yaml
name: 手动发布
on:
  workflow_dispatch:
    inputs:
      version_type:
        description: '版本类型'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor  
          - major
      enable_ftp:
        description: '启用FTP部署'
        required: false
        default: true
        type: boolean
      upload_cdn:
        description: '上传CDN更新'
        required: false
        default: true
        type: boolean

jobs:
  manual-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: 版本管理
        run: |
          # 使用 mbump 进行版本管理
          pnpm run mbump ${{ github.event.inputs.version_type }}
      
      - name: 构建应用
        run: pnpm tauri build
      
      - name: 版本化部署
        uses: ./
        id: deploy
        with:
          source-dir: 'src-tauri/target/release/bundle/'
          target-root: 'dist/releases/'
          config-file: 'src-tauri/tauri.conf.json'
          enable-ftp: ${{ github.event.inputs.enable_ftp && 'use' || 'disabled' }}
          ftp-host: ${{ secrets.FTP_HOST }}
          ftp-username: ${{ secrets.FTP_USERNAME }}
          ftp-password: ${{ secrets.FTP_PASSWORD }}
          ftp-server-dir: '/apps/releases/'
          upload-latest: ${{ github.event.inputs.upload_cdn && 'use' || 'disabled' }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 🔧 高级功能详解

### FTP 部署配置

#### 基础 FTP 配置
```yaml
- name: 基础FTP部署
  uses: ./
  with:
    enable-ftp: 'use'
    ftp-host: 'ftp.example.com'
    ftp-username: ${{ secrets.FTP_USER }}
    ftp-password: ${{ secrets.FTP_PASS }}
    ftp-server-dir: '/releases/'
```

#### 高级 FTP 配置
```yaml
- name: 高级FTP部署
  uses: ./
  with:
    enable-ftp: 'use'
    ftp-host: 'secure-ftp.example.com'
    ftp-username: ${{ secrets.SECURE_FTP_USER }}
    ftp-password: ${{ secrets.SECURE_FTP_PASS }}
    ftp-server-dir: '/apps/myapp/releases/v{{version}}/'
    # 注意：{{version}} 会被实际版本号替换
```

### CDN 更新功能

#### CDN 更新流程
1. **获取 GitHub Release**: 自动获取最新的 GitHub Release
2. **下载 latest.json**: 从 Release assets 中获取 latest.json
3. **URL 替换**: 将 base URL 替换为 CDN 地址
4. **上传更新**: 将更新后的 latest.json 上传到 FTP 服务器

#### CDN 配置示例
```yaml
- name: CDN 更新部署
  uses: ./
  with:
    upload-latest: 'use'
    github-token: ${{ secrets.GITHUB_TOKEN }}
    # 这会自动：
    # 1. 获取最新 GitHub Release
    # 2. 查找 latest.json 文件
    # 3. 替换 CDN URL
    # 4. 上传到 /updater/ 目录
```

### 版本管理集成

#### 与 mbump 集成
```yaml
- name: 自动版本管理
  run: |
    # mbump 会自动更新版本号
    pnpm run mbump
    # 获取新版本号
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "NEW_VERSION=$NEW_VERSION" >> $GITHUB_ENV

- name: 构建和部署
  uses: ./
  with:
    # 使用新的版本号
    config-file: 'package.json'  # 或 tauri.conf.json
```

## 🚀 目录结构示例

### 执行前后对比

**执行前项目结构**:
```
my-tauri-app/
├── src-tauri/
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── target/
│       └── release/
│           ├── bundle/
│           │   ├── app_1.5.2.msi
│           │   ├── app_1.5.2.dmg
│           │   ├── app_1.5.2.AppImage
│           │   └── app_1.5.2.deb
│           └── fabu/
└── package.json
```

**执行后项目结构**:
```
my-tauri-app/
├── src-tauri/
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── target/
│       └── release/
│           ├── bundle/
│           │   ├── app_1.5.2.msi
│           │   ├── app_1.5.2.dmg
│           │   ├── app_1.5.2.AppImage
│           │   └── app_1.5.2.deb
│           └── fabu/
│               └── v1.5.2/                    # 新创建的版本目录
│                   ├── app_1.5.2.msi
│                   ├── app_1.5.2.dmg
│                   ├── app_1.5.2.AppImage
│                   └── app_1.5.2.deb
├── package.json
└── version.txt                                 # 保存版本号的文件
```

### FTP 服务器结构示例

**FTP 目录结构**:
```
/
├── apps/
│   └── myapp/
│       └── releases/
│           ├── v1.5.2/
│           │   ├── app_1.5.2.msi
│           │   ├── app_1.5.2.dmg
│           │   └── app_1.5.2.AppImage
│           └── v1.5.1/
│               ├── app_1.5.1.msi
│               └── app_1.5.1.dmg
└── updater/
    └── latest.json                             # CDN 配置文件
```

## 🛠️ 开发环境设置

### 1. 环境要求
- **Node.js**: >= 16.0.0
- **pnpm**: >= 8.0.0
- **TypeScript**: >= 5.0.0

### 2. 项目克隆和安装
```bash
# 克隆项目
git clone https://github.com/your-org/up-actions.git
cd up-actions

# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 打包 distribution
pnpm run package
```

### 3. 本地开发

#### 开发模式（监听文件变化）
```bash
# 启动 TypeScript 监听模式
pnpm run dev
```

#### 完整构建流程
```bash
# 执行完整构建：TypeScript 编译 + 打包 + 版本管理
pnpm run build:full
```

#### 清理构建产物
```bash
# 清理 dist 目录
pnpm run clean
```

### 4. 项目结构
```
up-actions/
├── src/                          # 源代码目录
│   ├── main.ts                   # 主入口文件
│   └── types.ts                  # TypeScript 类型定义
├── dist/                         # 构建输出目录
│   ├── index.js                  # GitHub Action 入口
│   ├── main.js                   # 主逻辑文件
│   └── types.js                  # 类型定义文件
├── mbump.config.ts               # mbump 版本管理配置
├── package.json                  # 项目依赖和脚本
├── tsconfig.json                 # TypeScript 配置
└── action.yml                    # GitHub Action 定义
```

### 5. 开发工作流

#### 添加新功能
1. **功能开发**: 在 `src/main.ts` 中添加新功能
2. **类型定义**: 在 `src/types.ts` 中添加相应的 TypeScript 类型
3. **测试验证**: 使用 `pnpm run dev` 进行本地测试
4. **构建验证**: 运行 `pnpm run build` 确保编译成功
5. **提交代码**: 使用语义化提交格式

#### 修复问题
1. **问题定位**: 通过日志输出和错误信息定位问题
2. **代码修复**: 修复相关代码逻辑
3. **回归测试**: 确保修复不影响现有功能
4. **文档更新**: 更新相关文档和注释

## 🧪 测试和调试

### 1. 本地测试方法

#### 创建测试工作流
```yaml
name: 本地测试
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test-action:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 测试 Action
        uses: ./
        id: test
        with:
          source-dir: './test-files/'
          target-root: './test-output/'
          config-file: './test-config.json'
          enable-ftp: 'disabled'  # 禁用 FTP 进行本地测试
```

#### 手动调试技巧
```bash
# 1. 验证目录结构
echo "当前目录: $(pwd)"
ls -la

# 2. 检查源目录
echo "源目录检查:"
ls -la src-tauri/target/release/bundle/ || echo "源目录不存在"

# 3. 验证配置文件
echo "配置文件内容:"
cat src-tauri/tauri.conf.json | jq .

# 4. 手动测试文件复制
echo "测试目标目录:"
mkdir -p test-output/
cp -r src-tauri/target/release/bundle/* test-output/
ls -la test-output/
```

### 2. 常见调试场景

#### 版本号提取问题
```yaml
- name: 调试版本提取
  run: |
    echo "检查配置文件..."
    cat src-tauri/tauri.conf.json
    echo "使用 jq 提取版本..."
    cat src-tauri/tauri.conf.json | jq -r '.package.version // .version // "0.0.0"'
```

#### 文件复制问题
```yaml
- name: 调试文件复制
  run: |
    echo "源目录文件:"
    find src-tauri/target/release/bundle/ -type f
    echo "目标目录权限:"
    ls -la src-tauri/target/release/fabu/
```

#### FTP 连接问题
```yaml
- name: 调试 FTP 连接
  run: |
    echo "测试 FTP 连接..."
    curl -v ftp://${{ secrets.FTP_HOST }} --user ${{ secrets.FTP_USER }}:${{ secrets.FTP_PASS }}
```

### 3. 性能优化建议

#### 大文件处理
- 使用 `rsync` 或 `scp` 处理超大文件
- 分批处理避免内存溢出
- 考虑使用 Git LFS 存储大文件

#### 并发优化
- 在不需要顺序执行的操作中使用并行步骤
- 合理使用 GitHub Actions 的矩阵策略
- 避免不必要的文件 I/O 操作

## 🛡️ 安全最佳实践

### 1. 密钥管理

#### GitHub Secrets 配置
```yaml
# 在 GitHub 仓库设置中添加以下 secrets:
FTP_HOST=your-ftp-server.com
FTP_USERNAME=your-username
FTP_PASSWORD=your-password  
GITHUB_TOKEN=ghp_your_token_here
```

#### 安全使用密钥
```yaml
- name: 安全部署
  uses: ./
  with:
    ftp-host: ${{ secrets.FTP_HOST }}
    ftp-username: ${{ secrets.FTP_USERNAME }}
    ftp-password: ${{ secrets.FTP_PASSWORD }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    # ✅ 正确：使用 secrets
    # ❌ 错误：直接使用明文密码
```

### 2. 输入验证

#### 参数验证
```typescript
// 内置验证逻辑
function validateInputs(inputs: ActionInputs): ValidationResult {
  const errors: string[] = [];
  
  // 验证 FTP 配置
  if (inputs.enableFtp === 'use') {
    if (!inputs.ftpHost || !inputs.ftpUsername || !inputs.ftpPassword) {
      errors.push('FTP credentials are required when enable-ftp is set to "use"');
    }
  }
  
  // 验证 GitHub Token
  if (inputs.uploadLatest !== 'disabled' && !inputs.githubToken) {
    errors.push('GitHub token is required when upload-latest is not disabled');
  }
  
  return { valid: errors.length === 0, errors };
}
```

#### 路径安全
```typescript
// 防止路径遍历攻击
function sanitizePath(inputPath: string): string {
  // 移除危险字符和相对路径
  return inputPath
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim();
}
```

### 3. 网络安全

#### FTP 安全
- 使用 FTPS (FTP over SSL/TLS) 替代普通 FTP
- 配置防火墙限制 FTP 访问 IP 范围
- 定期更换 FTP 账户密码

#### GitHub Token
- 使用最小权限原则
- 定期轮换访问令牌
- 监控 token 使用情况

## 🐛 故障排除

### 常见问题及解决方案

#### 1. 版本号提取失败

**症状**: 输出版本为 `0.0.0` 或显示 "Version not found in config file"

**诊断步骤**:
```bash
# 检查配置文件存在性
ls -la src-tauri/tauri.conf.json

# 验证 JSON 语法
cat src-tauri/tauri.conf.json | jq .

# 检查版本字段
cat src-tauri/tauri.conf.json | jq '.package.version'
cat src-tauri/tauri.conf.json | jq '.version'
```

**解决方案**:
```json
// 方案 1: 在 package 对象中定义版本
{
  "package": {
    "version": "1.2.3"
  }
}

// 方案 2: 在根级别定义版本
{
  "version": "1.2.3"
}

// 方案 3: 在 tauri 对象中定义版本
{
  "tauri": {
    "version": "1.2.3"
  }
}
```

#### 2. 源目录不存在

**症状**: 显示 "Source directory does not exist"

**诊断步骤**:
```bash
# 检查构建是否完成
ls -la src-tauri/target/release/bundle/

# 验证构建产物
find src-tauri/target/release/ -name "*.msi" -o -name "*.dmg" -o -name "*.AppImage"
```

**解决方案**:
```yaml
- name: 确保构建完成
  run: |
    # 等待构建完成
    while [ ! -d "src-tauri/target/release/bundle/" ]; do
      echo "等待构建完成..."
      sleep 5
    done
    ls -la src-tauri/target/release/bundle/
```

#### 3. FTP 连接失败

**症状**: FTP 部署失败或超时

**诊断步骤**:
```bash
# 测试 FTP 连接
curl -v --connect-timeout 10 ftp://${{ secrets.FTP_HOST }} --user user:pass

# 检查网络连通性
telnet ${{ secrets.FTP_HOST }} 21
```

**解决方案**:
```yaml
- name: FTP 连接测试
  run: |
    # 使用 lftp 进行详细测试
    lftp -c "set ftp:ssl-allow no; open ftp://${{ secrets.FTP_HOST }}; user ${{ secrets.FTP_USERNAME }} ${{ secrets.FTP_PASSWORD }}; ls"
```

#### 4. 文件权限问题

**症状**: 文件复制失败或权限错误

**诊断步骤**:
```bash
# 检查文件权限
ls -la src-tauri/target/release/bundle/

# 检查目录权限
ls -ld src-tauri/target/release/fabu/
```

**解决方案**:
```yaml
- name: 修复权限
  run: |
    # 设置正确的文件权限
    chmod -R 755 src-tauri/target/release/bundle/
    chmod -R 755 src-tauri/target/release/fabu/
```

#### 5. GitHub API 限制

**症状**: CDN 更新失败，显示 API 限制错误

**诊断步骤**:
```bash
# 检查 GitHub Token 权限
curl -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" https://api.github.com/user
```

**解决方案**:
```yaml
- name: 优化 API 调用
  run: |
    # 使用 GitHub CLI 替代 REST API
    gh release list --limit 1
```

### 调试模式启用

#### 启用详细日志
```yaml
- name: 调试模式部署
  uses: ./
  env:
    DEBUG: true
    NODE_OPTIONS: '--trace-warnings'
  with:
    source-dir: 'src-tauri/target/release/bundle/'
    target-root: 'releases/'
    config-file: 'src-tauri/tauri.conf.json'
    enable-ftp: 'use'
```

#### 保存调试信息
```yaml
- name: 保存调试信息
  if: failure()
  run: |
    # 保存调试日志
    echo "=== 调试信息 ===" > debug.log
    echo "工作目录: $(pwd)" >> debug.log
    echo "环境变量:" >> debug.log
    env | grep -E "(GITHUB|FTP)" >> debug.log
    echo "=== 目录结构 ===" >> debug.log
    find . -type f -name "*.log" -o -name "*.json" >> debug.log
```

## 📊 性能优化

### 1. 大规模文件处理

#### 并行处理优化
```yaml
# 使用矩阵策略并行处理不同平台
strategy:
  matrix:
    platform: [ubuntu-latest, windows-latest, macos-latest]
```

#### 增量部署
```yaml
- name: 检查文件变更
  id: check-changes
  run: |
    # 比较文件差异，只部署变更的文件
    git diff --name-only HEAD~1 HEAD | grep -E '\.(msi|dmg|AppImage)$' > changed-files.txt
    
- name: 增量部署
  if: hashFiles('changed-files.txt') != ''
  uses: ./
  with:
    # 只处理变更的文件
    source-dir: 'src-tauri/target/release/bundle/'
    target-root: 'releases/'
```

### 2. 网络优化

#### FTP 传输优化
```yaml
- name: 优化FTP传输
  run: |
    # 使用压缩传输
    tar -czf release.tar.gz src-tauri/target/release/bundle/
    
    # 分块传输大文件
    split -b 50M release.tar.gz release.tar.gz.
```

#### CDN 缓存策略
```yaml
- name: 设置CDN缓存
  run: |
    # 为静态资源设置长期缓存
    curl -X PUT \
      -H "Cache-Control: public, max-age=31536000" \
      -H "Expires: $(date -d '+1 year' -u +%a,\ %d\ %b\ %Y\ %H:%M:%S\ GMT)" \
      https://cdn.example.com/releases/${{ steps.deploy.outputs.version }}/
```

## 🔄 集成和扩展

### 1. CI/CD 集成

#### Jenkins 集成
```groovy
pipeline {
    agent any
    stages {
        stage('构建') {
            steps {
                sh 'pnpm tauri build'
            }
        }
        stage('部署') {
            steps {
                sh '''
                    curl -L https://github.com/your-org/up-actions/releases/latest/download/index.js \
                      -o action.js
                    node action.js
                '''
            }
        }
    }
}
```

#### GitLab CI 集成
```yaml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - pnpm tauri build

deploy:
  stage: deploy
  script:
    - echo "Deploying with up-actions"
  only:
    - tags
```

### 2. 第三方工具集成

#### 监控和告警
```yaml
- name: 部署监控
  run: |
    # 发送部署通知到 Slack
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"✅ 应用 v${{ steps.deploy.outputs.version }} 部署成功\"}" \
      ${{ secrets.SLACK_WEBHOOK }}
    
    # 记录到日志系统
    echo "Deployment successful: v${{ steps.deploy.outputs.version }}" | \
      logger -t deployment
```

#### 质量检查
```yaml
- name: 部署前检查
  run: |
    # 文件完整性检查
    cd ${{ steps.deploy.outputs.target-dir }}
    sha256sum *.msi *.dmg *.AppImage > checksums.txt
    
    # 大小合理性检查
    for file in *.msi *.dmg *.AppImage; do
      size=$(stat -c%s "$file")
      if [ $size -lt 1000000 ]; then
        echo "警告: $file 文件过小，可能存在问题"
        exit 1
      fi
    done
```

## 📈 监控和分析

### 1. 部署指标追踪

#### 构建成功率
```yaml
- name: 记录构建指标
  run: |
    # 记录构建时间
    echo "BUILD_TIME=$(date +%s)" >> $GITHUB_ENV
    
    # 记录文件大小
    echo "APP_SIZE=$(du -sh ${{ steps.deploy.outputs.target-dir }} | cut -f1)" >> $GITHUB_ENV
    
    # 记录版本信息
    echo "VERSION=${{ steps.deploy.outputs.version }}" >> $GITHUB_ENV
```

#### 性能监控
```yaml
- name: 性能监控
  run: |
    # 监控部署时间
    START_TIME=$(date +%s)
    
    # 执行部署操作
    # ... 部署步骤 ...
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "部署耗时: ${DURATION}秒"
    
    # 发送到监控系统
    curl -X POST https://monitoring.example.com/metrics \
      -d "deployment_duration=${DURATION}&version=${{ steps.deploy.outputs.version }}"
```

### 2. 错误分析

#### 错误日志收集
```yaml
- name: 收集错误日志
  if: failure()
  run: |
    # 收集所有日志文件
    find . -name "*.log" -exec cat {} \; > error.log
    
    # 分析常见错误模式
    grep -i "error\|fail\|exception" error.log | sort | uniq -c | sort -nr
    
    # 发送错误报告
    curl -X POST https://monitoring.example.com/errors \
      -H "Content-Type: application/json" \
      -d @error.log
```

## 🎯 最佳实践

### 1. 版本管理

#### 语义化版本控制
```bash
# 使用 mbump 进行版本管理
pnpm run mbump patch    # 1.0.0 -> 1.0.1
pnpm run mbump minor    # 1.0.1 -> 1.1.0  
pnpm run mbump major    # 1.1.0 -> 2.0.0
```

#### 版本一致性检查
```yaml
- name: 版本一致性检查
  run: |
    # 检查所有配置文件中的版本一致性
    CONFIG_VERSION=$(cat src-tauri/tauri.conf.json | jq -r '.package.version')
    PACKAGE_VERSION=$(cat package.json | jq -r '.version')
    
    if [ "$CONFIG_VERSION" != "$PACKAGE_VERSION" ]; then
      echo "❌ 版本不一致: tauri.conf.json=$CONFIG_VERSION, package.json=$PACKAGE_VERSION"
      exit 1
    fi
    
    echo "✅ 版本一致性检查通过: $CONFIG_VERSION"
```

### 2. 部署策略

#### 蓝绿部署
```yaml
- name: 蓝绿部署
  run: |
    # 确定当前环境（蓝或绿）
    CURRENT_ENV=$(curl -s https://api.example.com/current-env)
    
    # 部署到目标环境
    TARGET_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")
    
    echo "部署到 $TARGET_ENV 环境"
    
    # 执行部署
    # ... 部署步骤 ...
    
    # 切换流量
    curl -X POST https://api.example.com/switch-env -d "target=$TARGET_ENV"
```

#### 回滚策略
```yaml
- name: 部署回滚
  run: |
    # 保存当前版本信息
    curl -s https://api.example.com/current-version > current-version.txt
    
    # 如果新版本部署失败，执行回滚
    if [ "$DEPLOY_STATUS" = "failed" ]; then
      PREVIOUS_VERSION=$(cat current-version.txt)
      echo "回滚到版本: $PREVIOUS_VERSION"
      
      # 执行回滚操作
      # ... 回滚步骤 ...
    fi
```

### 3. 安全实践

#### 依赖安全
```bash
# 定期检查依赖安全性
pnpm audit

# 自动修复安全漏洞
pnpm audit --fix

# 更新依赖到安全版本
pnpm update
```

#### 代码签名
```yaml
- name: 代码签名验证
  run: |
    # 验证文件签名
    for file in ${{ steps.deploy.outputs.target-dir }}/*.{msi,dmg,AppImage}; do
      echo "验证 $file 签名..."
      # 使用适当的工具验证签名
      # codesign --verify "$file"  # macOS
      # signtool verify /pa "$file"  # Windows
    done
```

## 🤝 贡献指南

### 开发工作流

#### 1. 功能开发
```bash
# 1. 创建功能分支
git checkout -b feature/ftp-improvements

# 2. 开发新功能
# 编辑 src/main.ts 添加 FTP 改进功能

# 3. 测试功能
pnpm run dev
pnpm test

# 4. 提交变更
git commit -m "feat: add FTP connection pooling"

# 5. 推送到远程
git push origin feature/ftp-improvements
```

#### 2. 问题修复
```bash
# 1. 创建修复分支
git checkout -b fix/version-extraction-bug

# 2. 修复问题
# 编辑相关代码文件

# 3. 添加测试用例
# 在 tests/ 目录添加测试

# 4. 提交修复
git commit -m "fix: resolve version extraction from nested package.json"

# 5. 创建 Pull Request
```

### 提交规范

#### 语义化提交
```bash
# 功能新增
git commit -m "feat: add CDN update functionality"

# 问题修复
git commit -m "fix: handle missing config file gracefully"

# 性能优化
git commit -m "perf: optimize file scanning for large directories"

# 重构
git commit -m "refactor: extract FTP logic into separate module"

# 文档更新
git commit -m "docs: update API reference with new parameters"

# 测试
git commit -m "test: add unit tests for version extraction"
```

#### 变更日志生成
```bash
# 使用 mbump 自动生成变更日志
pnpm run mbump

# 手动生成变更日志
git log --pretty=format:"%h - %s (%an, %ad)" --date=short
```

### 代码质量

#### 代码规范
```bash
# TypeScript 代码检查
npx tsc --noEmit

# 代码格式化
npx prettier --write src/

# 代码质量检查
npx eslint src/ --ext .ts
```

#### 测试覆盖
```bash
# 运行测试套件
npm test

# 生成覆盖率报告
npm run test:coverage

# 性能测试
npm run test:performance
```

## 📞 技术支持

### 获取帮助

#### 1. 查看文档
- 本 README.md 文件包含详细的使用说明
- 查看 `action.yml` 了解最新的输入输出参数
- 检查 `src/types.ts` 了解完整的 TypeScript 类型定义

#### 2. 社区支持
- **GitHub Issues**: 提交 bug 报告和功能请求
- **GitHub Discussions**: 参与社区讨论和问答
- **Wiki 页面**: 查看更多技术文档和示例

#### 3. 问题反馈

**报告 Bug**:
请在 GitHub Issues 中提供以下信息：
- 详细的错误描述和复现步骤
- GitHub Actions 工作流配置
- 相关日志输出
- 环境信息（操作系统、Node.js 版本等）

**请求功能**:
请在 GitHub Issues 中描述：
- 功能的详细需求和用例
- 期望的行为和交互方式
- 相关的技术限制或考虑

### 联系方式

- **项目维护者**: supbose
- **开源协议**: ISC License
- **项目地址**: [https://github.com/your-org/up-actions](https://github.com/your-org/up-actions)

## 📄 许可证

本项目采用 ISC 许可证，详见 [LICENSE](LICENSE) 文件。

```
ISC License

Copyright (c) 2024, supbose

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## 🙏 致谢

感谢以下开源项目的支持：

- **[@samkirkland/ftp-deploy](https://github.com/SamKirkland/ftp-deploy)**: 提供了可靠的 FTP 部署解决方案
- **[@octokit/core](https://github.com/octokit/core.js)**: GitHub API 客户端库
- **[@actions/core](https://github.com/actions/toolkit/tree/main/packages/core)**: GitHub Actions 核心工具包
- **[@mznjs/mbump](https://www.npmjs.com/package/@mznjs/mbump)**: 版本管理工具

---

**🎉 感谢使用 up-actions！**

如果您觉得这个项目有用，请给我们一个 ⭐ Star！您的支持是我们持续改进的动力。

如果在使用过程中遇到问题或有改进建议，欢迎提交 Issue 或 Pull Request。让我们一起构建更好的版本化部署解决方案！