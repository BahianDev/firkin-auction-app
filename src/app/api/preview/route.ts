// app/api/preview/route.ts
import { getLinkPreview } from 'link-preview-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  try {
    const data = await getLinkPreview(url);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
