import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  label: string;
  hint?: string;
  facing?: "user" | "environment";
  value: File | null;
  onCapture: (file: File | null) => void;
}

/** Live camera only — gallery uploads are intentionally not allowed (anti-fraud). */
const CameraCapture = ({ label, hint, facing = "environment", value, onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 50);
    } catch {
      toast.error("کیمرہ کھل نہیں سکا — براہِ کرم کیمرے کی اجازت دیں");
    }
  };

  const shoot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${label.replace(/\s+/g, "-")}-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        setPreview(URL.createObjectURL(blob));
        stop();
        setOpen(false);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="space-y-2 rounded-xl border p-3 bg-card/60">
      <div>
        <p className="text-xs font-bold text-foreground">{label} *</p>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>

      {open ? (
        <div className="space-y-2">
          <video ref={videoRef} playsInline muted className="w-full rounded-lg bg-black aspect-[4/3] object-cover" />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" onClick={shoot}>
              <Camera className="w-4 h-4 mr-1" /> تصویر لیں
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { stop(); setOpen(false); }}>
              منسوخ
            </Button>
          </div>
        </div>
      ) : preview && value ? (
        <div className="space-y-2">
          <img src={preview} alt={label} className="w-full rounded-lg aspect-[4/3] object-cover" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-primary flex items-center gap-1">
              <Check className="w-3 h-3" /> لی گئی
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => { onCapture(null); setPreview(null); void start(); }}>
              <RefreshCw className="w-3 h-3 mr-1" /> دوبارہ
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={start}>
          <Camera className="w-4 h-4 mr-1" /> کیمرہ کھولیں
        </Button>
      )}
    </div>
  );
};

export default CameraCapture;
