import { useCallback, useEffect, useRef, useState } from "react";
import { TSkillsInput, type RatingMap } from "./components/TSkillsInput";
import { TSkillsChart } from "./components/TSkillsChart";
import { TSkillMatrix } from "./components/TSkillMatrix";
import { GapAnalysis } from "./components/GapAnalysis";
import { OrganizationalComparison } from "./components/OrganizationalComparison";
import { TrainingPlan } from "./components/TrainingPlan";
import { CareerPath } from "./components/CareerPath";
import { OpenRoles } from "./components/OpenRoles";
import { OneOnOneSummary } from "./components/OneOnOneSummary";
import homepageGraphic from "../assets/t-skill-homepage-graphic-v2.png";
import {
  BarChart3,
  Users,
  TrendingUp,
  Building2,
  Grid3x3,
  AlertCircle,
  GraduationCap,
  Route,
  Briefcase,
  MessageSquare,
} from "lucide-react";
import type {
  CareerHorizon,
  EmployeeSummary,
  OpenRole,
  RoleRecommendation,
  SkillCategory,
  SkillGapResult,
  TargetShape,
} from "../api/types";
import {
  fetchEmployeeSkills,
  fetchEmployees,
  fetchOpenRoles,
  fetchTaxonomy,
  postCareerPath,
  postRoleRecommendations,
  postSkillGap,
  postTrainingPlan,
  skillGapResultToDisplay,
} from "../api/client";
import type { SkillGapDisplay } from "../api/types";

interface Skill {
  id: string;
  name: string;
  level: number;
}

interface DeepSkill extends Skill {
  parentId: string;
}

function buildDefaultRatings(categories: SkillCategory[]): RatingMap {
  const map: RatingMap = {};
  for (const cat of categories) {
    for (const sub of cat.sub_skills) {
      map[sub.id] = { skill_rating: 3, value_to_sponsor: 3, value_to_mitre: 3 };
    }
  }
  return map;
}

