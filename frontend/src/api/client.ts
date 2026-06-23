import type {
  EmployeeCreate,
  EmployeeSummary,
  EmployeesList,
  HRSkillsResult,
  SkillCategory,
  SkillGapResult,
  SkillInput,
  SubSkill,
  CareerHorizon,
  CareerPathResponse,
  OpenRolesList,
  RoleRecommendationsResponse,
  TargetShape,
  Taxonomy,
  TrainingPlanResponse,
} from "./types";

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function fetchTaxonomy(): Promise<Taxonomy> {
  return request<Taxonomy>("/taxonomy");
}

export function createCategory(name: string): Promise<SkillCategory> {
  return request<SkillCategory>("/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function reorderCategories(categoryIds: number[]): Promise<Taxonomy> {
  return request<Taxonomy>("/categories/order", {
    method: "PUT",
    body: JSON.stringify({ category_ids: categoryIds }),
  });
}

export function deleteCategory(categoryId: number): Promise<void> {
  return request<void>(`/categories/${categoryId}`, { method: "DELETE" });
}

export function createSubSkill(
  categoryId: number,
  name: string
): Promise<SubSkill> {
  return request<SubSkill>(`/categories/${categoryId}/sub-skills`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteSubSkill(subSkillId: number): Promise<void> {
  return request<void>(`/sub-skills/${subSkillId}`, { method: "DELETE" });
}

export function fetchEmployees(): Promise<EmployeesList> {
  return request<EmployeesList>("/employees");
}

export function createEmployee(body: EmployeeCreate): Promise<EmployeeSummary> {
  return request<EmployeeSummary>("/employees", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchEmployeeSkills(name: string): Promise<HRSkillsResult> {
  return request<HRSkillsResult>(
    `/employees/${encodeURIComponent(name)}/skills`
  );
}

export function postSkillGap(
  employeeName: string,
  skills: SkillInput[]
): Promise<SkillGapResult> {
  return request<SkillGapResult>("/skill-gap", {
    method: "POST",
    body: JSON.stringify({ employee_name: employeeName, skills }),
  });
}

export function postTrainingPlan(
  employeeName: string,
  skills: SkillInput[],
  targetShape: TargetShape
): Promise<TrainingPlanResponse> {
  return request<TrainingPlanResponse>("/training-plan", {
    method: "POST",
    body: JSON.stringify({
      employee_name: employeeName,
      skills,
      target_shape: targetShape,
    }),
  });
}

export function fetchOpenRoles(): Promise<OpenRolesList> {
  return request<OpenRolesList>("/open-roles");
}

export function postRoleRecommendations(
  employeeName: string,
  skills: SkillInput[],
  targetShape: TargetShape,
  careerHorizon: CareerHorizon
): Promise<RoleRecommendationsResponse> {
  return request<RoleRecommendationsResponse>("/role-recommendations", {
    method: "POST",
    body: JSON.stringify({
      employee_name: employeeName,
      skills,
      target_shape: targetShape,
      career_horizon: careerHorizon,
    }),
  });
}

export function postCareerPath(
  employeeName: string,
  skills: SkillInput[],
  targetShape: TargetShape,
  careerHorizon: CareerHorizon
): Promise<CareerPathResponse> {
  return request<CareerPathResponse>("/career-path", {
    method: "POST",
    body: JSON.stringify({
      employee_name: employeeName,
      skills,
      target_shape: targetShape,
      career_horizon: careerHorizon,
    }),
  });
}

export function postMockEmployees(numEmployees = 3): Promise<unknown> {
  return request("/mock-employees", {
    method: "POST",
    body: JSON.stringify({ num_employees: numEmployees }),
  });
}

export function computeSkillGap(
  skillRating: number,
  valueToSponsor: number,
  valueToMitre: number
): number {
  const sponsorGap = valueToSponsor - skillRating;
  const mitreGap = valueToMitre - skillRating;
  return 2 * sponsorGap + mitreGap;
}

export function skillGapResultToDisplay(result: SkillGapResult) {
  return result.ranked_skills.map((s) => ({
    skill: s.sub_skill,
    current: s.skill_rating,
    desired: s.value_to_sponsor,
    valueToMitre: s.value_to_mitre,
    skillGap: s.skill_gap,
    totalScore: s.total_score,
    rank: s.rank,
    gap: s.skill_gap,
    priority: (s.skill_gap >= 6
      ? "high"
      : s.skill_gap >= 3
        ? "medium"
        : "low") as "high" | "medium" | "low",
    requiredBy:
      s.rank === 1
        ? ["Highest skill gap"]
        : s.rank <= 3
          ? ["Top development focus"]
          : [`Rank #${s.rank}`],
  }));
}
