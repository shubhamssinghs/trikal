export type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "PII" | "PHI" | "FINANCIAL" | "LEGAL";

export function isHighSensitivity(classification: DataClassification): boolean {
  return ["PHI", "PII", "FINANCIAL", "LEGAL"].includes(classification);
}

export function requiresRedaction(classification: DataClassification, hipaaEnabled: boolean): boolean {
  if (classification === "PHI" && hipaaEnabled) return true;
  if (classification === "PII") return true;
  return false;
}
