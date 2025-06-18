// lib/fetchPreview.ts
import { getLinkPreview } from 'link-preview-js';

export async function fetchPreview(url: string) {
  try {
    const data = await getLinkPreview(url);
    return data;
  } catch (error) {
    console.error("Error fetching preview", error);
    return null;
  }
}
