/** Retains an uploaded URL if the record write fails, avoiding duplicate uploads on retry. */
export function createBannerUploadDraft() {
  let source: Blob | null = null;
  let url: string | null = null;
  return {
    reset() { source = null; url = null; },
    async save(blob: Blob, upload: (blob: Blob) => Promise<string>, saveRecord: (url: string) => Promise<void>) {
      if (source !== blob) { source = blob; url = null; }
      if (!url) url = await upload(blob);
      await saveRecord(url);
      return url;
    },
  };
}