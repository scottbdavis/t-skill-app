import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  level: number;
}

interface DeepSkill extends Skill {
  parentId: string;
}

interface TSkillsInputProps {
  onSkillsChange: (horizontal: Skill[], vertical: DeepSkill[]) => void;
  initialHorizontal?: Skill[];
  initialVertical?: DeepSkill[];
}

export function TSkillsInput({ onSkillsChange, initialHorizontal = [], initialVertical = [] }: TSkillsInputProps) {
  const [horizontalSkills, setHorizontalSkills] = useState<Skill[]>(initialHorizontal);
  const [verticalSkills, setVerticalSkills] = useState<DeepSkill[]>(initialVertical);
  const [newHSkill, setNewHSkill] = useState('');
  const [newVSkill, setNewVSkill] = useState('');
  const [selectedParent, setSelectedParent] = useState<string>('');

  const addHorizontalSkill = () => {
    if (newHSkill.trim()) {
      const skill: Skill = {
        id: Date.now().toString(),
        name: newHSkill.trim(),
        level: 3
      };
      const updated = [...horizontalSkills, skill];
      setHorizontalSkills(updated);
      onSkillsChange(updated, verticalSkills);
      setNewHSkill('');
    }
  };

  const addVerticalSkill = () => {
    if (newVSkill.trim() && selectedParent) {
      const skill: DeepSkill = {
        id: Date.now().toString(),
        name: newVSkill.trim(),
        level: 3,
        parentId: selectedParent
      };
      const updated = [...verticalSkills, skill];
      setVerticalSkills(updated);
      onSkillsChange(horizontalSkills, updated);
      setNewVSkill('');
    }
  };

  const removeSkill = (id: string, type: 'horizontal' | 'vertical') => {
    if (type === 'horizontal') {
      const updated = horizontalSkills.filter(s => s.id !== id);
      setHorizontalSkills(updated);
      onSkillsChange(updated, verticalSkills);
    } else {
      const updated = verticalSkills.filter(s => s.id !== id);
      setVerticalSkills(updated);
      onSkillsChange(horizontalSkills, updated);
    }
  };

  const updateLevel = (id: string, level: number, type: 'horizontal' | 'vertical') => {
    if (type === 'horizontal') {
      const updated = horizontalSkills.map(s => s.id === id ? { ...s, level } : s);
      setHorizontalSkills(updated);
      onSkillsChange(updated, verticalSkills);
    } else {
      const updated = verticalSkills.map(s => s.id === id ? { ...s, level } : s);
      setVerticalSkills(updated);
      onSkillsChange(horizontalSkills, updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-900">Broad Skills (Horizontal)</h3>
        <p className="text-sm text-gray-600 mb-4">Your primary skill sets and general competencies</p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newHSkill}
            onChange={(e) => setNewHSkill(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addHorizontalSkill()}
            placeholder="e.g., Data Science, Cloud Computing"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addHorizontalSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        <div className="space-y-3">
          {horizontalSkills.map(skill => {
            const deepSkillCount = verticalSkills.filter(v => v.parentId === skill.id).length;
            return (
              <div key={skill.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-1 font-medium text-gray-900">{skill.name}</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={skill.level}
                    onChange={(e) => updateLevel(skill.id, parseInt(e.target.value), 'horizontal')}
                    className="w-32"
                  />
                  <span className="w-8 text-center text-sm text-gray-600">{skill.level}/5</span>
                  <button
                    onClick={() => removeSkill(skill.id, 'horizontal')}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                {deepSkillCount > 0 && (
                  <div className="text-xs text-gray-500 pl-3">
                    {deepSkillCount} deep skill{deepSkillCount !== 1 ? 's' : ''} linked
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-900">Deep Skills (Vertical)</h3>
        <p className="text-sm text-gray-600 mb-4">Your specialized expertise and sub-skills under each broad skill</p>

        {horizontalSkills.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            Add at least one broad skill first to organize your deep skills
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <select
                value={selectedParent}
                onChange={(e) => setSelectedParent(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Select broad skill...</option>
                {horizontalSkills.map(skill => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newVSkill}
                onChange={(e) => setNewVSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addVerticalSkill()}
                placeholder="e.g., Machine Learning, Python, SQL"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!selectedParent}
              />
              <button
                onClick={addVerticalSkill}
                disabled={!selectedParent || !newVSkill.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            <div className="space-y-3">
              {verticalSkills.map(skill => {
                const parent = horizontalSkills.find(h => h.id === skill.parentId);
                return (
                  <div key={skill.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{skill.name}</div>
                      <div className="text-xs text-gray-500">under {parent?.name || 'Unknown'}</div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={skill.level}
                      onChange={(e) => updateLevel(skill.id, parseInt(e.target.value), 'vertical')}
                      className="w-32"
                    />
                    <span className="w-8 text-center text-sm text-gray-600">{skill.level}/5</span>
                    <button
                      onClick={() => removeSkill(skill.id, 'vertical')}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
