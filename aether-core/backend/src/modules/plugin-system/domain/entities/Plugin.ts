export class Plugin {
  constructor(
    public id: string,
    public name: string,
    public version: string,
    public description: string,
    public author: string,
    public status: 'active' | 'inactive' | 'error' = 'inactive',
    public config: Record<string, any> = {},
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}