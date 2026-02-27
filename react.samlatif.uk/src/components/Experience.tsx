import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DATE_BASED_STACK_DEFAULTS,
  GLOBAL_STACK_DEFAULTS,
  JOBS,
} from "../data/cv";
import { isSkillMatch } from "../utils/filterUtils";

const toCompanyKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

const getElementOuterHeight = (element: Element | null) => {
  if (!element) {
    return 0;
  }

  const styles = window.getComputedStyle(element);
  const marginTop = parseFloat(styles.marginTop) || 0;
  const marginBottom = parseFloat(styles.marginBottom) || 0;
  return element.clientHeight + marginTop + marginBottom;
};

const getStickyNavOffset = () =>
  getElementOuterHeight(document.querySelector("nav"));

const getSectionAboveContentHeight = (target: HTMLElement) => {
  const section = target.closest("section");
  const container = target.closest(".container");

  if (!section || !container || container.parentElement !== section) {
    return 0;
  }

  let height = 0;
  const children = Array.from(container.children);

  for (const child of children) {
    if (child.contains(target)) {
      break;
    }

    height += getElementOuterHeight(child);
  }

  return height;
};

const scrollWithDynamicOffset = (
  target: HTMLElement,
  includeSectionAboveContent = false,
) => {
  const targetY = getTargetScrollTop(target, includeSectionAboveContent);

  window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
};

const getTargetScrollTop = (
  target: HTMLElement,
  includeSectionAboveContent = false,
) => {
  return (
    target.getBoundingClientRect().top +
    window.scrollY -
    getStickyNavOffset() -
    (includeSectionAboveContent ? getSectionAboveContentHeight(target) : 0)
  );
};

interface ExperienceProps {
  activeTechs: string[];
  onTechClick: (tech: string) => void;
  onClearTech: () => void;
}

export const Experience = ({
  activeTechs,
  onTechClick,
  onClearTech,
}: ExperienceProps) => {
  const previousFilterCount = useRef(activeTechs.length);
  const [matchPositionLabel, setMatchPositionLabel] = useState("0/0");

  const matchingJobIndexes = useMemo(() => {
    if (!activeTechs.length) {
      return [];
    }

    return JOBS.reduce<number[]>((indexes, job, index) => {
      const stackWithDefaults = withJobStackDefaults(job.stack, job.date);
      const matched = activeTechs.some((activeTech) =>
        stackWithDefaults.some((stackTech) =>
          isSkillMatch(activeTech, stackTech),
        ),
      );

      if (matched) {
        indexes.push(index);
      }

      return indexes;
    }, []);
  }, [activeTechs]);

  const getMatchedJobTargets = useCallback(() => {
    const allJobs = Array.from(
      document.querySelectorAll("#experience .job"),
    ) as HTMLElement[];

    return matchingJobIndexes
      .map((index) => allJobs[index])
      .filter(Boolean)
      .map((job) => {
        return (job.querySelector(".jhead") as HTMLElement | null) ?? job;
      });
  }, [matchingJobIndexes]);

  const getCurrentMatchPosition = useCallback((targets: HTMLElement[]) => {
    if (!targets.length) {
      return 0;
    }

    const positions = targets.map((target) => getTargetScrollTop(target, true));
    const currentY = window.scrollY;
    const threshold = 6;
    let currentIndex = positions.findIndex(
      (position) => position >= currentY - threshold,
    );

    if (currentIndex === -1) {
      currentIndex = positions.length - 1;
    }

    return currentIndex + 1;
  }, []);

  const updateMatchPositionLabel = useCallback(() => {
    const targets = getMatchedJobTargets();
    const total = targets.length;

    if (!activeTechs.length || !total) {
      setMatchPositionLabel("0/0");
      return;
    }

    setMatchPositionLabel(`${getCurrentMatchPosition(targets)}/${total}`);
  }, [activeTechs.length, getCurrentMatchPosition, getMatchedJobTargets]);

  const scrollToRelativeMatch = useCallback(
    (direction: 1 | -1) => {
      if (!activeTechs.length) {
        return;
      }

      const targets = getMatchedJobTargets();
      if (!targets.length) {
        return;
      }

      const currentY = window.scrollY;
      const threshold = 6;
      const positions = targets.map((target) =>
        getTargetScrollTop(target, true),
      );

      let nextIndex = 0;

      if (direction > 0) {
        nextIndex = positions.findIndex(
          (position) => position > currentY + threshold,
        );

        if (nextIndex === -1) {
          nextIndex = 0;
        }
      } else {
        nextIndex = positions.length - 1;

        for (let index = positions.length - 1; index >= 0; index -= 1) {
          if (positions[index] < currentY - threshold) {
            nextIndex = index;
            break;
          }
        }
      }

      scrollWithDynamicOffset(targets[nextIndex], true);
      window.setTimeout(updateMatchPositionLabel, 250);
    },
    [activeTechs.length, getMatchedJobTargets, updateMatchPositionLabel],
  );

  useEffect(() => {
    if (!activeTechs.length) {
      if (previousFilterCount.current > 0) {
        const experienceSection = document.getElementById("experience");
        if (experienceSection) {
          scrollWithDynamicOffset(experienceSection);
        }
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
      scrollWithDynamicOffset(target, true);
    }

    previousFilterCount.current = activeTechs.length;
  }, [activeTechs]);

  useEffect(() => {
    updateMatchPositionLabel();
  }, [updateMatchPositionLabel]);

  useEffect(() => {
    const handleScroll = () => {
      updateMatchPositionLabel();
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateMatchPositionLabel]);

  const canJumpMatches =
    activeTechs.length > 0 && matchingJobIndexes.length > 0;

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
          <div className="fmatch-nav">
            <button
              className="fnavbtn"
              onClick={() => scrollToRelativeMatch(-1)}
              type="button"
              disabled={!canJumpMatches}
            >
              ↑ Prev match
            </button>
            <button
              className="fnavbtn"
              onClick={() => scrollToRelativeMatch(1)}
              type="button"
              disabled={!canJumpMatches}
            >
              ↓ Next match
            </button>
            <span className="fmatch-pos" aria-live="polite">
              {matchPositionLabel}
            </span>
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
                data-job-company={toCompanyKey(job.co)}
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
