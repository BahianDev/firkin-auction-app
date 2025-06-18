// components/LinkPreviewClient.tsx
"use client";

import { useEffect, useState } from "react";

export default function LinkPreviewClient({ url }: { url: string }) {
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    if (!url) return;
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        setPreview(data);
      } catch (err) {
        console.error("Error fetching preview:", err);
      }
    };
    fetchPreview();
  }, [url]);

  if (!preview) return null;

  console.log(preview)

  return (
    <div className="mt-4 p-4 border rounded bg-white shadow">
      <h3 className="text-lg text-black font-bold">{preview.title}</h3>
      {preview.images?.[0] && (
        <img src={preview.images[0]} alt="preview" className="mt-2 w-full h-auto" />
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline block mt-2"
      >
        Visit site
      </a>
    </div>
  );
}
