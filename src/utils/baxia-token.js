'use strict'

/**
 * Baxia Token Generator
 * Generates bx-ua, bx-umid-token, and bx-v headers required by chat.qwen.ai
 * Uses Node.js crypto (Web Crypto API compatible subset) — safe for all runtimes.
 */

const crypto = require('crypto')
const { logger } = require('./logger')

const BAXIA_VERSION = '2.5.36'

// ── Random helpers ────────────────────────────────────────────────────────────

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes = crypto.randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── WebGL fingerprint ─────────────────────────────────────────────────────────

function generateWebGLFingerprint() {
  const renderers = [
    'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.6)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080, OpenGL 4.6)',
    'ANGLE (AMD, AMD Radeon RX 580, OpenGL 4.6)',
    'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics, OpenGL 4.6)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060, OpenGL 4.6)',
  ]
  return {
    renderer: pick(renderers),
    vendor: 'Google Inc. (Intel)',
  }
}

// ── Canvas fingerprint (SHA-256 of random bytes → base64) ────────────────────

function generateCanvasFingerprint() {
  const bytes = crypto.randomBytes(32)
  const hash = crypto.createHash('sha256').update(bytes).digest('base64')
  return hash.substring(0, 32)
}

// ── Fingerprint data collection ───────────────────────────────────────────────

function collectFingerprintData() {
  const platforms = ['Win32', 'Linux x86_64', 'MacIntel']
  const languages = ['en-US', 'zh-CN', 'en-GB', 'zh-TW']
  const timezoneOffsets = [-480, -300, 0, 60, 480, 330, 540]
  const pixelRatios = [1, 1.25, 1.5, 2]
  const colorDepths = [24, 30, 32]
  const deviceMemories = [4, 8, 16, 32]

  const webgl = generateWebGLFingerprint()
  const canvas = generateCanvasFingerprint()

  return {
    p: pick(platforms),
    l: pick(languages),
    hc: randomInt(4, 16),
    dm: pick(deviceMemories),
    to: pick(timezoneOffsets),
    sw: randomInt(1280, 2560),
    sh: randomInt(720, 1440),
    cd: pick(colorDepths),
    pr: pick(pixelRatios),
    wf: webgl.renderer.substring(0, 20),
    cf: canvas,
    af: (124.04347527516074 + Math.random() * 0.001).toFixed(14),
    ts: Date.now(),
    r: Math.random(),
  }
}

// ── Encoding ──────────────────────────────────────────────────────────────────

function encodeBaxiaToken(data) {
  const json = JSON.stringify(data)
  const b64 = Buffer.from(json, 'utf-8').toString('base64')
  const versionKey = BAXIA_VERSION.replace(/\./g, '')
  return `${versionKey}!${b64}`
}

// ── UMID token (best-effort fetch from Alibaba endpoint) ─────────────────────

let _cachedUmidToken = null
let _umidFetchedAt = 0
const UMID_TTL_MS = 30 * 60 * 1000 // 30 minutes

async function fetchUmidToken() {
  const now = Date.now()
  if (_cachedUmidToken && now - _umidFetchedAt < UMID_TTL_MS) {
    return _cachedUmidToken
  }

  try {
    const axios = require('axios')
    const res = await axios.get('https://sg-wum.alibaba.com/w/wu.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      },
      timeout: 5000,
    })
    // Upstash-style: etag header carries the umid token
    const etag = res.headers && (res.headers['etag'] || res.headers['ETag'])
    if (etag) {
      _cachedUmidToken = etag
      _umidFetchedAt = now
      return etag
    }
  } catch (err) {
    logger.warn(`Failed to fetch UMID token from Alibaba: ${err.message}`, 'BAXIA')
  }

  // Fallback: generate a plausible-looking token
  const fallback = 'T2gA' + randomString(40)
  _cachedUmidToken = fallback
  _umidFetchedAt = now
  return fallback
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate the three Baxia headers required by chat.qwen.ai:
 *   bx-ua        — browser fingerprint encoded as base64 JSON
 *   bx-umid-token — device UMID (fetched from Alibaba or generated)
 *   bx-v         — Baxia SDK version string
 *
 * @returns {Promise<{ 'bx-ua': string, 'bx-umid-token': string, 'bx-v': string }>}
 */
async function getBaxiaHeaders() {
  const fingerprintData = collectFingerprintData()
  const bxUa = encodeBaxiaToken(fingerprintData)
  const bxUmidToken = await fetchUmidToken()

  return {
    'bx-ua': bxUa,
    'bx-umid-token': bxUmidToken,
    'bx-v': BAXIA_VERSION,
  }
}

/**
 * Synchronous variant — skips the UMID fetch (uses cached value or fallback).
 * Safe to call from non-async contexts.
 */
function getBaxiaHeadersSync() {
  const fingerprintData = collectFingerprintData()
  const bxUa = encodeBaxiaToken(fingerprintData)
  const bxUmidToken = _cachedUmidToken || ('T2gA' + randomString(40))

  return {
    'bx-ua': bxUa,
    'bx-umid-token': bxUmidToken,
    'bx-v': BAXIA_VERSION,
  }
}

/**
 * Pre-warm the UMID token cache. Call once at startup.
 */
async function initBaxia() {
  try {
    await fetchUmidToken()
    logger.success(`Baxia token initialized (v${BAXIA_VERSION})`, 'BAXIA')
  } catch (err) {
    logger.warn(`Baxia init failed, will use fallback: ${err.message}`, 'BAXIA')
  }
}

module.exports = {
  getBaxiaHeaders,
  getBaxiaHeadersSync,
  initBaxia,
  // Exposed for testing
  _internal: { collectFingerprintData, encodeBaxiaToken, generateCanvasFingerprint, randomString },
}