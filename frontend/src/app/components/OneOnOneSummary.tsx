import { type ReactNode } from "react";
import { MessageSquare, AlertCircle } from "lucide-react";
import type {
  CareerHorizon,
  EmployeeSummary,
  RoleRecommendation,
  SkillCategory,
  SkillGapResult,
  TargetShape,
} from "../../api/types";
import type { RatingMap } from "./TSkillsInput";
import { computeSkillGap } from "../../api/client";
import { renderMarkdownSimple } from "./renderMarkdownSimple";

interface OneOnOneSummaryProps {
  employeeName: string;
  employee: EmployeeSummary | undefined;
  taxonomy: SkillCategory[];
  ratings: RatingMap;
  gapResult: SkillGapResult | null;
  targetShape: TargetShape;
  careerHorizon: CareerHorizon;
  planMarkdown: string | null;
  careerMarkdown: string | null;
  roleRecommendations: RoleRecommendation[];
  rolesSummary: string | null;
}

const HORIZON_LABELS: Record<CareerHorizon, string> = {
  short: "1–2 years",
  medium: "3–5 years",
  long: "5+ years",
};

function extractMarkdownBullets(text: string, max = 5): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("* "))
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .slice(0, max);
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 italic">No data yet.</p>;
  }
  return (
    <ul className="space-y-2 text-sm text-gray-700 list-disc ml-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function OneOnOneSummary({
  employeeName,
  employee,
  taxonomy,
  ratings,
  gapResult,
  targetShape,
  careerHorizon,
  planMarkdown,
  careerMarkdown,
  roleRecommendations,
  rolesSummary,
}: OneOnOneSummaryProps) {
  const ratedSkills = taxonomy.flatMap((cat) =>
    cat.sub_skills
      .map((sub) => {
        const r = ratings[sub.id];
        if (!r) return null;
        const sponsorGap = r.value_to_sponsor - r.skill_rating;
        const mitreGap = r.value_to_mitre - r.skill_rating;
        const totalGap = computeSkillGap(
          r.skill_rating,
          r.value_to_sponsor,
          r.value_to_mitre
        );
        return {
          name: sub.name,
          category: cat.name,
          rating: r.skill_rating,
          sponsorValue: r.value_to_sponsor,
          mitreValue: r.value_to_mitre,
          sponsorGap,
          mitreGap,
          totalGap,
        };
      })
      .filter(Boolean)
  ) as {
    name: string;
    category: string;
    rating: number;
    sponsorValue: number;
    mitreValue: number;
    sponsorGap: number;
    mitreGap: number;
    totalGap: number;
  }[];

  const strengths = [...ratedSkills]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const topGaps = gapResult?.ranked_skills.slice(0, 5) ?? [];
  const topFocus = gapResult?.top_development_focus ?? [];

  const sponsorPriority = [...ratedSkills]
    .filter((s) => s.sponsorGap > 0)
    .sort((a, b) => b.sponsorGap - a.sponsorGap)
    .slice(0, 3);

  const mitrePriority = [...ratedSkills]
    .filter((s) => s.mitreGap > 0)
    .sort((a, b) => b.mitreGap - a.mitreGap)
    .slice(0, 3);

  const trainingBullets = planMarkdown
    ? extractMarkdownBullets(planMarkdown, 6)
    : [];
  const careerBullets = careerMarkdown
    ? extractMarkdownBullets(careerMarkdown, 6)
    : [];

  const topGapSkill =
    gapResult?.highest_skill_gap_sub_skill ?? "your highest-gap skill";
  const topRec = roleRecommendations[0];

  const directReportQuestions = [
    `Which of your top development areas (${topFocus.join(", ") || "from gap analysis"}) feel most urgent to you right now?`,
    `Your current T-shape is ${gapResult?.current_shape ?? "—"} — does that match how you see your strengths and depth?`,
    `For ${topGapSkill}, what would help you move from rating ${topGaps[0]?.skill_rating ?? "?"} toward sponsor value ${topGaps[0]?.value_to_sponsor ?? "?"} and MITRE value ${topGaps[0]?.value_to_mitre ?? "?"}?`,
    planMarkdown
      ? "Which training plan activities can you commit to in the next 90 days?"
      : "What learning formats (courses, mentoring, projects) work best for you?",
    careerMarkdown
      ? `Does the ${HORIZON_LABELS[careerHorizon]} career path align with your personal goals?`
      : "Where do you want your career to be in 3–5 years?",
    topRec
      ? `Would roles like "${topRec.title}" interest you as a growth path?`
      : "What internal roles or missions would stretch you in the right direction?",
  ];

  const leaderQuestions = [
    `Are sponsor priorities reflected in ${employeeName}'s current assignments, especially for ${sponsorPriority.map((s) => s.name).join(", ") || "high sponsor-value skills"}?`,
    `How can we align MITRE enterprise needs (${mitrePriority.map((s) => s.name).join(", ") || "MITRE-critical skills"}) with this role's scope?`,
    `What stretch opportunities would help move toward a target ${targetShape} shape over ${HORIZON_LABELS[careerHorizon]}?`,
    `What barriers (time, funding, access) might block closing the largest gap (${topGapSkill}, gap ${gapResult?.highest_skill_gap ?? "—"})?`,
    planMarkdown
      ? "Which training plan items can you sponsor or approve this quarter?"
      : "What budget or approval is needed to support prioritized skill development?",
    topRec
      ? `Can we create a development assignment aligned with "${topRec.title}" (${topRec.rationale.slice(0, 120)}…)?`
      : "Are there open roles or projects that match this person's gap-closing priorities?",
  ];

  const missingData: string[] = [];
  if (!gapResult) missingData.push("Calculate skill gaps (Skill Input tab)");
  if (!planMarkdown) missingData.push("Generate a training plan");
  if (!careerMarkdown) missingData.push("Generate a career path");
  if (roleRecommendations.length === 0)
    missingData.push("Generate open role recommendations");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <MessageSquare size={20} />
          1:1 Summary Discussion
        </h3>
        <p className="text-sm text-gray-600">
          Discussion framework for{" "}
          <span className="font-medium text-gray-900">
            {employeeName || "team member"}
          </span>
          {employee && (
            <>
              {" "}
              · {employee.department} · {employee.role}
            </>
          )}
          . Use this agenda to align on skills, gaps, development, and career
          direction.
        </p>
        {missingData.length > 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">Incomplete data — visit other tabs to enrich this summary: </span>
              {missingData.join(" · ")}
            </div>
          </div>
        )}
      </div>

      <SummarySection title="1. Current skill profile">
        <BulletList
          items={[
            gapResult
              ? `Current shape: ${gapResult.current_shape} — ${gapResult.shape_description}`
              : "Run gap analysis to determine T/N/M shape",
            `Broad skill categories rated: ${taxonomy.length}; sub-skills tracked: ${ratedSkills.length}`,
            ...strengths.map(
              (s) =>
                `Strength: ${s.name} (${s.category}) — self-rating ${s.rating}/5`
            ),
          ]}
        />
      </SummarySection>

      <SummarySection title="2. Gaps — sponsor and MITRE priorities">
        <p className="text-xs text-gray-500 mb-3">
          Weighted gap = 2×(sponsor value − rating) + (MITRE value − rating)
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-2">
              Top weighted gaps
            </h4>
            <BulletList
              items={topGaps.map(
                (s) =>
                  `${s.sub_skill}: total gap ${s.skill_gap} (rating ${s.skill_rating}, sponsor ${s.value_to_sponsor}, MITRE ${s.value_to_mitre})`
              )}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-2">
              Sponsor vs MITRE focus
            </h4>
            <BulletList
              items={[
                ...sponsorPriority.map(
                  (s) =>
                    `Sponsor gap: ${s.name} (+${s.sponsorGap} to sponsor target ${s.sponsorValue})`
                ),
                ...mitrePriority.map(
                  (s) =>
                    `MITRE gap: ${s.name} (+${s.mitreGap} to MITRE target ${s.mitreValue})`
                ),
              ]}
            />
          </div>
        </div>
      </SummarySection>

      <SummarySection title="3. Training plan">
        {planMarkdown ? (
          trainingBullets.length > 0 ? (
            <BulletList items={trainingBullets} />
          ) : (
            <div className="text-sm text-gray-700 prose-sm">
              {renderMarkdownSimple(planMarkdown.split("\n").slice(0, 12).join("\n"))}
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500 italic">
            Generate a training plan on the Training Plan tab (target shape:{" "}
            {targetShape}).
          </p>
        )}
      </SummarySection>

      <SummarySection title="4. Career path">
        {careerMarkdown ? (
          careerBullets.length > 0 ? (
            <BulletList
              items={[
                `Horizon: ${HORIZON_LABELS[careerHorizon]} · Target shape: ${targetShape}`,
                ...careerBullets,
              ]}
            />
          ) : (
            <div className="text-sm text-gray-700">
              <p className="mb-2">
                Horizon: {HORIZON_LABELS[careerHorizon]} · Target shape:{" "}
                {targetShape}
              </p>
              {renderMarkdownSimple(careerMarkdown.split("\n").slice(0, 12).join("\n"))}
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500 italic">
            Generate a career path on the Career Path tab.
          </p>
        )}
      </SummarySection>

      {(roleRecommendations.length > 0 || rolesSummary) && (
        <SummarySection title="5. Open roles & mobility">
          {rolesSummary && (
            <p className="text-sm text-gray-700 mb-3">{rolesSummary}</p>
          )}
          <BulletList
            items={roleRecommendations.slice(0, 3).map(
              (r) =>
                `${r.title} (fit ${Math.round(r.fit_score)}%): ${r.rationale.slice(0, 100)}${r.rationale.length > 100 ? "…" : ""}`
            )}
          />
        </SummarySection>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <SummarySection title="Questions for the direct report">
          <BulletList items={directReportQuestions} />
        </SummarySection>
        <SummarySection title="Questions for the leader">
          <BulletList items={leaderQuestions} />
        </SummarySection>
      </div>
    </div>
  );
}
