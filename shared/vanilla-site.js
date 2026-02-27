const TECH_ROWS = [];
const SKILLS = [];
const DATE_BASED_STACK_DEFAULTS = [];
const GLOBAL_STACK_DEFAULTS = [];
const TESTIMONIALS = [];
const JOBS = [];
const PROFILE = {
  username: "samlatif",
  name: "Sam Latif",
  email: "hello@samlatif.uk",
  headline: "Senior Fullstack Consultant",
  location: "West London, UK",
  bio: "15+ years delivering high-performance, scalable web applications.",
};

function applyProfileData() {
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");

  if (header) {
    const eyebrow = header.querySelector(".eyebrow");
    if (eyebrow) {
      eyebrow.innerHTML = `${PROFILE.headline} &nbsp;·&nbsp; ${PROFILE.location}`;
    }

    const heading = header.querySelector("h1");
    if (heading) {
      const parts = PROFILE.name.trim().split(" ");
      const first = parts.slice(0, -1).join(" ") || PROFILE.name;
      const last = parts.length > 1 ? parts[parts.length - 1] : "";
      heading.innerHTML = last
        ? `${first} <span class="acc">${last}</span>`
        : first;
    }

    const role = header.querySelector(".role");
    if (role) {
      role.textContent = PROFILE.headline;
    }

    header.querySelectorAll('.hcontact a[href^="mailto:"]').forEach((link) => {
      link.setAttribute("href", `mailto:${PROFILE.email}`);
      link.innerHTML = "<em>◆</em>" + PROFILE.email;
    });

    const summaryFirst = header.querySelector(".summary p");
    if (summaryFirst) {
      summaryFirst.textContent = PROFILE.bio;
    }

    const hireButton = header.querySelector(".hire-btn");
    if (hireButton) {
      hireButton.setAttribute(
        "href",
        `mailto:${PROFILE.email}?subject=Contract%20Opportunity`,
      );
    }
  }

  if (footer) {
    const name = footer.querySelector(".fname");
    if (name) {
      name.textContent = PROFILE.name;
    }

    footer.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
      link.setAttribute("href", `mailto:${PROFILE.email}`);
      link.textContent = PROFILE.email;
    });
  }
}

