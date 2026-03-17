# Code Marker

Highlight and manage code sections with ease — like a highlighter pen for your editor.

Code Marker lets you mark any selection of code with a persistent background colour. Highlights are stored in `.vscode/highlights.json` and automatically track your code as you edit it: if you type inside a highlighted region the highlight grows with it, and a highlight is only removed when every character of it is deleted.

---

## Features

### Add Highlight
Select any text, right-click → **Add Highlight** (or use the Command Palette: `Code Marker: Add Highlight`). Choose from four presets or enter any custom hex colour.

**Preset colours**

| Name   | Colour                                                      |
|--------|-------------------------------------------------------------|
| Red    | `#FF000055` — semi-transparent red                          |
| Blue   | `#0000FF55` — semi-transparent blue                         |
| Green  | `#00CC0055` — semi-transparent green                        |
| Yellow | `#FFFF0088` — semi-transparent yellow (classic highlighter) |

Custom colours can be entered as 6-digit (`#RRGGBB`) or 8-digit (`#RRGGBBAA`) hex values.

---

### Remove Highlight
Right-click → **Remove Highlight**.

| Situation | Result |
|---|---|
| No selection (cursor only) | Removes every highlight that contains the cursor |
| Selection fully covers a highlight | Removes that highlight entirely |
| Selection overlaps the left side | Trims the highlight's start to the selection end |
| Selection overlaps the right side | Trims the highlight's end to the selection start |
| Selection is entirely inside a highlight | Splits the highlight into two halves around the selection |

---

### Split Highlight
Place the cursor **inside** a highlighted region (not at the boundary) and right-click → **Split Highlight**. The highlight is divided into two same-colour halves with a two-space gap inserted at the cursor. The cursor lands between the two spaces so you can start typing unattached content immediately.

---

### Edit Highlight Comment
Right-click anywhere inside a highlight → **Edit Highlight Comment** to attach a short note to that highlight. The comment is saved alongside the highlight in `highlights.json`.

---

### Refresh Highlights
Right-click → **Refresh Highlights** re-reads the storage file and redraws all decorations. Useful if something looks out of sync after an external file change.

---

## Smart Highlight Tracking

Highlights follow your edits automatically using VS Code's exact change deltas — no full-text diffing:

- **Typing inside** a highlight → highlight expands to cover the new text
- **Deleting inside** a highlight → highlight shrinks accordingly
- **Typing before** a highlight → highlight shifts right
- **Deleting a highlight entirely** → highlight is removed from storage
- **Pasting over** a highlight → highlight spans the pasted content

This means highlights survive renames, reformatting, and normal day-to-day editing without any manual intervention.

---

## Persistence

Highlights are stored in `.vscode/highlights.json` in your workspace root, keyed by file URI:

```json
{
  "file:///path/to/your/file.ts": [
    {
      "id": "1",
      "text": "highlighted text",
      "color": "#FFFF0088",
      "comment": "optional note",
      "position": { "start": 42, "end": 58 }
    }
  ]
}
```

The file is created automatically on first use. Commit it to version control to share highlights with your team.

---

## Commands

All commands are available via right-click in the editor and via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).

| Command | Palette Title | Context Menu |
|---|---|---|
| `code-marker.addHighlight` | Code Marker: Add Highlight | ✓ (requires selection) |
| `code-marker.removeHighlight` | Code Marker: Remove Highlight | ✓ |
| `code-marker.splitHighlight` | Code Marker: Split Highlight | ✓ |
| `code-marker.editHighlightComment` | Code Marker: Edit Highlight Comment | ✓ |
| `code-marker.refreshHighlights` | Code Marker: Refresh Highlights | ✓ |

---

## Installation

**From a `.vsix` file:**

```bash
code --install-extension code-marker-0.0.1.vsix
```

Or: Extensions panel → `···` menu → **Install from VSIX…**

---

## Building from Source

```bash
pnpm install
pnpm run build      # TypeScript → out/
pnpm run package    # creates code-marker-x.x.x.vsix
```

Requires Node.js ≥ 18 and VS Code ≥ 1.110.

---

## Repository

[github.com/joley-gh/code-marker](https://github.com/joley-gh/code-marker)

---

## Project Structure

```
src/
├── extension.ts               # activate / deactivate entry point
├── colors.ts                  # preset colour definitions
├── decorations.ts             # TextEditorDecorationType management
├── events.ts                  # workspace & editor event listeners
├── storage.ts                 # .vscode/highlights.json I/O
├── highlightManager.ts        # delta-based position adjustment
└── commands/
    ├── addHighlight.ts
    ├── removeHighlight.ts
    ├── splitHighlight.ts
    ├── editHighlightComment.ts
    └── refreshHighlights.ts
```

---

## License

MIT
