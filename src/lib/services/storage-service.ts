import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/constants";

export class StorageService {
  private supabase = createAdminClient();

  async createSignedUploadUrl(
    workspaceId: string,
    agentId: string,
    fileName: string
  ): Promise<{ signedUrl: string; path: string }> {
    const path = `${workspaceId}/${agentId}/${Date.now()}_${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(path);

    if (error) throw new Error(`Failed to create upload URL: ${error.message}`);

    return {
      signedUrl: data.signedUrl,
      path,
    };
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) throw new Error(`Failed to delete file: ${error.message}`);
  }

  async getSignedDownloadUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) throw new Error(`Failed to create download URL: ${error.message}`);

    return data.signedUrl;
  }

  async downloadFile(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .download(path);

    if (error) throw new Error(`Failed to download file: ${error.message}`);

    return data;
  }
}

export const storageService = new StorageService();
