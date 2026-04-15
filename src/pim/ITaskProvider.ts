// Implementation: SPEC_PIM_ITASKPROVIDER
// Requirements: REQ_PIM_TASKPROVIDER

export type TaskStatus =
    | "notStarted" | "inProgress" | "completed"
    | "deferred" | "waitingOnOther";

export type TaskPriority = "low" | "normal" | "high";

export interface Task {
    id: string;               // provider-specific unique ID (e.g. Outlook EntryID)
    subject: string;
    dueDate?: string;         // ISO date string (YYYY-MM-DD)
    status: TaskStatus;
    priority: TaskPriority;
    isComplete: boolean;      // explicit completion flag — independent of status
    completedDate?: string;   // read-only; side-effect of isComplete → true
    body?: string;            // optional, loaded on-demand only
    categories: string[];     // link to Jarvis projects/events via category name
    source: string;           // provider identifier (e.g. "outlook")
}

export interface ITaskProvider {
    readonly source: string;
    getTasks(): Promise<Task[]>;
    setTask(task: Partial<Task>): Promise<Task>;
    modifyTask(id: string, changes: Partial<Task>): Promise<void>;
    deleteTask(id: string): Promise<void>;
}
