import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import type { Server, Socket } from "socket.io";
import { SocketEvents, type Pin } from "@resourcegrid/shared";

/**
 * Broadcasts pin deltas to every connected client. The map fetches the initial set
 * over REST; this gateway only carries changes so screens update without a refresh.
 */
@WebSocketGateway({
  cors: {
    origin: (process.env.WEB_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
  },
})
export class PinsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PinsGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`client connected: ${client.id}`);
  }

  emitCreated(pin: Pin): void {
    this.server.emit(SocketEvents.PinCreated, pin);
  }

  emitUpdated(pin: Pin): void {
    this.server.emit(SocketEvents.PinUpdated, pin);
  }

  emitResolved(pin: Pin): void {
    this.server.emit(SocketEvents.PinResolved, pin);
  }

  emitDeleted(id: string): void {
    this.server.emit(SocketEvents.PinDeleted, { id });
  }
}
