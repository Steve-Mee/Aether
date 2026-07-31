export interface StartPreviewInput {
  tenantId: string;
  projectId: string;
  revisionId: string;
  artifactsPath?: string | null;
}

export interface StartPreviewResult {
  previewUrl: string;
  expiresAt?: Date;
}

/**
 * Ephemeral preview host; returns signed/preview URL.
 */
export interface PreviewHostPort {
  startPreview(input: StartPreviewInput): Promise<StartPreviewResult>;
}
