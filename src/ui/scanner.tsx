"use client";

import { Camera, Check, ImageUp, LoaderCircle, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prepareReceiptImage } from "@/lib/prepare-receipt-image";
import { Button } from "./button";
import { cn } from "./cn";

type Stage = "idle" | "preparing" | "uploading" | "reading" | "done" | "error";

const STEPS: Array<{ stage: Stage; label: string }> = [
  { stage: "preparing", label: "Straightening and shrinking the photo" },
  { stage: "uploading", label: "Uploading it privately" },
  { stage: "reading", label: "Reading the merchant, date and every item" },
];

/** Photo in, receipt out: prepares the image, uploads it, waits for the read. */
export function Scanner({ scansLeft, isDemo }: { scansLeft: number; isDemo: boolean }) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function scan(file: Blob) {
    setError(null);
    setPreview(URL.createObjectURL(file));
    try {
      setStage("preparing");
      const image = await prepareReceiptImage(file);
      setStage("uploading");
      const body = new FormData();
      body.append("image", image, "receipt.jpg");
      const request = fetch("/api/receipts", { method: "POST", body });
      // The upload is quick; most of the wait is the AI reading the photo.
      const reading = setTimeout(() => setStage("reading"), 700);
      const response = await request;
      clearTimeout(reading);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "That receipt couldn't be scanned.");
      setStage("done");
      router.push(`/receipts/${result.receipt.id}`);
    } catch (e) {
      setStage("error");
      setError(e instanceof Error ? e.message : "That receipt couldn't be scanned.");
    }
  }

  async function useSample() {
    const response = await fetch("/samples/receipt-grocer.jpg");
    await scan(await response.blob());
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void scan(file);
  }

  const busy = stage === "preparing" || stage === "uploading" || stage === "reading" || stage === "done";
  const outOfScans = scansLeft === 0;

  if (busy && preview) {
    const current = STEPS.findIndex((s) => s.stage === stage);
    return (
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start" aria-live="polite">
        <div className="relative mx-auto w-56 overflow-hidden border-2 border-ink lg:w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset */}
          <img src={preview} alt="Your receipt" className="block max-h-[26rem] w-full object-cover object-top" />
          <span aria-hidden className="scan-sweep absolute inset-x-0 h-1 bg-cat-lime shadow-[0_0_0_1px_var(--color-ink)]" />
        </div>
        <ol className="grid gap-3">
          {STEPS.map((step, index) => {
            const done = index < current || stage === "done";
            const active = index === current && stage !== "done";
            return (
              <li key={step.stage} className={cn("flex items-center gap-3 text-lg font-bold", !done && !active && "text-muted")}>
                <span className={cn("grid size-8 shrink-0 place-items-center border-2 border-ink", done && "bg-ink text-white", active && "bg-cat-lime")}>
                  {done ? (
                    <Check aria-hidden className="size-4" strokeWidth={3} />
                  ) : active ? (
                    <LoaderCircle aria-hidden className="size-4 animate-spin" strokeWidth={3} />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </span>
                {step.label}
              </li>
            );
          })}
          <li className="pl-11 text-sm text-muted">Usually a few seconds. Busy days can take up to half a minute.</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {error && (
        <p role="alert" className="border-2 border-danger p-3 font-semibold text-danger">
          {error}
        </p>
      )}

      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => onFiles(e.target.files)} />
      <input ref={library} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" tabIndex={-1} onChange={(e) => onFiles(e.target.files)} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "grid gap-3 border-2 border-ink p-4 lg:border-dashed lg:p-10",
          dragging ? "bg-cat-lime" : "bg-paper",
        )}
      >
        <p className="hidden text-center text-xl font-extrabold lg:block">Drop a photo of the receipt here</p>
        <div className="grid gap-2 lg:mx-auto lg:w-80">
          <Button onClick={() => camera.current?.click()} disabled={outOfScans} className="py-5 text-lg lg:hidden">
            <Camera aria-hidden className="size-6" strokeWidth={2.5} />
            Take a photo
          </Button>
          <Button variant="secondary" onClick={() => library.current?.click()} disabled={outOfScans}>
            <ImageUp aria-hidden className="size-5" strokeWidth={2.5} />
            <span className="lg:hidden">Choose from photos</span>
            <span className="hidden lg:inline">Choose a file</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <p className="text-sm font-semibold">
          {outOfScans
            ? "You've used today's scans. You can still add expenses by hand."
            : `${scansLeft} ${scansLeft === 1 ? "scan" : "scans"} left today`}
        </p>
        <Button variant="secondary" onClick={useSample} disabled={outOfScans} className="px-3 py-2 text-sm">
          <ReceiptText aria-hidden className="size-4" strokeWidth={2.5} />
          {isDemo ? "No receipt handy? Try a sample" : "Try a sample receipt"}
        </Button>
      </div>
    </div>
  );
}
