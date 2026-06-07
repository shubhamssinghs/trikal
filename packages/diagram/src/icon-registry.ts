export interface IconDefinition {
  name: string;
  icon: string;
  category: string;
  provider: string;
}

export const iconRegistry: Record<string, IconDefinition> = {
  // AWS
  "aws.cloudfront": { name: "Amazon CloudFront", icon: "/icons/aws/cloudfront.svg", category: "networking", provider: "aws" },
  "aws.waf": { name: "AWS WAF", icon: "/icons/aws/waf.svg", category: "security", provider: "aws" },
  "aws.ecs": { name: "Amazon ECS", icon: "/icons/aws/ecs.svg", category: "compute", provider: "aws" },
  "aws.rds": { name: "Amazon RDS", icon: "/icons/aws/rds.svg", category: "database", provider: "aws" },
  "aws.s3": { name: "Amazon S3", icon: "/icons/aws/s3.svg", category: "storage", provider: "aws" },
  "aws.kms": { name: "AWS KMS", icon: "/icons/aws/kms.svg", category: "security", provider: "aws" },
  "aws.elasticache": { name: "Amazon ElastiCache", icon: "/icons/aws/elasticache.svg", category: "database", provider: "aws" },
  "aws.alb": { name: "Application Load Balancer", icon: "/icons/aws/alb.svg", category: "networking", provider: "aws" },
  // Azure
  "azure.devops": { name: "Azure DevOps", icon: "/icons/azure/devops.svg", category: "tools", provider: "azure" },
  "azure.app-service": { name: "Azure App Service", icon: "/icons/azure/app-service.svg", category: "compute", provider: "azure" },
  "azure.sql": { name: "Azure SQL Database", icon: "/icons/azure/sql-database.svg", category: "database", provider: "azure" },
  // Tools
  "tools.slack": { name: "Slack", icon: "/icons/tools/slack.svg", category: "communication", provider: "tools" },
  "tools.jira": { name: "Jira", icon: "/icons/tools/jira.svg", category: "project-management", provider: "tools" },
  "tools.teams": { name: "Microsoft Teams", icon: "/icons/tools/teams.svg", category: "communication", provider: "tools" },
  "tools.zoom": { name: "Zoom", icon: "/icons/tools/zoom.svg", category: "communication", provider: "tools" },
  "tools.outlook": { name: "Outlook", icon: "/icons/tools/outlook.svg", category: "communication", provider: "tools" },
  // Generic
  "generic.user": { name: "User", icon: "/icons/generic/user.svg", category: "identity", provider: "generic" },
  "generic.mobile": { name: "Mobile App", icon: "/icons/generic/mobile-app.svg", category: "client", provider: "generic" },
  "generic.database": { name: "Database", icon: "/icons/generic/database.svg", category: "database", provider: "generic" },
  "generic.lock": { name: "Security Control", icon: "/icons/generic/lock.svg", category: "security", provider: "generic" },
  "generic.api": { name: "API", icon: "/icons/generic/api.svg", category: "service", provider: "generic" },
  "generic.queue": { name: "Message Queue", icon: "/icons/generic/queue.svg", category: "messaging", provider: "generic" },
};

export function lookupIcon(type: string): IconDefinition | undefined {
  return iconRegistry[type];
}
