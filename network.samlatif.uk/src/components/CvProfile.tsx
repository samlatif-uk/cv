"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./CvProfile.module.css";
import type { CvData } from "@/lib/cvData";
import { EducationEditorForm } from "@/components/EducationEditorForm";
import { JobsEditorForm } from "@/components/JobsEditorForm";
import { OverviewStatsEditorForm } from "@/components/OverviewStatsEditorForm";
import { ProfileEditorForm } from "@/components/ProfileEditorForm";
import { RecommendationsEditorForm } from "@/components/RecommendationsEditorForm";
import { SkillsEditorForm } from "@/components/SkillsEditorForm";
import { TechRowsEditorForm } from "@/components/TechRowsEditorForm";
import {
  getSkillMatchStrength,
  isSkillMatch,
  normalizeTechToken,
  splitTechItems,
} from "../../../shared/src/filter-utils";

const SECTION_IDS = [
  "overview",
  "techskills",
  "skills",
  "experience",
  "recommendations",
  "education",
];

const CATEGORIES = ["all", "core", "state", "testing", "ui", "tooling", "cms"];

type Category = (typeof CATEGORIES)[number];

const getCategoryLabel = (category: Category) => {
  if (category === "ui") return "UI & Design";
  if (category === "cms") return "CMS / Other";
  return category[0].toUpperCase() + category.slice(1);
};

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

