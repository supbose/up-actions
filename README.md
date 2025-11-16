# 复制构建文件到发布目录 - GitHub Action 使用说明

## 项目概述

本项目是一个专门用于 Tauri 应用程序的 GitHub Action，主要功能是将 Tauri 构建生成的文件复制到带版本号的发布目录中。该 action 会自动从 `tauri.conf.json` 配置文件中提取版本号，并创建结构化的发布目录。

## 功能特性

### 核心功能
- ✅ 自动提取版本号：从 `tauri.conf.json` 获取应用版本
- ✅ 智能目录创建：创建版本化的发布目录 (`v{version}`)
- ✅ 批量文件复制：将构建产物从 bundle 目录复制到发布目录
- ✅ 平铺结构复制：所有文件复制到目标目录根级别，不保留子目录结构
- ✅ 详细日志输出：提供完整的操作日志和错误信息
- ✅ 灵活配置：支持自定义源目录、目标目录和配置文件路径

### 版本号提取逻辑
1. 优先从配置文件根级别的 `version` 字段获取
2. 如果根级别没有，则尝试从 `package.version` 字段获取
3. 如果都未找到，使用默认值 `0.0.0`

## 技术规格

### 运行环境
- **Node.js 版本**: Node 16
- **支持的操作系统**: Linux, Windows, macOS
- **主要依赖**: `@actions/core`, `@actions/github`

### 目录结构支持
- **源目录**: `src-tauri/target/release/bundle/` (默认)
- **目标目录**: `src-tauri/target/release/fabu/v{version}/` (默认)

## API 参考

### 输入参数 (inputs)

| 参数名 | 类型 | 必需 | 默认值 | 描述 |
|--------|------|------|--------|------|
| `source-dir` | string | 否 | `src-tauri/target/release/bundle/` | 包含打包文件的源目录路径 |
| `target-root` | string | 否 | `src-tauri/target/release/fabu/` | 发布文件的目标根目录 |
| `config-file` | string | 否 | `src-tauri/tauri.conf.json` | tauri.conf.json 配置文件的路径 |

### 输出参数 (outputs)

| 输出名 | 类型 | 描述 |
|--------|------|------|
| `version` | string | 从配置文件中提取的应用版本号 |
| `target-dir` | string | 带版本号的目标目录完整路径 |

## 安装和使用

### 1. 在工作流中使用

将以下步骤添加到你的 GitHub Actions 工作流中：

```yaml
name: 构建和发布
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

      - name: 构建 Tauri 应用
        # 你的构建步骤...

      - name: 复制构建文件到发布目录
        uses: ./
        id: copy-files
        with:
          source-dir: 'src-tauri/target/release/bundle/'
          target-root: 'src-tauri/target/release/fabu/'
          config-file: 'src-tauri/tauri.conf.json'

      - name: 使用版本信息
        run: |
          echo "版本号: ${{ steps.copy-files.outputs.version }}"
          echo "目标目录: ${{ steps.copy-files.outputs.target-dir }}"
```

### 2. 手动使用

你也可以在 GitHub Actions 中手动触发此 action：

```yaml
name: 手动发布
on:
  workflow_dispatch:
    inputs:
      source_directory:
        description: '源目录路径'
        required: false
        default: 'src-tauri/target/release/bundle/'
      target_directory:
        description: '目标根目录路径'
        required: false
        default: 'src-tauri/target/release/fabu/'

jobs:
  copy-files:
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 复制构建文件
        uses: ./
        with:
          source-dir: ${{ github.event.inputs.source_directory }}
          target-root: ${{ github.event.inputs.target_directory }}
```

## 配置示例

### tauri.conf.json 配置示例

项目根目录的 `tauri.conf.json` 应包含版本信息：

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
    "productName": "My Tauri App",
    "version": "1.2.3"
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
      "identifier": "com.example.myapp",
      "longDescription": "",
      "macos": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": ["config.json"],
      "shortDescription": "",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": "",
        "wix": {
          "language": ["en-US"],
          "template": "main.wxs"
        }
      }
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": false
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "My Tauri App",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

### 工作流配置示例

创建 `.github/workflows/release.yml` 文件：

```yaml
name: 发布应用
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 Rust
        uses: dtolnay/rust-toolchain@stable

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.19.0

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 构建应用
        run: pnpm tauri build

      - name: 复制构建文件到发布目录
        id: copy
        uses: ./
        with:
          source-dir: 'src-tauri/target/release/bundle/'
          target-root: 'release/'

      - name: 显示结果
        run: |
          echo "版本: ${{ steps.copy.outputs.version }}"
          echo "目标目录: ${{ steps.copy.outputs.target-dir }}"
          echo "文件列表:"
          ls -la "${{ steps.copy.outputs.target-dir }}"
```

