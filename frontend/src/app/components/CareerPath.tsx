import { Loader2, Route } from "lucide-react";
import type {
  CareerHorizon,
  SkillGapResult,
  TargetShape,
} from "../../api/types";
import { renderMarkdownSimple } from "./renderMarkdownSimple";

const SHAPE_OPTIONS: {
  value: TargetShape;
  label: string;
  description: string;
}[] = [
  {
    value: "T",
    label: "T — One deep pillar",
    description:
      "Career path emphasizes specialist depth in one primary domain.",
  },
  {
    value: "N",
    label: "N — Two pillars",
    description:
      "Progress toward dual-domain leadership across two primary areas.",
  },
  {
    value: "M",
    label: "M — Balanced breadth",
    description:
      "Progress toward multi-pillar executive or portfolio leadership.",
  },
];

const HORIZON_OPTIONS: {
  value: CareerHorizon;
  label: string;
  description: string;
}[] = [
  {
    value: "short",
    label: "1–2 years",
    description: "Near-term role moves and skill closes.",
  },
  {
    value: "medium",
    label: "3–5 years",
    description: "Mid-career progression and shape transition.",
  },
  {
    value: "long",
    label: "5+ years",
    description: "Long-range executive or principal trajectory.",
  },
];

interface CareerPathProps {
  employeeName: string;
  gapResult: SkillGapResult | null;
  targetShape: TargetShape;
  onTargetShapeChange: (shape: TargetShape) => void;
  careerHorizon: CareerHorizon;
  onCareerHorizonChange: (horizon: CareerHorizon) => void;
  careerMarkdown: string | null;
  careerLoading: boolean;
  careerError: string | null;
  onGenerate: () => void;
}

export function CareerPath({
  employeeName,
  gapResult,
  targetShape,
  onTargetShapeChange,
  careerHorizon,
  onCareerHorizonChange,
  careerMarkdown,
  careerLoading,
  careerError,
  onGenerate,
}: CareerPathProps) {
  const canGenerate = Boolean(employeeName.trim()) && !careerLoading;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <Route size={20} />
          Career path projection
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Extrapolates a career trajectory from your <strong>current skills
          matrix</strong> through planned acquisition to a future{" "}
          <strong>T, N, or M</strong> balance. The agent uses gap-ranked skills
          and projected 12 / 24 / 36-month ratings to propose role stages.
        </p>

        <p className="text-sm font-medium text-gray-800 mb-2">
          Planning horizon
        </p>
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          {HORIZON_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                careerHorizon === opt.value
                  ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="careerHorizon"
                value={opt.value}
                checked={careerHorizon === opt.value}
                onChange={() => onCareerHorizonChange(opt.value)}
                className="sr-only"
              />
              <span className="font-medium text-gray-900 block">{opt.label}</span>
              <span className="text-xs text-gray-600 mt-2 block">
                {opt.description}
              </span>
            </label>
          ))}
        </div>

        <p className="text-sm font-medium text-gray-800 mb-2">
          Future skills matrix (target shape)
        </p>
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          {SHAPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                targetShape === opt.value
                  ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="careerTargetShape"
                value={opt.value}
                checked={targetShape === opt.value}
                onChange={() => onTargetShapeChange(opt.value)}
                className="sr-only"
              />
              <span className="font-medium text-gray-900 block">{opt.label}</span>
              <span className="text-xs text-gray-600 mt-2 block">
                {opt.description}
              </span>
            </label>
          ))}
        </div>

        {gapResult ? (
          <div className="flex flex-wrap gap-2 text-sm mb-4">
            <span className="px-2 py-1 bg-gray-100 rounded">
              Employee: <strong>{gapResult.employee_name}</strong>
            </span>
            <span className="px-2 py-1 bg-blue-50 text-blue-900 rounded">
              Current: {gapResult.current_shape}
            </span>
            <span className="px-2 py-1 bg-purple-50 text-purple-900 rounded">
              Target acquisition: {targetShape}
            </span>
            <span className="px-2 py-1 bg-indigo-50 text-indigo-900 rounded">
              Horizon:{" "}
              {HORIZON_OPTIONS.find((h) => h.value === careerHorizon)?.label}
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-700 mb-4">
            Run <strong>Calculate skill gaps</strong> on Skill Input for the
            richest path, or generate from current ratings.
          </p>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 flex items-center gap-2 font-medium"
        >
          {careerLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Building career path…
            </>
          ) : (
            "Generate career path"
          )}
        </button>

        {careerError && (
          <p className="mt-3 text-sm text-red-600">{careerError}</p>
        )}
      </div>

      {careerMarkdown && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <article className="prose prose-sm max-w-none">
            {renderMarkdownSimple(careerMarkdown)}
          </article>
        </div>
      )}
    </div>
  );
}
