"use client";

import { useState } from "react";
import { CsvJsonConverter } from "@/components/CsvJsonConverter";

type JobEntry = {
  co: string;
  date: string;
  title: string;
  desc: string;
  bullets: string[];
  stack: string[];
};

type EditableJobEntry = {
  co: string;
  date: string;
  title: string;
  desc: string;
  bulletsText: string;
  stackText: string;
};

type JobsEditorFormProps = {
  username: string;
  initialJobs: JobEntry[];
};

type JsonObject = Record<string, unknown>;

const createEmptyJob = (): EditableJobEntry => ({
  co: "",
  date: "",
  title: "",
  desc: "",
  bulletsText: "",
  stackText: "",
});

const toEditableJob = (job: JobEntry): EditableJobEntry => ({
  co: job.co,
  date: job.date,
  title: job.title,
  desc: job.desc,
  bulletsText: job.bullets.join("\n"),
  stackText: job.stack.join(", "),
});

const parseMultiline = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const parseCommaSeparated = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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

const formatDatePart = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const objectValue = asObject(value);
  if (!objectValue) {
    return "";
  }

  const year =
    typeof objectValue.year === "number"
      ? objectValue.year
      : typeof objectValue.year === "string"
        ? Number.parseInt(objectValue.year, 10)
        : NaN;
  const month =
    typeof objectValue.month === "number"
      ? objectValue.month
      : typeof objectValue.month === "string"
        ? Number.parseInt(objectValue.month, 10)
        : NaN;

  if (!Number.isFinite(year) || year <= 0) {
    return "";
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (Number.isFinite(month) && month >= 1 && month <= 12) {
    return `${monthNames[month - 1]} ${year}`;
  }

  return String(year);
};

const buildDateRange = (
  startRaw: unknown,
  endRaw: unknown,
  isCurrentRaw: unknown,
) => {
  const start = formatDatePart(startRaw);
  const end =
    isCurrentRaw === true ? "Present" : formatDatePart(endRaw) || "Present";

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || end;
};

const parseStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const firstNonEmptyStringArray = (values: unknown[]) => {
  for (const value of values) {
    const parsed = parseStringArray(value);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [] as string[];
};

const normalizeDescriptionToBullets = (description: string) =>
  description
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 6);

const normalizeJobRecord = (value: unknown): JobEntry | null => {
  const record = asObject(value);
  if (!record) {
    return null;
  }

  const title = firstString(record, [
    "title",
    "position",
    "role",
    "occupation",
    "jobTitle",
    "localizedTitle",
  ]);
  const company = firstString(record, [
    "companyName",
    "company",
    "employerName",
    "organizationName",
    "organization",
    "company.name",
    "employer.name",
  ]);

  if (!title || !company) {
    return null;
  }

  const description = firstString(record, [
    "description",
    "summary",
    "roleDescription",
    "localizedDescription",
  ]);
  const date = buildDateRange(
    readPath(record, "startDate") ??
      readPath(record, "startedOn") ??
      readPath(record, "from"),
    readPath(record, "endDate") ??
      readPath(record, "endedOn") ??
      readPath(record, "to"),
    readPath(record, "isCurrent") ?? readPath(record, "current"),
  );

  const rawBullets = firstNonEmptyStringArray([
    readPath(record, "bullets"),
    readPath(record, "highlights"),
    readPath(record, "achievements"),
  ]);
  const bullets =
    rawBullets.length > 0
      ? rawBullets
      : description
        ? normalizeDescriptionToBullets(description)
        : [];
  const stack = parseStringArray(
    readPath(record, "skills") ??
      readPath(record, "technologies") ??
      readPath(record, "stack"),
  );

  return {
    co: company,
    title,
    date: date || "Unknown",
    desc: description || `${title} at ${company}`,
    bullets,
    stack,
  };
};

const collectJobCandidates = (payload: unknown) => {
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
  const jobs: JobEntry[] = [];

  for (const objectValue of allObjects) {
    const job = normalizeJobRecord(objectValue);
    if (!job) {
      continue;
    }

    const key = `${job.co}|${job.title}|${job.date}`.toLowerCase();
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    jobs.push(job);
  }

  return jobs;
};

