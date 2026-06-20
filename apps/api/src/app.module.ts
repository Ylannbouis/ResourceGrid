import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { PinsModule } from "./pins/pins.module";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, PinsModule],
})
export class AppModule {}
