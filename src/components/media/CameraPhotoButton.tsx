import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera as NativeCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { tr } from "@/lib/i18n/tr";

/** Original camera evidence only: never open a gallery or enhance receipts. */
export default function CameraPhotoButton({ onCapture, disabled, label = tr("Camera", "کیمرہ"), className }: { onCapture: (file: File) => void | Promise<void>; disabled?: boolean; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(async media => {
      if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
      stream = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); }
      if (!cancelled) setReady(true);
    }).catch(() => { if (!cancelled) { toast.error(tr("Camera could not open — check permission", "کیمرہ نہیں کھل سکا — اجازت چیک کریں")); setOpen(false); } });
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop()); setReady(false); };
  }, [open]);
  const start = async () => {
    if (disabled || lock.current) return;
    if (!Capacitor.isNativePlatform()) {
      if (navigator.mediaDevices?.getUserMedia) setOpen(true);
      else toast.error(tr("Camera unavailable", "کیمرہ دستیاب نہیں"));
      return;
    }
    lock.current = true; setBusy(true);
    try {
      const photo = await NativeCamera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.Uri, quality: 95, correctOrientation: true });
      if (!photo.webPath) throw new Error("No camera photo");
      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error("Camera photo unreadable");
      const blob = await response.blob();
      await onCapture(new File([blob], `camera.${photo.format}`, { type: blob.type || "image/jpeg" }));
    } catch (error) {
      if (!(error instanceof Error && /cancel/i.test(error.message))) toast.error(tr("Camera photo could not be read", "کیمرے کی تصویر نہیں پڑھی جا سکی"));
    } finally { lock.current = false; setBusy(false); }
  };
  const capture = async () => {
    const source = video.current;
    if (!source?.videoWidth || !ready || lock.current || disabled) return;
    lock.current = true; setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = source.videoWidth; canvas.height = source.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Camera unavailable");
      context.drawImage(source, 0, 0);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) throw new Error("Camera capture failed");
      setOpen(false);
      await onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
    } catch { toast.error(tr("Photo could not be captured", "تصویر نہیں لی جا سکی")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <><Button type="button" variant="outline" size="sm" disabled={disabled || busy} className={className} onClick={() => void start()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}{label}</Button><Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader><video ref={video} autoPlay playsInline muted className="aspect-[4/3] w-full rounded-md bg-muted object-contain" /><Button disabled={!ready || busy || disabled} onClick={() => void capture()}><Camera className="size-4" />{tr("Capture photo", "تصویر کھینچیں")}</Button></DialogContent></Dialog></>;
}