import * as core from '@actions/core'
import { getOctokit } from '@actions/github'
import { execSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { parseConfig, isTag, type Env } from './util.js'
import { createReleaseWithAsset, releaseExists } from './github.js'

const ID_REGEX = /^[a-zA-Z][a-zA-Z0-9._-]+$/
const REQUIRED_FIELDS = [
  'id',
  'name',
  'version',
  'versionCode',
  'author',
  'description'
]

export interface ModuleProps {
  id: string
  name: string
  version: string
  versionCode: string
  author: string
  description: string
}

function extractModuleProp(zipPath: string): string {
  try {
    return execSync(`unzip -p "${zipPath}" module.prop`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch {
    throw new Error('ZIP file must contain module.prop at root level')
  }
}

function parseModuleProp(content: string): Record<string, string> {
  // Check for Windows (CR+LF) or old Mac (CR) line endings
  if (content.includes('\r\n')) {
    throw new Error(
      'module.prop must use UNIX (LF) line breaks, not Windows (CR+LF)'
    )
  }
  if (content.includes('\r')) {
    throw new Error(
      'module.prop must use UNIX (LF) line breaks, not Macintosh (CR)'
    )
  }

  const props: Record<string, string> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim()
      const value = trimmed.substring(eqIndex + 1).trim()
      props[key] = value
    }
  }

  return props
}

function validateModuleProp(
  props: Record<string, string>,
  expectedRepoName: string
): ModuleProps {
  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!props[field]) {
      throw new Error(`module.prop must contain "${field}" field`)
    }
  }

  // Validate id format
  if (!ID_REGEX.test(props.id)) {
    throw new Error(
      `module.prop id "${props.id}" is invalid. ` +
        'Must match ^[a-zA-Z][a-zA-Z0-9._-]+$ ' +
        '(e.g., a_module, a.module, module-101)'
    )
  }

  // Validate id matches repo name
  if (props.id !== expectedRepoName) {
    throw new Error(
      `module.prop id "${props.id}" does not match repository name "${expectedRepoName}"`
    )
  }

  // Validate versionCode is integer
  if (!/^\d+$/.test(props.versionCode)) {
    throw new Error(
      `module.prop versionCode "${props.versionCode}" must be an integer`
    )
  }

  console.log(`Validated module.prop:`)
  console.log(`  id=${props.id}`)
  console.log(`  name=${props.name}`)
  console.log(`  version=${props.version}`)
  console.log(`  versionCode=${props.versionCode}`)

  return props as unknown as ModuleProps
}

function validateZipFile(
  filePath: string,
  expectedRepoName: string
): ModuleProps {
  // Check file exists
  try {
    const stat = statSync(filePath)
    if (!stat.isFile()) {
      throw new Error(`${filePath} is not a file`)
    }
  } catch {
    throw new Error(`File not found: ${filePath}`)
  }

  // Check it's a zip file
  if (!filePath.endsWith('.zip')) {
    throw new Error(`File must be a .zip file: ${filePath}`)
  }

  // Extract and validate module.prop
  const modulePropContent = extractModuleProp(filePath)
  const props = parseModuleProp(modulePropContent)
  return validateModuleProp(props, expectedRepoName)
}

export async function run(): Promise<void> {
  try {
    const config = parseConfig(process.env as Env)

    // Validate tag
    if (!config.input_tag_name && !isTag(config.github_ref)) {
      throw new Error(
        'GitHub Releases require a tag. Set tag_name input or trigger on tag push.'
      )
    }

    // Validate file input
    if (!config.input_file) {
      throw new Error('file input is required')
    }

    // Get repository name
    const [owner, repo] = config.github_repository.split('/')

    // Validate the zip file and module.prop
    const moduleProps = validateZipFile(config.input_file, repo)

    // Generate asset name: id-versionCode-version.zip
    const assetName = `${moduleProps.id}-${moduleProps.versionCode}-${moduleProps.version}.zip`

    // Initialize GitHub client
    const github = getOctokit(config.github_token)

    // Check if release already exists
    const tag =
      config.input_tag_name || config.github_ref.replace('refs/tags/', '')

    const exists = await releaseExists(github, owner, repo, tag)
    if (exists) {
      throw new Error(
        `Release for tag "${tag}" already exists. This action only supports creating new releases.`
      )
    }

    // Create release with asset
    const { release, asset } = await createReleaseWithAsset(
      config,
      github,
      config.input_file,
      assetName
    )

    // Set outputs
    core.setOutput('url', release.html_url)
    core.setOutput('id', release.id.toString())
    core.setOutput('upload_url', release.upload_url)

    console.log(`Release created successfully: ${release.html_url}`)
    console.log(`Asset uploaded: ${asset.browser_download_url}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}
