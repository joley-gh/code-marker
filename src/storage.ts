import * as vscode from 'vscode';

/** A single persisted highlight entry. */
export interface Highlight {
  id: string;
  /** The highlighted text content (used for smart text-based comparison). */
  text: string;
  /** Background colour, e.g. "#FF000050". */
  color: string;
  position: {
    start: number; // character offset
    end: number;   // character offset (exclusive)
  };
}

/** Root storage format: maps file URI strings → their highlights. */
export type HighlightData = Record<string, Highlight[]>;

export class HighlightStorage {
  private static readonly STORAGE_FILE = '.vscode/highlights.json';

  // ------------------------------------------------------------------ helpers

  private static async getFilePath(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode');
    try {
      await vscode.workspace.fs.stat(vscodeDir);
    } catch {
      await vscode.workspace.fs.createDirectory(vscodeDir);
    }
    return vscode.Uri.joinPath(workspaceFolder.uri, HighlightStorage.STORAGE_FILE).fsPath;
  }

  // ------------------------------------------------------------------ full file I/O

  static async readAll(workspaceFolder: vscode.WorkspaceFolder): Promise<HighlightData> {
    const filePath = await this.getFilePath(workspaceFolder);
    try {
      const raw = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
      return JSON.parse(Buffer.from(raw).toString('utf-8')) as HighlightData;
    } catch {
      return {};
    }
  }

  static async saveAll(workspaceFolder: vscode.WorkspaceFolder, data: HighlightData): Promise<void> {
    const filePath = await this.getFilePath(workspaceFolder);
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(filePath),
      Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
    );
  }

  // ------------------------------------------------------------------ per-file helpers

  static async readFileHighlights(
    workspaceFolder: vscode.WorkspaceFolder,
    fileUri: string
  ): Promise<Highlight[]> {
    const data = await this.readAll(workspaceFolder);
    return data[fileUri] ?? [];
  }

  static async saveFileHighlights(
    workspaceFolder: vscode.WorkspaceFolder,
    fileUri: string,
    highlights: Highlight[]
  ): Promise<void> {
    const data = await this.readAll(workspaceFolder);
    if (highlights.length === 0) {
      delete data[fileUri];
    } else {
      data[fileUri] = highlights;
    }
    await this.saveAll(workspaceFolder, data);
  }

  // ------------------------------------------------------------------ utilities

  static getHighlightForText(highlights: Highlight[], searchText: string): Highlight | undefined {
    return highlights.find(h => h.text.toLowerCase() === searchText.toLowerCase());
  }

  static generateId(highlights: Highlight[]): string {
    if (highlights.length === 0) return '1';
    const maxId = Math.max(...highlights.map(h => parseInt(h.id) || 0));
    return String(maxId + 1);
  }
}