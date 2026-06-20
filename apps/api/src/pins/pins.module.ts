import { Module } from "@nestjs/common";
import { PinsController } from "./pins.controller";
import { PinsService } from "./pins.service";
import { PinsGateway } from "./pins.gateway";

@Module({
  controllers: [PinsController],
  providers: [PinsService, PinsGateway],
})
export class PinsModule {}
