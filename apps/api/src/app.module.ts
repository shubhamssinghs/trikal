import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { StorageModule } from "./storage/storage.module";
import { SettingsModule } from "./settings/settings.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { CompaniesModule } from "./companies/companies.module";
import { ProjectsModule } from "./projects/projects.module";
import { TranscriptsModule } from "./transcripts/transcripts.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { AiModule } from "./ai/ai.module";
import { MilestonesModule } from "./milestones/milestones.module";
import { RisksModule } from "./risks/risks.module";
import { StakeholdersModule } from "./stakeholders/stakeholders.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    StorageModule,
    SettingsModule,
    ComplianceModule,
    AuthModule,
    HealthModule,
    CompaniesModule,
    ProjectsModule,
    TranscriptsModule,
    KnowledgeModule,
    AiModule,
    MilestonesModule,
    RisksModule,
    StakeholdersModule,
  ],
})
export class AppModule {}