function toMatrixSkills(
  categories: SkillCategory[],
  ratings: RatingMap
): { horizontal: Skill[]; vertical: DeepSkill[] } {
  const horizontal = categories.map((cat) => {
    const levels = cat.sub_skills.map(
      (s) => ratings[s.id]?.skill_rating ?? 0
    );
    const level = levels.length ? Math.max(...levels) : 1;
    return { id: String(cat.id), name: cat.name, level };
  });
  const vertical = categories.flatMap((cat) =>
    cat.sub_skills.map((sub) => ({
      id: String(sub.id),
      name: sub.name,
      level: ratings[sub.id]?.skill_rating ?? 3,
      parentId: String(cat.id),
    }))
  );
  return { horizontal, vertical };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<
    | "input"
    | "matrix"
    | "visualization"
    | "gaps"
    | "training"
    | "career"
    | "roles"
    | "comparison"
    | "oneonone"
  >("input");
  const [taxonomy, setTaxonomy] = useState<SkillCategory[]>([]);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const [ratings, setRatings] = useState<RatingMap>({});
  const [skillGaps, setSkillGaps] = useState<SkillGapDisplay[]>([]);
  const [gapResult, setGapResult] = useState<SkillGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [targetShape, setTargetShape] = useState<TargetShape>("T");
  const [planMarkdown, setPlanMarkdown] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [careerHorizon, setCareerHorizon] = useState<CareerHorizon>("medium");
  const [careerMarkdown, setCareerMarkdown] = useState<string | null>(null);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState<string | null>(null);
  const [openRoles, setOpenRoles] = useState<OpenRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleRecommendations, setRoleRecommendations] = useState<
    RoleRecommendation[]
  >([]);
  const [recommendedRoleIds, setRecommendedRoleIds] = useState<number[]>([]);
  const [rolesSummary, setRolesSummary] = useState<string | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const initialEmployeeLoaded = useRef(false);

  const reloadTaxonomy = useCallback(async () => {
    const data = await fetchTaxonomy();
    setTaxonomy(data.categories);
    setRatings((prev) => {
      const next: RatingMap = {};
      const validIds = new Set<number>();
      for (const cat of data.categories) {
        for (const sub of cat.sub_skills) {
          validIds.add(sub.id);
          next[sub.id] = prev[sub.id] ?? {
            skill_rating: 3,
            value_to_sponsor: 3,
            value_to_mitre: 3,
          };
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    reloadTaxonomy().catch((e: Error) => setTaxonomyError(e.message));
  }, [reloadTaxonomy]);

  const reloadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data.employees);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadEmployees();
  }, [reloadEmployees]);

  useEffect(() => {
    setRolesLoading(true);
    fetchOpenRoles()
      .then((data) => setOpenRoles(data.roles))
      .catch(() => setOpenRoles([]))
      .finally(() => setRolesLoading(false));
  }, []);

  const { horizontal: horizontalSkills, vertical: verticalSkills } =
    toMatrixSkills(taxonomy, ratings);

  const handleRatingChange = useCallback(
    (
      subSkillId: number,
      field: "skill_rating" | "value_to_sponsor" | "value_to_mitre",
      value: number
    ) => {
      setRatings((prev) => ({
        ...prev,
        [subSkillId]: {
          ...prev[subSkillId],
          skill_rating: prev[subSkillId]?.skill_rating ?? 3,
          value_to_sponsor: prev[subSkillId]?.value_to_sponsor ?? 3,
          value_to_mitre: prev[subSkillId]?.value_to_mitre ?? 3,
          [field]: value,
        },
      }));
    },
    []
  );

  const buildSkillInputs = useCallback(() => {
    const skills: {
      sub_skill: string;
      skill_rating: number;
      value_to_sponsor: number;
      value_to_mitre: number;
    }[] = [];
    for (const cat of taxonomy) {
      for (const sub of cat.sub_skills) {
        const r = ratings[sub.id];
        if (r) {
          skills.push({
            sub_skill: sub.name,
            skill_rating: r.skill_rating,
            value_to_sponsor: r.value_to_sponsor,
            value_to_mitre: r.value_to_mitre,
          });
        }
      }
    }
    return skills;
  }, [taxonomy, ratings]);

  const handleCalculate = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await postSkillGap(employeeName, buildSkillInputs());
      setGapResult(result);
      setSkillGaps(skillGapResultToDisplay(result));
      setActiveTab("gaps");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeByName = useCallback(
    async (name: string) => {
      if (!name.trim()) return;
      setLoading(true);
      setLoadError(null);
      try {
        const hr = await fetchEmployeeSkills(name);
        setEmployeeName(hr.employee_name);
        const nameToSubId = new Map<string, number>();
        for (const cat of taxonomy) {
          for (const sub of cat.sub_skills) {
            nameToSubId.set(sub.name.toLowerCase(), sub.id);
          }
        }
        setRatings((prev) => {
          const next = { ...prev };
          for (const s of hr.skills) {
            const id = nameToSubId.get(s.sub_skill.toLowerCase());
            if (id != null) {
              next[id] = {
                skill_rating: s.skill_rating,
                value_to_sponsor: s.value_to_sponsor,
                value_to_mitre: s.value_to_mitre ?? 3,
              };
            }
          }
          return next;
        });
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Employee not found");
      } finally {
        setLoading(false);
      }
    },
    [taxonomy]
  );

  useEffect(() => {
    if (
      initialEmployeeLoaded.current ||
      employeesLoading ||
      taxonomy.length === 0 ||
      employees.length === 0
    ) {
      return;
    }
    initialEmployeeLoaded.current = true;
    const name = employees[0].name;
    setEmployeeName(name);
    void loadEmployeeByName(name);
  }, [employeesLoading, employees, taxonomy.length, loadEmployeeByName]);

  const handleEmployeeCreated = (name: string) => {
    setEmployeeName(name);
    setLoadError(null);
  };

  const handleLoadEmployee = () => {
    void loadEmployeeByName(employeeName);
  };

  const handleEmployeeSelect = (name: string) => {
    setEmployeeName(name);
    void loadEmployeeByName(name);
  };

  const handleGenerateTrainingPlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const result = await postTrainingPlan(
        employeeName,
        buildSkillInputs(),
        targetShape
      );
      setPlanMarkdown(result.plan);
      setGapResult(result.gap_analysis);
      setSkillGaps(skillGapResultToDisplay(result.gap_analysis));
    } catch (e) {
      setPlanError(
        e instanceof Error ? e.message : "Training plan generation failed"
      );
    } finally {
      setPlanLoading(false);
    }
  };

  const handleGenerateRoleRecommendations = async () => {
    setRecsLoading(true);
    setRecsError(null);
    try {
      const result = await postRoleRecommendations(
        employeeName,
        buildSkillInputs(),
        targetShape,
        careerHorizon
      );
      setRolesSummary(result.summary);
      setRoleRecommendations(result.recommendations);
      setRecommendedRoleIds(result.recommended_role_ids);
      setOpenRoles(result.open_roles);
      setGapResult(result.gap_analysis);
      setSkillGaps(skillGapResultToDisplay(result.gap_analysis));
    } catch (e) {
      setRecsError(
        e instanceof Error ? e.message : "Role recommendation failed"
      );
    } finally {
      setRecsLoading(false);
    }
  };

  const handleGenerateCareerPath = async () => {
    setCareerLoading(true);
    setCareerError(null);
    try {
      const result = await postCareerPath(
        employeeName,
        buildSkillInputs(),
        targetShape,
        careerHorizon
      );
      setCareerMarkdown(result.career_path);
      setGapResult(result.gap_analysis);
      setSkillGaps(skillGapResultToDisplay(result.gap_analysis));
    } catch (e) {
      setCareerError(
        e instanceof Error ? e.message : "Career path generation failed"
      );
    } finally {
      setCareerLoading(false);
    }
  };

  const userSkillsMap = [...horizontalSkills, ...verticalSkills].reduce(
    (acc, skill) => {
      acc[skill.name] = skill.level;
      return acc;
    },
    {} as Record<string, number>
  );

  const mockOrganizationalData = {
    corporate: {
      name: "Corporate",
      skills: {} as Record<string, number>,
      objectives: ["Align with enterprise T-skill goals"],
    },
    division: {
      name: "Division",
      skills: {} as Record<string, number>,
      objectives: ["Division skill targets"],
    },
    department: {
      name: "Department",
      skills: {} as Record<string, number>,
      objectives: ["Department priorities"],
    },
    team: {
      name: "Team",
      skills: {} as Record<string, number>,
      objectives: ["Team delivery goals"],
    },
    customer: {
      name: "Customer",
      skills: {} as Record<string, number>,
      objectives: ["Customer-facing outcomes"],
    },
  };

  const tabs = [
    { id: "input" as const, label: "Skill Input", icon: Users },
    { id: "matrix" as const, label: "T-Matrix View", icon: Grid3x3 },
    { id: "visualization" as const, label: "Charts", icon: BarChart3 },
    { id: "gaps" as const, label: "Gap Analysis", icon: TrendingUp },
    { id: "training" as const, label: "Training Plan", icon: GraduationCap },
    { id: "career" as const, label: "Career Path", icon: Route },
    { id: "roles" as const, label: "Open Roles", icon: Briefcase },
    { id: "comparison" as const, label: "Org Comparison", icon: Building2 },
    { id: "oneonone" as const, label: "1:1 Summary", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-stretch overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <div className="md:w-[40%] md:flex-none min-h-[140px]">
              <img
                src={homepageGraphic}
                alt="T-skill career development journey"
                className="w-full h-full min-h-[140px] max-h-52 md:max-h-none md:min-h-[180px] object-cover object-left"
              />
            </div>
            <div className="md:w-[60%] md:flex-none flex items-center bg-sky-100 p-6">
              <h1 className="homepage-headline w-full">
                Take Your Next Step in the Right Direction.
              </h1>
            </div>
          </div>
          {gapResult && (
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                <span className="font-semibold text-orange-900">
                  Highest gap: {gapResult.highest_skill_gap}
                </span>
                <span className="text-orange-800">
                  ({gapResult.highest_skill_gap_sub_skill})
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <span className="font-bold text-blue-700 text-lg">
                  {gapResult.current_shape}
                </span>
                <span className="text-blue-800">{gapResult.shape_description}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {taxonomyError && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <AlertCircle size={18} />
            Cannot reach API: {taxonomyError}. Start the backend with{" "}
            <code className="bg-red-100 px-1 rounded">
              uvicorn src.api:app --reload
            </code>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "input" && taxonomy.length > 0 && (
          <TSkillsInput
            taxonomy={taxonomy}
            employees={employees}
            employeesLoading={employeesLoading}
            employeeName={employeeName}
            onEmployeeSelect={handleEmployeeSelect}
            ratings={ratings}
            onRatingChange={handleRatingChange}
            onCalculate={handleCalculate}
            onLoadEmployee={handleLoadEmployee}
            onTaxonomyChange={reloadTaxonomy}
            onReloadEmployees={reloadEmployees}
            onEmployeeCreated={handleEmployeeCreated}
            loading={loading}
            loadError={loadError}
          />
        )}

        {activeTab === "input" && taxonomy.length === 0 && !taxonomyError && (
          <p className="text-gray-500">Loading skill taxonomy…</p>
        )}

        {activeTab === "matrix" && (
          <TSkillMatrix
            horizontalSkills={horizontalSkills}
            verticalSkills={verticalSkills}
          />
        )}

        {activeTab === "visualization" && (
          <TSkillsChart
            horizontalSkills={horizontalSkills}
            verticalSkills={verticalSkills}
          />
        )}

        {activeTab === "gaps" && (
          <GapAnalysis
            gaps={skillGaps}
            shapeLabel={gapResult?.current_shape}
            highestSkillGap={gapResult?.highest_skill_gap}
            highestSkillGapSubSkill={gapResult?.highest_skill_gap_sub_skill}
          />
        )}

        {activeTab === "training" && (
          <TrainingPlan
            employeeName={employeeName}
            gapResult={gapResult}
            targetShape={targetShape}
            onTargetShapeChange={setTargetShape}
            planMarkdown={planMarkdown}
            planLoading={planLoading}
            planError={planError}
            onGenerate={handleGenerateTrainingPlan}
          />
        )}

        {activeTab === "career" && (
          <CareerPath
            employeeName={employeeName}
            gapResult={gapResult}
            targetShape={targetShape}
            onTargetShapeChange={setTargetShape}
            careerHorizon={careerHorizon}
            onCareerHorizonChange={setCareerHorizon}
            careerMarkdown={careerMarkdown}
            careerLoading={careerLoading}
            careerError={careerError}
            onGenerate={handleGenerateCareerPath}
          />
        )}

        {activeTab === "roles" && (
          <OpenRoles
            employeeName={employeeName}
            gapResult={gapResult}
            targetShape={targetShape}
            roles={openRoles}
            rolesLoading={rolesLoading}
            recommendedIds={recommendedRoleIds}
            recommendations={roleRecommendations}
            summary={rolesSummary}
            recsLoading={recsLoading}
            recsError={recsError}
            onGenerateRecommendations={handleGenerateRoleRecommendations}
          />
        )}

        {activeTab === "comparison" && (
          <OrganizationalComparison
            userSkills={userSkillsMap}
            levels={mockOrganizationalData}
          />
        )}

        {activeTab === "oneonone" && (
          <OneOnOneSummary
            employeeName={employeeName}
            employee={employees.find((e) => e.name === employeeName)}
            taxonomy={taxonomy}
            ratings={ratings}
            gapResult={gapResult}
            targetShape={targetShape}
            careerHorizon={careerHorizon}
            planMarkdown={planMarkdown}
            careerMarkdown={careerMarkdown}
            roleRecommendations={roleRecommendations}
            rolesSummary={rolesSummary}
          />
        )}
      </main>
    </div>
  );
}
