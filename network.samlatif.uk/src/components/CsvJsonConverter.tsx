"use client";

import { ChangeEvent, useMemo, useState } from "react";

function parseCsvLine(line: string, delimiter: string) {
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
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(
  input: string,
  delimiter: string,
  hasHeader: boolean,
  trimValues: boolean,
) {
  const lines = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [] as string[], json: [] as Record<string, string>[] };
  }

  const rows = lines.map((line) => parseCsvLine(line, delimiter));
  const normalizedRows = trimValues
    ? rows.map((row) => row.map((cell) => cell.trim()))
    : rows;

  const columnCount = Math.max(...normalizedRows.map((row) => row.length));
  const paddedRows = normalizedRows.map((row) => {
    if (row.length >= columnCount) {
      return row;
    }

    return [
      ...row,
      ...Array.from({ length: columnCount - row.length }, () => ""),
    ];
  });

  const headers = hasHeader
    ? paddedRows[0].map((value, index) => value || `column_${index + 1}`)
    : Array.from({ length: columnCount }, (_, index) => `column_${index + 1}`);

  const bodyRows = hasHeader ? paddedRows.slice(1) : paddedRows;
  const json = bodyRows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });

  return { headers, json };
}

export function CsvJsonConverter() {
  const [csvInput, setCsvInput] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [hasHeader, setHasHeader] = useState(true);
  const [trimValues, setTrimValues] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const result = useMemo(
    () => parseCsv(csvInput, delimiter, hasHeader, trimValues),
    [csvInput, delimiter, hasHeader, trimValues],
  );

  const jsonText = useMemo(
    () => JSON.stringify(result.json, null, 2),
    [result],
  );

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCsvInput(String(reader.result ?? ""));
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <details className="rounded-md border border-[var(--border)] p-3">
      <summary className="cursor-pointer text-sm font-medium">
        CSV to JSON helper (for LinkedIn imports)
      </summary>

      <div className="mt-3 space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="cv-muted text-xs">Delimiter</span>
            <input
              className="cv-input w-full rounded-md px-3 py-2"
              value={delimiter}
              maxLength={1}
              onChange={(event) => setDelimiter(event.target.value || ",")}
            />
          </label>

          <label className="inline-flex items-center gap-2 pt-6 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(event) => setHasHeader(event.target.checked)}
            />
            Header row
          </label>

          <label className="inline-flex items-center gap-2 pt-6 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={trimValues}
              onChange={(event) => setTrimValues(event.target.checked)}
            />
            Trim values
          </label>

          <label className="inline-flex items-center gap-2 pt-6 text-sm">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFileChange}
              className="cv-input w-full rounded-md px-2 py-1 text-xs file:mr-2 file:rounded file:border-0 file:bg-[var(--accent)] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black"
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <textarea
            value={csvInput}
            onChange={(event) => setCsvInput(event.target.value)}
            placeholder="name,email\nSam,sam@example.com"
            className="cv-input min-h-36 w-full rounded-md p-2 font-mono text-xs"
          />
          <textarea
            value={jsonText}
            readOnly
            className="cv-input min-h-36 w-full rounded-md p-2 font-mono text-xs"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="cv-muted text-xs">
            Rows: {result.json.length} · Columns: {result.headers.length}
          </p>
          <button
            type="button"
            className="cv-btn-secondary rounded-md px-2 py-1 text-xs"
            onClick={copyJson}
            disabled={result.json.length === 0}
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy JSON"}
          </button>
        </div>
      </div>
    </details>
  );
}
