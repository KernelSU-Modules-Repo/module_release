import { GitHub } from '@actions/github/lib/utils.js'
import { open } from 'node:fs/promises'
import { statSync } from 'node:fs'
import { Config, uploadUrl, releaseBody } from './util.js'

type Octokit = InstanceType<typeof GitHub>

export interface Release {
  id: number
  upload_url: string
  html_url: string
  tag_name: string
  name: string | null
  body?: string | null
  target_commitish: string
  draft: boolean
  prerelease: boolean
}

export interface ReleaseAsset {
  id: number
  name: string
  size: number
  browser_download_url: string
}

export const createReleaseWithAsset = async (
  config: Config,
  github: Octokit,
  filePath: string,
  assetName: string
): Promise<{ release: Release; asset: ReleaseAsset }> => {
  const [owner, repo] = config.github_repository.split('/')
  const tag =
    config.input_tag_name ||
    (config.github_ref.startsWith('refs/tags/')
      ? config.github_ref.replace('refs/tags/', '')
      : '')

  if (!tag) {
    throw new Error('No tag specified and GITHUB_REF is not a tag')
  }

  const name = config.input_name || tag
  const body = releaseBody(config)

  console.log(`Creating release for tag: ${tag}`)

  // Create release
  const releaseResponse = await github.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tag,
    name,
    body,
    draft: false,
    prerelease: config.input_prerelease,
    target_commitish: config.input_target_commitish,
    generate_release_notes: config.input_generate_release_notes,
    make_latest: config.input_make_latest
  })

  const release = releaseResponse.data as Release
  console.log(`Release created: ${release.html_url}`)

  // Upload asset immediately
  const assetResult = await upload(
    config,
    github,
    release.upload_url,
    filePath,
    assetName
  )

  return { release, asset: assetResult }
}

export const upload = async (
  config: Config,
  github: Octokit,
  releaseUploadUrl: string,
  filePath: string,
  assetName: string
): Promise<ReleaseAsset> => {
  const size = statSync(filePath).size
  const mime = 'application/zip'

  console.log(`Uploading ${assetName} (${size} bytes, ${mime})...`)

  const endpoint = new URL(uploadUrl(releaseUploadUrl))
  endpoint.searchParams.append('name', assetName)

  const fh = await open(filePath)
  try {
    const resp = await github.request({
      method: 'POST',
      url: endpoint.toString(),
      headers: {
        'content-length': `${size}`,
        'content-type': mime,
        authorization: `token ${config.github_token}`
      },
      data: fh.readableWebStream({
        type: 'bytes'
      } as Parameters<typeof fh.readableWebStream>[0])
    })

    if (resp.status !== 201) {
      const json = resp.data as { message?: string; errors?: unknown[] }
      throw new Error(
        `Failed to upload release asset ${assetName}. Status: ${resp.status}\n${json.message}\n${JSON.stringify(json.errors)}`
      )
    }

    console.log(`Uploaded ${assetName}`)
    return resp.data as ReleaseAsset
  } finally {
    await fh.close()
  }
}

export const releaseExists = async (
  github: Octokit,
  owner: string,
  repo: string,
  tag: string
): Promise<boolean> => {
  try {
    await github.rest.repos.getReleaseByTag({ owner, repo, tag })
    return true
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status
    if (status === 404) {
      return false
    }
    throw error
  }
}
