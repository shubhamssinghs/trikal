import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { StorageModule } from "./storage/storage.module";
import { SettingsModule } from "./settings/settings.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { LookupsModule } from "./lookups/lookups.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { CompaniesModule } from "./companies/companies.module";
import { ProjectsModule } from "./projects/projects.module";
import { TranscriptsModule } from "./transcripts/transcripts.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { AiModule } from "./ai/ai.module";
import { MilestonesModule } from "./milestones/milestones.module";
import { RisksModule } from "./risks/risks.module";
import { MembersModule } from "./members/members.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    StorageModule,
    SettingsModule,
    ComplianceModule,
    LookupsModule,
    AuthModule,
    HealthModule,
    CompaniesModule,
    ProjectsModule,
    TranscriptsModule,
    KnowledgeModule,
    AiModule,
    MilestonesModule,
    RisksModule,
    MembersModule,
  ],
})
export class AppModule {}
