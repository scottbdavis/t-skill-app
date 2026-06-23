interface Skill {
  id: string;
  name: string;
  level: number;
}

interface DeepSkill extends Skill {
  parentId: string;
}

interface TSkillMatrixProps {
  horizontalSkills: Skill[];
  verticalSkills: DeepSkill[];
}

export function TSkillMatrix({ horizontalSkills, verticalSkills }: TSkillMatrixProps) {
  const getLevelColor = (level: number) => {
    switch (level) {
      case 5: return 'bg-green-600 text-white';
      case 4: return 'bg-green-400 text-white';
      case 3: return 'bg-yellow-400 text-gray-900';
      case 2: return 'bg-orange-400 text-white';
      case 1: return 'bg-red-400 text-white';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 5: return 'Expert';
      case 4: return 'Advanced';
      case 3: return 'Intermediate';
      case 2: return 'Beginner';
      case 1: return 'Novice';
      default: return 'Unrated';
    }
  };

  const maxDeepSkills = Math.max(
    ...horizontalSkills.map(h => verticalSkills.filter(v => v.parentId === h.id).length),
    0
  );

  if (horizontalSkills.length === 0) {
    return (
      <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Add broad skills and deep skills to see your T-Skill Matrix</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">T-Skill Matrix</h3>
          <p className="text-sm text-gray-600 mt-1">Visualization of your broad and deep skills</p>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span>Novice</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-400 rounded"></div>
            <span>Beginner</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span>Intermediate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span>Advanced</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span>Expert</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-2 min-w-full">
          {/* Horizontal Skills Row */}
          <div className="flex gap-2">
            {horizontalSkills.map(skill => (
              <div
                key={skill.id}
                className={`flex-1 min-w-[140px] p-4 rounded-lg ${getLevelColor(skill.level)} flex flex-col items-center justify-center`}
              >
                <div className="font-semibold text-center text-sm">{skill.name}</div>
                <div className="text-xs mt-1 opacity-90">{getLevelLabel(skill.level)}</div>
              </div>
            ))}
          </div>

          {/* Deep Skills Rows */}
          {maxDeepSkills > 0 && (
            <div className="flex gap-2">
              {horizontalSkills.map(hSkill => {
                const deepSkills = verticalSkills.filter(v => v.parentId === hSkill.id);
                return (
                  <div key={hSkill.id} className="flex-1 min-w-[140px] flex flex-col gap-2">
                    {deepSkills.map((dSkill, index) => (
                      <div
                        key={dSkill.id}
                        className={`p-3 rounded-lg ${getLevelColor(dSkill.level)} text-center`}
                      >
                        <div className="font-medium text-sm">{dSkill.name}</div>
                        <div className="text-xs mt-1 opacity-90">{getLevelLabel(dSkill.level)}</div>
                      </div>
                    ))}
                    {/* Fill empty spaces to maintain alignment */}
                    {Array.from({ length: maxDeepSkills - deepSkills.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-3 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 text-center">
                        <div className="text-xs text-gray-400">No skill</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{horizontalSkills.length}</div>
          <div className="text-sm text-gray-600">Broad Skills</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{verticalSkills.length}</div>
          <div className="text-sm text-gray-600">Deep Skills</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {(horizontalSkills.reduce((sum, s) => sum + s.level, 0) / horizontalSkills.length || 0).toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg Broad Level</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {(verticalSkills.reduce((sum, s) => sum + s.level, 0) / verticalSkills.length || 0).toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg Deep Level</div>
        </div>
      </div>
    </div>
  );
}
