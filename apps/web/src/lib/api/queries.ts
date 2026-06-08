import { api } from "./client";

export type Company = {
  id: string; name: string; description?: string; website?: string;
  logoKey?: string | null;
  createdAt: string; _count?: { projects: number };
};

export type Project = {
  id: string; name: string; description?: string; status: string;
  companyId: string; startDate?: string; targetEndDate?: string;
  company?: { id: string; name: string };
  _count?: { knowledgeItems: number; recommendations: number };
};

export type Recommendation = {
  id: string; type: string; title: string; description?: string;
  status: string; createdAt: string;
  aiRun?: { agentType: string; modelId?: string; createdAt: string };
};

export const queries = {
  companies: () => api.get<Company[]>("/companies"),
  company: (id: string) => api.get<Company>(`/companies/${id}`),
  projects: (companyId?: string) =>
    api.get<Project[]>(`/projects${companyId ? `?companyId=${companyId}` : ""}`),
  project: (id: string) => api.get<Project>(`/projects/${id}`),
  recommendations: (projectId: string) =>
    api.get<Recommendation[]>(`/ai/recommendations?projectId=${projectId}`),
  approveRec: (id: string) => api.patch<Recommendation>(`/ai/recommendations/${id}/approve`),
  rejectRec: (id: string) => api.patch<Recommendation>(`/ai/recommendations/${id}/reject`),
};
