// components/MicrolinkPreview.tsx
"use client";

import { useEffect, useState } from "react";

export default function MicrolinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    if (!url) return;

    const fetchPreview = async () => {
      try {
        const res = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(
            url
          )}&screenshot=true&meta=true`
        );
        const data = await res.json();
        if (data.status === "success") {
          setPreview(data.data);
        }
      } catch (error) {
        console.error("Microlink error:", error);
      }
    };

    fetchPreview();
  }, [url]);

  if (!preview) return null;

  return (
    <div className=" border rounded shadow-lg overflow-hidden bg-white">
      {preview.screenshot?.url && (
        <img
          src={preview.screenshot.url}
          alt="Website screenshot"
          className="w-full object-cover"
        />
      )}
    </div>
  );
}
