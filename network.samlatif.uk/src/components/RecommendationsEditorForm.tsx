"use client";

import { useState } from "react";

type RecommendationEntry = {
  by: string;
  role: string;
  date: string;
  relationship: string;
  quote: string;
  visibility: "public" | "private";
};

type RecommendationsEditorFormProps = {
  username: string;
  initialRecommendations: RecommendationEntry[];
};

type JsonObject = Record<string, unknown>;

const createEmptyRecommendation = (): RecommendationEntry => ({
  by: "",
  role: "",
  date: "",
  relationship: "",
  quote: "",
  visibility: "public",
});

const asObject = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
};

const readPath = (source: JsonObject, path: string) => {
  const segments = path.split(".");
  let current: unknown = source;

  for (const segment of segments) {
    const currentObject = asObject(current);
    if (!currentObject || !(segment in currentObject)) {
      return undefined;
    }

    current = currentObject[segment];
  }

  return current;
};

const firstString = (source: JsonObject, paths: string[]) => {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const normalizeDate = (value: string) => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

const parseCsvLine = (line: string, delimiter = ",") => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const getRowValue = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (normalized in row) {
      const value = row[normalized]?.trim();
      if (value) {
        return value;
      }
    }
  }

  return "";
};

const collectRecommendationsFromCsv = (csvText: string) => {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [] as RecommendationEntry[];
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    normalizeHeader(header),
  );
  const recommendations: RecommendationEntry[] = [];
  const dedupe = new Set<string>();

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });

    const by = getRowValue(row, [
      "By",
      "Author",
      "Recommender",
      "Recommender Name",
      "Name",
    ]);
    const quote = getRowValue(row, [
      "Quote",
      "Content",
      "Recommendation",
      "Text",
      "Message",
    ]);

    if (!by || !quote) {
      continue;
    }

    const role =
      getRowValue(row, ["Role", "Title", "Headline", "Recommender Role"]) ||
      "Colleague";
    const relationship =
      getRowValue(row, ["Relationship", "Context", "Relationship Label"]) ||
      "Worked together";
    const date = normalizeDate(
      getRowValue(row, [
        "Date",
        "Recommendation At",
        "Created At",
        "Timestamp",
      ]),
    );
    const visibilityRaw = getRowValue(row, ["Visibility", "Is Public"]);

    const recommendation: RecommendationEntry = {
      by,
      role,
      date,
      relationship,
      quote,
      visibility:
        visibilityRaw.toLowerCase() === "private" ? "private" : "public",
    };

    const key = `${by}|${date}|${quote.slice(0, 80)}`.toLowerCase();
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    recommendations.push(recommendation);
  }

  return recommendations;
};

const normalizeRecommendation = (
  value: unknown,
): RecommendationEntry | null => {
  const record = asObject(value);
  if (!record) {
    return null;
  }

  const quote = firstString(record, [
    "quote",
    "content",
    "recommendation",
    "text",
    "description",
    "message",
  ]);
  const by = firstString(record, [
    "by",
    "author",
    "recommenderName",
    "from",
    "fullName",
    "name",
  ]);

  if (!quote || !by) {
    return null;
  }

  const role = firstString(record, [
    "role",
    "title",
    "headline",
    "recommenderRole",
    "authorTitle",
  ]);
  const relationship = firstString(record, [
    "relationship",
    "relationshipLabel",
    "context",
  ]);
  const date = normalizeDate(
    firstString(record, [
      "date",
      "recommendationAt",
      "createdAt",
      "created",
      "timestamp",
    ]),
  );
  const visibilityRaw = firstString(record, ["visibility", "isPublic"]);

  return {
    by,
    role: role || "Colleague",
    date,
    relationship: relationship || "Worked together",
    quote,
    visibility:
      visibilityRaw.toLowerCase() === "private" ? "private" : "public",
  };
};

