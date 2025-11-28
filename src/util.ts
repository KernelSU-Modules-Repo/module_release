import { readFileSync } from 'node:fs'

export interface Env {
  GITHUB_TOKEN?: string
  GITHUB_REF?: string
  GITHUB_REPOSITORY?: string
  INPUT_FILE?: string
  INPUT_TAG_NAME?: string
  INPUT_NAME?: string
  INPUT_BODY?: string
  INPUT_BODY_PATH?: string
  INPUT_PRERELEASE?: string
  INPUT_TARGET_COMMITISH?: string
  INPUT_TOKEN?: string
  INPUT_GENERATE_RELEASE_NOTES?: string
  INPUT_MAKE_LATEST?: string
}

export interface Config {
  github_token: string
  github_ref: string
  github_repository: string
  input_file: string
  input_tag_name?: string
  input_name?: string
  input_body?: string
  input_body_path?: string
  input_prerelease: boolean
  input_target_commitish?: string
  input_generate_release_notes: boolean
  input_make_latest?: 'true' | 'false' | 'legacy'
}

export const parseConfig = (env: Env): Config => {
  return {
    github_token: env.GITHUB_TOKEN || env.INPUT_TOKEN || '',
    github_ref: env.GITHUB_REF || '',
    github_repository: env.GITHUB_REPOSITORY || '',
    input_file: env.INPUT_FILE || '',
    input_tag_name: env.INPUT_TAG_NAME?.trim(),
    input_name: env.INPUT_NAME,
    input_body: env.INPUT_BODY,
    input_body_path: env.INPUT_BODY_PATH,
    input_prerelease: env.INPUT_PRERELEASE === 'true',
    input_target_commitish: env.INPUT_TARGET_COMMITISH || undefined,
    input_generate_release_notes: env.INPUT_GENERATE_RELEASE_NOTES === 'true',
    input_make_latest: parseMakeLatest(env.INPUT_MAKE_LATEST)
  }
}

const parseMakeLatest = (
  value: string | undefined
): 'true' | 'false' | 'legacy' | undefined => {
  if (value === 'true' || value === 'false' || value === 'legacy') {
    return value
  }
  return undefined
}

export const isTag = (ref: string): boolean => {
  return ref.startsWith('refs/tags/')
}

export const releaseBody = (config: Config): string | undefined => {
  if (config.input_body_path) {
    try {
      return readFileSync(config.input_body_path, 'utf8')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? 'ERR'
      console.warn(
        `Failed to read body_path "${config.input_body_path}" (${code}). Falling back to 'body' input.`
      )
    }
  }
  return config.input_body
}

export const uploadUrl = (url: string): string => {
  const templateMarkerPos = url.indexOf('{')
  if (templateMarkerPos > -1) {
    return url.substring(0, templateMarkerPos)
  }
  return url
}
