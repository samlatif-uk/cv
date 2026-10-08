import { useState } from "react";
import logoData from "../data/company-logos.json";

type CompanyMarkProps = { company: string; size?: "sm" | "md" };
const logos: Record<string, { paths: string[]; color: string }> = logoData;

const META: Record<string, { label: string; tone: string }> = {
  "Bank of America": { label: "BofA", tone: "red" }, "Goldman Sachs": { label: "GS", tone: "blue" },
  Visa: { label: "VISA", tone: "visa" }, "Deutsche Bank": { label: "DB", tone: "cobalt" },
  HSBC: { label: "HSBC", tone: "red" }, Deloitte: { label: "D", tone: "green" }, UBS: { label: "UBS", tone: "red" },
  "The Stars Group": { label: "★", tone: "gold" }, "Chelsea FC": { label: "CFC", tone: "blue" },
  "Thought Machine": { label: "TM", tone: "violet" },
};

const getMeta = (company: string) => {
  const key = Object.keys(META).find((candidate) => company.toLowerCase().includes(candidate.toLowerCase()));
  if (key) return META[key];
  const initials = company.replace(/\([^)]*\)/g, "").split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return { label: initials || "•", tone: "ink" };
};

export const CompanyMark = ({ company, size = "sm" }: CompanyMarkProps) => {
  const [failedImage, setFailedImage] = useState(false);
  const meta = getMeta(company);
  const imageSrc = company === "Deloitte Digital" ? "/logos/deloitte.png" : company === "Anmut Consulting" ? "/logos/anmut.jpg" : null;
  if (imageSrc && !failedImage) {
    return <img className={`company-mark company-mark-${size} company-mark-image`} src={imageSrc} alt="" width="30" height="30" loading="lazy" onError={() => setFailedImage(true)} />;
  }
  const key = Object.keys(logos).find((name) => company.includes(name));
  if (key) {
    const logo = logos[key];
    return <span className={`company-mark company-mark-${size}`} style={{ background: logo.color }} aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="white" focusable="false">{logo.paths.map((path) => <path key={path} d={path} />)}</svg></span>;
  }
  return <span className={`company-mark company-mark-${size} company-mark-${meta.tone}`} aria-hidden="true">{meta.label}</span>;
};
