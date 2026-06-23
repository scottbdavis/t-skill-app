import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Skill {
  id: string;
  name: string;
  level: number;
}

interface DeepSkill extends Skill {
  parentId: string;
}

interface TSkillsChartProps {
  horizontalSkills: Skill[];
  verticalSkills: DeepSkill[];
}

export function TSkillsChart({ horizontalSkills, verticalSkills }: TSkillsChartProps) {
  const allSkills = [
    ...horizontalSkills.map((s, idx) => ({ ...s, type: 'Broad', uniqueKey: `h-${s.id}-${idx}` })),
    ...verticalSkills.map((s, idx) => ({ ...s, type: 'Deep', uniqueKey: `v-${s.id}-${idx}` }))
  ];

  const radarData = allSkills.slice(0, 8).map((skill, idx) => ({
    skill: skill.name.length > 20 ? skill.name.substring(0, 20) + '...' : skill.name,
    level: skill.level,
    fullMark: 5,
    uniqueKey: `radar-${idx}-${skill.name}`
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-900">T-Skills Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={allSkills}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="level" fill="#3b82f6" name="Skill Level" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {allSkills.length >= 3 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold mb-4 text-gray-900">Skills Radar</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 5]} />
              <Radar name="Current Level" dataKey="level" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
