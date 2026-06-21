import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { VoiceService } from "./voice.service";

/** Minimal shape of the multer memory-storage file (avoids needing @types/multer). */
interface UploadedAudio {
  buffer: Buffer;
}

@Controller("voice")
export class VoiceController {
  constructor(private readonly voice: VoiceService) {}

  /** Drives the client's feature gate — the mic button only shows when enabled. */
  @Get("status")
  status(): { enabled: boolean } {
    return { enabled: this.voice.isEnabled() };
  }

  @Post("triage")
  @UseInterceptors(
    FileInterceptor("audio", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async triage(
    @UploadedFile() file: UploadedAudio | undefined,
    @Body() body: { lat?: string; lng?: string },
  ) {
    if (!this.voice.isEnabled()) {
      throw new ServiceUnavailableException("Voice triage is not configured");
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException("No audio provided");
    }
    const fallback =
      body.lat != null && body.lng != null
        ? { lat: Number(body.lat), lng: Number(body.lng) }
        : null;
    return this.voice.triage(file.buffer, fallback);
  }
}
