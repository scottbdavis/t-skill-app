import type { EmployeeSummary, SkillCategory } from "../../api/types";
import {
  computeSkillGap,
  createCategory,
  createEmployee,
  createSubSkill,
  deleteCategory,
  deleteSubSkill,
  reorderCategories,
} from "../../api/client";
import { GripVertical, Loader2, Plus, Search, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";

export interface RatingMap {
  [subSkillId: number]: {
    skill_rating: number;
    value_to_sponsor: number;
    value_to_mitre: number;
  };
}

interface TSkillsInputProps {
  taxonomy: SkillCategory[];
  employees: EmployeeSummary[];
  employeesLoading?: boolean;
  employeeName: string;
  onEmployeeSelect: (name: string) => void;
  ratings: RatingMap;
  onRatingChange: (
    subSkillId: number,
    field: "skill_rating" | "value_to_sponsor" | "value_to_mitre",
    value: number
  ) => void;
  onCalculate: () => void;
  onLoadEmployee: () => void;
  onTaxonomyChange: () => Promise<void>;
  onReloadEmployees: () => Promise<void>;
  onEmployeeCreated: (name: string) => void;
  loading?: boolean;
  loadError?: string | null;
}

export function TSkillsInput({
  taxonomy,
  employees,
  employeesLoading = false,
  employeeName,
  onEmployeeSelect,
  ratings,
  onRatingChange,
  onCalculate,
  onLoadEmployee,
  onTaxonomyChange,
  onReloadEmployees,
  onEmployeeCreated,
  loading = false,
  loadError = null,
}: TSkillsInputProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubSkillByCategory, setNewSubSkillByCategory] = useState<
    Record<number, string>
  >({});
  const [taxonomyBusy, setTaxonomyBusy] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonDepartment, setNewPersonDepartment] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("");
  const [employeeBusy, setEmployeeBusy] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [orderedCategories, setOrderedCategories] =
    useState<SkillCategory[]>(taxonomy);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  useEffect(() => {
    setOrderedCategories(taxonomy);
  }, [taxonomy]);

  const ratedCount = Object.keys(ratings).filter(
    (id) =>
      ratings[Number(id)]?.skill_rating > 0 &&
      ratings[Number(id)]?.value_to_sponsor > 0 &&
      ratings[Number(id)]?.value_to_mitre > 0
  ).length;

  const busy = loading || taxonomyBusy || employeesLoading || employeeBusy;
  const selectedEmployee = employees.find((e) => e.name === employeeName);

  const runTaxonomyAction = async (action: () => Promise<void>) => {
    setTaxonomyBusy(true);
    setTaxonomyError(null);
    try {
      await action();
      await onTaxonomyChange();
    } catch (e) {
      setTaxonomyError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setTaxonomyBusy(false);
    }
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    void runTaxonomyAction(async () => {
      await createCategory(name);
      setNewCategoryName("");
    });
  };

  const handleDeleteCategory = (categoryId: number, categoryName: string) => {
    if (
      !window.confirm(
        `Delete category "${categoryName}" and all its sub-skills?`
      )
    ) {
      return;
    }
    void runTaxonomyAction(async () => {
      await deleteCategory(categoryId);
    });
  };

  const handleAddSubSkill = (categoryId: number) => {
    const name = (newSubSkillByCategory[categoryId] ?? "").trim();
    if (!name) return;
    void runTaxonomyAction(async () => {
      await createSubSkill(categoryId, name);
      setNewSubSkillByCategory((prev) => ({ ...prev, [categoryId]: "" }));
    });
  };

  const handleDeleteSubSkill = (subSkillId: number, subSkillName: string) => {
    if (!window.confirm(`Delete sub-skill "${subSkillName}"?`)) return;
    void runTaxonomyAction(async () => {
      await deleteSubSkill(subSkillId);
    });
  };

  const reorderCategoryList = (from: number, to: number) => {
    if (from === to) return orderedCategories;
    const next = [...orderedCategories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const persistCategoryOrder = async (next: SkillCategory[]) => {
    const previous = orderedCategories;
    setOrderedCategories(next);
    setTaxonomyBusy(true);
    setTaxonomyError(null);
    try {
      await reorderCategories(next.map((cat) => cat.id));
      await onTaxonomyChange();
    } catch (e) {
      setOrderedCategories(previous);
      setTaxonomyError(
        e instanceof Error ? e.message : "Could not save category order"
      );
    } finally {
      setTaxonomyBusy(false);
    }
  };

  const handleCategoryDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    void persistCategoryOrder(reorderCategoryList(dragIndex, toIndex));
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleAddEmployee = async () => {
    const name = newPersonName.trim();
    const department = newPersonDepartment.trim();
    const role = newPersonRole.trim();
    if (!name || !department || !role) return;

    setEmployeeBusy(true);
    setEmployeeError(null);
    try {
      const skills = orderedCategories.flatMap((cat) =>
        cat.sub_skills.map((sub) => {
          const r = ratings[sub.id] ?? {
            skill_rating: 3,
            value_to_sponsor: 3,
            value_to_mitre: 3,
          };
          return {
            sub_skill_id: sub.id,
            skill_rating: r.skill_rating,
            value_to_sponsor: r.value_to_sponsor,
            value_to_mitre: r.value_to_mitre,
          };
        })
      );

      await createEmployee({ name, department, role, skills });
      await onReloadEmployees();
      onEmployeeCreated(name);
      setNewPersonName("");
      setNewPersonDepartment("");
      setNewPersonRole("");
    } catch (e) {
      setEmployeeError(e instanceof Error ? e.message : "Could not add team member");
    } finally {
      setEmployeeBusy(false);
    }
  };

  const canAddEmployee =
    newPersonName.trim() &&
    newPersonDepartment.trim() &&
    newPersonRole.trim() &&
    !busy;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold mb-1 text-gray-900 flex items-center gap-2">
          <User size={20} />
          Team member
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Select a direct report or group member to load their HR skill profile.
        </p>
        <div className="flex flex-wrap gap-2 items-stretch">
          <select
            value={employeeName}
            onChange={(e) => onEmployeeSelect(e.target.value)}
            disabled={busy || employees.length === 0}
            className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          >
            {employeesLoading ? (
              <option value="">Loading team members…</option>
            ) : employees.length === 0 ? (
              <option value="">No employees in database</option>
            ) : (
              <>
                <option value="" disabled>
                  Select team member…
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} — {emp.department}, {emp.role}
                  </option>
                ))}
              </>
            )}
          </select>
          <button
            type="button"
            onClick={onLoadEmployee}
            disabled={!employeeName.trim() || busy}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            <Search size={16} />
            Reload from HR
          </button>
        </div>
        {selectedEmployee && (
          <p className="mt-3 text-sm text-gray-600">
            Reviewing{" "}
            <span className="font-medium text-gray-900">
              {selectedEmployee.name}
            </span>{" "}
            · {selectedEmployee.department} · {selectedEmployee.role}
          </p>
        )}
        {!employeesLoading && employees.length === 0 && (
          <p className="mt-2 text-sm text-amber-700">
            No team members yet — add someone below to begin a T-skill assessment.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            Add new team member
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Creates a new person in the database with the current skill ratings
            on this page. They will appear in the dropdown for future reviews.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Full name"
              disabled={busy}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newPersonDepartment}
              onChange={(e) => setNewPersonDepartment(e.target.value)}
              placeholder="Department"
              disabled={busy}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newPersonRole}
              onChange={(e) => setNewPersonRole(e.target.value)}
              placeholder="Role / title"
              disabled={busy}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAddEmployee()}
            disabled={!canAddEmployee}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-300"
          >
            <Plus size={16} />
            Add team member
          </button>
        </div>

        {(loadError || taxonomyError || employeeError) && (
          <p className="mt-2 text-sm text-red-600">
            {loadError ?? employeeError ?? taxonomyError}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-1">Skill taxonomy</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add or remove categories (broad skills) and sub-skills (deep skills).
          Drag the grab bar on each primary skill section to set priority order.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            placeholder="New category name, e.g. Data Science"
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={busy}
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={busy || !newCategoryName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-300"
          >
            <Plus size={16} />
            Add category
          </button>
        </div>
      </div>

      {orderedCategories.map((category, index) => (
        <div
          key={category.id}
          onDragOver={(e) => {
            e.preventDefault();
            setDropIndex(index);
          }}
          onDragLeave={() => setDropIndex(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleCategoryDrop(index);
          }}
          className={`bg-white rounded-lg p-6 shadow-sm border transition-colors ${
            dropIndex === index && dragIndex !== null
              ? "border-blue-400 ring-2 ring-blue-100"
              : "border-gray-200"
          } ${dragIndex === index ? "opacity-60" : ""}`}
        >
          <div className="flex items-start gap-3 mb-4">
            <button
              type="button"
              draggable={!busy}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              disabled={busy}
              className="mt-0.5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing disabled:opacity-50 disabled:cursor-not-allowed"
              title="Drag to reorder primary skills"
              aria-label={`Reorder ${category.name}`}
            >
              <GripVertical size={20} />
            </button>
            <div className="flex-1 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Rate each sub-skill (1–5), its value to your sponsor (1–5), and
                  its value to MITRE (1–5)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteCategory(category.id, category.name)}
                disabled={busy}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                title="Delete category"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={newSubSkillByCategory[category.id] ?? ""}
              onChange={(e) =>
                setNewSubSkillByCategory((prev) => ({
                  ...prev,
                  [category.id]: e.target.value,
                }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" && handleAddSubSkill(category.id)
              }
              placeholder="New sub-skill name"
              className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => handleAddSubSkill(category.id)}
              disabled={busy || !(newSubSkillByCategory[category.id] ?? "").trim()}
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-1 text-sm disabled:bg-gray-300"
            >
              <Plus size={14} />
              Add sub-skill
            </button>
          </div>

          {category.sub_skills.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No sub-skills yet — add one above.
            </p>
          ) : (
            <div className="space-y-4">
              {category.sub_skills.map((sub) => {
                const r = ratings[sub.id] ?? {
                  skill_rating: 3,
                  value_to_sponsor: 3,
                  value_to_mitre: 3,
                };
                const skillGap = computeSkillGap(
                  r.skill_rating,
                  r.value_to_sponsor,
                  r.value_to_mitre
                );
                const sponsorGap = r.value_to_sponsor - r.skill_rating;
                const mitreGap = r.value_to_mitre - r.skill_rating;
                return (
                  <div
                    key={sub.id}
                    className="border border-gray-100 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-gray-900">{sub.name}</p>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteSubSkill(sub.id, sub.name)
                        }
                        disabled={busy}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                        title="Delete sub-skill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <label className="block">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          Your skill rating
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            value={r.skill_rating}
                            onChange={(e) =>
                              onRatingChange(
                                sub.id,
                                "skill_rating",
                                Number(e.target.value)
                              )
                            }
                            className="flex-1"
                          />
                          <span className="w-10 text-sm text-gray-600">
                            {r.skill_rating}/5
                          </span>
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          Value to sponsor
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            value={r.value_to_sponsor}
                            onChange={(e) =>
                              onRatingChange(
                                sub.id,
                                "value_to_sponsor",
                                Number(e.target.value)
                              )
                            }
                            className="flex-1"
                          />
                          <span className="w-10 text-sm text-gray-600">
                            {r.value_to_sponsor}/5
                          </span>
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          Value to MITRE
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            value={r.value_to_mitre}
                            onChange={(e) =>
                              onRatingChange(
                                sub.id,
                                "value_to_mitre",
                                Number(e.target.value)
                              )
                            }
                            className="flex-1"
                          />
                          <span className="w-10 text-sm text-gray-600">
                            {r.value_to_mitre}/5
                          </span>
                        </div>
                      </label>
                    </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Skill gap:{" "}
                    <span className="font-semibold text-orange-600">
                      {skillGap}
                    </span>{" "}
                    (2×{sponsorGap} + {mitreGap})
                  </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCalculate}
          disabled={busy || ratedCount === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2 font-medium"
        >
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Working…
            </>
          ) : (
            "Calculate skill gaps"
          )}
        </button>
      </div>
    </div>
  );
}