## 目录结构示例

### 执行前目录结构
```
your-tauri-project/
├── src-tauri/
│   ├── tauri.conf.json
│   └── target/
│       └── release/
│           ├── bundle/
│           │   ├── app.msi
│           │   ├── app.dmg
│           │   └── app.AppImage
│           └── fabu/
└── dist/
```

### 执行后目录结构
```
your-tauri-project/
├── src-tauri/
│   ├── tauri.conf.json
│   └── target/
│       └── release/
│           ├── bundle/
│           │   ├── app.msi
│           │   ├── app.dmg
│           │   └── app.AppImage
│           └── fabu/
│               └── v1.2.3/           # 新创建的版本目录
│                   ├── app.msi
│                   ├── app.dmg
│                   └── app.AppImage
│           └── version.txt           # 保存版本号的文件
└── dist/
```

## 故障排除

### 常见问题及解决方案

#### 1. 版本号未正确提取
**问题现象**: 输出版本为 `0.0.0` 或日志显示 "Version not found in config file"

**解决方案**:
- 检查 `tauri.conf.json` 文件是否存在
- 确认版本号字段格式正确：
  - 方案1: `{"version": "1.2.3"}`
  - 方案2: `{"package": {"version": "1.2.3"}}`
- 验证 JSON 语法是否正确

#### 2. 源目录不存在
**问题现象**: 日志显示 "Source directory does not exist"

**解决方案**:
- 确认构建步骤已完成并生成了 bundle 文件
- 检查路径是否正确（使用绝对路径或正确的相对路径）
- 验证源目录参数配置

#### 3. 目标目录创建失败
**问题现象**: 日志显示 "Failed to create target directory"

**解决方案**:
- 检查磁盘空间是否充足
- 验证目录写入权限
- 确认目标路径格式正确

#### 4. 文件复制失败
**问题现象**: 部分文件复制失败或数量不匹配

**解决方案**:
- 检查源目录中是否有文件
- 验证文件权限设置
- 查看详细错误日志

#### 5. JSON 解析错误
**问题现象**: 日志显示 "Could not parse config file"

**解决方案**:
- 验证 `tauri.conf.json` 语法正确性
- 检查文件编码（推荐 UTF-8）
- 确认文件不是二进制格式

### 调试技巧

#### 1. 启用详细日志
在工作流中添加调试步骤：
```yaml
- name: 调试目录结构
  run: |
    echo "当前目录: $(pwd)"
    echo "目录列表:"
    ls -la
    echo "源目录检查:"
    ls -la src-tauri/target/release/bundle/ || echo "源目录不存在"
    echo "配置文件检查:"
    ls -la src-tauri/tauri.conf.json || echo "配置文件不存在"
```

#### 2. 验证配置文件内容
```yaml
- name: 检查配置文件
  run: |
    echo "配置文件内容:"
    cat src-tauri/tauri.conf.json | jq .
```

#### 3. 手动测试文件复制
```yaml
- name: 手动复制测试
  run: |
    echo "测试源目录: ${{ github.event.inputs.source-dir }}"
    echo "测试目标目录: ${{ github.event.inputs.target-root }}"
    ls -la "${{ github.event.inputs.source-dir }}" || echo "源目录不存在"
```

## 最佳实践

### 1. 版本管理
- 使用语义化版本控制 (如 `v1.2.3`)
- 在 `tauri.conf.json` 中维护准确的版本信息
- 考虑使用 Git 标签触发发布流程

### 2. 目录结构
- 保持统一的目录命名规范
- 使用相对路径时注意工作目录上下文
- 考虑不同操作系统的路径分隔符

### 3. 错误处理
- 总是检查关键步骤的执行结果
- 使用 action 的输出参数进行后续处理
- 保存版本号到文件以便后续步骤使用

### 4. 安全性
- 不要在配置文件中硬编码敏感信息
- 使用 GitHub Secrets 管理敏感配置
- 验证文件路径防止路径遍历攻击

## 许可证

本项目采用 ISC 许可证 - 详见 [LICENSE](LICENSE) 文件

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目！

### 开发环境设置
```bash
git clone <repository-url>
cd up-actions
pnpm install
```

### 本地测试
```bash
# 构建项目
pnpm run package

# 手动测试 action
# (需要在 GitHub Actions 中或本地环境模拟)
```

### 提交规范
- 使用清晰的提交信息
- 遵循语义化提交格式
- 确保所有测试通过后再提交

## 更新日志

### v1.0.0 (当前版本)
- 初始版本发布
- 支持 Tauri 构建文件复制
- 自动版本号提取
- 灵活的目录配置
- 完整的错误处理和日志输出

---

更多详细信息和最新更新，请查看项目仓库。
