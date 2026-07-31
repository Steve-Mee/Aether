export interface StoredMediaFile {
  key: string;
  url: string;
  mimeType: string;
  absolutePath: string;
}

export interface MediaStorePort {
  save(
    tenantId: string,
    filename: string,
    mimeType: string,
    content: Buffer
  ): Promise<StoredMediaFile>;
}
