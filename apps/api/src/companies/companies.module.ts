import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";

@Module({
  imports: [MulterModule.register({})],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
