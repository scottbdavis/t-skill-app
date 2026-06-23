import { Loader2, Target } from "lucide-react";
import type { SkillGapResult, TargetShape } from "../../api/types";
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
      "After the largest gap, deepen sub-skills in one primary category; maintain others lightly.",
  },
  {
    value: "N",
    label: "N — Two pillars",
    description:
      "Build depth in two primary categories while closing gaps in both verticals.",
  },
  {
    value: "M",
    label: "M — Balanced breadth",
    description:
      "Balance skill scores across all primary categories; raise weakest broad areas evenly.",
  },
];

interface TrainingPlanProps {
  employeeName: string;
  gapResult: SkillGapResult | null;
  targetShape: TargetShape;
  onTargetShapeChange: (shape: TargetShape) => void;
  planMarkdown: string | null;
  planLoading: boolean;
  planError: string | null;
  onGenerate: () => void;
}

export function TrainingPlan({
  employeeName,
  gapResult,
  targetShape,
  onTargetShapeChange,
  planMarkdown,
  planLoading,
  planError,
  onGenerate,
}: TrainingPlanProps) {
  const canGenerate = Boolean(employeeName.trim()) && !planLoading;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <Target size={20} />
          Training plan emphasis
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the T, N, or M balance you want the matrix to move toward. The
          agent starts with your{" "}
          <strong>largest skill gap</strong>, then sequences sub-skill work to
          match this shape.
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
                name="targetShape"
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
            <span className="px-2 py-1 bg-orange-50 text-orange-900 rounded">
              Largest gap: {gapResult.highest_skill_gap} (
              {gapResult.highest_skill_gap_sub_skill})
            </span>
            <span className="px-2 py-1 bg-blue-50 text-blue-900 rounded">
              Current shape: {gapResult.current_shape}
            </span>
            <span className="px-2 py-1 bg-purple-50 text-purple-900 rounded">
              Target: {targetShape}
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-700 mb-4">
            Run <strong>Calculate skill gaps</strong> on the Skill Input tab first
            for the best plan, or generate from current ratings below.
          </p>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2 font-medium"
        >
          {planLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating plan…
            </>
          ) : (
            "Generate training plan"
          )}
        </button>

        {planError && (
          <p className="mt-3 text-sm text-red-600">{planError}</p>
        )}
      </div>

      {planMarkdown && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <article className="prose prose-sm max-w-none">
            {renderMarkdownSimple(planMarkdown)}
          </article>
        </div>
      )}
    </div>
  );
}
