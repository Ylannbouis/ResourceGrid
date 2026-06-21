import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { DeepgramClient } from "@deepgram/sdk";
// The Anthropic zod helper expects a zod v4 schema (zod 3.25 ships both under /v4).
import * as z from "zod/v4";
import {
  CATEGORIES,
  PinPriority,
  PinType,
  type VoiceTriageResult,
} from "@resourcegrid/shared";

/** What Claude extracts from the transcript (location is geocoded separately). */
const extractionSchema = z.object({
  type: z.enum([PinType.OFFER, PinType.NEED]),
  category: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  contact: z.string().nullable(),
  priority: z.enum([
    PinPriority.CRITICAL,
    PinPriority.URGENT,
    PinPriority.STANDARD,
  ]),
  locationText: z.string(),
});
type Extraction = z.infer<typeof extractionSchema>;

interface LatLng {
  lat: number;
  lng: number;
}

const SYSTEM_PROMPT = `You triage spoken mutual-aid requests during a localized crisis into a structured map pin.

Given a transcript of someone speaking, produce:
- type: "OFFER" if they are offering a resource/help, "NEED" if they are requesting help.
- category: the single closest match from this list: ${CATEGORIES.join(", ")}. Use "other" only if nothing fits.
- title: a short imperative summary (3-8 words), e.g. "Need a water pump" or "Generator to share".
- description: any extra useful detail they gave, or null.
- contact: a phone number or @handle if they said one, else null.
- priority: "CRITICAL" for life-threatening / urgent danger (flooding, injury, no power for medical), "URGENT" for time-sensitive needs, "STANDARD" otherwise. Offers are usually "STANDARD".
- locationText: copy any address, street, or place they mentioned VERBATIM (e.g. "123 Elm Street"). If they gave no location, use an empty string.

Be decisive; do not ask questions.`;

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  /** Feature is live only when both provider keys are configured. */
  isEnabled(): boolean {
    return Boolean(process.env.DEEPGRAM_API_KEY && process.env.ANTHROPIC_API_KEY);
  }

  async triage(
    audio: Buffer,
    fallback: LatLng | null,
  ): Promise<VoiceTriageResult> {
    const transcript = await this.transcribe(audio);
    const extracted = await this.extract(transcript);
    const { location, geocoded } = await this.geocode(
      extracted.locationText,
      fallback,
    );

    return {
      transcript,
      details: {
        type: extracted.type,
        category: extracted.category,
        title: extracted.title,
        description: extracted.description,
        contact: extracted.contact,
        priority: extracted.priority,
      },
      location,
      geocoded,
      locationText: extracted.locationText,
    };
  }

  /** Deepgram speech-to-text. */
  private async transcribe(audio: Buffer): Promise<string> {
    const dg = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
    const res = await dg.listen.v1.media.transcribeFile(audio, {
      model: "nova-3",
      smart_format: true,
      punctuate: true,
    });
    // results.channels[0].alternatives[0].transcript on a standard response.
    const transcript =
      (res as { results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> } })
        .results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    return transcript.trim();
  }

  /** Claude structured extraction (Haiku 4.5, no thinking — keep latency low). */
  private async extract(transcript: string): Promise<Extraction> {
    if (!transcript) {
      // Nothing was heard — return a safe, generic NEED the user can edit/delete.
      return {
        type: PinType.NEED,
        category: "other",
        title: "Voice request (no speech detected)",
        description: null,
        contact: null,
        priority: PinPriority.STANDARD,
        locationText: "",
      };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
      output_config: { format: zodOutputFormat(extractionSchema) },
    });

    const parsed = message.parsed_output;
    if (!parsed) {
      this.logger.warn(`Extraction returned no parsed output for: ${transcript}`);
      return {
        type: PinType.NEED,
        category: "other",
        title: transcript.slice(0, 80),
        description: null,
        contact: null,
        priority: PinPriority.STANDARD,
        locationText: "",
      };
    }
    return parsed;
  }

  /** Geocode the spoken location via OpenStreetMap Nominatim; fall back to the device. */
  private async geocode(
    locationText: string,
    fallback: LatLng | null,
  ): Promise<{ location: LatLng; geocoded: boolean }> {
    const fallbackLocation = fallback ?? { lat: 37.7749, lng: -122.4194 };

    if (!locationText.trim()) {
      return { location: fallbackLocation, geocoded: false };
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        locationText,
      )}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "ResourceGrid/1.0 (mutual-aid map)" },
      });
      const hits = (await res.json()) as Array<{ lat: string; lon: string }>;
      const top = hits[0];
      if (top) {
        return {
          location: { lat: Number(top.lat), lng: Number(top.lon) },
          geocoded: true,
        };
      }
    } catch (err) {
      this.logger.warn(`Geocoding failed for "${locationText}": ${String(err)}`);
    }
    return { location: fallbackLocation, geocoded: false };
  }
}
