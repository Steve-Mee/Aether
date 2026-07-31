export interface TenantDirectoryPort {
  listTenantIds(): Promise<string[]>;
}
