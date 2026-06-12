export type SupplierStatus = 'active' | 'inactive' | 'disabled';

export class Supplier {
  constructor(
    public readonly id: string,
    public name: string,
    public website: string,
    public status: SupplierStatus,
    public autoSyncEnabled: boolean,
    public supplierType: string | null,
    public readonly createdAt: Date
  ) {}

  static create(data: {
    name: string;
    website: string;
    supplierType?: string | null;
  }): Supplier {
    return new Supplier(
      '',
      data.name,
      data.website,
      'active',
      true,
      data.supplierType ?? null,
      new Date()
    );
  }
}
