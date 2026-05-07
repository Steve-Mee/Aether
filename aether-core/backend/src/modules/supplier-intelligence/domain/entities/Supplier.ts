export class Supplier {
  constructor(
    public readonly id: string,
    public name: string,
    public website: string,
    public status: string, // active, inactive
    public readonly createdAt: Date
  ) {}

  static create(data: {
    name: string;
    website: string;
  }): Supplier {
    return new Supplier(
      '',
      data.name,
      data.website,
      'active',
      new Date()
    );
  }
}