import * as vscode from 'vscode';

import { resolveSwatch, type ResolvedSwatch } from './color';
import { CONFIG_NAMESPACE, getConfig, type ExtensionConfig } from './config';
import { scanOklchFunctions } from './scanner';

interface AppliedDecorationState {
  appliedKeys: Set<string>;
  renderKey: string;
}

interface DecorationEntry {
  decorationType: vscode.TextEditorDecorationType;
}

interface ResolvedRangeMatch {
  range: vscode.Range;
  source: string;
  swatch: ResolvedSwatch;
}

const SUPPORTED_LANGUAGE_IDS = new Set([
  'astro',
  'css',
  'html',
  'javascript',
  'javascriptreact',
  'json',
  'jsonc',
  'less',
  'markdown',
  'mdx',
  'php',
  'postcss',
  'sass',
  'scss',
  'svelte',
  'tailwindcss',
  'typescript',
  'typescriptreact',
  'vue',
]);

class LruCache<K, V> {
  readonly #limit: number;
  readonly #store = new Map<K, V>();

  constructor(limit: number) {
    this.#limit = limit;
  }

  clear(): void {
    this.#store.clear();
  }

  get(key: K): V | undefined {
    const value = this.#store.get(key);
    if (value === undefined) {
      return undefined;
    }

    this.#store.delete(key);
    this.#store.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.#store.has(key)) {
      this.#store.delete(key);
    }

    this.#store.set(key, value);
    if (this.#store.size <= this.#limit) {
      return;
    }

    const oldestKey = this.#store.keys().next().value as K | undefined;
    if (oldestKey !== undefined) {
      this.#store.delete(oldestKey);
    }
  }
}

class OklchDecorationController implements vscode.Disposable {
  readonly #configChangeDisposable: vscode.Disposable;
  readonly #decorationEntries = new Map<string, DecorationEntry>();
  readonly #editorState = new WeakMap<vscode.TextEditor, AppliedDecorationState>();
  readonly #literalCache = new LruCache<string, ResolvedSwatch | null>(1_024);
  readonly #timers = new Map<vscode.TextEditor, NodeJS.Timeout>();
  readonly #visibleEditors = new Set<vscode.TextEditor>();

