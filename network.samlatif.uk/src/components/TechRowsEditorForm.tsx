"use client";

import { useState } from "react";

type TechRow = {
  cat: string;
  items: string;
  yrs: string;
};

type TechRowsEditorFormProps = {
  username: string;
  initialTechRows: TechRow[];
};

export function TechRowsEditorForm({
  username,
  initialTechRows,
}: TechRowsEditorFormProps) {
  const [rows, setRows] = useState<TechRow[]>(
    initialTechRows.length
      ? initialTechRows
      : [{ cat: "Frontend", items: "React, TypeScript", yrs: "5" }],
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateRow = (
    index: number,
    field: keyof TechRow,
    value: string,
  ) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addRow = () => {
    setRows((current) => [...current, { cat: "", items: "", yrs: "" }]);
  };

  const removeRow = (index: number) => {
    setRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [{ cat: "", items: "", yrs: "" }];
    });
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/profiles/${username}/tech-rows`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          techRows: rows,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save tech skills.");
      }

      setMessage("Tech skills saved.");
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save tech skills.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={`${index}-${row.cat}`} className="grid gap-3 md:grid-cols-12">
            <input
              className="cv-input rounded-md px-3 py-2 text-sm md:col-span-3"
              value={row.cat}
              onChange={(event) => updateRow(index, "cat", event.target.value)}
              placeholder="Category"
            />
            <input
              className="cv-input rounded-md px-3 py-2 text-sm md:col-span-7"
              value={row.items}
              onChange={(event) => updateRow(index, "items", event.target.value)}
              placeholder="Skills (comma separated)"
            />
            <div className="flex gap-2 md:col-span-2">
              <input
                className="cv-input w-full rounded-md px-3 py-2 text-sm"
                value={row.yrs}
                onChange={(event) => updateRow(index, "yrs", event.target.value)}
                placeholder="Yrs"
              />
              <button
                type="button"
                className="cv-btn-secondary rounded-md px-2 py-2 text-sm"
                onClick={() => removeRow(index)}
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="cv-btn-secondary rounded-md px-4 py-2 text-sm"
          onClick={addRow}
        >
          Add row
        </button>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save tech skills"}
        </button>
      </div>
      <p className="cv-danger text-sm">{error || message}</p>
    </form>
  );
}