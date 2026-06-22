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
    file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
    parse: (s: string) => ({ fsPath: s, scheme: 'file', path: s }),
    from: (components: { scheme: string; path: string; query?: string }) => ({
        scheme: components.scheme,
        path: components.path,
        query: components.query ?? '',
        fsPath: components.path,
        toString: () => `${components.scheme}:${components.path}${components.query ? '?' + components.query : ''}`,
    }),
};

export const workspace = {
    workspaceFolders: [],
    getConfiguration: () => ({
        get: () => undefined,
    }),
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const window = {
    createTreeView: () => ({ dispose: () => {} }),
    createOutputChannel: () => ({ dispose: () => {}, info: () => {}, warn: () => {} }),
};

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
