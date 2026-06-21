import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  OWNER_TOKEN_HEADER,
  bboxSchema,
  createPinSchema,
  updatePinSchema,
  type Bbox,
  type CreatePinInput,
  type UpdatePinInput,
} from "@resourcegrid/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PinsService } from "./pins.service";

@Controller("pins")
export class PinsController {
  constructor(private readonly pins: PinsService) {}

  /** GET /api/pins?minLat&minLng&maxLat&maxLng — optional viewport filter. */
  @Get()
  list(@Query() query: Record<string, string>) {
    let bbox: Bbox | undefined;
    if (
      query.minLat != null &&
      query.minLng != null &&
      query.maxLat != null &&
      query.maxLng != null
    ) {
      const parsed = bboxSchema.safeParse({
        minLat: Number(query.minLat),
        minLng: Number(query.minLng),
        maxLat: Number(query.maxLat),
        maxLng: Number(query.maxLng),
      });
      if (parsed.success) bbox = parsed.data;
    }
    return this.pins.findActive(bbox);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createPinSchema)) body: CreatePinInput,
  ) {
    return this.pins.create(body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Headers(OWNER_TOKEN_HEADER) token: string | undefined,
    @Body(new ZodValidationPipe(updatePinSchema)) body: UpdatePinInput,
  ) {
    return this.pins.update(id, token, body);
  }

  @Post(":id/claim")
  claim(@Param("id") id: string) {
    return this.pins.claim(id);
  }

  @Post(":id/confirm")
  confirm(@Param("id") id: string) {
    return this.pins.confirm(id);
  }

  @Post(":id/resolve")
  resolve(
    @Param("id") id: string,
    @Headers(OWNER_TOKEN_HEADER) token: string | undefined,
  ) {
    return this.pins.resolve(id, token);
  }

  @Delete(":id")
  remove(
    @Param("id") id: string,
    @Headers(OWNER_TOKEN_HEADER) token: string | undefined,
  ) {
    return this.pins.remove(id, token);
  }
}
