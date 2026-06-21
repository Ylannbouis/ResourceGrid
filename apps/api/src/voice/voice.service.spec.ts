const mockTranscribe = jest.fn();
const mockParse = jest.fn();

jest.mock("@deepgram/sdk", () => ({
  DeepgramClient: jest.fn(() => ({
    listen: { v1: { media: { transcribeFile: mockTranscribe } } },
  })),
}));

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn(() => ({ messages: { parse: mockParse } })),
}));

import { PinPriority, PinType } from "@resourcegrid/shared";
import { VoiceService } from "./voice.service";

/** Shape of a standard Deepgram transcription response (only the fields we read). */
const dgResponse = (transcript: string) => ({
  results: { channels: [{ alternatives: [{ transcript }] }] },
});

describe("VoiceService", () => {
  let service: VoiceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VoiceService();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("maps transcript + extraction into a pin and geocodes the spoken location", async () => {
    mockTranscribe.mockResolvedValue(
      dgResponse("My basement is flooding at 123 Elm Street, I need a water pump"),
    );
    mockParse.mockResolvedValue({
      parsed_output: {
        type: PinType.NEED,
        category: "water",
        title: "Need a water pump",
        description: null,
        contact: null,
        priority: PinPriority.CRITICAL,
        locationText: "123 Elm Street",
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => [{ lat: "40.12", lon: "-74.21" }],
    });

    const result = await service.triage(Buffer.from("audio"), { lat: 1, lng: 2 });

    expect(result.details.type).toBe(PinType.NEED);
    expect(result.details.priority).toBe(PinPriority.CRITICAL);
    expect(result.location).toEqual({ lat: 40.12, lng: -74.21 });
    expect(result.geocoded).toBe(true);
    expect(result.transcript).toContain("Elm Street");
  });

  it("falls back to the device location when no location is spoken", async () => {
    mockTranscribe.mockResolvedValue(dgResponse("I need water"));
    mockParse.mockResolvedValue({
      parsed_output: {
        type: PinType.NEED,
        category: "water",
        title: "Need water",
        description: null,
        contact: null,
        priority: PinPriority.URGENT,
        locationText: "",
      },
    });

    const fallback = { lat: 37.7, lng: -122.4 };
    const result = await service.triage(Buffer.from("audio"), fallback);

    expect(result.geocoded).toBe(false);
    expect(result.location).toEqual(fallback);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("falls back when Nominatim returns no hit", async () => {
    mockTranscribe.mockResolvedValue(dgResponse("need help on Nowhere Rd"));
    mockParse.mockResolvedValue({
      parsed_output: {
        type: PinType.NEED,
        category: "other",
        title: "Need help",
        description: null,
        contact: null,
        priority: PinPriority.STANDARD,
        locationText: "Nowhere Rd",
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ json: async () => [] });

    const result = await service.triage(Buffer.from("audio"), { lat: 5, lng: 6 });
    expect(result.geocoded).toBe(false);
    expect(result.location).toEqual({ lat: 5, lng: 6 });
  });

  it("is disabled without keys and enabled with both", () => {
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(service.isEnabled()).toBe(false);

    process.env.DEEPGRAM_API_KEY = "dg";
    process.env.ANTHROPIC_API_KEY = "an";
    expect(service.isEnabled()).toBe(true);

    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });
});
