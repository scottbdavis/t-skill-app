import { AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SkillGap {
  skill: string;
  current: number;
  desired: number;
  valueToMitre?: number;
  skillGap?: number;
  totalScore?: number;
  rank?: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  requiredBy: string[];
}

interface GapAnalysisProps {
  gaps: SkillGap[];
  shapeLabel?: string;
  highestSkillGap?: number;
  highestSkillGapSubSkill?: string;
}

export function GapAnalysis({
  gaps,
  shapeLabel,
  highestSkillGap,
  highestSkillGapSubSkill,
}: GapAnalysisProps) {
  const sortedGaps = [...gaps].sort((a, b) => b.gap - a.gap);
  const topGaps = sortedGaps.slice(0, 10);

  const chartData = topGaps.map((gap, idx) => ({
    skill: gap.skill.length > 15 ? gap.skill.substring(0, 15) + '...' : gap.skill,
    skillRating: gap.current,
    valueToSponsor: gap.desired,
    skillGap: gap.skillGap ?? gap.gap,
    uniqueKey: `gap-${idx}-${gap.skill}`,
  }));

  const maxGap = Math.max(...sortedGaps.map((g) => g.skillGap ?? g.gap), 1);

  const getGapColor = (gapValue: number) => {
    if (gapValue >= 6) return '#ef4444';
    if (gapValue >= 3) return '#f59e0b';
    return '#10b981';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {highestSkillGap != null && highestSkillGapSubSkill && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-900">
            <span className="font-semibold">Highest overall skill gap: {highestSkillGap}</span>
            {' — '}
            {highestSkillGapSubSkill}
            {' '}
            <span className="text-orange-700">
              (2× sponsor gap + MITRE gap)
            </span>
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-orange-500" size={20} />
          <h3 className="font-semibold text-gray-900">
            Ranked by weighted skill gap (2× sponsor + MITRE)
            {shapeLabel ? ` — Shape: ${shapeLabel}` : ''}
          </h3>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="skill"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11 }}
            />
            <YAxis domain={[0, maxGap]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="skillRating" fill="#60a5fa" name="Skill rating" />
            <Bar dataKey="valueToSponsor" fill="#34d399" name="Value to sponsor" />
            <Bar dataKey="skillGap" fill="#f97316" name="Skill gap" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-900">Detailed gap analysis</h3>
        <div className="space-y-3">
          {sortedGaps.map((gap, index) => {
            const gapValue = gap.skillGap ?? gap.gap;
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{gap.skill}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadge(gap.priority)}`}>
                        {gap.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>Value to sponsor: {gap.desired}/5</span>
                      {gap.valueToMitre != null && (
                        <span>Value to MITRE: {gap.valueToMitre}/5</span>
                      )}
                      <span>Skill rating: {gap.current}/5</span>
                      <span className="font-semibold text-orange-700">
                        Gap: {gapValue}
                      </span>
                      {gap.rank != null && (
                        <span className="text-gray-400">Rank #{gap.rank}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (gapValue / maxGap) * 100)}%`,
                        backgroundColor: getGapColor(gapValue),
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                    {gap.requiredBy.map((req, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

