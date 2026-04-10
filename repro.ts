/**
 * Minimal reproduction: resolveKey("shift+return") produces identical
 * output to resolveKey("return") — the shift modifier is silently dropped
 * for all non-letter keys.
 *
 * This matters because programs like Claude Code use the Kitty keyboard
 * protocol where Shift+Enter should produce \x1b[13;2u (CSI u encoding),
 * not plain \r. When using `pty send <name> --seq key:shift+enter`, the
 * shift modifier is lost and the application receives a plain Enter.
 */

// ---------------------------------------------------------------------------
// resolveKey — copied verbatim from pty src/keys.ts (v0.1.0)
// ---------------------------------------------------------------------------

const KEY_MAP: Record<string, string> = {
  return: "\r",
  enter: "\r",
  tab: "\t",
  escape: "\x1b",
  esc: "\x1b",
  space: " ",
  backspace: "\x7f",
  delete: "\x1b[3~",
  up: "\x1b[A",
  down: "\x1b[B",
  right: "\x1b[C",
  left: "\x1b[D",
  home: "\x1b[H",
  end: "\x1b[F",
  pageup: "\x1b[5~",
  pagedown: "\x1b[6~",
}

const MODIFIERS = new Set(["ctrl", "alt", "shift"])

function resolveKey(spec: string): string {
  const parts = spec.toLowerCase().split("+")
  const base = parts.pop()!
  const mods = new Set(parts)

  for (const mod of mods) {
    if (!MODIFIERS.has(mod)) {
      throw new Error(`Unknown modifier: "${mod}" in key spec "${spec}"`)
    }
  }

  let result: string
  if (KEY_MAP[base] !== undefined) {
    result = KEY_MAP[base]
  } else if (base.length === 1 && base >= "a" && base <= "z") {
    result = base
  } else {
    throw new Error(`Unknown key: "${base}" in key spec "${spec}"`)
  }

  // BUG: shift on non-letters is silently ignored (line 46-51 of src/keys.ts)
  if (mods.has("shift")) {
    if (result.length === 1 && result >= "a" && result <= "z") {
      result = result.toUpperCase()
    }
  }

  if (mods.has("ctrl")) {
    if (result.length === 1) {
      const code = result.toLowerCase().charCodeAt(0)
      if (code >= 97 && code <= 122) {
        result = String.fromCharCode(code - 96)
      }
    }
  }

  if (mods.has("alt")) {
    result = "\x1b" + result
  }

  return result
}

// ---------------------------------------------------------------------------
// Reproduction
// ---------------------------------------------------------------------------

const toHex = (s: string) =>
  [...s].map((c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")

const enter = resolveKey("return")
const shiftEnter = resolveKey("shift+return")

console.log("--- resolveKey output ---")
console.log(`resolveKey("return")       → ${toHex(enter)}`)
console.log(`resolveKey("shift+return") → ${toHex(shiftEnter)}`)
console.log()

if (enter === shiftEnter) {
  console.log("BUG: shift+return produces identical bytes to plain return")
  console.log()
  console.log("Expected: \\x1b[13;2u  (Kitty keyboard protocol CSI u encoding)")
  console.log(`Got:      ${toHex(shiftEnter)}`)
  process.exit(1)
} else {
  console.log("OK: shift+return is correctly differentiated from return")
  process.exit(0)
}
