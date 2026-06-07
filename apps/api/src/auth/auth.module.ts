import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TrishulAuthMiddleware } from "./trishul-auth.middleware";
import { AuthController } from "./auth.controller";

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [TrishulAuthMiddleware],
  exports: [TrishulAuthMiddleware],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply auth middleware globally — routes can opt out via @Public()
    consumer
      .apply(TrishulAuthMiddleware)
      .exclude("health", "auth/login", "auth/callback", "auth/logout")
      .forRoutes("*");
  }
}
