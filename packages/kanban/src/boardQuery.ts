// Implementation: SPEC_KAN_LIST, SPEC_KAN_FILTERVALUES
// Requirements: REQ_KAN_LIST, REQ_KAN_FILTERVALUES
//
// Pure board-query logic: no vscode import, no file access. The tool handlers in extension.ts keep
// owner resolution, file access and parsing and call these functions on the parsed board (D-12).

export interface BoardFieldOption { name: string }
export interface BoardField { name: string; type?: string; options?: BoardFieldOption[] }
export interface BoardData { fields?: BoardField[]; items?: Array<Record<string, unknown>> }

export interface ListFilter {
    status?: string;
    labels?: string[];
    /** Declared-field filters, AND-combined (SPEC_KAN_LIST step 4). Validated by selectItems(). */
    fields?: unknown;
    /** true: full items; absent or false: projection. Any other value is refused by detailsError(). */
    details?: boolean;
}

export interface NameCount { name: string; count: number }

/** The error of SPEC_KAN_LIST step 1; undefined when `details` is absent, true or false. */
export function detailsError(details: unknown): string | undefined {
    if (details === undefined || details === true || details === false) { return undefined; }
    return 'details must be true or false';
}

function labelsOf(item: Record<string, unknown>): string[] {
    return Array.isArray(item.labels) ? item.labels.filter((l): l is string => typeof l === 'string') : [];
}

/** SPEC_KAN_LIST step 4, `fields` checks in the order the spec fixes; the first error found is returned. */
function parseFieldFilters(data: BoardData, fields: unknown):
    { error: string } | { filters: Array<{ name: string; type: string; value: string }> } {
    if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
        return { error: 'fields must be an object that maps declared field names to strings' };
    }
    const entries = Object.entries(fields as Record<string, unknown>);
    const filterable = (data.fields ?? []).filter(f => f.name !== 'status' && (f.type === 'single_select' || f.type === 'text'));
    for (const [key] of entries) {
        if (!filterable.some(f => f.name === key)) {
            return { error: `Cannot filter by "${key}". Filterable fields: ${filterable.map(f => f.name).join(', ')}` };
        }
    }
    for (const [key, value] of entries) {
        if (typeof value !== 'string') { return { error: `fields.${key} must be a string` }; }
    }
    const filters: Array<{ name: string; type: string; value: string }> = [];
    for (const [key, value] of entries) {
        const def = filterable.find(f => f.name === key)!;
        const type = def.type as string;
        if (type === 'single_select') {
            const valid = (def.options ?? []).map(o => o.name);
            if (!valid.includes(value as string)) {
                return { error: `Unknown value "${value}" for field "${key}". Valid: ${valid.join(', ')}` };
            }
        } else if (value === '') {
            return { error: `fields.${key} must not be empty` };
        }
        filters.push({ name: key, type, value: value as string });
    }
    return { filters };
}

/** SPEC_KAN_LIST steps 4 to 6: status validation, filtering, shaping. */
export function selectItems(data: BoardData, filter: ListFilter): { error: string } | { items: Array<Record<string, unknown>> } {
    if (filter.status) {
        const statusField = (data.fields ?? []).find(f => f.name === 'status');
        const validOptions = statusField?.options?.map(o => o.name) ?? [];
        if (!validOptions.includes(filter.status)) {
            return { error: `Unknown status "${filter.status}". Valid: ${validOptions.join(', ')}` };
        }
    }

    const fieldFilters: Array<{ name: string; type: string; value: string }> = [];
    if (filter.fields !== undefined) {
        const parsed = parseFieldFilters(data, filter.fields);
        if ('error' in parsed) { return parsed; }
        fieldFilters.push(...parsed.filters);
    }

    let items = data.items ?? [];
    if (filter.status) {
        items = items.filter(i => i.status === filter.status);
    }
    for (const f of fieldFilters) {
        const wanted = f.value.toLowerCase();
        items = items.filter(i => {
            const v = i[f.name];
            if (typeof v !== 'string') { return false; }
            return f.type === 'text' ? v.toLowerCase().includes(wanted) : v === f.value;
        });
    }
    if (filter.labels && filter.labels.length > 0) {
        items = items.filter(i => {
            const itemLabels = labelsOf(i);
            return filter.labels!.every(l => itemLabels.includes(l));
        });
    }

    if (filter.details === true) {
        return { items: items.map(i => ({ ...i, labels: labelsOf(i) })) };
    }
    return { items: items.map(i => ({ id: i.id, name: i.name, status: i.status, labels: labelsOf(i) })) };
}

/** Plain string order by code point (not UTF-16 code unit, not locale), so the order never depends on the locale. */
function compareCodePoints(a: string, b: string): number {
    const x = Array.from(a);
    const y = Array.from(b);
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) {
        const d = x[i].codePointAt(0)! - y[i].codePointAt(0)!;
        if (d !== 0) { return d; }
    }
    return x.length - y.length;
}

/** SPEC_KAN_FILTERVALUES steps 3 to 6: the declared status values, the other single-select options and the labels in use, each with a card count. */
export function filterValues(data: BoardData):
    { error: string } | { statuses: NameCount[]; fields: Array<{ name: string; options: NameCount[] }>; labels: NameCount[] } {
    const statusField = (data.fields ?? []).find(f => f.name === 'status');
    if (!statusField) { return { error: 'board has no status field' }; }

    const items = data.items ?? [];
    const declared = new Set((statusField.options ?? []).map(o => o.name));
    const statuses = (statusField.options ?? []).map(o => ({
        name: o.name,
        count: items.filter(i => i.status === o.name).length,
    }));

    // An item whose status is not a declared option counts neither its status nor its labels (D-10).
    const counted = items.filter(i => typeof i.status === 'string' && declared.has(i.status));
    const counts = new Map<string, number>();
    for (const item of counted) {
        const onCard = new Set<string>();
        for (const l of labelsOf(item)) {
            if (typeof l === 'string') { onCard.add(l); }
        }
        for (const l of onCard) { counts.set(l, (counts.get(l) ?? 0) + 1); }
    }
    const labels = [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => compareCodePoints(a.name, b.name));

    const fields = (data.fields ?? [])
        .filter(f => f.type === 'single_select' && f.name !== 'status')
        .map(f => ({
            name: f.name,
            options: (f.options ?? []).map(o => ({ name: o.name, count: counted.filter(i => i[f.name] === o.name).length })),
        }));

    return { statuses, fields, labels };
}
