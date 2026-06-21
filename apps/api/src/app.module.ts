import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { PinsModule } from "./pins/pins.module";
import { VoiceModule } from "./voice/voice.module";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, PinsModule, VoiceModule],
})
export class AppModule {}
