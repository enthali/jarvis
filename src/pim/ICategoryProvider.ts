// Implementation: SPEC_PIM_IFACE
// Requirements: REQ_PIM_PROVIDER

export interface Category {
    id?: string;         // provider-specific unique ID (e.g. Outlook CategoryID)
    name: string;
    color: number;       // provider-specific colour value (0 = none)
    source: string;      // provider identifier (e.g. "outlook")
}

export interface ICategoryProvider {
    readonly source: string;
    getCategories(): Promise<Category[]>;
    setCategory(name: string, color: number): Promise<void>;
    deleteCategory(name: string): Promise<void>;
    renameCategory(oldName: string, newName: string): Promise<void>;
}
