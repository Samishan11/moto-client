import type { PresignUploadRequest, PresignUploadResponse, UploadScope } from '@moto/contract';
import { apiFetch } from './client';

/** Ask the API for a presigned PUT URL. */
export function presignUpload(body: PresignUploadRequest): Promise<PresignUploadResponse> {
  return apiFetch<PresignUploadResponse>('/uploads/presign', {
    method: 'POST',
    body,
    auth: true,
  });
}

/**
 * Full upload flow: presign → PUT the local file directly to object storage →
 * return the `objectKey` to commit on the owning resource. Bytes never go
 * through our API.
 */
export async function uploadLocalFile(
  scope: UploadScope,
  localUri: string,
  contentType: string,
): Promise<string> {
  const { uploadUrl, objectKey } = await presignUpload({ scope, contentType });

  // RN: read the local file into a blob, then PUT it to the presigned URL.
  const fileRes = await fetch(localUri);
  const blob = await fileRes.blob();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }
  return objectKey;
}
