export type DatabaseBindValue = string | number | null | Uint8Array;

export interface DatabaseConnection {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: DatabaseBindValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, ...params: DatabaseBindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: DatabaseBindValue[]): Promise<T[]>;
  withExclusiveTransactionAsync(
    task: (transaction: DatabaseConnection) => Promise<void>,
  ): Promise<void>;
}
