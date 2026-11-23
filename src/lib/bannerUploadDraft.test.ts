import { it, expect, vi } from "vitest";
import { createBannerUploadDraft } from "./bannerUploadDraft";

it("retains uploaded evidence after a failed record write", async () => {
  const draft = createBannerUploadDraft();
  const photo = new Blob(["photo"]);
  const upload = vi.fn().mockResolvedValue("saved-photo-url");
  const save = vi.fn().mockRejectedValueOnce(new Error("record failed")).mockResolvedValueOnce(undefined);
  await expect(draft.save(photo, upload, save)).rejects.toThrow("record failed");
  await expect(draft.save(photo, upload, save)).resolves.toBe("saved-photo-url");
  expect(upload).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenLastCalledWith("saved-photo-url");
});
it("does not save a record after upload failure", async () => {
  const save = vi.fn();
  await expect(createBannerUploadDraft().save(new Blob(), async () => { throw new Error("upload failed"); }, save)).rejects.toThrow("upload failed");
  expect(save).not.toHaveBeenCalled();
});