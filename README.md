# pty — `resolveKey` silently drops shift modifier for non-letter keys

`resolveKey("shift+return")` produces `\r` (identical to plain `return`). The shift modifier is silently discarded for all non-letter keys (return, tab, escape, arrows, etc.).

This means `pty send <name> --seq key:shift+enter` sends a plain Enter to the PTY, which breaks applications that distinguish Shift+Enter from Enter via the [Kitty keyboard protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) (e.g. Claude Code, Codex).

## Reproduction

```bash
bun run repro.ts
```

## Expected

`shift+return` should produce `\x1b[13;2u` (CSI u encoding: keycode 13, modifier 2 for Shift), matching the Kitty keyboard protocol that modern terminal applications use.

## Actual

```
resolveKey("return")       → \x0d
resolveKey("shift+return") → \x0d

BUG: shift+return produces identical bytes to plain return
```

## Versions

- pty: 0.1.0 (installed via Nix)
- Runtime: Bun 1.3.11
- OS: macOS 15.4 (Darwin 25.2.0)

## Notes

The bug is in `src/keys.ts` lines 46-51. The comment says "shift on non-letters is silently ignored". This affects all shift+key combinations for non-letter keys: `shift+tab`, `shift+up`, `shift+down`, etc.

A possible fix would be to encode shifted special keys using the CSI u format from the Kitty keyboard protocol:
- `shift+return` → `\x1b[13;2u`
- `shift+tab` → `\x1b[9;2u` (or the legacy `\x1b[Z`)
- `shift+up` → `\x1b[1;2A`

## Related Issue

<!-- Link will be added after filing -->
