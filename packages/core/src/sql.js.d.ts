declare module 'sql.js' {
    interface SqlJsStatic {
        Database: new (data?: ArrayLike<number> | Buffer) => Database;
    }

    interface QueryExecResult {
        columns: string[];
        values: (string | number | Uint8Array | null)[][];
    }

    interface Database {
        exec(sql: string): QueryExecResult[];
        close(): void;
    }

    interface SqlJsConfig {
        locateFile?: (file: string) => string;
    }

    function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
    export default initSqlJs;
}
