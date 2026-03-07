"use client";

import { useState } from "react";

import { SafeForm, SafeInput, SafeTextarea } from "./HydrationSafeFormControls";

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

const getRowValue = (
  row: Record<string, string>,
  keys: string[],
  fallback = "",
) => {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (normalized in row) {
      const value = row[normalized]?.trim();
      if (value) {
        return value;
      }
    }
  }

  return fallback;
};

const collectCsvJobs = (csvText: string) => {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [] as JobEntry[];
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    normalizeHeader(header),
  );
  const jobs: JobEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });

    const title = getRowValue(row, ["Title", "Role", "Position", "Job Title"]);
    const company = getRowValue(row, [
      "Company",
      "Company Name",
      "Employer",
      "Organization",
    ]);

    if (!title || !company) {
      continue;
    }

    const start = getRowValue(row, ["Started On", "Start Date", "From"]);
    const end = getRowValue(row, ["Finished On", "End Date", "To"], "Present");
    const date = start ? `${start} – ${end}` : end;
    const description = getRowValue(row, [
      "Description",
      "Summary",
      "Role Description",
    ]);
    const bullets = normalizeDescriptionToBullets(description);
    const stack = parseCommaSeparated(
      getRowValue(row, ["Skills", "Technologies", "Stack", "Tech"]),
    );

    const key = `${company}|${title}|${date}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    jobs.push({
      co: company,
      title,
      date: date || "Unknown",
      desc: description || `${title} at ${company}`,
      bullets,
      stack,
    });
  }

  return jobs;
};

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

  const saveJobs = async (nextJobs: JobEntry[], successMessage: string) => {
    const response = await fetch(`/api/profiles/${username}/jobs`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobs: nextJobs }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Could not save job experience.");
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
        ? collectCsvJobs(text)
        : collectJobCandidates(JSON.parse(text) as unknown);

      if (!imported.length) {
        throw new Error(
          `No experience entries found in that ${isCsv ? "CSV" : "JSON"} file.`,
        );
      }

      setJobs(imported.map(toEditableJob));
      await saveJobs(
        imported,
        `Imported and saved ${imported.length} role${imported.length === 1 ? "" : "s"}.`,
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

    const payloadJobs = jobs.map((job) => ({
      co: job.co,
      date: job.date,
      title: job.title,
      desc: job.desc,
      bullets: parseMultiline(job.bulletsText),
      stack: parseCommaSeparated(job.stackText),
    }));

    try {
      await saveJobs(payloadJobs, "Job experience saved.");
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
    <SafeForm onSubmit={onSubmit} className="cv-card space-y-3 rounded-xl p-4">
      <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
        <p className="text-sm font-medium">
          Import LinkedIn export (CSV or JSON)
        </p>
        <SafeInput
          type="file"
          accept=".csv,text/csv,.json,application/json"
          className="cv-input w-full rounded-md px-3 py-2 text-sm"
          onChange={onImportFile}
          disabled={saving || importing}
        />
        <p className="text-xs text-[var(--muted)]">
          Upload a CSV or JSON file and roles are imported and saved
          automatically.
        </p>
      </div>
      <div className="space-y-3">
        {jobs.map((job, index) => (
          <div
            key={`job-entry-${index}`}
            className="space-y-2 rounded-md border border-[var(--border)] p-3"
          >
            <div className="grid gap-2 md:grid-cols-2">
              <SafeInput
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={job.co}
                onChange={(event) => updateJob(index, "co", event.target.value)}
                placeholder="Company"
              />
              <SafeInput
                className="cv-input rounded-md px-3 py-2 text-sm"
                value={job.date}
                onChange={(event) =>
                  updateJob(index, "date", event.target.value)
                }
                placeholder="Date range (e.g. 2021 – 2024)"
              />
              <SafeInput
                className="cv-input rounded-md px-3 py-2 text-sm md:col-span-2"
                value={job.title}
                onChange={(event) =>
                  updateJob(index, "title", event.target.value)
                }
                placeholder="Job title"
              />
            </div>
            <SafeTextarea
              className="cv-input min-h-20 w-full rounded-md px-3 py-2 text-sm"
              value={job.desc}
              onChange={(event) => updateJob(index, "desc", event.target.value)}
              placeholder="Role summary"
            />
            <SafeTextarea
              className="cv-input min-h-20 w-full rounded-md px-3 py-2 text-sm"
              value={job.bulletsText}
              onChange={(event) =>
                updateJob(index, "bulletsText", event.target.value)
              }
              placeholder="Bullet points (one per line)"
            />
            <SafeInput
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
    </SafeForm>
  );
}