async function loadSharedCvData() {
  const syncArray = (target, source) => {
    if (!Array.isArray(target) || !Array.isArray(source)) {
      return;
    }
    target.splice(0, target.length, ...source);
  };

  const applyData = (sharedData) => {
    syncArray(TECH_ROWS, sharedData.TECH_ROWS);
    syncArray(SKILLS, sharedData.SKILLS);
    syncArray(DATE_BASED_STACK_DEFAULTS, sharedData.DATE_BASED_STACK_DEFAULTS);
    syncArray(GLOBAL_STACK_DEFAULTS, sharedData.GLOBAL_STACK_DEFAULTS);
    syncArray(TESTIMONIALS, sharedData.TESTIMONIALS);
    syncArray(JOBS, sharedData.JOBS);

    if (sharedData.profile) {
      Object.assign(PROFILE, sharedData.profile);
    }
  };

  const fetchJson = async (url, timeoutMs = 0) => {
    try {
      const controller = timeoutMs > 0 ? new AbortController() : null;
      const timeoutId =
        controller && timeoutMs > 0
          ? setTimeout(() => controller.abort(), timeoutMs)
          : null;

      const response = await fetch(url, {
        cache: "no-cache",
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch {
      return null;
    }
  };

  const apiData = await fetchJson(
    "https://network.samlatif.uk/api/cv/samlatif",
    3500,
  );

  if (apiData) {
    applyData(apiData);
    return true;
  }

  const candidates = [
    "/shared/cv-data.json",
    "./shared/cv-data.json",
    "./cv-data.json",
  ];

  for (const candidate of candidates) {
    const sharedData = await fetchJson(candidate, 3500);
    if (sharedData) {
      applyData(sharedData);
      return true;
    }
  }

  console.warn("Unable to load shared CV data.");
  return false;
}

function renderDataUnavailableNotice() {
  const techTable = document.getElementById("techTable");
  const skillsWrap = document.getElementById("swrap");
  const timeline = document.getElementById("tl");

  if (techTable) {
    techTable.innerHTML =
      '<tr><td colspan="2">CV data is temporarily unavailable.</td></tr>';
  }

  if (skillsWrap) {
    skillsWrap.innerHTML =
      '<span class="stag">Data unavailable — please refresh later.</span>';
  }

  if (timeline) {
    timeline.innerHTML =
      '<div class="job vis"><div class="jdesc">CV data is temporarily unavailable. Please refresh later.</div></div>';
  }

  const testimonials = document.querySelector("#recommendations .testimonials");
  if (testimonials) {
    testimonials.innerHTML =
      "<blockquote>Recommendations are temporarily unavailable.</blockquote>";
  }
}

function renderTestimonials() {
  const testimonials = document.querySelector("#recommendations .testimonials");
  if (!testimonials) {
    return;
  }

  const getDateValue = (dateText) => {
    const timestamp = Date.parse(dateText);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const formatRecommendationDate = (dateText) => {
    const timestamp = Date.parse(dateText);
    if (Number.isNaN(timestamp)) {
      return dateText || "Unknown date";
    }

    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const publicTestimonials = TESTIMONIALS.filter(
    (testimonial) => testimonial.visibility === "public",
  )
    .slice()
    .sort(
      (first, second) => getDateValue(second.date) - getDateValue(first.date),
    );

  if (!publicTestimonials.length) {
    testimonials.innerHTML =
      "<blockquote>No recommendations available yet.</blockquote>";
    return;
  }

  testimonials.innerHTML = publicTestimonials
    .map(
      (testimonial) =>
        `<blockquote class="testimonial-link" data-job-company="${toCompanyKey(testimonial.jobCompany || "")}">“${testimonial.quote}”<cite>${testimonial.by} · ${testimonial.role} · ${formatRecommendationDate(testimonial.date)} · ${formatRelationship(testimonial)}</cite></blockquote>`,
    )
    .join("");

  testimonials.querySelectorAll(".testimonial-link").forEach((item) => {
    item.addEventListener("click", () => {
      scrollToJobByCompany(item.getAttribute("data-job-company") || "");
    });
  });
}

function renderOverviewStats() {
  const recommendationsCount = document.getElementById(
    "overviewRecommendationsCount",
  );

  if (!recommendationsCount) {
    return;
  }

  const publicTestimonials = TESTIMONIALS.filter(
    (testimonial) => testimonial.visibility === "public",
  );

  recommendationsCount.textContent = String(publicTestimonials.length);
}

function formatRelationship(testimonial) {
  if (
    testimonial.jobCompany &&
    testimonial.relationship.includes(testimonial.jobCompany)
  ) {
    return testimonial.relationship.replace(
      testimonial.jobCompany,
      `<span class="rec-company">${testimonial.jobCompany}</span>`,
    );
  }

  return testimonial.relationship;
}

function toCompanyKey(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeForSingleQuotedInline(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function renderTechTable() {
  document.getElementById("techTable").innerHTML = TECH_ROWS.map((r, index) => {
    const pct = Math.min(100, (parseInt(r.yrs) * 100) / 15);
    return `<tr class="tech-filterable" onclick="addFiltersFromTechRow(${index})"><td>${r.cat}</td><td><div>${r.items}<span class="yrs">${r.yrs} yrs</span></div><div class="bar-wrap"><div class="bar"><div class="bar-fill" style="width:0" data-w="${pct}%"></div></div></div></td></tr>`;
  }).join("");
  const io = new IntersectionObserver(
    (es, o) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.querySelectorAll(".bar-fill").forEach((b) => {
            b.style.width = b.dataset.w;
          });
          o.unobserve(e.target);
        }
      });
    },
    { threshold: 0.2 },
  );
  document.querySelectorAll("#techTable tr").forEach((r) => io.observe(r));
}

let activeCat = "all",
  activeTechs = [];

function getJobStartYear(date) {
  const years = date.match(/\d{4}/g) || [];
  return years.length ? Number(years[0]) : null;
}

function getJavaScriptVersionedSkill(startYear) {
  return startYear !== null && startYear < 2015
    ? "JavaScript (ES5)"
    : "JavaScript (ES6+)";
}

const isSkillMatch = (filterSkill, jobSkill) =>
  window.CVFilterUtils.isSkillMatch(filterSkill, jobSkill);

function withJobStackDefaults(stack, date) {
  const startYear = getJobStartYear(date);
  const normalizedStack = stack.map((skill) =>
    skill === "JavaScript" ? getJavaScriptVersionedSkill(startYear) : skill,
  );
  const stackWithGlobalDefaults = GLOBAL_STACK_DEFAULTS.reduce((acc, skill) => {
    if (!acc.includes(skill)) {
      return [skill, ...acc];
    }
    return acc;
  }, normalizedStack);

  if (startYear === null) {
    return stackWithGlobalDefaults;
  }
  return DATE_BASED_STACK_DEFAULTS.reduce((acc, rule) => {
    const aboveMin =
      rule.minStartYear === undefined || startYear >= rule.minStartYear;
    const belowMax =
      rule.maxStartYear === undefined || startYear <= rule.maxStartYear;
    if (aboveMin && belowMax && !acc.includes(rule.skill)) {
      return [rule.skill, ...acc];
    }
    return acc;
  }, stackWithGlobalDefaults);
}

const splitTechItems = (items) => window.CVFilterUtils.splitTechItems(items);

const normalizeTechToken = (token) =>
  window.CVFilterUtils.normalizeTechToken(token);

function getFilterableTechSet() {
  const techSet = new Set([
    ...SKILLS.map((skill) => skill.n),
    ...DATE_BASED_STACK_DEFAULTS.map((rule) => rule.skill),
    ...GLOBAL_STACK_DEFAULTS,
  ]);

  JOBS.forEach((job) => {
    withJobStackDefaults(job.stack, job.date).forEach((tech) =>
      techSet.add(tech),
    );
  });

  return techSet;
}

function addTechFilters(techs) {
  activeTechs = Array.from(new Set([...activeTechs, ...techs]));
  renderJobs();
  renderFilterBar();
  renderSkills();

  if (activeTechs.length) {
    scrollToBestMatchingJob();
  }
}

function addFiltersFromTechRow(index) {
  const row = TECH_ROWS[index];
  if (!row) {
    return;
  }

  const filterableTechSet = getFilterableTechSet();
  const parsedTechs = splitTechItems(row.items)
    .flatMap((token) => normalizeTechToken(token))
    .filter((tech) => filterableTechSet.has(tech));

  if (parsedTechs.length) {
    addTechFilters(parsedTechs);
  }
}

function renderSkills() {
  document.getElementById("swrap").innerHTML = SKILLS.map((s) => {
    const show = activeCat === "all" || s.c === activeCat;
    const lit = activeTechs.includes(s.n);
    return `<button class="stag${!show ? " dim" : ""}${lit ? " lit" : ""}" type="button" onclick="filterTech('${s.n.replace(/'/g, "\\'")}')">${s.n}</button>`;
  }).join("");
}

document.querySelectorAll(".fbtn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".fbtn").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    activeCat = b.dataset.cat;
    renderSkills();
  });
});