const getElementOuterHeight = (element: Element | null) => {
  if (!element) {
    return 0;
  }

  const stylesForElement = window.getComputedStyle(element);
  const marginTop = parseFloat(stylesForElement.marginTop) || 0;
  const marginBottom = parseFloat(stylesForElement.marginBottom) || 0;
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

const toCompanyKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type ProfileIdentity = {
  username: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  bio: string;
  summary: string[];
  avatarUrl?: string | null;
};

export function ProfileCv({
  data,
  profile,
  canEdit,
}: {
  data: CvData;
  profile: ProfileIdentity;
  canEdit?: boolean;
}) {
  const [firstName, ...restNameParts] = profile.name.split(" ");
  const lastName = restNameParts.join(" ");
  const [activeTechs, setActiveTechs] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [activeNav, setActiveNav] = useState("techskills");
  const [matchPositionLabel, setMatchPositionLabel] = useState("0/0");
  const previousFilterCount = useRef(activeTechs.length);
  const knownCompanies = useMemo(
    () =>
      Array.from(new Set(data.JOBS.map((job) => job.co))).sort(
        (first, second) => second.length - first.length,
      ),
    [data.JOBS],
  );

  const filterableTechSet = useMemo(() => {
    const techSet = new Set<string>([
      ...data.SKILLS.map((skill) => skill.n),
      ...data.DATE_BASED_STACK_DEFAULTS.map((rule) => rule.skill),
      ...data.GLOBAL_STACK_DEFAULTS,
    ]);

    data.JOBS.forEach((job) => {
      job.stack.forEach((tech) => techSet.add(tech));
    });

    return techSet;
  }, [data]);

  const withJobStackDefaults = useCallback(
    (stack: string[], date: string) => {
      const startYear = getJobStartYear(date);
      const normalizedStack = stack.map((skill) =>
        skill === "JavaScript" ? getJavaScriptVersionedSkill(startYear) : skill,
      );
      const stackWithGlobalDefaults = data.GLOBAL_STACK_DEFAULTS.reduce(
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

      return data.DATE_BASED_STACK_DEFAULTS.reduce((nextStack, rule) => {
        const aboveMin =
          rule.minStartYear === undefined || startYear >= rule.minStartYear;
        const belowMax =
          rule.maxStartYear === undefined || startYear <= rule.maxStartYear;

        if (aboveMin && belowMax && !nextStack.includes(rule.skill)) {
          return [rule.skill, ...nextStack];
        }

        return nextStack;
      }, stackWithGlobalDefaults);
    },
    [data.DATE_BASED_STACK_DEFAULTS, data.GLOBAL_STACK_DEFAULTS],
  );

  const matchingJobIndexes = useMemo(() => {
    if (!activeTechs.length) {
      return [];
    }

    return data.JOBS.reduce<number[]>((indexes, job, index) => {
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
  }, [activeTechs, data.JOBS, withJobStackDefaults]);

  const bestMatchingJob = useMemo(() => {
    if (!activeTechs.length) {
      return null;
    }

    const latestSelectedTech = activeTechs[activeTechs.length - 1];
    let bestMatchIndex = -1;
    let bestLatestMatchStrength = -1;
    let bestMatchCount = -1;
    let bestTotalMatchStrength = -1;

    data.JOBS.forEach((job, index) => {
      const stackWithDefaults = withJobStackDefaults(job.stack, job.date);
      const techMatchStrengths = activeTechs.map((activeTech) =>
        stackWithDefaults.reduce(
          (bestStrength, tech) =>
            Math.max(bestStrength, getSkillMatchStrength(activeTech, tech)),
          0,
        ),
      );
      const matchCount = techMatchStrengths.filter(
        (strength) => strength > 0,
      ).length;

      if (matchCount === 0) {
        return;
      }

      const latestMatchStrength = latestSelectedTech
        ? stackWithDefaults.reduce(
            (bestStrength, tech) =>
              Math.max(
                bestStrength,
                getSkillMatchStrength(latestSelectedTech, tech),
              ),
            0,
          )
        : 0;
      const totalMatchStrength = techMatchStrengths.reduce(
        (sum, strength) => sum + strength,
        0,
      );

      const shouldReplaceBest =
        latestMatchStrength > bestLatestMatchStrength ||
        (latestMatchStrength === bestLatestMatchStrength &&
          matchCount > bestMatchCount) ||
        (latestMatchStrength === bestLatestMatchStrength &&
          matchCount === bestMatchCount &&
          totalMatchStrength > bestTotalMatchStrength);

      if (shouldReplaceBest) {
        bestMatchIndex = index;
        bestLatestMatchStrength = latestMatchStrength;
        bestMatchCount = matchCount;
        bestTotalMatchStrength = totalMatchStrength;
      }
    });

    if (bestMatchIndex < 0) {
      return null;
    }

    const bestJob = data.JOBS[bestMatchIndex];
    return {
      index: bestMatchIndex,
      label: `${bestJob.co} · ${bestJob.title}`,
    };
  }, [activeTechs, data.JOBS, withJobStackDefaults]);

  const getMatchedJobTargets = useCallback(() => {
    const allJobs = Array.from(
      document.querySelectorAll('[data-job="true"]'),
    ) as HTMLElement[];

    return matchingJobIndexes
      .map((index) => allJobs[index])
      .filter(Boolean)
      .map((job) => {
        return (
          (job.querySelector('[data-jhead="true"]') as HTMLElement | null) ??
          job
        );
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
    const handleScroll = () => {
      const currentSection = SECTION_IDS.reduce((current, id) => {
        const sectionElement = document.getElementById(id);
        if (
          sectionElement &&
          window.scrollY >= sectionElement.offsetTop - getStickyNavOffset()
        ) {
          return id;
        }

        return current;
      }, "");

      if (currentSection) {
        setActiveNav(currentSection);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const navLinks = Array.from(
      document.querySelectorAll('nav a[href^="#"]'),
    ) as HTMLAnchorElement[];

    const unsubs = navLinks.map((link) => {
      const onClick = (event: MouseEvent) => {
        const href = link.getAttribute("href") || "";
        const id = href.replace("#", "");
        const target = document.getElementById(id);

        if (!target || !SECTION_IDS.includes(id)) {
          return;
        }

        event.preventDefault();
        scrollWithDynamicOffset(target);
        window.history.replaceState(null, "", `#${id}`);
      };

      link.addEventListener("click", onClick);
      return () => link.removeEventListener("click", onClick);
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

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
      document.querySelectorAll('[data-job="true"]'),
    ) as HTMLElement[];

    const firstMatch = bestMatchingJob
      ? allJobElements[bestMatchingJob.index]
      : null;

    if (firstMatch) {
      const target =
        (firstMatch.querySelector(
          '[data-jhead="true"]',
        ) as HTMLElement | null) ?? firstMatch;
      scrollWithDynamicOffset(target, true);
    }

    previousFilterCount.current = activeTechs.length;
  }, [activeTechs, bestMatchingJob]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      updateMatchPositionLabel();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [updateMatchPositionLabel]);

  useEffect(() => {
    const handleScroll = () => {
      updateMatchPositionLabel();
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateMatchPositionLabel]);

  const handleTechClick = (tech: string) => {
    setActiveTechs((current) =>
      current.includes(tech)
        ? current.filter((item) => item !== tech)
        : [...current, tech],
    );
  };

  const handleAddTechFilters = (techs: string[]) => {
    setActiveTechs((current) => Array.from(new Set([...current, ...techs])));
  };

  const canJumpMatches =
    activeTechs.length > 0 && matchingJobIndexes.length > 0;

  const handleRowClick = (items: string) => {
    const parsedTechs = splitTechItems(items)
      .flatMap((token) => normalizeTechToken(token))
      .filter((tech) => filterableTechSet.has(tech));

    if (parsedTechs.length) {
      handleAddTechFilters(parsedTechs);
    }
  };

  const scrollToCompanyJob = (jobCompany?: string) => {
    const experienceSection = document.getElementById("experience");
    if (!experienceSection) {
      return;
    }

    if (!jobCompany) {
      scrollWithDynamicOffset(experienceSection);
      return;
    }

    const companyKey = toCompanyKey(jobCompany);
    const jobCard = document.querySelector(
      `#experience [data-job-company="${companyKey}"]`,
    ) as HTMLElement | null;
    const target =
      (jobCard?.querySelector('[data-jhead="true"]') as HTMLElement | null) ??
      jobCard ??
      experienceSection;
    scrollWithDynamicOffset(target, target !== experienceSection);
  };

  const resolveJobCompany = (testimonial: CvData["TESTIMONIALS"][number]) => {
    if (testimonial.jobCompany) {
      return testimonial.jobCompany;
    }

    const haystack = `${testimonial.relationship} ${testimonial.quote}`;
    return knownCompanies.find((company) => haystack.includes(company));
  };

  const renderRelationship = (relationship: string, jobCompany?: string) => {
    if (!jobCompany || !relationship.includes(jobCompany)) {
      return relationship;
    }

    const [before, ...rest] = relationship.split(jobCompany);
    const after = rest.join(jobCompany);

    return (
      <>
        {before.trimEnd()}{" "}
        <span className={styles.recCompany}>{jobCompany}</span>
        {after}
      </>
    );
  };

  const formatRecommendationDate = (value?: string) => {
    if (!value) {
      return "Date unknown";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(parsed);
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.eyebrow}>
            {profile.headline} · {profile.location}
          </div>
          <h1 className={styles.name}>
            {firstName}
            {lastName ? <span className={styles.acc}> {lastName}</span> : null}
          </h1>
          <div className={styles.role}>@{profile.username}</div>
          <div className={styles.hcontact}>
            <a href={`mailto:${profile.email}`}>
              <em>◆</em>
              {profile.email}
            </a>
          </div>
          <ul className={styles.summary}>
            {(profile.summary.length ? profile.summary : [profile.bio]).map(
              (line) => (
                <p key={line}>{line}</p>
              ),
            )}
          </ul>
          {canEdit ? (
            <div className="mt-4">
              <ProfileEditorForm
                username={profile.username}
                initialName={profile.name}
                initialHeadline={profile.headline}
                initialLocation={profile.location}
                initialBio={profile.bio}
                initialAvatarUrl={profile.avatarUrl ?? null}
              />
            </div>
          ) : null}
        </div>
      </header>

      <nav className={styles.nav}>
        <div className={styles.container}>
          <div className={styles.navInner}>
            <a
              href="#overview"
              className={activeNav === "overview" ? styles.active : ""}
            >
              Overview
            </a>
            {canEdit ? (
              <a href="#edit-overview" className={styles.editLink}>
                Edit
              </a>
            ) : null}
            <a
              href="#techskills"
              className={activeNav === "techskills" ? styles.active : ""}
            >
              Tech Skills
            </a>
            {canEdit ? (
              <a href="#edit-techskills" className={styles.editLink}>
                Edit
              </a>
            ) : null}
            <a
              href="#skills"
              className={activeNav === "skills" ? styles.active : ""}
            >
              Stack Tags
            </a>
            {canEdit ? (
              <a href="#edit-skills" className={styles.editLink}>
                Edit
              </a>
            ) : null}
            <a
              href="#experience"
              className={activeNav === "experience" ? styles.active : ""}
            >
              Experience
            </a>
            {canEdit ? (
              <a href="#edit-experience" className={styles.editLink}>
                Edit
              </a>
            ) : null}
            <a
              href="#recommendations"
              className={activeNav === "recommendations" ? styles.active : ""}
            >
              Recommendations
            </a>
            {canEdit ? (
              <a href="#edit-recommendations" className={styles.editLink}>
                Edit
              </a>
            ) : null}
            <a
              href="#education"
              className={activeNav === "education" ? styles.active : ""}
            >
              Education
            </a>
            {canEdit ? (
              <a href="#edit-education" className={styles.editLink}>
                Edit
              </a>
            ) : null}
          </div>
        </div>
      </nav>

      <section id="overview" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.stats}>
            {(data.OVERVIEW_STATS ?? []).map((stat, statIndex) => (
              <div
                key={`${stat.value}-${stat.label}-${statIndex}`}
                className={styles.stat}
              >
                <div className={styles.sn}>{stat.value}</div>
                <div className={styles.sl}>{stat.label}</div>
              </div>
            ))}
          </div>
          {canEdit ? (
            <div id="edit-overview" className="mt-4">
              <OverviewStatsEditorForm
                username={profile.username}
                initialOverviewStats={data.OVERVIEW_STATS ?? []}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section id="techskills" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.shead}>
            <span className={styles.snum}>01</span>
            <h2>Technical Skills</h2>
            <div className={styles.sline} />
          </div>
          <table className={styles.techTable}>
            <tbody>
              {data.TECH_ROWS.map((row, rowIndex) => {
                const pct = Math.min(100, (parseInt(row.yrs, 10) * 100) / 15);
                return (
                  <tr
                    key={`${row.cat}-${rowIndex}`}
                    onClick={() => handleRowClick(row.items)}
                  >
                    <td>{row.cat}</td>
                    <td>
                      <div>
                        {row.items}
                        <span className={styles.yrs}>{row.yrs} yrs</span>
                      </div>
                      <div className={styles.barWrap}>
                        <div className={styles.bar}>
                          <div
                            className={styles.barFill}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {canEdit ? (
            <div id="edit-techskills" className="mt-4">
              <TechRowsEditorForm
                username={profile.username}
                initialTechRows={data.TECH_ROWS}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section id="skills" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.shead}>
            <span className={styles.snum}>02</span>
            <h2>Stack at a Glance</h2>
            <div className={styles.sline} />
          </div>
          {data.SKILLS.length > 0 ? (
            <>
              <div className={styles.fbtns}>
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`${styles.fbtn} ${activeCategory === category ? styles.on : ""}`}
                  >
                    {getCategoryLabel(category)}
                  </button>
                ))}
              </div>
              <div className={styles.swrap}>
                {data.SKILLS.map((skill) => {
                  const visible =
                    activeCategory === "all" || skill.c === activeCategory;
                  const highlighted = activeTechs.includes(skill.n);

                  return (
                    <button
                      key={skill.n}
                      type="button"
                      className={`${styles.stag} ${visible ? "" : styles.dim} ${highlighted ? styles.lit : ""}`}
                      onClick={() => handleTechClick(skill.n)}
                    >
                      {skill.n}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className={styles.emptyState}>No stack tags added yet.</p>
          )}
          {canEdit ? (
            <div id="edit-skills" className="mt-4">
              <SkillsEditorForm
                username={profile.username}
                initialSkills={data.SKILLS}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section id="experience" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.shead}>
            <span className={styles.snum}>03</span>
            <h2>Experience</h2>
            <div className={styles.sline} />
          </div>
          <div
            id="fbar"
            className={`${styles.fbar} ${activeTechs.length ? styles.show : ""}`}
          >
            <span>Filtering by:</span>
            <div className={styles.fchips}>
              {activeTechs.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  className={styles.fchip}
                  onClick={() => handleTechClick(tech)}
                >
                  {tech} ×
                </button>
              ))}
            </div>
            <div className={styles.fmatchNav}>
              <button
                type="button"
                className={styles.fnavbtn}
                onClick={() => scrollToRelativeMatch(-1)}
                disabled={!canJumpMatches}
              >
                ↑ Prev match
              </button>
              <button
                type="button"
                className={styles.fnavbtn}
                onClick={() => scrollToRelativeMatch(1)}
                disabled={!canJumpMatches}
              >
                ↓ Next match
              </button>
              <span className={styles.fmatchPos} aria-live="polite">
                {matchPositionLabel}
              </span>
            </div>
            <button
              type="button"
              className={styles.fclear}
              onClick={() => setActiveTechs([])}
            >
              Clear ×
            </button>
          </div>
          <div className={styles.tl}>
            {data.JOBS.map((job) => {
              const stackWithDefaults = withJobStackDefaults(
                job.stack,
                job.date,
              );
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
                  data-job="true"
                  data-job-company={toCompanyKey(job.co)}
                  className={`${styles.job} ${matched ? styles.match : ""} ${filtered ? styles.filtered : ""}`}
                >
                  <div className={styles.jhead} data-jhead="true">
                    <div className={styles.jco}>{job.co}</div>
                    <div className={styles.jdate}>{job.date}</div>
                  </div>
                  <div className={styles.jtitle}>{job.title}</div>
                  <div className={styles.jdesc}>{job.desc}</div>

                  {job.bullets.length > 0 ? (
                    <ul className={styles.jbuls}>
                      {job.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}

                  {stackWithDefaults.length > 0 ? (
                    <div className={styles.jstack}>
                      {stackWithDefaults.map((tech) => (
                        <button
                          key={`${job.co}-${tech}`}
                          type="button"
                          className={`${styles.jtag} ${activeTechs.some((activeTech) => isSkillMatch(activeTech, tech)) ? styles.lit : ""}`}
                          onClick={() => handleTechClick(tech)}
                        >
                          {tech}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {canEdit ? (
            <div id="edit-experience" className="mt-4">
              <JobsEditorForm
                username={profile.username}
                initialJobs={data.JOBS}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section id="recommendations" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.shead}>
            <span className={styles.snum}>04</span>
            <h2>Recommendations</h2>
            <div className={styles.sline} />
          </div>
          <div className={styles.testimonials}>
            {data.TESTIMONIALS.filter(
              (testimonial) => testimonial.visibility === "public",
            ).map((testimonial) => {
              const jobCompany = resolveJobCompany(testimonial);

              return (
                <blockquote
                  key={`${testimonial.by}-${testimonial.date}`}
                  className={styles.testimonialLink}
                  role="button"
                  tabIndex={0}
                  onClick={() => scrollToCompanyJob(jobCompany)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      scrollToCompanyJob(jobCompany);
                    }
                  }}
                >
                  “{testimonial.quote}”
                  <cite>
                    {testimonial.by} · {testimonial.role} ·{" "}
                    {formatRecommendationDate(testimonial.date)} ·{" "}
                    {renderRelationship(testimonial.relationship, jobCompany)}
                  </cite>
                </blockquote>
              );
            })}
          </div>
          {canEdit ? (
            <div id="edit-recommendations" className="mt-4">
              <RecommendationsEditorForm
                username={profile.username}
                initialRecommendations={data.TESTIMONIALS}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section id="education" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.shead}>
            <span className={styles.snum}>05</span>
            <h2>Education</h2>
            <div className={styles.sline} />
          </div>
          <div className={styles.edugrid}>
            {(data.EDUCATION ?? []).map((education, educationIndex) => (
              <div
                key={`${education.degree}-${education.institution}-${educationIndex}`}
                className={styles.educard}
              >
                <div className={styles.edudeg}>{education.degree}</div>
                <div className={styles.eduuni}>{education.institution}</div>
                <div className={styles.edumeta}>{education.period}</div>
                <div className={styles.edugrade}>{education.grade}</div>
                <div className={styles.edunote}>{education.note}</div>
              </div>
            ))}
          </div>
          {canEdit ? (
            <div id="edit-education" className="mt-4">
              <EducationEditorForm
                username={profile.username}
                initialEducation={data.EDUCATION ?? []}
              />
            </div>
          ) : null}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.fname}>{profile.name}</div>
          <div className={styles.fline} />
          <div className={styles.finfo}>
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
