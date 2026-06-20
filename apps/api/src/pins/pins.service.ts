import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  PinStatus,
  PinType,
  type Bbox,
  type CreatePinInput,
  type UpdatePinInput,
} from "@resourcegrid/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PinsGateway } from "./pins.gateway";
import { toOwnedPin, toPublicPin } from "./pins.mapper";

@Injectable()
export class PinsService {
  private readonly logger = new Logger(PinsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PinsGateway,
  ) {}

  private get ttlMs(): number {
    const hours = Number(process.env.PIN_TTL_HOURS ?? 24);
    return hours * 60 * 60 * 1000;
  }

  /** Active pins within a viewport: not resolved and not expired. */
  async findActive(bbox?: Bbox) {
    const pins = await this.prisma.pin.findMany({
      where: {
        status: { not: PinStatus.RESOLVED },
        expiresAt: { gt: new Date() },
        ...(bbox
          ? {
              lat: { gte: bbox.minLat, lte: bbox.maxLat },
              lng: { gte: bbox.minLng, lte: bbox.maxLng },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return pins.map(toPublicPin);
  }

  async create(input: CreatePinInput) {
    const pin = await this.prisma.pin.create({
      data: {
        ...input,
        ownerToken: randomBytes(24).toString("hex"),
        expiresAt: new Date(Date.now() + this.ttlMs),
      },
    });
    this.gateway.emitCreated(toPublicPin(pin));
    // Owner token returned ONCE, only to the creator.
    return toOwnedPin(pin);
  }

  async update(id: string, token: string | undefined, input: UpdatePinInput) {
    await this.assertOwner(id, token);
    const pin = await this.prisma.pin.update({ where: { id }, data: input });
    const pub = toPublicPin(pin);
    this.gateway.emitUpdated(pub);
    return pub;
  }

  /** Claim an OPEN offer. Intentionally token-free so anyone can take a resource. */
  async claim(id: string) {
    const existing = await this.getOrThrow(id);
    if (existing.type !== PinType.OFFER) {
      throw new ForbiddenException("Only offers can be claimed");
    }
    if (existing.status !== PinStatus.OPEN) {
      throw new ForbiddenException("Pin is not open");
    }
    const pin = await this.prisma.pin.update({
      where: { id },
      data: { status: PinStatus.CLAIMED },
    });
    const pub = toPublicPin(pin);
    this.gateway.emitUpdated(pub);
    return pub;
  }

  async resolve(id: string, token: string | undefined) {
    await this.assertOwner(id, token);
    const pin = await this.prisma.pin.update({
      where: { id },
      data: { status: PinStatus.RESOLVED },
    });
    const pub = toPublicPin(pin);
    // Resolved pins leave the active map — tell clients to remove it.
    this.gateway.emitResolved(pub);
    return pub;
  }

  async remove(id: string, token: string | undefined) {
    await this.assertOwner(id, token);
    await this.prisma.pin.delete({ where: { id } });
    this.gateway.emitDeleted(id);
    return { id };
  }

  private async getOrThrow(id: string) {
    const pin = await this.prisma.pin.findUnique({ where: { id } });
    if (!pin) throw new NotFoundException("Pin not found");
    return pin;
  }

  private async assertOwner(id: string, token: string | undefined) {
    const pin = await this.getOrThrow(id);
    if (!token || !safeEqual(token, pin.ownerToken)) {
      throw new ForbiddenException("Invalid owner token");
    }
    return pin;
  }

  /** Every 5 minutes, drop expired pins so the map stays fresh. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepExpired(): Promise<void> {
    const expired = await this.prisma.pin.findMany({
      where: { expiresAt: { lte: new Date() } },
      select: { id: true },
    });
    if (expired.length === 0) return;

    await this.prisma.pin.deleteMany({
      where: { id: { in: expired.map((p) => p.id) } },
    });
    for (const { id } of expired) this.gateway.emitDeleted(id);
    this.logger.log(`swept ${expired.length} expired pin(s)`);
  }
}

/** Constant-time comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
