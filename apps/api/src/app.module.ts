import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { CompaniesModule } from "./companies/companies.module";
import { ProjectsModule } from "./projects/projects.module";
import { TranscriptsModule } from "./transcripts/transcripts.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    CompaniesModule,
    ProjectsModule,
    TranscriptsModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
