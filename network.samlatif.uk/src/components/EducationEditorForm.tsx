"use client";

import { useState } from "react";

type EducationEntry = {
  degree: string;
  institution: string;
  period: string;
  grade: string;
  note: string;
};

type EducationEditorFormProps = {
  username: string;
  initialEducation: EducationEntry[];
};

export function EducationEditorForm({
  username,
  initialEducation,
}: EducationEditorFormProps) {
  const [entries, setEntries] = useState<EducationEntry[]>(
    initialEducation.length
      ? initialEducation
      : [
          {
            degree: "",
            institution: "",
            period: "",
            grade: "",
            note: "",
          },
        ],
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateEntry = (
    index: number,
    field: keyof EducationEntry,
    value: string,
  ) => {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addEntry = () => {
    setEntries((current) => [
      ...current,
      { degree: "", institution: "", period: "", grade: "", note: "" },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries((current) => {
      const next = current.filter((_, entryIndex) => entryIndex !== index);
      return next.length
        ? next
        : [
            {
              degree: "",
              institution: "",
              period: "",
              grade: "",
              note: "",
            },
          ];
    });
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/profiles/${username}/education`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ education: entries }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save education.");
      }

      setMessage("Education saved.");
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save education.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={`${index}-${entry.degree}-${entry.institution}`}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.degree}
                onChange={(event) =>
                  updateEntry(index, "degree", event.target.value)
                }
                placeholder="Degree"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.institution}
                onChange={(event) =>
                  updateEntry(index, "institution", event.target.value)
                }
                placeholder="Institution"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.period}
                onChange={(event) =>
                  updateEntry(index, "period", event.target.value)
                }
                placeholder="Period (e.g. 2011 – 2012)"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.grade}
                onChange={(event) =>
                  updateEntry(index, "grade", event.target.value)
                }
                placeholder="Grade"
              />
            </div>
            <textarea
              className="cv-input min-h-20 w-full rounded-md px-3 py-2 text-sm"
              value={entry.note}
              onChange={(event) =>
                updateEntry(index, "note", event.target.value)
              }
              placeholder="Note"
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="cv-btn-secondary rounded-md px-3 py-2 text-sm"
                onClick={() => removeEntry(index)}
              >
                Remove entry
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="cv-btn-secondary rounded-md px-4 py-2 text-sm"
          onClick={addEntry}
        >
          Add entry
        </button>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save education"}
        </button>
      </div>
      <p className="cv-danger text-sm">{error || message}</p>
    </form>
  );
}
