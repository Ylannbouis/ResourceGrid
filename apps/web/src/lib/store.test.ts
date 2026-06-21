import { beforeEach, describe, expect, it } from "vitest";
import {
  PinPriority,
  PinStatus,
  PinType,
  type Pin,
} from "@resourcegrid/shared";
import { selectPinList, usePinStore } from "./store";

function pin(overrides: Partial<Pin> = {}): Pin {
  const now = new Date().toISOString();
  return {
    id: "p1",
    type: PinType.NEED,
    category: "water",
    title: "Need water",
    description: null,
    contact: null,
    priority: PinPriority.STANDARD,
    confirmations: 0,
    lat: 0,
    lng: 0,
    status: PinStatus.OPEN,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("pin store", () => {
  beforeEach(() => {
    usePinStore.setState({ pins: {}, connected: false });
  });

  it("seeds and lists pins", () => {
    usePinStore.getState().setAll([pin({ id: "a" }), pin({ id: "b" })]);
    expect(selectPinList(usePinStore.getState())).toHaveLength(2);
  });

  it("upserts a pin in place", () => {
    usePinStore.getState().upsert(pin({ id: "a", title: "one" }));
    usePinStore.getState().upsert(pin({ id: "a", title: "two" }));
    const list = selectPinList(usePinStore.getState());
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("two");
  });

  it("removes a pin when it becomes resolved", () => {
    usePinStore.getState().upsert(pin({ id: "a" }));
    usePinStore.getState().upsert(pin({ id: "a", status: PinStatus.RESOLVED }));
    expect(selectPinList(usePinStore.getState())).toHaveLength(0);
  });

  it("removes a pin by id", () => {
    usePinStore.getState().setAll([pin({ id: "a" })]);
    usePinStore.getState().remove("a");
    expect(selectPinList(usePinStore.getState())).toHaveLength(0);
  });
});
