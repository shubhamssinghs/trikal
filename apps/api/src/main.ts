import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import session from "express-session";
import * as ConnectRedis from "connect-redis";
import Redis from "ioredis";

// connect-redis exposes RedisStore as a named export; CJS/ESM interop varies by
// build, so resolve it defensively at runtime.
/* eslint-disable @typescript-eslint/no-explicit-any */
const RedisStore: any = (ConnectRedis as any).RedisStore ?? (ConnectRedis as any).default ?? ConnectRedis;
/* eslint-enable @typescript-eslint/no-explicit-any */
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  // Persist sessions in Redis so OAuth tokens survive API restarts/HMR — without
  // this, the default in-memory store is wiped on every reload and users get
  // logged out on the next request. Falls back to in-memory if Redis is absent.
  let store: session.Store | undefined;
  if (process.env.REDIS_HOST) {
    const client = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
    client.on("error", (e) => new Logger("Session").warn(`Redis session store: ${e.message}`));
    store = new RedisStore({ client, prefix: "trikal:sess:", ttl: 60 * 60 * 24 * 7 });
  }

  // Cookies + session (required by the OIDC OAuth middleware to store tokens)
  app.use(cookieParser());
  app.use(
    session({
      store,
      secret: process.env.JWT_SECRET ?? "dev-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    })
  );

  app.enableCors({
    origin: process.env.WEB_URL ?? "http://localhost:3100",
    credentials: true,
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
