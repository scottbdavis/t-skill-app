import { Building2, Users, Target, UserCircle2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface OrgLevel {
  name: string;
  skills: { [key: string]: number };
  objectives: string[];
}

interface OrganizationalComparisonProps {
  userSkills: { [key: string]: number };
  levels: {
    corporate: OrgLevel;
    division: OrgLevel;
    department: OrgLevel;
    team: OrgLevel;
    customer: OrgLevel;
  };
}

export function OrganizationalComparison({ userSkills, levels }: OrganizationalComparisonProps) {
  const allSkillNames = new Set<string>();
  Object.keys(userSkills).forEach(skill => allSkillNames.add(skill));
  Object.values(levels).forEach(level => {
    Object.keys(level.skills).forEach(skill => allSkillNames.add(skill));
  });

  const radarData = Array.from(allSkillNames).slice(0, 8).map((skillName, idx) => ({
    skill: skillName.length > 20 ? skillName.substring(0, 20) + '...' : skillName,
    user: userSkills[skillName] || 0,
    corporate: levels.corporate.skills[skillName] || 0,
    division: levels.division.skills[skillName] || 0,
    department: levels.department.skills[skillName] || 0,
    team: levels.team.skills[skillName] || 0,
    uniqueKey: `org-${idx}-${skillName}`
  }));

  const levelCards = [
    { key: 'corporate', icon: Building2, color: 'blue', data: levels.corporate },
    { key: 'division', icon: Users, color: 'purple', data: levels.division },
    { key: 'department', icon: Target, color: 'green', data: levels.department },
    { key: 'team', icon: UserCircle2, color: 'orange', data: levels.team },
    { key: 'customer', icon: Target, color: 'pink', data: levels.customer }
  ];

  const colorMap: { [key: string]: string } = {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    green: '#10b981',
    orange: '#f59e0b',
    pink: '#ec4899'
  };

  const calculateAlignment = (userSkills: { [key: string]: number }, levelSkills: { [key: string]: number }) => {
    const commonSkills = Object.keys(userSkills).filter(skill => levelSkills[skill]);
    if (commonSkills.length === 0) return 0;

    const totalDiff = commonSkills.reduce((sum, skill) => {
      return sum + Math.abs(userSkills[skill] - levelSkills[skill]);
    }, 0);

    const maxPossibleDiff = commonSkills.length * 5;
    return Math.round(((maxPossibleDiff - totalDiff) / maxPossibleDiff) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-900">Skills Alignment Across Organization</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} />
            <Radar name="You" dataKey="user" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Radar name="Corporate" dataKey="corporate" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            <Radar name="Division" dataKey="division" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            <Radar name="Department" dataKey="department" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            <Radar name="Team" dataKey="team" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levelCards.map(({ key, icon: Icon, color, data }) => {
          const alignment = calculateAlignment(userSkills, data.skills);
          return (
            <div key={key} className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-${color}-100`}>
                  <Icon size={20} style={{ color: colorMap[color] }} />
                </div>
                <h4 className="font-medium text-gray-900 capitalize">{data.name}</h4>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Alignment</span>
                  <span className="font-medium" style={{ color: colorMap[color] }}>{alignment}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${alignment}%`,
                      backgroundColor: colorMap[color]
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">Key Objectives:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {data.objectives.slice(0, 3).map((obj, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
