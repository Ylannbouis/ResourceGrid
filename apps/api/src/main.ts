import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix("api");

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  new Logger("Bootstrap").log(`ResourceGrid API listening on :${port}`);
}

void bootstrap();
