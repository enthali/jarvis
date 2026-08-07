// Minimal vscode mock for vitest tests
export class TreeItem {
    label?: string;
    collapsibleState?: number;
    contextValue?: string;
    tooltip?: string;
    description?: string;
    command?: { command: string; title: string; arguments?: unknown[] };
    iconPath?: unknown;

    constructor(label: string | undefined, collapsibleState?: number) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}

export const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
};

export class ThemeIcon {
    readonly id: string;
    readonly color?: ThemeColor;
    constructor(id: string, color?: ThemeColor) {
        this.id = id;
        this.color = color;
    }
}

export class ThemeColor {
    readonly id: string;
    constructor(id: string) {
        this.id = id;
    }
}

export class EventEmitter {
    private _listeners: (() => void)[] = [];
    event = (listener: () => void) => {
        this._listeners.push(listener);
        return { dispose: () => { this._listeners = this._listeners.filter(l => l !== listener); } };
    };
    fire() {
        for (const l of this._listeners) { l(); }
    }
    dispose() { this._listeners = []; }
}

export class Disposable {
    static from(...disposables: { dispose: () => void }[]): Disposable {
        return new Disposable(() => { for (const d of disposables) { d.dispose(); } });
    }
    constructor(private _callOnDispose: () => void) {}
    dispose() { this._callOnDispose(); }
}

export const Uri = {
    file: (path: string) => ({ fsPath: path, scheme: 'file', path, toString: (skipEncoding?: boolean) => `file://${path}` }),
    parse: (s: string) => ({ fsPath: s.replace(/^file:\/\//, ''), scheme: 'file', path: s, toString: (skipEncoding?: boolean) => s }),
    joinPath: (base: any, ...parts: string[]) => {
        const basePath = base.fsPath ?? base.path ?? '';
        const joined = [basePath, ...parts].join('/');
        return { fsPath: joined, scheme: 'file', path: joined, toString: () => `file://${joined}` };
    },
    from: (components: { scheme: string; path: string; query?: string }) => ({
        scheme: components.scheme,
        path: components.path,
        query: components.query ?? '',
        fsPath: components.path,
        toString: () => `${components.scheme}:${components.path}${components.query ? '?' + components.query : ''}`,
    }),
};

export class FileSystemError extends Error {
    code: string;
    constructor(messageOrUri?: string) {
        super(messageOrUri);
        this.code = 'FileNotFound';
    }
    static FileNotFound(messageOrUri?: string): FileSystemError { return new FileSystemError(messageOrUri); }
}

export const workspace = {
    workspaceFolders: [
        { uri: { fsPath: 'C:\\workspace\\jarvis', scheme: 'file', toString: (_skip?: boolean) => 'file:///C%3A/workspace/jarvis' } },
        { uri: { fsPath: '/ws', scheme: 'file', toString: (_skip?: boolean) => 'file:///ws' } },
    ],
    getConfiguration: () => ({
        get: () => undefined,
    }),
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
    fs: {
        stat: async () => ({ type: 1, size: 0, ctime: 0, mtime: 0 }),
    },
};

export const window = {
    createTreeView: () => ({ dispose: () => {} }),
    createOutputChannel: () => ({ dispose: () => {}, info: () => {}, warn: () => {} }),
    showInformationMessage: (..._args: unknown[]) => Promise.resolve(undefined),
    showWarningMessage: (..._args: unknown[]) => Promise.resolve(undefined),
};

export class CancellationTokenSource {
    token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
    dispose() {}
}

export const commands = {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: async () => {},
    getCommands: async () => [] as string[],
};

export const lm = {
    registerTool: (_name: string, _impl: unknown) => ({ dispose: () => {} }),
};

export class LanguageModelToolResult {
    content: unknown[];
    constructor(content: unknown[]) { this.content = content; }
}

export class LanguageModelTextPart {
    value: string;
    constructor(value: string) { this.value = value; }
}