const collectRecommendations = (payload: unknown) => {
  const allObjects: JsonObject[] = [];
  const seen = new Set<unknown>();

  const walk = (value: unknown) => {
    if (!value || seen.has(value)) {
      return;
    }

    if (Array.isArray(value)) {
      seen.add(value);
      for (const item of value) {
        walk(item);
      }
      return;
    }

    const objectValue = asObject(value);
    if (!objectValue) {
      return;
    }

    seen.add(objectValue);
    allObjects.push(objectValue);

    for (const nested of Object.values(objectValue)) {
      walk(nested);
    }
  };

  walk(payload);

  const dedupe = new Set<string>();
  const recommendations: RecommendationEntry[] = [];

  for (const objectValue of allObjects) {
    const recommendation = normalizeRecommendation(objectValue);
    if (!recommendation) {
      continue;
    }

    const key =
      `${recommendation.by}|${recommendation.date}|${recommendation.quote.slice(0, 80)}`.toLowerCase();
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    recommendations.push(recommendation);
  }

  return recommendations;
};

export function RecommendationsEditorForm({
  username,
  initialRecommendations,
}: RecommendationsEditorFormProps) {
  const [entries, setEntries] = useState<RecommendationEntry[]>(
    initialRecommendations.length
      ? initialRecommendations
      : [createEmptyRecommendation()],
  );
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateEntry = (
    index: number,
    field: keyof RecommendationEntry,
    value: string,
  ) => {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addEntry = () => {
    setEntries((current) => [...current, createEmptyRecommendation()]);
  };

  const removeEntry = (index: number) => {
    setEntries((current) => {
      const next = current.filter((_, entryIndex) => entryIndex !== index);
      return next.length ? next : [createEmptyRecommendation()];
    });
  };

  const saveRecommendations = async (
    nextRecommendations: RecommendationEntry[],
    successMessage: string,
  ) => {
    const response = await fetch(`/api/profiles/${username}/recommendations`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recommendations: nextRecommendations }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Could not save recommendations.");
    }

    setMessage(successMessage);
    window.location.reload();
  };

  async function onImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImporting(true);
    setError("");
    setMessage("");

    try {
      const text = await file.text();
      const isCsv =
        file.name.toLowerCase().endsWith(".csv") ||
        file.type.includes("csv") ||
        file.type.includes("text/plain");

      const imported = isCsv
        ? collectRecommendationsFromCsv(text)
        : collectRecommendations(JSON.parse(text) as unknown);

      if (!imported.length) {
        throw new Error(
          `No recommendations found in that ${isCsv ? "CSV" : "JSON"} file.`,
        );
      }

      setEntries(imported);
      await saveRecommendations(
        imported,
        `Imported and saved ${imported.length} recommendation${imported.length === 1 ? "" : "s"}.`,
      );
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Could not import LinkedIn file.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await saveRecommendations(entries, "Recommendations saved.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save recommendations.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
        <p className="text-sm font-medium">
          Import LinkedIn export (CSV or JSON)
        </p>
        <input
          type="file"
          accept=".csv,text/csv,.json,application/json"
          className="cv-input w-full rounded-md px-3 py-2 text-sm"
          onChange={onImportFile}
          disabled={saving || importing}
        />
        <p className="text-xs text-[var(--muted)]">
          Upload a CSV or JSON file and recommendations are imported and saved
          automatically.
        </p>
      </div>
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={`recommendation-entry-${index}`}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.by}
                onChange={(event) =>
                  updateEntry(index, "by", event.target.value)
                }
                placeholder="Recommender name"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.role}
                onChange={(event) =>
                  updateEntry(index, "role", event.target.value)
                }
                placeholder="Recommender role"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.date}
                onChange={(event) =>
                  updateEntry(index, "date", event.target.value)
                }
                placeholder="Date (YYYY-MM-DD)"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.relationship}
                onChange={(event) =>
                  updateEntry(index, "relationship", event.target.value)
                }
                placeholder="Relationship"
              />
            </div>
            <textarea
              className="cv-input min-h-20 w-full rounded-md px-3 py-2 text-sm"
              value={entry.quote}
              onChange={(event) =>
                updateEntry(index, "quote", event.target.value)
              }
              placeholder="Recommendation text"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={entry.visibility}
                onChange={(event) =>
                  updateEntry(index, "visibility", event.target.value)
                }
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button
                type="button"
                className="cv-btn-secondary rounded-md px-3 py-2 text-sm"
                onClick={() => removeEntry(index)}
              >
                Remove recommendation
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
          Add recommendation
        </button>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={saving || importing}
        >
          {saving ? "Saving..." : "Save recommendations"}
        </button>
      </div>
      <p className="cv-danger text-sm">{error || message}</p>
    </form>
  );
}
