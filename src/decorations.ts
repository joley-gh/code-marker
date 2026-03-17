import * as vscode from 'vscode';
import { HighlightStorage, Highlight } from './storage';

/**
 * One TextEditorDecorationType per unique colour, lazily created and reused
 * across all editors to avoid leaking resources.
 */
const highlightDecorationCache = new Map<string, vscode.TextEditorDecorationType>();
const commentDecorationCache = new Map<string, vscode.TextEditorDecorationType>();

/** Returns (or lazily creates) a TextEditorDecorationType for a given colour. */
export function getDecorationType(color: string, comment?: string): vscode.TextEditorDecorationType {
  let type = highlightDecorationCache.get(comment ? `${color}:${comment}` : color);
  if (!type) {
    const renderOptions: vscode.DecorationRenderOptions = {
      backgroundColor: color,
      borderRadius: '2px',
    };
    
    type = vscode.window.createTextEditorDecorationType(renderOptions);
    highlightDecorationCache.set(comment ? `${color}:${comment}` : color, type);
  }
  return type;
}

/** Returns (or lazily creates) a TextEditorDecorationType for line-end comments. */
export function getCommentDecorationType(comment: string, color: string): vscode.TextEditorDecorationType {
  const key = `${comment}:${color}`;
  let type = commentDecorationCache.get(key);
  if (!type) {
    type = vscode.window.createTextEditorDecorationType({
      light: {
        after: {
          contentText: ` ${comment}`,
          fontStyle: 'italic',
          color,
          margin: '0 0 0 4px',
        },
      },
      dark: {
        after: {
          contentText: ` ${comment}`,
          fontStyle: 'italic',
          color,
          margin: '0 0 0 4px',
        },
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    commentDecorationCache.set(key, type);
  }
  return type;
}

interface DecorationGroup {
  ranges: vscode.Range[];
  comment?: string;
  color: string;
}

/**
 * Applies all highlights to an editor.
 * Colours no longer present in the list are cleared.
 */
export function applyDecorations(editor: vscode.TextEditor, highlights: Highlight[]): void {
  const highlightGroups = new Map<string, DecorationGroup>();
  const commentGroups = new Map<string, DecorationGroup>();

  for (const h of highlights) {
    const start  = editor.document.positionAt(h.position.start);
    const end    = editor.document.positionAt(h.position.end);
    
    const lineRange = getLineRange(editor.document, start, end);
    
    // Highlight ranges
    let highlightKey = h.color;
    if (h.comment) {
      highlightKey = `${h.color}:${h.comment}`;
    }
    
    let highlightGroup = highlightGroups.get(highlightKey);
    if (!highlightGroup) {
      highlightGroup = { ranges: [], comment: h.comment, color: h.color };
      highlightGroups.set(highlightKey, highlightGroup);
    }
    highlightGroup.ranges.push(new vscode.Range(start, end));
    
    // Comment ranges (at end of line)
    if (h.comment) {
      const commentKey = `${h.comment}:${h.color}`;
      let commentGroup = commentGroups.get(commentKey);
      if (!commentGroup) {
        commentGroup = { ranges: [], comment: h.comment, color: h.color };
        commentGroups.set(commentKey, commentGroup);
      }
      commentGroup.ranges.push(lineRange);
    }
  }

  // Apply highlight decorations
  for (const [key, group] of highlightGroups) {
    editor.setDecorations(getDecorationType(group.color, group.comment), group.ranges);
  }

  // Apply comment decorations
  for (const [key, group] of commentGroups) {
    editor.setDecorations(getCommentDecorationType(group.comment!, group.color), group.ranges);
  }
  
  const usedHighlightKeys = new Set<string>();
  const usedCommentKeys = new Set<string>();

  for (const [key, group] of highlightGroups) {
    usedHighlightKeys.add(key);
  }

  for (const [key, group] of commentGroups) {
    usedCommentKeys.add(key);
  }

  for (const key of highlightDecorationCache.keys()) {
    if (!usedHighlightKeys.has(key)) {
      const type = highlightDecorationCache.get(key);
      if (type) {
        editor.setDecorations(type, []);
      }
    }
  }

  for (const key of commentDecorationCache.keys()) {
    if (!usedCommentKeys.has(key)) {
      const type = commentDecorationCache.get(key);
      if (type) {
        editor.setDecorations(type, []);
      }
    }
  }
}

function getLineRange(document: vscode.TextDocument, start: vscode.Position, end: vscode.Position): vscode.Range {
  const endLine = end.line;
  const lineText = document.lineAt(endLine).text;
  const endCharacter = lineText.length > 0 ? lineText.length : 0;
  return new vscode.Range(endLine, endCharacter, endLine, endCharacter);
}

/** Reads highlights from disk and re-applies decorations for an editor. */
export async function refreshDecorationsForEditor(editor: vscode.TextEditor): Promise<void> {
  const wf = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  if (!wf) return;
  const highlights = await HighlightStorage.readFileHighlights(wf, editor.document.uri.toString());
  applyDecorations(editor, highlights);
}

/** Disposes all cached decoration types (call on deactivate). */
export function disposeDecorations(): void {
  highlightDecorationCache.forEach(t => t.dispose());
  highlightDecorationCache.clear();
  commentDecorationCache.forEach(t => t.dispose());
  commentDecorationCache.clear();
}