export function JobsEditorForm({ username, initialJobs }: JobsEditorFormProps) {
  const [jobs, setJobs] = useState<EditableJobEntry[]>(
    initialJobs.length ? initialJobs.map(toEditableJob) : [createEmptyJob()],
  );
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateJob = (
    index: number,
    field: keyof EditableJobEntry,
    value: string,
  ) => {
    setJobs((current) =>
      current.map((job, jobIndex) =>
        jobIndex === index ? { ...job, [field]: value } : job,
      ),
    );
  };

  const addJob = () => {
    setJobs((current) => [...current, createEmptyJob()]);
  };

  const removeJob = (index: number) => {
    setJobs((current) => {
      const next = current.filter((_, jobIndex) => jobIndex !== index);
      return next.length ? next : [createEmptyJob()];
    });
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
      const payload = JSON.parse(text) as unknown;
      const imported = collectJobCandidates(payload);

      if (!imported.length) {
        throw new Error("No experience entries found in that JSON file.");
      }

      setJobs(imported.map(toEditableJob));
      setMessage(
        `Imported ${imported.length} role${imported.length === 1 ? "" : "s"}. Review and click Save job experience.`,
      );
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Could not import LinkedIn JSON.",
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

    const payloadJobs = jobs.map((job) => ({
      co: job.co,
      date: job.date,
      title: job.title,
      desc: job.desc,
      bullets: parseMultiline(job.bulletsText),
      stack: parseCommaSeparated(job.stackText),
    }));

    try {
      const response = await fetch(`/api/profiles/${username}/jobs`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobs: payloadJobs }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save job experience.");
      }

      setMessage("Job experience saved.");
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save job experience.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
        <p className="text-sm font-medium">Import LinkedIn export (JSON)</p>
        <input
          type="file"
          accept=".json,application/json"
          className="cv-input w-full rounded-md px-3 py-2 text-sm"
          onChange={onImportFile}
          disabled={saving || importing}
        />
        <p className="text-xs text-[var(--muted)]">
          Loads roles into this editor. Click Save job experience to persist.
        </p>
      </div>
      <CsvJsonConverter />
      <div className="space-y-3">
        {jobs.map((job, index) => (
          <div
            key={`job-entry-${index}`}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={job.co}
                onChange={(event) => updateJob(index, "co", event.target.value)}
                placeholder="Company"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={job.date}
                onChange={(event) =>
                  updateJob(index, "date", event.target.value)
                }
                placeholder="Date range (e.g. 2021 – 2024)"
              />
              <input
                className="cv-input rounded-md px-3 py-2 text-sm md:col-span-2"
                value={job.title}
                onChange={(event) =>
                  updateJob(index, "title", event.target.value)
                }
                placeholder="Job title"
              />
            </div>
            <textarea
              className="cv-input min-h-20 w-full rounded-md px-3 py-2 text-sm"
              value={job.desc}
              onChange={(event) => updateJob(index, "desc", event.target.value)}
              placeholder="Role summary"
            />
            <textarea
              className="cv-input min-h-20 w-full rounded-md px-3 py-2 text-sm"
              value={job.bulletsText}
              onChange={(event) =>
                updateJob(index, "bulletsText", event.target.value)
              }
              placeholder="Bullet points (one per line)"
            />
            <input
              className="cv-input w-full rounded-md px-3 py-2 text-sm"
              value={job.stackText}
              onChange={(event) =>
                updateJob(index, "stackText", event.target.value)
              }
              placeholder="Stack tags (comma separated)"
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="cv-btn-secondary rounded-md px-3 py-2 text-sm"
                onClick={() => removeJob(index)}
              >
                Remove job
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="cv-btn-secondary rounded-md px-4 py-2 text-sm"
          onClick={addJob}
        >
          Add job
        </button>
        <button
          type="submit"
          className="cv-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={saving || importing}
        >
          {saving ? "Saving..." : "Save job experience"}
        </button>
      </div>
      <p className="cv-danger text-sm">{error || message}</p>
    </form>
  );
}
