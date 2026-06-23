import { useState, useEffect } from 'react';
import { TSkillsInput } from './components/TSkillsInput';
import { TSkillsChart } from './components/TSkillsChart';
import { TSkillMatrix } from './components/TSkillMatrix';
import { GapAnalysis } from './components/GapAnalysis';
import { OrganizationalComparison } from './components/OrganizationalComparison';
import { BarChart3, Users, TrendingUp, Building2, Grid3x3 } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  level: number;
}

interface DeepSkill extends Skill {
  parentId: string;
}

interface SkillGap {
  skill: string;
  current: number;
  desired: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  requiredBy: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'matrix' | 'visualization' | 'gaps' | 'comparison'>('input');
  const [horizontalSkills, setHorizontalSkills] = useState<Skill[]>([
    { id: '1', name: 'Data Science', level: 4 },
    { id: '2', name: 'Cloud Computing', level: 3 },
    { id: '3', name: 'Leadership', level: 4 }
  ]);
  const [verticalSkills, setVerticalSkills] = useState<DeepSkill[]>([
    { id: '4', name: 'Machine Learning', level: 4, parentId: '1' },
    { id: '5', name: 'Python', level: 5, parentId: '1' },
    { id: '6', name: 'SQL', level: 3, parentId: '1' },
    { id: '7', name: 'AWS', level: 3, parentId: '2' },
    { id: '8', name: 'Docker', level: 4, parentId: '2' },
    { id: '9', name: 'Team Management', level: 4, parentId: '3' }
  ]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);

  const mockOrganizationalData = {
    corporate: {
      name: 'Corporate',
      skills: {
        'Project Management': 4,
        'Strategic Planning': 5,
        'Leadership': 5,
        'Data Analysis': 4,
        'Machine Learning': 4,
        'Cloud Architecture': 5
      },
      objectives: [
        'Digital transformation by Q4 2026',
        'AI adoption across all divisions',
        'Customer satisfaction >90%'
      ]
    },
    division: {
      name: 'Division',
      skills: {
        'Project Management': 4,
        'Data Analysis': 5,
        'Machine Learning': 5,
        'Python': 4,
        'Agile Methodologies': 4
      },
      objectives: [
        'Launch 3 AI-powered products',
        'Reduce time-to-market by 30%',
        'Build ML team of 20+ engineers'
      ]
    },
    department: {
      name: 'Department',
      skills: {
        'Machine Learning': 5,
        'Python': 5,
        'SQL': 4,
        'Data Analysis': 5,
        'Cloud Architecture': 4
      },
      objectives: [
        'Deploy ML models in production',
        'Improve model accuracy to 95%',
        'Automate data pipelines'
      ]
    },
    team: {
      name: 'Team',
      skills: {
        'Python': 5,
        'Machine Learning': 4,
        'SQL': 4,
        'Communication': 4,
        'Collaboration': 5
      },
      objectives: [
        'Complete customer churn model',
        'Optimize inference latency',
        'Document ML best practices'
      ]
    },
    customer: {
      name: 'Customer',
      skills: {
        'Machine Learning': 5,
        'Real-time Analytics': 5,
        'API Design': 4,
        'Python': 4,
        'Cloud Architecture': 5
      },
      objectives: [
        'Real-time recommendations',
        '99.9% uptime SLA',
        'Sub-100ms response time'
      ]
    }
  };

  useEffect(() => {
    const allSkills = [...horizontalSkills, ...verticalSkills];
    const userSkillMap = allSkills.reduce((acc, skill) => {
      acc[skill.name] = skill.level;
      return acc;
    }, {} as { [key: string]: number });

    const allDesiredSkills = new Map<string, { desired: number; requiredBy: Set<string> }>();

    Object.entries(mockOrganizationalData).forEach(([levelName, levelData]) => {
      Object.entries(levelData.skills).forEach(([skillName, desiredLevel]) => {
        if (!allDesiredSkills.has(skillName)) {
          allDesiredSkills.set(skillName, { desired: desiredLevel, requiredBy: new Set() });
        } else {
          const existing = allDesiredSkills.get(skillName)!;
          existing.desired = Math.max(existing.desired, desiredLevel);
        }
        allDesiredSkills.get(skillName)!.requiredBy.add(levelData.name);
      });
    });

    const gaps: SkillGap[] = [];
    allDesiredSkills.forEach((value, skillName) => {
      const current = userSkillMap[skillName] || 0;
      const gap = value.desired - current;

      if (gap !== 0) {
        let priority: 'high' | 'medium' | 'low' = 'low';
        if (Math.abs(gap) >= 2) priority = 'high';
        else if (Math.abs(gap) >= 1) priority = 'medium';

        gaps.push({
          skill: skillName,
          current,
          desired: value.desired,
          gap,
          priority,
          requiredBy: Array.from(value.requiredBy)
        });
      }
    });

    setSkillGaps(gaps);
  }, [horizontalSkills, verticalSkills]);

  const handleSkillsChange = (horizontal: Skill[], vertical: Skill[]) => {
    setHorizontalSkills(horizontal);
    setVerticalSkills(vertical);
  };

  const userSkillsMap = [...horizontalSkills, ...verticalSkills].reduce((acc, skill) => {
    acc[skill.name] = skill.level;
    return acc;
  }, {} as { [key: string]: number });

  const tabs = [
    { id: 'input' as const, label: 'Skill Input', icon: Users },
    { id: 'matrix' as const, label: 'T-Matrix View', icon: Grid3x3 },
    { id: 'visualization' as const, label: 'Charts', icon: BarChart3 },
    { id: 'gaps' as const, label: 'Gap Analysis', icon: TrendingUp },
    { id: 'comparison' as const, label: 'Org Comparison', icon: Building2 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-gray-900">T-Skills Assessment & Gap Analysis</h1>
          <p className="text-sm text-gray-600 mt-1">
            Analyze your skills, identify gaps, and align with organizational objectives
          </p>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
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
        {activeTab === 'input' && (
          <TSkillsInput
            onSkillsChange={handleSkillsChange}
            initialHorizontal={horizontalSkills}
            initialVertical={verticalSkills}
          />
        )}

        {activeTab === 'matrix' && (
          <TSkillMatrix
            horizontalSkills={horizontalSkills}
            verticalSkills={verticalSkills}
          />
        )}

        {activeTab === 'visualization' && (
          <TSkillsChart
            horizontalSkills={horizontalSkills}
            verticalSkills={verticalSkills}
          />
        )}

        {activeTab === 'gaps' && (
          <GapAnalysis gaps={skillGaps} />
        )}

        {activeTab === 'comparison' && (
          <OrganizationalComparison
            userSkills={userSkillsMap}
            levels={mockOrganizationalData}
          />
        )}
      </main>
    </div>
  );
}
