import { serverFetch } from "./server";

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

// Server-side reads — forward the user's session cookie to the API.
export const queries = {
  companies: () => serverFetch<Company[]>("/companies", []),
  company: (id: string) => serverFetch<Company | null>(`/companies/${id}`, null),
  projects: (companyId?: string) =>
    serverFetch<Project[]>(`/projects${companyId ? `?companyId=${companyId}` : ""}`, []),
  project: (id: string) => serverFetch<Project | null>(`/projects/${id}`, null),
  recommendations: (projectId: string) =>
    serverFetch<Recommendation[]>(`/ai/recommendations?projectId=${projectId}`, []),
};
