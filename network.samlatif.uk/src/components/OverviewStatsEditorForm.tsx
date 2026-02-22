"use client";

import { useState } from "react";

type OverviewStat = {
  value: string;
  label: string;
};

type OverviewStatsEditorFormProps = {
  username: string;
  initialOverviewStats: OverviewStat[];
};

export function OverviewStatsEditorForm({
  username,
  initialOverviewStats,
}: OverviewStatsEditorFormProps) {
  const [stats, setStats] = useState<OverviewStat[]>(
    initialOverviewStats.length
      ? initialOverviewStats
      : [
          { value: "5+", label: "Years Experience" },
          { value: "10+", label: "Projects" },
          { value: "3", label: "Core Domains" },
          { value: "BSc", label: "Education" },
        ],
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateStat = (
    index: number,
    field: keyof OverviewStat,
    value: string,
  ) => {
    setStats((current) =>
      current.map((stat, statIndex) =>
        statIndex === index ? { ...stat, [field]: value } : stat,
      ),
    );
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/profiles/${username}/overview-stats`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          overviewStats: stats,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save overview stats.");
      }

      setMessage("Overview stats saved.");
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save overview stats.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {stats.slice(0, 4).map((stat, index) => (
          <div
            key={`${index}-${stat.label}`}
            className="grid gap-2 md:grid-cols-5"
          >
            <input
              className="cv-input rounded-md px-3 py-2 text-sm md:col-span-2"
              value={stat.value}
              onChange={(event) =>
                updateStat(index, "value", event.target.value)
              }
              placeholder="Value"
            />
            <input
              className="cv-input rounded-md px-3 py-2 text-sm md:col-span-3"
              value={stat.label}
              onChange={(event) =>
                updateStat(index, "label", event.target.value)
              }
              placeholder="Label"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="cv-danger text-sm">{error || message}</p>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save overview stats"}
        </button>
      </div>
    </form>
  );
}
