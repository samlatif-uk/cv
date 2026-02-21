import { useEffect, useRef } from "react";
import {
  DATE_BASED_STACK_DEFAULTS,
  GLOBAL_STACK_DEFAULTS,
  JOBS,
} from "../data/cv";

const getJobStartYear = (date: string) => {
  const years = date.match(/\d{4}/g);
  if (!years?.length) {
    return null;
  }

  return Number(years[0]);
};

const getJavaScriptVersionedSkill = (startYear: number | null) => {
  return startYear !== null && startYear < 2015
    ? "JavaScript (ES5)"
    : "JavaScript (ES6+)";
};

const isSkillMatch = (filterSkill: string, jobSkill: string) => {
  if (filterSkill === "React") {
    return /^React(?:\s|$)/.test(jobSkill) && jobSkill !== "React Native";
  }

  return filterSkill === jobSkill;
};

const withJobStackDefaults = (stack: string[], date: string) => {
  const startYear = getJobStartYear(date);
  const normalizedStack = stack.map((skill) =>
    skill === "JavaScript" ? getJavaScriptVersionedSkill(startYear) : skill,
  );
  const stackWithGlobalDefaults = GLOBAL_STACK_DEFAULTS.reduce(
    (nextStack, skill) => {
      if (!nextStack.includes(skill)) {
        return [skill, ...nextStack];
      }

      return nextStack;
    },
    normalizedStack,
  );

  if (startYear === null) {
    return stackWithGlobalDefaults;
  }

  return DATE_BASED_STACK_DEFAULTS.reduce((nextStack, rule) => {
    const aboveMin =
      rule.minStartYear === undefined || startYear >= rule.minStartYear;
    const belowMax =
      rule.maxStartYear === undefined || startYear <= rule.maxStartYear;

    if (aboveMin && belowMax && !nextStack.includes(rule.skill)) {
      return [rule.skill, ...nextStack];
    }

    return nextStack;
  }, stackWithGlobalDefaults);
};

interface ExperienceProps {
  activeTechs: string[];
  onTechClick: (tech: string) => void;
  onClearTech: () => void;
}

const getFilterBarHeight = () => {
  const filterBar = document.getElementById("fbar");
  if (!filterBar || !filterBar.classList.contains("show")) {
    return 0;
  }

  const styles = window.getComputedStyle(filterBar);
  const marginBottom = parseFloat(styles.marginBottom) || 0;
  return filterBar.offsetHeight + marginBottom;
};

export const Experience = ({
  activeTechs,
  onTechClick,
  onClearTech,
}: ExperienceProps) => {
  const previousFilterCount = useRef(activeTechs.length);

  useEffect(() => {
    if (!activeTechs.length) {
      if (previousFilterCount.current > 0) {
        const experienceSection = document.getElementById("experience");
        experienceSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      previousFilterCount.current = 0;
      return;
    }

    const allJobElements = Array.from(
      document.querySelectorAll("#experience .job"),
    ) as HTMLElement[];
    const latestSelectedTech = activeTechs[activeTechs.length - 1];

    let bestMatchIndex = -1;
    let bestMatchCount = -1;
    let bestHasLatest = false;

    JOBS.forEach((job, index) => {
      const stackWithDefaults = withJobStackDefaults(job.stack, job.date);
      const matchCount = activeTechs.filter((activeTech) =>
        stackWithDefaults.some((tech) => isSkillMatch(activeTech, tech)),
      ).length;

      if (matchCount === 0) {
        return;
      }

      const hasLatest = latestSelectedTech
        ? stackWithDefaults.some((tech) =>
            isSkillMatch(latestSelectedTech, tech),
          )
        : false;

      const shouldReplaceBest =
        matchCount > bestMatchCount ||
        (matchCount === bestMatchCount && hasLatest && !bestHasLatest);

      if (shouldReplaceBest) {
        bestMatchIndex = index;
        bestMatchCount = matchCount;
        bestHasLatest = hasLatest;
      }
    });

    const firstMatch =
      bestMatchIndex >= 0 ? allJobElements[bestMatchIndex] : null;

    if (firstMatch) {
      const target =
        (firstMatch.querySelector(".jhead") as HTMLElement | null) ??
        firstMatch;
      const targetY =
        target.getBoundingClientRect().top +
        window.scrollY -
        (90 + getFilterBarHeight());
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }

    previousFilterCount.current = activeTechs.length;
  }, [activeTechs]);

  return (
    <section id="experience">
      <div className="container">
        <div className="shead">
          <span className="snum">03</span>
          <h2>Experience</h2>
          <div className="sline" />
        </div>
        <div className={`fbar ${activeTechs.length ? "show" : ""}`}>
          <span>Filtering by:</span>
          <div className="fchips">
            {activeTechs.map((tech) => (
              <button
                key={tech}
                className="fchip"
                onClick={() => onTechClick(tech)}
                type="button"
              >
                {tech} ×
              </button>
            ))}
          </div>
          <button className="fclear" onClick={onClearTech} type="button">
            Clear ×
          </button>
        </div>
        <div className="tl">
          {JOBS.map((job, index) => {
            const stackWithDefaults = withJobStackDefaults(job.stack, job.date);
            const matched = activeTechs.length
              ? activeTechs.some((activeTech) =>
                  stackWithDefaults.some((tech) =>
                    isSkillMatch(activeTech, tech),
                  ),
                )
              : false;
            const filtered = activeTechs.length > 0 && !matched;

            return (
              <div
                key={`${job.co}-${job.date}`}
                className={`job vis ${matched ? "match" : ""} ${filtered ? "filtered" : ""}`}
                style={{ transitionDelay: `${index * 0.03}s` }}
              >
                <div className="jhead">
                  <div className="jco">{job.co}</div>
                  <div className="jdate">{job.date}</div>
                </div>
                <div className="jtitle">{job.title}</div>
                <div className="jdesc">{job.desc}</div>

                {job.bullets.length > 0 && (
                  <ul className="jbuls">
                    {job.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}

                {stackWithDefaults.length > 0 && (
                  <div className="jstack">
                    {stackWithDefaults.map((tech) => (
                      <button
                        key={`${job.co}-${tech}`}
                        className={`jtag${activeTechs.some((activeTech) => isSkillMatch(activeTech, tech)) ? " lit" : ""}`}
                        onClick={() => onTechClick(tech)}
                        type="button"
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
