"use client";

import { useState } from "react";

import { SafeForm, SafeInput, SafeSelect } from "./HydrationSafeFormControls";

type Skill = {
  n: string;
  c: string;
};

type SkillsEditorFormProps = {
  username: string;
  initialSkills: Skill[];
};

const CATEGORY_OPTIONS = ["core", "state", "testing", "ui", "tooling", "cms"];

export function SkillsEditorForm({
  username,
  initialSkills,
}: SkillsEditorFormProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateSkill = (index: number, field: keyof Skill, value: string) => {
    setSkills((current) =>
      current.map((skill, skillIndex) =>
        skillIndex === index ? { ...skill, [field]: value } : skill,
      ),
    );
  };

  const addSkill = () => {
    setSkills((current) => [...current, { n: "", c: "core" }]);
  };

  const removeSkill = (index: number) => {
    setSkills((current) =>
      current.filter((_, skillIndex) => skillIndex !== index),
    );
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/profiles/${username}/skills`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skills,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save stack tags.");
      }

      setMessage("Stack at a glance saved.");
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save stack tags.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeForm onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="space-y-3">
        {skills.map((skill, index) => (
          <div
            key={`stack-skill-${index}`}
            className="grid gap-3 md:grid-cols-12"
          >
            <SafeInput
              className="cv-input rounded-md px-3 py-2 text-sm md:col-span-7"
              value={skill.n}
              onChange={(event) => updateSkill(index, "n", event.target.value)}
              placeholder="Skill"
            />
            <SafeSelect
              className="cv-input rounded-md px-3 py-2 text-sm md:col-span-4"
              value={skill.c}
              onChange={(event) => updateSkill(index, "c", event.target.value)}
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category === "ui"
                    ? "UI & Design"
                    : category === "cms"
                      ? "CMS / Other"
                      : category[0].toUpperCase() + category.slice(1)}
                </option>
              ))}
            </SafeSelect>
            <button
              type="button"
              className="cv-btn-secondary rounded-md px-2 py-2 text-sm md:col-span-1"
              onClick={() => removeSkill(index)}
              aria-label="Remove skill"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="cv-btn-secondary rounded-md px-4 py-2 text-sm"
          onClick={addSkill}
        >
          Add skill
        </button>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save stack at a glance"}
        </button>
      </div>
      <p className="cv-danger text-sm">{error || message}</p>
    </SafeForm>
  );
}
