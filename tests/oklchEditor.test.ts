import { beforeEach, expect, mock, test } from 'bun:test';
import type * as vscode from 'vscode';

class Position {
  constructor(readonly line: number, readonly character: number) {}
}
class Range {
  constructor(readonly start: Position, readonly end: Position) {}
}
class Disposable {
  constructor(readonly dispose: () => void) {}
}
let invoke: (target?: { uri: string; version: number; offset: number; source: string }) => void;
let receive: (message: unknown) => Promise<void>;
let source = '';
let disposed: () => void;
let editCount = 0;
let editOptions: unknown;
let rejectEdit = false;
let panelCount = 0;
const messages: { type: string; source?: string; text?: string }[] = [];
const document = {
  uri: { toString: () => 'file:///palette.json' },
  version: 1, lineCount: 1, isClosed: false,
  offsetAt: (position: Position) => position.character,
  positionAt: (offset: number) => new Position(0, offset),
  lineAt: () => ({ range: new Range(new Position(0, 0), new Position(0, source.length)) }),
  getText: (range?: Range) => range ? source.slice(range.start.character, range.end.character) : source,
};
const editor = {
  document, selection: { active: new Position(0, 18) },
  edit: (callback: (builder: { replace: (range: Range, text: string) => void }) => void, options: unknown) => {
    editCount += 1; editOptions = options;
    if (rejectEdit) { return Promise.resolve(false); }
    callback({ replace: (range, text) => { source = source.slice(0, range.start.character) + text + source.slice(range.end.character); } });
    document.version += 1;
    return Promise.resolve(true);
  },
};
mock.module('vscode', () => ({
  Position, Range, Disposable,
  MarkdownString: class { value = ''; appendMarkdown(text: string) { this.value += text; } },
  Hover: class { constructor(readonly contents: unknown, readonly range: Range) {} },
  ViewColumn: { Beside: 2 }, Uri: { joinPath: (_uri: unknown, ...paths: string[]) => paths.join('/') },
  workspace: { getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }) },
  commands: { registerCommand: (_id: string, callback: () => void) => { invoke = callback; return new Disposable(() => {}); } },
  window: {
    activeTextEditor: editor,
    visibleTextEditors: [editor],
    showInformationMessage: () => {},
    createWebviewPanel: () => { panelCount += 1; return ({
      dispose: () => disposed?.(), onDidDispose: (callback: () => void) => { disposed = callback; },
      webview: {
        cspSource: 'test:', asWebviewUri: (uri: string) => uri, html: '',
        onDidReceiveMessage: (callback: typeof receive) => { receive = callback; return new Disposable(() => {}); },
        postMessage: (message: typeof messages[number]) => { messages.push(message); return Promise.resolve(true); },
      },
    }); },
  },
}));
const { registerOklchEditor, provideOklchHover } = await import('../src/oklchEditor');
beforeEach(() => {
  source = '--brand: oklch(62% 0.35 260 / 80%);';
  document.version = 1; document.isClosed = false;
  editCount = 0; rejectEdit = false; messages.length = 0;
  registerOklchEditor({ extensionUri: {} } as vscode.ExtensionContext);
  invoke();
});
const color = { lightness: 0.62, chroma: 0.2, hueDegrees: 260, alpha: 0.8 };

test('apply makes one precise undoable edit and tracks its new range', async () => {
  await receive({ type: 'ready' });
  expect(messages[0]?.source).toBe('oklch(62% 0.35 260 / 80%)');
  await receive({ type: 'apply', color });
  expect(source).toBe('--brand: oklch(62% 0.2 260 / 80%);');
  expect(editCount).toBe(1);
  expect(editOptions).toEqual({ undoStopBefore: true, undoStopAfter: true });
  await receive({ type: 'apply', color: { ...color, alpha: 1 } });
  expect(source).toBe('--brand: oklch(62% 0.2 260);');
  expect(messages.at(-1)?.type).toBe('applied');
});

test('intervening document edits cannot be overwritten', async () => {
  document.version += 1;
  source = `/* other edit */ ${source}`;
  await receive({ type: 'apply', color });
  expect(editCount).toBe(0);
  expect(messages.at(-1)?.type).toBe('error');
  expect(source).toContain('/* other edit */');
});

test('no-op, malformed, and concurrent messages cannot create extra edits', async () => {
  await receive({ type: 'apply', color: { ...color, chroma: 0.35 } });
  expect(editCount).toBe(0);
  await receive({ type: 'apply', color: { ...color, alpha: Infinity } });
  expect(editCount).toBe(0);
  await Promise.all([receive({ type: 'apply', color }), receive({ type: 'apply', color })]);
  expect(editCount).toBe(1);
});

test('failed edits report failure and leave original source intact', async () => {
  rejectEdit = true;
  await receive({ type: 'apply', color });
  expect(source).toBe('--brand: oklch(62% 0.35 260 / 80%);');
  expect(messages.at(-1)?.type).toBe('error');
});

test('hover action targets the hovered color instead of the cursor', async () => {
  source = 'oklch(50% 0.1 10) oklch(70% 0.2 200)';
  editor.selection.active = new Position(0, 3);
  const hover = provideOklchHover(document as unknown as vscode.TextDocument, new Position(0, 25) as vscode.Position, { isCancellationRequested: false } as vscode.CancellationToken);
  const markdown = hover?.contents as unknown as { value: string; isTrusted: unknown };
  expect(markdown.isTrusted).toEqual({ enabledCommands: ['visualiseOklch.editColor'] });
  const encoded = markdown.value.match(/editColor\?([^)]*)/)?.[1];
  const [target] = JSON.parse(decodeURIComponent(encoded!));
  invoke(target);
  await receive({ type: 'ready' });
  expect(messages.at(-1)?.source).toBe('oklch(70% 0.2 200)');
  await receive({ type: 'apply', color });
  expect(source).toBe('oklch(50% 0.1 10) oklch(62% 0.2 260 / 80%)');
  editor.selection.active = new Position(0, 18);
});

test('hover is absent outside colors and when cancelled', () => {
  const doc = document as unknown as vscode.TextDocument;
  expect(provideOklchHover(doc, new Position(0, 0) as vscode.Position, { isCancellationRequested: false } as vscode.CancellationToken)).toBeUndefined();
  expect(provideOklchHover(doc, new Position(0, 18) as vscode.Position, { isCancellationRequested: true } as vscode.CancellationToken)).toBeUndefined();
});

test('stale hover links cannot open a picker for shifted content', () => {
  const before = panelCount;
  const target = { uri: document.uri.toString(), version: document.version, offset: 9, source: 'oklch(62% 0.35 260 / 80%)' };
  document.version += 1;
  invoke(target);
  expect(panelCount).toBe(before);
  invoke({ ...target, version: document.version, source: 'oklch(0% 0 0)' });
  expect(panelCount).toBe(before);
});
