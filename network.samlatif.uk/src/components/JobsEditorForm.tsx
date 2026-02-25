"use client";

import { useState } from "react";

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

export function JobsEditorForm({ username, initialJobs }: JobsEditorFormProps) {
  const [jobs, setJobs] = useState<EditableJobEntry[]>(
    initialJobs.length ? initialJobs.map(toEditableJob) : [createEmptyJob()],
  );
  const [saving, setSaving] = useState(false);
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
          disabled={saving}
        >
          {saving ? "Saving..." : "Save job experience"}
        </button>
      </div>
      <p className="cv-danger text-sm">{error || message}</p>
    </form>
  );
}
