'use strict'

/**
 * Image size / ratio utilities
 * Shared by chat.image.video.js and any future image-related routes.
 */

/**
 * Normalize a string: trim + collapse whitespace.
 * @param {string|null|undefined} s
 * @returns {string}
 */
function normalizeInputString(s) {
  if (!s || typeof s !== 'string') return ''
  return s.trim().replace(/\s+/g, ' ')
}

/**
 * Try to parse a ratio string like "16:9" or "16/9".
 * Returns the canonical "W:H" form or null.
 * @param {string} s
 * @returns {string|null}
 */
function tryParseRatioString(s) {
  const text = normalizeInputString(s)
  if (!text) return null
  const m = text.match(/^(\d+)\s*[:\/]\s*(\d+)$/)
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  if (!w || !h) return null
  return `${w}:${h}`
}

/**
 * Try to parse an OpenAI-style size string like "1024x768".
 * Returns { width, height } or null.
 * @param {string} size
 * @returns {{ width: number, height: number }|null}
 */
function tryParseOpenAiImageSize(size) {
  const text = normalizeInputString(size)
  if (!text) return null
  const m = text.toLowerCase().match(/^(\d{2,5})\s*x\s*(\d{2,5})$/)
  if (!m) return null
  const width = Number(m[1])
  const height = Number(m[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
}

// Qwen-supported aspect ratios with their numeric values
const QWEN_RATIOS = [
  { key: '1:1',  r: 1 },
  { key: '16:9', r: 16 / 9 },
  { key: '9:16', r: 9 / 16 },
  { key: '4:3',  r: 4 / 3 },
  { key: '3:4',  r: 3 / 4 },
]

/**
 * Map an OpenAI image size string (e.g. "1024x1024", "16:9", "1792x1024")
 * to the nearest Qwen-supported aspect ratio string.
 *
 * Priority:
 *   1. If the input is already a valid Qwen ratio string → return as-is
 *   2. If it parses as WxH → find nearest ratio by aspect ratio distance
 *   3. Fallback → "1:1"
 *
 * @param {string} size
 * @returns {string}
 */
function mapOpenAiImageSizeToQwenRatio(size) {
  // Direct ratio string match
  const ratio = tryParseRatioString(size)
  if (ratio) {
    const valid = QWEN_RATIOS.find(r => r.key === ratio)
    if (valid) return valid.key
  }

  // WxH pixel size → nearest ratio
  const parsed = tryParseOpenAiImageSize(size)
  if (!parsed) return '1:1'

  const { width, height } = parsed
  const aspectRatio = width / height

  let best = QWEN_RATIOS[0]
  let bestDiff = Infinity
  for (const candidate of QWEN_RATIOS) {
    const diff = Math.abs(aspectRatio - candidate.r)
    if (diff < bestDiff) {
      best = candidate
      bestDiff = diff
    }
  }
  return best.key
}

/**
 * Parse a Qwen ratio string ("W:H") into pixel dimensions.
 * Uses a base resolution of 1024px on the longer side.
 * @param {string} ratio - e.g. "16:9"
 * @returns {{ width: number, height: number }}
 */
function ratioToPixels(ratio, basePx = 1024) {
  const parsed = tryParseRatioString(ratio)
  if (!parsed) return { width: basePx, height: basePx }
  const [w, h] = parsed.split(':').map(Number)
  if (w >= h) {
    return { width: basePx, height: Math.round(basePx * h / w) }
  }
  return { width: Math.round(basePx * w / h), height: basePx }
}

/**
 * Validate that a size string is usable (either WxH or ratio).
 * Returns the canonical Qwen ratio.
 * @param {string|null|undefined} size
 * @param {string} [defaultRatio='1:1']
 * @returns {string}
 */
function resolveImageRatio(size, defaultRatio = '1:1') {
  if (!size) return defaultRatio
  return mapOpenAiImageSizeToQwenRatio(size)
}

module.exports = {
  normalizeInputString,
  tryParseRatioString,
  tryParseOpenAiImageSize,
  mapOpenAiImageSizeToQwenRatio,
  ratioToPixels,
  resolveImageRatio,
}