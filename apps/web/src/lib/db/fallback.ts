/**
 * Fallback to mock data if DB is unavailable.
 * Lets the app keep running during early development when Docker is not yet up.
 */
import { projects as mockProjects, type Project as MockProject } from "@/lib/mock-data";

export function getMockProjectsAsDbShape() {
  return mockProjects.map((p) => ({
    ...p,
    createdAt: new Date(p.startDate),
    updatedAt: new Date(p.startDate),
  }));
}

export type { MockProject };
