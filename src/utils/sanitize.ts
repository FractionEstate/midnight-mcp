/**
 * Sanitization Utilities
 *
 * Content sanitization and filtering for safe output.
 * Based on GitHub MCP server patterns.
 */

// =============================================================================
// MAIN SANITIZER
// =============================================================================

/**
 * Main sanitization function that combines all filters
 */
export function sanitize(input: string): string {
  return filterCodeFenceMetadata(filterInvisibleCharacters(input))
}

// =============================================================================
// INVISIBLE CHARACTER FILTERING
// =============================================================================

/**
 * Removes invisible or control characters that should not appear in user-facing output.
 * Includes:
 * - Unicode tag characters: U+E0001, U+E0020–U+E007F
 * - BiDi control characters: U+202A–U+202E, U+2066–U+2069
 * - Hidden modifier characters: U+200B, U+200C, U+200E, U+200F, U+00AD, U+FEFF, U+180E, U+2060–U+2064
 */
export function filterInvisibleCharacters(input: string): string {
  if (!input) return input

  const result: string[] = []
  for (const char of input) {
    if (!shouldRemoveChar(char)) {
      result.push(char)
    }
  }
  return result.join("")
}

function shouldRemoveChar(char: string): boolean {
  const codePoint = char.codePointAt(0)
  if (codePoint === undefined) return false

  // Individual characters to remove
  const removeChars = new Set([
    0x200b, // ZERO WIDTH SPACE
    0x200c, // ZERO WIDTH NON-JOINER
    0x200e, // LEFT-TO-RIGHT MARK
    0x200f, // RIGHT-TO-LEFT MARK
    0x00ad, // SOFT HYPHEN
    0xfeff, // ZERO WIDTH NO-BREAK SPACE (BOM)
    0x180e, // MONGOLIAN VOWEL SEPARATOR
    0xe0001, // TAG
  ])

  if (removeChars.has(codePoint)) {
    return true
  }

  // Unicode tags: U+E0020–U+E007F
  if (codePoint >= 0xe0020 && codePoint <= 0xe007f) {
    return true
  }

  // BiDi controls: U+202A–U+202E
  if (codePoint >= 0x202a && codePoint <= 0x202e) {
    return true
  }

  // BiDi isolates: U+2066–U+2069
  if (codePoint >= 0x2066 && codePoint <= 0x2069) {
    return true
  }

  // Hidden modifiers: U+2060–U+2064
  if (codePoint >= 0x2060 && codePoint <= 0x2064) {
    return true
  }

  return false
}

// =============================================================================
// CODE FENCE FILTERING
// =============================================================================

const MAX_CODE_FENCE_INFO_LENGTH = 48

/**
 * Removes hidden or suspicious info strings from fenced code blocks.
 * Prevents injection via code fence metadata.
 */
export function filterCodeFenceMetadata(input: string): string {
  if (!input) return input

  const lines = input.split("\n")
  let insideFence = false
  let currentFenceLen = 0

  for (let i = 0; i < lines.length; i++) {
    const { sanitized, toggled, fenceLen } = sanitizeCodeFenceLine(
      lines[i],
      insideFence,
      currentFenceLen
    )
    lines[i] = sanitized

    if (toggled) {
      insideFence = !insideFence
      if (insideFence) {
        currentFenceLen = fenceLen
      } else {
        currentFenceLen = 0
      }
    }
  }

  return lines.join("\n")
}

interface SanitizeResult {
  sanitized: string
  toggled: boolean
  fenceLen: number
}

