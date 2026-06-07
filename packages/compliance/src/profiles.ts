export type ComplianceLevel = "standard" | "internal" | "pii" | "phi-hipaa" | "financial" | "legal";

export interface ComplianceRules {
  hipaaEnabled: boolean;
  piaRequired: boolean;
  phiHandling: "none" | "redact" | "strict";
  aiAccessPolicy: "allow" | "restricted" | "blocked";
  requireApprovalForExternalActions: boolean;
  auditLevel: "minimal" | "standard" | "full";
}

export const ComplianceProfiles: Record<ComplianceLevel, ComplianceRules> = {
  standard: {
    hipaaEnabled: false,
    piaRequired: false,
    phiHandling: "none",
    aiAccessPolicy: "allow",
    requireApprovalForExternalActions: true,
    auditLevel: "standard",
  },
  internal: {
    hipaaEnabled: false,
    piaRequired: false,
    phiHandling: "none",
    aiAccessPolicy: "allow",
    requireApprovalForExternalActions: true,
    auditLevel: "standard",
  },
  pii: {
    hipaaEnabled: false,
    piaRequired: true,
    phiHandling: "redact",
    aiAccessPolicy: "restricted",
    requireApprovalForExternalActions: true,
    auditLevel: "full",
  },
  "phi-hipaa": {
    hipaaEnabled: true,
    piaRequired: true,
    phiHandling: "strict",
    aiAccessPolicy: "restricted",
    requireApprovalForExternalActions: true,
    auditLevel: "full",
  },
  financial: {
    hipaaEnabled: false,
    piaRequired: true,
    phiHandling: "none",
    aiAccessPolicy: "restricted",
    requireApprovalForExternalActions: true,
    auditLevel: "full",
  },
  legal: {
    hipaaEnabled: false,
    piaRequired: true,
    phiHandling: "none",
    aiAccessPolicy: "restricted",
    requireApprovalForExternalActions: true,
    auditLevel: "full",
  },
};
