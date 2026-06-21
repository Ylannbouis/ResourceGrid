import { ForbiddenException } from "@nestjs/common";
import { PinPriority, PinStatus, PinType } from "@resourcegrid/shared";
import { PinsService } from "./pins.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { PinsGateway } from "./pins.gateway";

type DbPin = {
  id: string;
  type: PinType;
  category: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  status: PinStatus;
  priority: PinPriority;
  confirmations: number;
  contact: string | null;
  ownerToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function makePin(overrides: Partial<DbPin> = {}): DbPin {
  const now = new Date();
  return {
    id: "pin_1",
    type: PinType.OFFER,
    category: "water",
    title: "Clean water to share",
    description: null,
    lat: 37.77,
    lng: -122.42,
    status: PinStatus.OPEN,
    priority: PinPriority.STANDARD,
    confirmations: 0,
    contact: null,
    ownerToken: "secret-token",
    expiresAt: new Date(now.getTime() + 3600_000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("PinsService", () => {
  let prisma: jest.Mocked<Pick<PrismaService, "pin">> & { pin: any };
  let gateway: jest.Mocked<PinsGateway>;
  let service: PinsService;

  beforeEach(() => {
    prisma = {
      pin: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    } as any;
    gateway = {
      emitCreated: jest.fn(),
      emitUpdated: jest.fn(),
      emitResolved: jest.fn(),
      emitDeleted: jest.fn(),
    } as any;
    service = new PinsService(prisma as unknown as PrismaService, gateway);
  });

  it("returns the owner token on create and broadcasts a public pin", async () => {
    const created = makePin();
    prisma.pin.create.mockResolvedValue(created);

    const result = await service.create({
      type: PinType.OFFER,
      category: "water",
      title: "Clean water to share",
      priority: PinPriority.STANDARD,
      lat: 37.77,
      lng: -122.42,
    });

    expect(result.ownerToken).toBe("secret-token");
    expect(gateway.emitCreated).toHaveBeenCalledWith(
      expect.not.objectContaining({ ownerToken: expect.anything() }),
    );
  });

  it("strips the owner token from the active list", async () => {
    prisma.pin.findMany.mockResolvedValue([makePin()]);
    const list = await service.findActive();
    expect(list[0]).not.toHaveProperty("ownerToken");
  });

  it("rejects mutations with the wrong owner token", async () => {
    prisma.pin.findUnique.mockResolvedValue(makePin());
    await expect(service.resolve("pin_1", "wrong")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.pin.update).not.toHaveBeenCalled();
  });

  it("allows the owner to resolve and broadcasts the removal", async () => {
    prisma.pin.findUnique.mockResolvedValue(makePin());
    prisma.pin.update.mockResolvedValue(
      makePin({ status: PinStatus.RESOLVED }),
    );
    await service.resolve("pin_1", "secret-token");
    expect(gateway.emitResolved).toHaveBeenCalled();
  });

  it("only claims open offers", async () => {
    prisma.pin.findUnique.mockResolvedValue(makePin({ type: PinType.NEED }));
    await expect(service.claim("pin_1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("claims an open offer without a token", async () => {
    prisma.pin.findUnique.mockResolvedValue(makePin());
    prisma.pin.update.mockResolvedValue(makePin({ status: PinStatus.CLAIMED }));
    const result = await service.claim("pin_1");
    expect(result.status).toBe(PinStatus.CLAIMED);
    expect(gateway.emitUpdated).toHaveBeenCalled();
  });

  it("carries the triage priority through create and broadcasts it", async () => {
    const created = makePin({
      type: PinType.NEED,
      priority: PinPriority.CRITICAL,
    });
    prisma.pin.create.mockResolvedValue(created);

    const result = await service.create({
      type: PinType.NEED,
      category: "medical",
      title: "Critical injury, needs transport",
      priority: PinPriority.CRITICAL,
      lat: 37.77,
      lng: -122.42,
    });

    expect(result.priority).toBe(PinPriority.CRITICAL);
    expect(gateway.emitUpdated).not.toHaveBeenCalled();
    expect(gateway.emitCreated).toHaveBeenCalledWith(
      expect.objectContaining({ priority: PinPriority.CRITICAL }),
    );
  });

  it("confirms a pin token-free, increments the count, and broadcasts", async () => {
    prisma.pin.findUnique.mockResolvedValue(makePin());
    prisma.pin.update.mockResolvedValue(makePin({ confirmations: 1 }));

    const result = await service.confirm("pin_1");

    expect(prisma.pin.update).toHaveBeenCalledWith({
      where: { id: "pin_1" },
      data: { confirmations: { increment: 1 } },
    });
    expect(result.confirmations).toBe(1);
    expect(gateway.emitUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ confirmations: 1 }),
    );
  });

  it("rejects confirming a pin that does not exist", async () => {
    prisma.pin.findUnique.mockResolvedValue(null);
    await expect(service.confirm("missing")).rejects.toBeTruthy();
    expect(prisma.pin.update).not.toHaveBeenCalled();
  });

  it("sweeps expired pins and broadcasts deletions", async () => {
    prisma.pin.findMany.mockResolvedValue([{ id: "pin_1" }, { id: "pin_2" }]);
    prisma.pin.deleteMany.mockResolvedValue({ count: 2 });
    await service.sweepExpired();
    expect(prisma.pin.deleteMany).toHaveBeenCalled();
    expect(gateway.emitDeleted).toHaveBeenCalledTimes(2);
  });
});
