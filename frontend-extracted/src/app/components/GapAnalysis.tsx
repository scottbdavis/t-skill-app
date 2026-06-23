import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface SkillGap {
  skill: string;
  current: number;
  desired: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  requiredBy: string[];
}

interface GapAnalysisProps {
  gaps: SkillGap[];
}

export function GapAnalysis({ gaps }: GapAnalysisProps) {
  const sortedGaps = [...gaps].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const topGaps = sortedGaps.slice(0, 10);

  const chartData = topGaps.map((gap, idx) => ({
    skill: gap.skill.length > 15 ? gap.skill.substring(0, 15) + '...' : gap.skill,
    current: gap.current,
    desired: gap.desired,
    gap: Math.abs(gap.gap),
    uniqueKey: `gap-${idx}-${gap.skill}`
  }));

  const getGapColor = (gap: number) => {
    if (Math.abs(gap) >= 2) return '#ef4444';
    if (Math.abs(gap) >= 1) return '#f59e0b';
    return '#10b981';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-orange-500" size={20} />
          <h3 className="font-semibold text-gray-900">Top Skill Gaps</h3>
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
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="current" fill="#60a5fa" name="Current Level" />
            <Bar dataKey="desired" fill="#34d399" name="Desired Level" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-900">Detailed Gap Analysis</h3>
        <div className="space-y-3">
          {sortedGaps.map((gap, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{gap.skill}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBadge(gap.priority)}`}>
                      {gap.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Current: {gap.current}/5</span>
                    <span>→</span>
                    <span>Desired: {gap.desired}/5</span>
                    <span className="flex items-center gap-1" style={{ color: getGapColor(gap.gap) }}>
                      {gap.gap > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      Gap: {Math.abs(gap.gap).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(gap.current / 5) * 100}%`,
                      backgroundColor: getGapColor(gap.gap)
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                  <span>Required by:</span>
                  {gap.requiredBy.map((req, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded">
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