  #config: ExtensionConfig = getConfig();
  #configVersion = 0;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.#visibleEditors.add(editor);
          this.schedule(editor, 0);
        }
      }),
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        const nextVisibleEditors = new Set(editors);
        for (const editor of this.#visibleEditors) {
          if (!nextVisibleEditors.has(editor)) {
            this.clearEditor(editor);
            this.#visibleEditors.delete(editor);
          }
        }

        for (const editor of editors) {
          this.#visibleEditors.add(editor);
          this.schedule(editor, 0);
        }
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        this.#visibleEditors.add(event.textEditor);
        this.schedule(event.textEditor, 0);
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document === event.document) {
            this.#visibleEditors.add(editor);
            this.schedule(editor, this.#config.updateDelayMs);
          }
        }
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        for (const editor of this.#visibleEditors) {
          if (editor.document === document) {
            this.clearEditor(editor);
          }
        }
      }),
      vscode.commands.registerCommand(`${CONFIG_NAMESPACE}.refresh`, () => {
        for (const editor of vscode.window.visibleTextEditors) {
          this.#visibleEditors.add(editor);
          this.schedule(editor, 0);
        }
      }),
      this,
    );

    this.#configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration(CONFIG_NAMESPACE)) {
        return;
      }

      this.#config = getConfig();
      this.#configVersion += 1;
      this.#literalCache.clear();

      for (const editor of vscode.window.visibleTextEditors) {
        this.clearEditor(editor);
        this.#visibleEditors.add(editor);
        this.schedule(editor, 0);
      }
    });

    context.subscriptions.push(this.#configChangeDisposable);

    for (const editor of vscode.window.visibleTextEditors) {
      this.#visibleEditors.add(editor);
      this.schedule(editor, 0);
    }
  }

  dispose(): void {
    for (const timer of this.#timers.values()) {
      clearTimeout(timer);
    }

    for (const editor of this.#visibleEditors) {
      this.clearEditor(editor);
    }

    for (const { decorationType } of this.#decorationEntries.values()) {
      decorationType.dispose();
    }

    this.#timers.clear();
    this.#visibleEditors.clear();
    this.#decorationEntries.clear();
    this.#configChangeDisposable.dispose();
  }

  private buildHoverMessage(match: ResolvedRangeMatch): vscode.MarkdownString {
    const hover = new vscode.MarkdownString(undefined, true);
    hover.appendMarkdown(`**${match.swatch.hex.toUpperCase()}**\n\n`);
    hover.appendCodeblock(match.source, 'css');
    hover.appendMarkdown(`\nNormalized: \`${match.swatch.normalized}\``);
    return hover;
  }

  private clearEditor(editor: vscode.TextEditor): void {
    const state = this.#editorState.get(editor);
    if (state) {
      for (const key of state.appliedKeys) {
        const entry = this.#decorationEntries.get(key);
        if (entry) {
          editor.setDecorations(entry.decorationType, []);
        }
      }
    }

    this.#editorState.delete(editor);
    const timer = this.#timers.get(editor);
    if (timer) {
      clearTimeout(timer);
      this.#timers.delete(editor);
    }

    this.pruneDecorationEntries();
  }

  private collectMatches(editor: vscode.TextEditor, scanRanges: vscode.Range[]): ResolvedRangeMatch[] {
    const document = editor.document;
    const matches: ResolvedRangeMatch[] = [];
    let remainingMatches = this.#config.maxVisibleMatches;

    for (const range of scanRanges) {
      if (remainingMatches <= 0) {
        break;
      }

      const text = document.getText(range);
      const baseOffset = document.offsetAt(range.start);
      for (const candidate of scanOklchFunctions(text, baseOffset, remainingMatches)) {
        const swatch = this.resolveLiteral(candidate.raw);
        if (!swatch) {
          continue;
        }

        matches.push({
          range: new vscode.Range(document.positionAt(candidate.start), document.positionAt(candidate.end)),
          source: candidate.raw,
          swatch,
        });
        remainingMatches -= 1;

        if (remainingMatches <= 0) {
          break;
        }
      }
    }

    return matches;
  }

  private createDecorationType(swatch: ResolvedSwatch): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      before: {
        backgroundColor: swatch.hex,
        border: `1px solid ${swatch.borderColor}`,
        contentText: ' ',
        height: '0.82em',
        margin: '0 0.42em 0 0.12em',
        width: '0.82em',
      },
    });
  }

  private getDecorationEntry(swatch: ResolvedSwatch): DecorationEntry {
    const existing = this.#decorationEntries.get(swatch.hex);
    if (existing) {
      return existing;
    }

    const entry = {
      decorationType: this.createDecorationType(swatch),
    };
    this.#decorationEntries.set(swatch.hex, entry);
    return entry;
  }

  private getDocumentCharacterCount(document: vscode.TextDocument): number {
    const lastLine = document.lineAt(Math.max(document.lineCount - 1, 0));
    return document.offsetAt(lastLine.range.end);
  }

  private getScanRanges(editor: vscode.TextEditor): vscode.Range[] {
    const document = editor.document;
    const lastLine = document.lineAt(Math.max(document.lineCount - 1, 0));
    const fullDocumentRange = new vscode.Range(new vscode.Position(0, 0), lastLine.range.end);

    if (editor.visibleRanges.length === 0 || this.getDocumentCharacterCount(document) <= this.#config.fullScanMaxChars) {
      return [fullDocumentRange];
    }

    const expandedRanges = editor.visibleRanges
      .map((range) => {
        const startLine = Math.max(0, range.start.line - this.#config.linePadding);
        const endLine = Math.min(document.lineCount - 1, range.end.line + this.#config.linePadding);
        return new vscode.Range(new vscode.Position(startLine, 0), document.lineAt(endLine).range.end);
      })
      .toSorted((left, right) => {
        const lineDelta = left.start.line - right.start.line;
        return lineDelta === 0 ? left.start.character - right.start.character : lineDelta;
      });

    const mergedRanges: vscode.Range[] = [];
    for (const range of expandedRanges) {
      const previous = mergedRanges.at(-1);
      if (!previous || previous.end.isBefore(range.start)) {
        mergedRanges.push(range);
        continue;
      }

      mergedRanges[mergedRanges.length - 1] = previous.union(range);
    }

    return mergedRanges.length > 0 ? mergedRanges : [fullDocumentRange];
  }

  private render(editor: vscode.TextEditor): void {
    if (!this.#config.enabled || !SUPPORTED_LANGUAGE_IDS.has(editor.document.languageId)) {
      this.clearEditor(editor);
      return;
    }

    const scanRanges = this.getScanRanges(editor);
    const rangeKey = scanRanges
      .map((range) => `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`)
      .join('|');
    const renderKey = `${this.#configVersion}:${editor.document.version}:${rangeKey}`;
    const previousState = this.#editorState.get(editor);
    if (previousState?.renderKey === renderKey) {
      return;
    }

    const groupedDecorations = new Map<string, vscode.DecorationOptions[]>();
    for (const match of this.collectMatches(editor, scanRanges)) {
      const current = groupedDecorations.get(match.swatch.hex);
      const decoration: vscode.DecorationOptions = {
        hoverMessage: this.buildHoverMessage(match),
        range: match.range,
      };

      if (current) {
        current.push(decoration);
      } else {
        groupedDecorations.set(match.swatch.hex, [decoration]);
      }
    }

    for (const [hex, options] of groupedDecorations) {
      const entry = this.#decorationEntries.get(hex);
      if (entry) {
        editor.setDecorations(entry.decorationType, options);
      }
    }

    for (const key of previousState?.appliedKeys ?? []) {
      if (!groupedDecorations.has(key)) {
        const entry = this.#decorationEntries.get(key);
        if (entry) {
          editor.setDecorations(entry.decorationType, []);
        }
      }
    }

    this.#editorState.set(editor, {
      appliedKeys: new Set(groupedDecorations.keys()),
      renderKey,
    });

    this.pruneDecorationEntries();
  }

  private resolveLiteral(source: string): ResolvedSwatch | null {
    const cached = this.#literalCache.get(source);
    if (cached !== undefined) {
      return cached;
    }

    const resolved = resolveSwatch(source);
    if (resolved) {
      this.getDecorationEntry(resolved);
    }

    this.#literalCache.set(source, resolved);
    return resolved;
  }

  private schedule(editor: vscode.TextEditor, delay: number): void {
    const existing = this.#timers.get(editor);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.#timers.delete(editor);
      this.render(editor);
    }, delay);
    this.#timers.set(editor, timer);
  }

  private pruneDecorationEntries(): void {
    if (this.#decorationEntries.size <= 768) {
      return;
    }

    const activeKeys = new Set<string>();
    for (const editor of this.#visibleEditors) {
      const state = this.#editorState.get(editor);
      if (!state) {
        continue;
      }

      for (const key of state.appliedKeys) {
        activeKeys.add(key);
      }
    }

    for (const [key, entry] of this.#decorationEntries) {
      if (activeKeys.has(key)) {
        continue;
      }

      entry.decorationType.dispose();
      this.#decorationEntries.delete(key);
      if (this.#decorationEntries.size <= 768) {
        return;
      }
    }
  }
}

let controller: OklchDecorationController | undefined;

export const activate = (context: vscode.ExtensionContext): void => {
  controller = new OklchDecorationController(context);
};

export const deactivate = (): void => {
  controller?.dispose();
  controller = undefined;
};
