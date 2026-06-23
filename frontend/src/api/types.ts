export interface SubSkill {
  id: number;
  name: string;
}

export interface SkillCategory {
  id: number;
  name: string;
  sub_skills: SubSkill[];
}

export interface Taxonomy {
  categories: SkillCategory[];
}

export interface SkillInput {
  sub_skill: string;
  skill_rating: number;
  value_to_sponsor: number;
  value_to_mitre: number;
}

export interface SkillScore {
  sub_skill: string;
  skill_rating: number;
  value_to_sponsor: number;
  value_to_mitre: number;
  skill_gap: number;
  total_score: number;
  rank: number;
}

export interface SkillGapResult {
  employee_name: string;
  ranked_skills: SkillScore[];
  top_development_focus: string[];
  highest_skill_gap: number;
  highest_skill_gap_sub_skill: string;
  current_shape: string;
  shape_description: string;
}

export interface SubSkillRating {
  subSkillId: number;
  subSkillName: string;
  categoryId: number;
  categoryName: string;
  skill_rating: number;
  value_to_sponsor: number;
  value_to_mitre: number;
}

export interface EmployeeSkillRecord {
  category: string;
  sub_skill: string;
  skill_rating: number;
  value_to_sponsor: number;
  value_to_mitre: number;
  total_score: number;
}

export interface EmployeeSummary {
  id: number;
  name: string;
  department: string;
  role: string;
}

export interface EmployeeSkillRatingIn {
  sub_skill_id: number;
  skill_rating: number;
  value_to_sponsor: number;
  value_to_mitre: number;
}

export interface EmployeeCreate {
  name: string;
  department: string;
  role: string;
  skills: EmployeeSkillRatingIn[];
}

export interface EmployeesList {
  employees: EmployeeSummary[];
}

export interface HRSkillsResult {
  employee_name: string;
  department: string;
  role: string;
  skills: EmployeeSkillRecord[];
}

export type TargetShape = "T" | "N" | "M";

export type CareerHorizon = "short" | "medium" | "long";

export interface TrainingPlanResponse {
  plan: string;
  gap_analysis: SkillGapResult;
  context: Record<string, unknown>;
}

export interface CareerPathResponse {
  career_path: string;
  gap_analysis: SkillGapResult;
  context: Record<string, unknown>;
}

export interface RoleSkillRequirement {
  sub_skill: string;
  category: string;
  min_skill_rating: number;
  develops_skill: string;
}

export interface OpenRole {
  id: number;
  title: string;
  department: string;
  level: string;
  job_description: string;
  target_shape: string;
  primary_categories: string;
  career_stage: string;
  status: string;
  skill_requirements: RoleSkillRequirement[];
}

export interface OpenRolesList {
  roles: OpenRole[];
}

export interface RoleRecommendation {
  role_id: number;
  title: string;
  fit_score: number;
  rationale: string;
  skills_to_develop: string[];
  career_path_alignment: string;
}

export interface RoleRecommendationsResponse {
  summary: string;
  recommendations: RoleRecommendation[];
  fit_scores: { role_id: number; title: string; deterministic_fit_score: number }[];
  open_roles: OpenRole[];
  recommended_role_ids: number[];
  gap_analysis: SkillGapResult;
}

export interface SkillGapDisplay {
  skill: string;
  current: number;
  desired: number;
  valueToMitre: number;
  skillGap: number;
  totalScore: number;
  rank: number;
  gap: number;
  priority: "high" | "medium" | "low";
  requiredBy: string[];
}
