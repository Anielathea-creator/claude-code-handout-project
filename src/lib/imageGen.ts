/**
 * Bildgenerierung via Gemini 2.5 Flash Image Preview ("Nano Banana").
 * Liefert eine data:image/png;base64,…-URL zurück, die direkt in ein
 * <img src="…"> gesetzt werden kann.
 */

import type { GoogleGenAI } from '@google/genai';
import { withRetry } from './retry';

// Gleiches Modell wie im Editor-Kontextmenü – "stable" ohne -preview-Suffix.
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export type AspectRatio = '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

/**
 * Erweitert den User-Prompt um einen konsistenten Stil, der gut zu
 * Schul-/Lehrmittel-Illustrationen passt.
 */
function buildImagePrompt(userPrompt: string, aspectRatio: AspectRatio): string {
  return [
    userPrompt,
    `Style: clean educational illustration suitable for a school handout,`,
    `clear shapes, neutral background, friendly and age-appropriate,`,
    `no text or labels in the image, ${aspectRatio} aspect ratio.`,
  ].join(' ');
}

export interface ImageGenResult {
  ok: true;
  dataUrl: string;
  mimeType: string;
}
export interface ImageGenError {
  ok: false;
  error: string;
}

/**
 * Erzeugt ein Bild und gibt die data-URL zurück.
 *
 * options.skipStyleSuffix=true: Sendet den Prompt ROH (ohne den
 * Schul-Illustrations-Stil-Suffix). Nötig, wenn der Aufruf einen sehr
 * spezifischen Stil verlangt – z.B. dekorative Rahmen.
 */
export async function generateImage(
  client: GoogleGenAI,
  prompt: string,
  aspectRatio: AspectRatio = '4:3',
  options?: { skipStyleSuffix?: boolean },
): Promise<ImageGenResult | ImageGenError> {
  if (!prompt?.trim()) {
    return { ok: false, error: 'Leerer Bild-Prompt.' };
  }
  try {
    const fullPrompt = options?.skipStyleSuffix
      ? prompt.trim()
      : buildImagePrompt(prompt.trim(), aspectRatio);

    const response = await withRetry(() =>
      client.models.generateContent({
        model: IMAGE_MODEL,
        contents: fullPrompt,
      }),
    );

    // Durch alle Parts laufen und den ersten inlineData-Part (PNG) nehmen
    const candidates = (response as any)?.candidates ?? [];
    for (const cand of candidates) {
      const parts = cand?.content?.parts ?? [];
      for (const part of parts) {
        const inline = part?.inlineData;
        if (inline?.data && inline?.mimeType?.startsWith('image/')) {
          const dataUrl = `data:${inline.mimeType};base64,${inline.data}`;
          return { ok: true, dataUrl, mimeType: inline.mimeType };
        }
      }
    }

    return {
      ok: false,
      error:
        'Keine Bilddaten in der Antwort gefunden. Möglicherweise wurde der Prompt durch Safety-Filter blockiert.',
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return { ok: false, error: 'API-Kontingent erschöpft. Bitte später erneut versuchen.' };
    }
    return { ok: false, error: `Bildgenerierung fehlgeschlagen: ${msg}` };
  }
}
