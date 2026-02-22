"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SamCvProfile.module.css";
import type { CvData } from "@/lib/cvData";

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

const splitSkillTokens = (skill: string) =>
  skill
    .toLowerCase()
    .split("/")
    .map((token) => token.trim())
    .filter(Boolean);

const isSkillMatch = (filterSkill: string, jobSkill: string) => {
  if (filterSkill === "React") {
    return /^React(?:\s|$)/.test(jobSkill) && jobSkill !== "React Native";
  }

  if (filterSkill === jobSkill) {
    return true;
  }

  const filterTokens = splitSkillTokens(filterSkill);
  const jobTokens = splitSkillTokens(jobSkill);

  return filterTokens.some((filterToken) =>
    jobTokens.some(
      (jobToken) =>
        jobToken === filterToken ||
        jobToken.includes(filterToken) ||
        filterToken.includes(jobToken),
    ),
  );
};

const splitTechItems = (items: string) => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of items) {
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      const token = current.trim();
      if (token) {
        parts.push(token);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) {
    parts.push(last);
  }

  return parts;
};

const normalizeTechToken = (token: string) => {
  const aliasMap: Record<string, string[]> = {
    "JS (OOP, Functional, FRP)": ["JavaScript (ES5)", "JavaScript (ES6+)"],
    "CSS / SCSS / SASS / LESS": ["CSS3 / SCSS / LESS"],
    "Magento/OSCommerce": ["Magento"],
    "Canvas (FabricJS, PixiJS)": ["Canvas"],
  };

  return aliasMap[token] ?? [token];
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

const getFilterBarHeight = () => {
  const filterBar = document.getElementById("fbar");
  if (!filterBar || !filterBar.classList.contains(styles.show)) {
    return 0;
  }

  const margins = window.getComputedStyle(filterBar);
  const marginBottom = parseFloat(margins.marginBottom) || 0;
  return filterBar.offsetHeight + marginBottom;
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
};

export function SamCvProfile({
  data,
  profile,
}: {
  data: CvData;
  profile: ProfileIdentity;
}) {
  const [firstName, ...restNameParts] = profile.name.split(" ");
  const lastName = restNameParts.join(" ");
  const isSam = profile.username === "samlatif";
  const [activeTechs, setActiveTechs] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [activeNav, setActiveNav] = useState("techskills");
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

  useEffect(() => {
    const handleScroll = () => {
      const currentSection = SECTION_IDS.reduce((current, id) => {
        const sectionElement = document.getElementById(id);
        if (
          sectionElement &&
          window.scrollY >= sectionElement.offsetTop - 120
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
    const withJobStackDefaults = (stack: string[], date: string) => {
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
    };

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
      document.querySelectorAll('[data-job="true"]'),
    ) as HTMLElement[];
    const latestSelectedTech = activeTechs[activeTechs.length - 1];

    let bestMatchIndex = -1;
    let bestMatchCount = -1;
    let bestHasLatest = false;

    data.JOBS.forEach((job, index) => {
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
        (firstMatch.querySelector(
          '[data-jhead="true"]',
        ) as HTMLElement | null) ?? firstMatch;
      const targetY =
        target.getBoundingClientRect().top +
        window.scrollY -
        (140 + getFilterBarHeight());
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }

    previousFilterCount.current = activeTechs.length;
  }, [activeTechs, data]);

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

  const withJobStackDefaults = (stack: string[], date: string) => {
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
  };

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
      experienceSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const targetY =
      target.getBoundingClientRect().top +
      window.scrollY -
      (140 + getFilterBarHeight());

    window.scrollTo({ top: targetY, behavior: "smooth" });
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
          <div className={styles.role}>
            {isSam
              ? "Frontend / UX Specialist · 15+ Years"
              : `@${profile.username}`}
          </div>
          <div className={styles.hcontact}>
            {isSam ? (
              <a href="tel:07851885776">
                <em>◆</em>07851 885 776
              </a>
            ) : null}
            <a href={`mailto:${profile.email}`}>
              <em>◆</em>
              {profile.email}
            </a>
            {isSam ? (
              <>
                <a href="https://samlatif.uk" target="_blank" rel="noreferrer">
                  <em>◆</em>Vanilla Site
                </a>
                <a
                  href="https://react.samlatif.uk"
                  target="_blank"
                  rel="noreferrer"
                >
                  <em>◆</em>React Site
                </a>
                <a
                  href="https://uk.linkedin.com/in/samlatifuk"
                  target="_blank"
                  rel="noreferrer"
                >
                  <em>◆</em>LinkedIn
                </a>
                <a
                  href="https://github.com/samlatif-uk"
                  target="_blank"
                  rel="noreferrer"
                >
                  <em>◆</em>GitHub
                </a>
              </>
            ) : null}
          </div>
          <ul className={styles.summary}>
            {(profile.summary.length ? profile.summary : [profile.bio]).map(
              (line) => (
                <p key={line}>{line}</p>
              ),
            )}
          </ul>
          {isSam ? (
            <div className={styles.hireCta}>
              <strong>Available for contract roles from July 2026.</strong>
              <a
                className={styles.hireBtn}
                href="mailto:hello@samlatif.uk?subject=Contract%20Opportunity"
              >
                Hire Me
              </a>
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
            <a
              href="#techskills"
              className={activeNav === "techskills" ? styles.active : ""}
            >
              Tech Skills
            </a>
            <a
              href="#skills"
              className={activeNav === "skills" ? styles.active : ""}
            >
              Stack Tags
            </a>
            <a
              href="#experience"
              className={activeNav === "experience" ? styles.active : ""}
            >
              Experience
            </a>
            <a
              href="#recommendations"
              className={activeNav === "recommendations" ? styles.active : ""}
            >
              Recommendations
            </a>
            <a
              href="#education"
              className={activeNav === "education" ? styles.active : ""}
            >
              Education
            </a>
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
        </div>
      </section>

      <section id="skills" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.shead}>
            <span className={styles.snum}>02</span>
            <h2>Stack at a Glance</h2>
            <div className={styles.sline} />
          </div>
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
                    {renderRelationship(testimonial.relationship, jobCompany)}
                  </cite>
                </blockquote>
              );
            })}
          </div>
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
            <div className={styles.educard}>
              <div className={styles.edudeg}>
                MSc Computer Games &amp; Entertainment
              </div>
              <div className={styles.eduuni}>
                Goldsmiths, University of London
              </div>
              <div className={styles.edumeta}>2011 – 2012</div>
              <div className={styles.edugrade}>Merit · 67%</div>
              <div className={styles.edunote}>
                Final project deferred to maintain quality of concurrent client
                commitments.
              </div>
            </div>
            <div className={styles.educard}>
              <div className={styles.edudeg}>
                BSc Computer Games Technologies
              </div>
              <div className={styles.eduuni}>University of East London</div>
              <div className={styles.edumeta}>2007 – 2010</div>
              <div className={styles.edugrade}>1st Class Honours</div>
              <div className={styles.edunote}>
                Modules: Games Programming, 3D Graphics, Virtual Environments,
                Network Gaming, Advanced Animation, Project Management.
              </div>
            </div>
            <div className={styles.educard}>
              <div className={styles.edudeg}>
                BSc Cognitive Science (1st year attended)
              </div>
              <div className={styles.eduuni}>University of Leeds</div>
              <div className={styles.edumeta}>2005 – 2006</div>
              <div className={styles.edugrade}>Year 1 Completed</div>
              <div className={styles.edunote}>
                Foundations in HCI, UX design, human behaviour and logic —
                directly relevant to frontend and UX work.
              </div>
            </div>
          </div>
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