function renderJobs() {
  document.getElementById("tl").innerHTML = JOBS.map((j, i) => {
    const stackWithDefaults = withJobStackDefaults(j.stack, j.date);
    const matched = activeTechs.length
      ? activeTechs.some((a) =>
          stackWithDefaults.some((t) => isSkillMatch(a, t)),
        )
      : false;
    const filtered = activeTechs.length && !matched;
    return `<div class="job${matched ? " match" : ""}${filtered ? " filtered" : ""}" data-job-company="${toCompanyKey(j.co)}" style="transition-delay:${i * 0.03}s">
<div class="jhead"><div class="jco">${j.co}</div><div class="jdate">${j.date}</div></div>
<div class="jtitle">${j.title}</div>
<div class="jdesc">${j.desc}</div>
${j.bullets.length ? `<ul class="jbuls">${j.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
${stackWithDefaults.length ? `<div class="jstack">${stackWithDefaults.map((t) => `<button class="jtag${activeTechs.some((a) => isSkillMatch(a, t)) ? " lit" : ""}" onclick="filterTech('${escapeForSingleQuotedInline(t)}')">${t}</button>`).join("")}</div>` : ""}
</div>`;
  }).join("");
  const io = new IntersectionObserver(
    (es, o) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("vis");
          o.unobserve(e.target);
        }
      });
    },
    { threshold: 0.05 },
  );
  document.querySelectorAll(".job").forEach((el) => io.observe(el));
}

function renderFilterBar() {
  document
    .getElementById("fbar")
    .classList.toggle("show", activeTechs.length > 0);
  document.getElementById("fchips").innerHTML = activeTechs
    .map(
      (t) =>
        `<button class="fchip" type="button" onclick="filterTech('${t.replace(/'/g, "\\'")}')">${t} ×</button>`,
    )
    .join("");

  const matchCount = getMatchingJobIndexes().length;
  const canJumpMatches = activeTechs.length > 0 && matchCount > 0;

  ["fprev", "fnext"].forEach((id) => {
    const button = document.getElementById(id);
    if (!button) {
      return;
    }

    button.disabled = !canJumpMatches;
  });

  updateMatchPositionLabel();
}

function getElementOuterHeight(element) {
  if (!element) {
    return 0;
  }

  const styles = window.getComputedStyle(element);
  const marginTop = parseFloat(styles.marginTop) || 0;
  const marginBottom = parseFloat(styles.marginBottom) || 0;
  return element.offsetHeight + marginTop + marginBottom;
}

function getStickyNavOffset() {
  return getElementOuterHeight(document.querySelector("nav"));
}

function getSectionAboveContentHeight(target) {
  const section = target?.closest("section");
  const container = target?.closest(".container");

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
}

function scrollWithDynamicOffset(target, includeSectionAboveContent = false) {
  if (!target) {
    return;
  }

  const targetY = getTargetScrollTop(target, includeSectionAboveContent);

  window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
}

function getTargetScrollTop(target, includeSectionAboveContent = false) {
  if (!target) {
    return 0;
  }

  return (
    target.getBoundingClientRect().top +
    window.scrollY -
    getStickyNavOffset() -
    (includeSectionAboveContent ? getSectionAboveContentHeight(target) : 0)
  );
}

function getMatchedJobTargets() {
  const allJobs = Array.from(document.querySelectorAll("#experience .job"));

  return getMatchingJobIndexes()
    .map((index) => allJobs[index])
    .filter(Boolean)
    .map((job) => job.querySelector(".jhead") || job);
}

function getCurrentMatchPosition(targets) {
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
}

function updateMatchPositionLabel() {
  const label = document.getElementById("fmatchpos");
  if (!label) {
    return;
  }

  const targets = getMatchedJobTargets();
  const total = targets.length;

  if (!activeTechs.length || !total) {
    label.textContent = "0/0";
    return;
  }

  label.textContent = `${getCurrentMatchPosition(targets)}/${total}`;
}

function getMatchingJobIndexes() {
  if (!activeTechs.length) {
    return [];
  }

  return JOBS.reduce((indexes, job, index) => {
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
}

function scrollToRelativeMatch(direction) {
  if (!activeTechs.length) {
    return;
  }

  const targets = getMatchedJobTargets();
  if (!targets.length) {
    return;
  }

  const currentY = window.scrollY;
  const threshold = 6;
  const positions = targets.map((target) => getTargetScrollTop(target, true));

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
}

function scrollToBestMatchingJob() {
  const allJobElements = Array.from(
    document.querySelectorAll("#experience .job"),
  );
  const latestSelectedTech = activeTechs[activeTechs.length - 1];

  let bestMatchIndex = -1;
  let bestMatchCount = -1;
  let bestHasLatest = false;

  JOBS.forEach((job, index) => {
    const stackWithDefaults = withJobStackDefaults(job.stack, job.date);
    const matchCount = activeTechs.filter((activeTech) =>
      stackWithDefaults.some((stackTech) =>
        isSkillMatch(activeTech, stackTech),
      ),
    ).length;

    if (matchCount === 0) {
      return;
    }

    const hasLatest = latestSelectedTech
      ? stackWithDefaults.some((stackTech) =>
          isSkillMatch(latestSelectedTech, stackTech),
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
    const target = firstMatch.querySelector(".jhead") || firstMatch;
    scrollWithDynamicOffset(target, true);
  } else {
    const experience = document.getElementById("experience");
    if (experience) {
      scrollWithDynamicOffset(experience);
    }
  }
}

function scrollToJobByCompany(companyKey) {
  const experience = document.getElementById("experience");
  if (!experience) {
    return;
  }

  if (!companyKey) {
    scrollWithDynamicOffset(experience);
    return;
  }

  const job = document.querySelector(
    `#experience .job[data-job-company="${companyKey}"]`,
  );
  const target = job?.querySelector(".jhead") || job || experience;
  scrollWithDynamicOffset(target, target !== experience);
}

function filterTech(t) {
  activeTechs = activeTechs.includes(t)
    ? activeTechs.filter((x) => x !== t)
    : [...activeTechs, t];
  renderJobs();
  renderFilterBar();
  renderSkills();
  if (activeTechs.length) {
    scrollToBestMatchingJob();
  } else {
    scrollWithDynamicOffset(document.getElementById("experience"));
  }
}

function clearF() {
  activeTechs = [];
  renderJobs();
  renderFilterBar();
  renderSkills();
  scrollWithDynamicOffset(document.getElementById("experience"));
}

document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href") || "";
    const id = href.replace("#", "");
    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    event.preventDefault();
    scrollWithDynamicOffset(target);
    window.history.replaceState(null, "", `#${id}`);
  });
});

const SIDS = [
  "overview",
  "techskills",
  "skills",
  "experience",
  "recommendations",
  "education",
];
window.addEventListener("scroll", () => {
  let cur = "";
  SIDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - getStickyNavOffset()) {
      cur = id;
    }
  });
  document
    .querySelectorAll("nav a")
    .forEach((a) =>
      a.classList.toggle("act", a.getAttribute("href") === "#" + cur),
    );
  updateMatchPositionLabel();
});

function setActiveSiteLink() {
  const activeSite = window.location.hostname.startsWith("react.")
    ? "react"
    : "vanilla";

  document.querySelectorAll(".site-link").forEach((link) => {
    link.classList.toggle(
      "active",
      link.getAttribute("data-site") === activeSite,
    );
  });
}

loadSharedCvData().then((loaded) => {
  applyProfileData();
  setActiveSiteLink();

  if (!loaded) {
    renderDataUnavailableNotice();
    return;
  }

  renderTechTable();
  renderOverviewStats();
  renderTestimonials();
  renderSkills();
  renderFilterBar();
  renderJobs();
});
