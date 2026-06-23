import { Fragment, useState } from "react";
import { Briefcase, Loader2, Sparkles } from "lucide-react";
import type {
  OpenRole,
  RoleRecommendation,
  SkillGapResult,
  TargetShape,
} from "../../api/types";

interface OpenRolesProps {
  employeeName: string;
  gapResult: SkillGapResult | null;
  targetShape: TargetShape;
  roles: OpenRole[];
  rolesLoading: boolean;
  recommendedIds: number[];
  recommendations: RoleRecommendation[];
  summary: string | null;
  recsLoading: boolean;
  recsError: string | null;
  onGenerateRecommendations: () => void;
}

export function OpenRoles({
  employeeName,
  gapResult,
  targetShape,
  roles,
  rolesLoading,
  recommendedIds,
  recommendations,
  summary,
  recsLoading,
  recsError,
  onGenerateRecommendations,
}: OpenRolesProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const recByRoleId = new Map(recommendations.map((r) => [r.role_id, r]));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <Briefcase size={20} />
          Role recommendations
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Match open positions to your skill gaps and career path (target{" "}
          <strong>{targetShape}</strong> shape). The agent suggests roles whose
          job descriptions help you develop high-gap sub-skills.
        </p>

        {gapResult && (
          <div className="flex flex-wrap gap-2 text-sm mb-4">
            <span className="px-2 py-1 bg-gray-100 rounded">
              Employee: <strong>{gapResult.employee_name}</strong>
            </span>
            <span className="px-2 py-1 bg-orange-50 text-orange-900 rounded">
              Top gap: {gapResult.highest_skill_gap_sub_skill}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onGenerateRecommendations}
          disabled={!employeeName.trim() || recsLoading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 flex items-center gap-2 font-medium"
        >
          {recsLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Finding matching roles…
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Recommend roles for my path
            </>
          )}
        </button>
        {recsError && <p className="mt-3 text-sm text-red-600">{recsError}</p>}
      </div>

      {summary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-900">
          <p className="font-medium mb-1">Advisor summary</p>
          <p>{summary}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-emerald-200">
          <h4 className="font-semibold text-gray-900 mb-3">Recommended for you</h4>
          <ul className="space-y-4">
            {recommendations.map((rec) => (
              <li
                key={rec.role_id}
                className="border border-emerald-100 rounded-lg p-4 bg-emerald-50/50"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900">{rec.title}</span>
                  <span className="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded">
                    Fit {rec.fit_score}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{rec.rationale}</p>
                <p className="text-xs text-gray-600">
                  <strong>Skills to develop:</strong>{" "}
                  {rec.skills_to_develop.join(", ")}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>Career path:</strong> {rec.career_path_alignment}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Open roles catalog</h4>
          <p className="text-sm text-gray-600 mt-1">
            Synthetic availability — click a row to view the full job description.
          </p>
        </div>

        {rolesLoading ? (
          <p className="p-8 text-center text-gray-500">Loading open roles…</p>
        ) : roles.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No open roles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Shape</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Develop skills</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => {
                  const isRecommended = recommendedIds.includes(role.id);
                  const developSkills = role.skill_requirements
                    .filter((s) => s.develops_skill === "develop")
                    .map((s) => s.sub_skill)
                    .join(", ");
                  return (
                    <Fragment key={role.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(expandedId === role.id ? null : role.id)
                        }
                        className={`cursor-pointer hover:bg-gray-50 ${
                          isRecommended ? "bg-emerald-50/80" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {isRecommended && (
                            <span
                              className="inline-block mr-1 text-emerald-600"
                              title="Recommended"
                            >
                              ★
                            </span>
                          )}
                          {role.title}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {role.department}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{role.level}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                            {role.target_shape}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">
                          {role.career_stage}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                          {developSkills}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            {role.status}
                          </span>
                        </td>
                      </tr>
                      {expandedId === role.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-4">
                            <p className="text-gray-800 mb-3">
                              {role.job_description}
                            </p>
                            <p className="text-xs text-gray-500 mb-2">
                              Primary categories: {role.primary_categories}
                            </p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {role.skill_requirements.map((req) => (
                                <li key={`${role.id}-${req.sub_skill}`}>
                                  {req.sub_skill} ({req.category}) — min rating{" "}
                                  {req.min_skill_rating},{" "}
                                  {req.develops_skill === "develop"
                                    ? "development focus"
                                    : "required"}
                                </li>
                              ))}
                            </ul>
                            {recByRoleId.get(role.id) && (
                              <p className="mt-3 text-sm text-emerald-800 border-t border-emerald-100 pt-3">
                                <strong>Why recommended:</strong>{" "}
                                {recByRoleId.get(role.id)!.rationale}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