function sanitizeCodeFenceLine(
  line: string,
  insideFence: boolean,
  expectedFenceLen: number
): SanitizeResult {
  const idx = line.indexOf("```")
  if (idx === -1) {
    return { sanitized: line, toggled: false, fenceLen: expectedFenceLen }
  }

  // Check for non-whitespace before the fence
  if (hasNonWhitespace(line.substring(0, idx))) {
    return { sanitized: line, toggled: false, fenceLen: expectedFenceLen }
  }

  // Count fence characters
  let fenceEnd = idx
  while (fenceEnd < line.length && line[fenceEnd] === "`") {
    fenceEnd++
  }

  const fenceLen = fenceEnd - idx
  if (fenceLen < 3) {
    return { sanitized: line, toggled: false, fenceLen: expectedFenceLen }
  }

  const rest = line.substring(fenceEnd)

  // If inside fence, check if this is a closing fence
  if (insideFence) {
    if (expectedFenceLen !== 0 && fenceLen !== expectedFenceLen) {
      return { sanitized: line, toggled: false, fenceLen: expectedFenceLen }
    }
    return { sanitized: line.substring(0, fenceEnd), toggled: true, fenceLen }
  }

  // Opening fence - sanitize the info string
  const trimmed = rest.trim()

  if (trimmed === "") {
    return { sanitized: line.substring(0, fenceEnd), toggled: true, fenceLen }
  }

  // Check for spaces in info string (not allowed)
  if (/\s/.test(trimmed)) {
    return { sanitized: line.substring(0, fenceEnd), toggled: true, fenceLen }
  }

  // Check length
  if (trimmed.length > MAX_CODE_FENCE_INFO_LENGTH) {
    return { sanitized: line.substring(0, fenceEnd), toggled: true, fenceLen }
  }

  // Check for safe characters only
  if (!isSafeCodeFenceToken(trimmed)) {
    return { sanitized: line.substring(0, fenceEnd), toggled: true, fenceLen }
  }

  // Safe info string - keep it
  if (rest.length > 0 && /\s/.test(rest[0])) {
    return {
      sanitized: line.substring(0, fenceEnd) + " " + trimmed,
      toggled: true,
      fenceLen,
    }
  }

  return {
    sanitized: line.substring(0, fenceEnd) + trimmed,
    toggled: true,
    fenceLen,
  }
}

function hasNonWhitespace(segment: string): boolean {
  for (const char of segment) {
    if (!/\s/.test(char)) {
      return true
    }
  }
  return false
}

function isSafeCodeFenceToken(token: string): boolean {
  for (const char of token) {
    const isLetter = /\p{L}/u.test(char)
    const isDigit = /\p{N}/u.test(char)
    const isAllowedSymbol = ["+", "-", "_", "#", "."].includes(char)

    if (!isLetter && !isDigit && !isAllowedSymbol) {
      return false
    }
  }
  return true
}

// =============================================================================
// ADDRESS SANITIZATION
// =============================================================================

/**
 * Validate and sanitize a Midnight address
 */
export function sanitizeMidnightAddress(address: string): string | null {
  if (!address) return null

  // Remove whitespace
  const cleaned = address.trim()

  // Midnight addresses are typically hex strings
  // Add your specific validation here
  if (!/^[a-fA-F0-9]+$/.test(cleaned)) {
    return null
  }

  return cleaned.toLowerCase()
}

/**
 * Validate and sanitize a transaction hash
 */
export function sanitizeTransactionHash(hash: string): string | null {
  if (!hash) return null

  const cleaned = hash.trim()

  // Transaction hashes are typically 64-character hex strings
  if (!/^[a-fA-F0-9]{64}$/.test(cleaned)) {
    return null
  }

  return cleaned.toLowerCase()
}

// =============================================================================
// CONTRACT SOURCE SANITIZATION
// =============================================================================

/**
 * Sanitize Compact contract source code
 */
export function sanitizeContractSource(source: string): string {
  // Remove invisible characters and potentially dangerous patterns
  let sanitized = filterInvisibleCharacters(source)

  // Remove any embedded shell commands or dangerous patterns
  sanitized = sanitized.replace(/\$\([^)]*\)/g, "") // Remove $(...)
  sanitized = sanitized.replace(/`[^`]*`/g, (match) => {
    // Only allow backticks in code strings, not shell execution
    if (match.includes("\n")) {
      return match // Multi-line, likely a code block
    }
    return match.replace(/[`$]/g, "") // Remove dangerous chars
  })

  return sanitized
}

// =============================================================================
// URL SANITIZATION
// =============================================================================

/**
 * Validate and sanitize a URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url.trim())

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Validate a URL is from Midnight network
 */
export function isMidnightUrl(url: string): boolean {
  const sanitized = sanitizeUrl(url)
  if (!sanitized) return false

  try {
    const parsed = new URL(sanitized)
    const host = parsed.hostname.toLowerCase()

    // Known Midnight domains
    const midnightDomains = [
      "midnight.network",
      "testnet.midnight.network",
      "devnet.midnight.network",
    ]

    return midnightDomains.some(
      (domain) => host === domain || host.endsWith("." + domain)
    )
  } catch {
    return false
  }
}
