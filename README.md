# Module Release Action

English | [简体中文](README_CN.md)

A GitHub Action for creating immutable releases with `module.prop` validation for Magisk/KernelSU modules.

## Features

- **Immutable releases**: Creates release and uploads asset in a single operation
- **module.prop validation**: Validates the zip file contains a valid `module.prop`
- **ID verification**: Ensures module ID matches the repository name
- **Format validation**: Validates all required fields and formats
- **Auto-naming**: Uploads asset as `{id}-{versionCode}-{version}.zip`

## Usage

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

      - name: Build module
        run: |
          # Your build steps here
          zip -r module.zip .

      - name: Create Release
        uses: KernelSU-Modules-Repo/module_release@v1
        with:
          file: module.zip
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `file` | Path to the zip file to upload | Yes | - |
| `tag_name` | Git tag name for the release | No | `github.ref_name` |
| `name` | Release name | No | Tag name |
| `body` | Release body/description | No | - |
| `body_path` | Path to file containing release body | No | - |
| `prerelease` | Mark as prerelease | No | `false` |
| `target_commitish` | Commitish value for the tag | No | - |
| `token` | GitHub token | No | `github.token` |
| `generate_release_notes` | Auto-generate release notes | No | `false` |
| `make_latest` | Mark as latest release (`true`/`false`/`legacy`) | No | - |

## Outputs

| Output | Description |
|--------|-------------|
| `url` | Release HTML URL |
| `id` | Release ID |
| `upload_url` | Release upload URL |

## module.prop Requirements

The zip file must contain a `module.prop` file at the root level with the following fields:

```properties
id=example_module
name=Example Module
version=v1.0.0
versionCode=100
author=Your Name
description=Module description
```

### Validation Rules

| Field | Requirement |
|-------|-------------|
| `id` | Must match `^[a-zA-Z][a-zA-Z0-9._-]+$` and equal repository name |
| `name` | Required, any single line string |
| `version` | Required, any single line string |
| `versionCode` | Required, must be an integer |
| `author` | Required, any single line string |
| `description` | Required, any single line string |
| Line endings | Must use UNIX (LF), not Windows (CR+LF) or Mac (CR) |

### ID Format Examples

- `a_module` - Valid
- `a.module` - Valid
- `module-101` - Valid
- `a module` - Invalid (contains space)
- `1_module` - Invalid (starts with number)
- `-a-module` - Invalid (starts with hyphen)

## Asset Naming

The uploaded asset will be automatically renamed to:

```
{id}-{versionCode}-{version}.zip
```

For example, with:
```properties
id=my_module
version=v1.2.3
versionCode=123
```

The asset will be uploaded as: `my_module-123-v1.2.3.zip`

## Error Handling

This action will fail if:

- The file is not a `.zip` file
- The zip does not contain `module.prop` at root level
- Any required field is missing in `module.prop`
- The `id` format is invalid
- The `id` does not match the repository name
- The `versionCode` is not an integer
- The file uses non-UNIX line endings
- A release for the tag already exists

## License

MIT
