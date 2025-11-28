# Module Release Action

[English](README.md) | 简体中文

一个用于创建不可变 Release 的 GitHub Action，支持 Magisk/KernelSU 模块的 `module.prop` 验证。

## 特性

- **不可变 Release**：在单次操作中创建 Release 并上传资源
- **module.prop 验证**：验证 zip 文件包含有效的 `module.prop`
- **ID 校验**：确保模块 ID 与仓库名称匹配
- **格式验证**：验证所有必填字段和格式
- **自动命名**：上传资源自动命名为 `{id}-{versionCode}-{version}.zip`

## 使用方法

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 构建模块
        run: |
          # 你的构建步骤
          zip -r module.zip .

      - name: 创建 Release
        uses: KernelSU-Modules-Repo/module_release@v1
        with:
          file: module.zip
          token: ${{ secrets.GITHUB_TOKEN }}
```

## 输入参数

| 参数 | 描述 | 必填 | 默认值 |
|------|------|------|--------|
| `file` | 要上传的 zip 文件路径 | 是 | - |
| `tag_name` | Release 的 Git 标签名 | 否 | `github.ref_name` |
| `name` | Release 名称 | 否 | 标签名 |
| `body` | Release 描述内容 | 否 | - |
| `body_path` | 包含 Release 描述的文件路径 | 否 | - |
| `prerelease` | 标记为预发布版本 | 否 | `false` |
| `target_commitish` | 标签对应的 commitish 值 | 否 | - |
| `token` | GitHub token | 否 | `github.token` |
| `generate_release_notes` | 自动生成发布说明 | 否 | `false` |
| `make_latest` | 标记为最新版本 (`true`/`false`/`legacy`) | 否 | - |

## 输出参数

| 输出 | 描述 |
|------|------|
| `url` | Release 页面 URL |
| `id` | Release ID |
| `upload_url` | Release 上传 URL |

## module.prop 要求

zip 文件必须在根目录包含 `module.prop` 文件，包含以下字段：

```properties
id=example_module
name=Example Module
version=v1.0.0
versionCode=100
author=Your Name
description=Module description
```

### 验证规则

| 字段 | 要求 |
|------|------|
| `id` | 必须匹配 `^[a-zA-Z][a-zA-Z0-9._-]+$` 且等于仓库名称 |
| `name` | 必填，任意单行字符串 |
| `version` | 必填，任意单行字符串 |
| `versionCode` | 必填，必须是整数 |
| `author` | 必填，任意单行字符串 |
| `description` | 必填，任意单行字符串 |
| 换行符 | 必须使用 UNIX (LF)，不能是 Windows (CR+LF) 或 Mac (CR) |

### ID 格式示例

- `a_module` - 有效
- `a.module` - 有效
- `module-101` - 有效
- `a module` - 无效（包含空格）
- `1_module` - 无效（以数字开头）
- `-a-module` - 无效（以连字符开头）

## 资源命名

上传的资源将自动重命名为：

```
{id}-{versionCode}-{version}.zip
```

例如，如果 module.prop 内容为：
```properties
id=my_module
version=v1.2.3
versionCode=123
```

资源将被上传为：`my_module-123-v1.2.3.zip`

## 错误处理

以下情况 Action 将失败：

- 文件不是 `.zip` 文件
- zip 文件根目录不包含 `module.prop`
- `module.prop` 缺少任何必填字段
- `id` 格式无效
- `id` 与仓库名称不匹配
- `versionCode` 不是整数
- 文件使用非 UNIX 换行符
- 该标签的 Release 已存在

## 许可证

MIT
