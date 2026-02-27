import { TESTIMONIALS } from "../data/cv";

const toCompanyKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
  const targetY =
    target.getBoundingClientRect().top +
    window.scrollY -
    getStickyNavOffset() -
    (includeSectionAboveContent ? getSectionAboveContentHeight(target) : 0);

  window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
};

const formatRelationship = (relationship: string, jobCompany?: string) => {
  if (!jobCompany || !relationship.includes(jobCompany)) {
    return relationship;
  }

  const start = relationship.indexOf(jobCompany);
  const before = relationship.slice(0, start);
  const after = relationship.slice(start + jobCompany.length);

  return (
    <>
      {before}
      <span className="rec-company">{jobCompany}</span>
      {after}
    </>
  );
};

const getDateValue = (dateText: string) => {
  const timestamp = Date.parse(dateText);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatRecommendationDate = (dateText: string) => {
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

export const Recommendations = () => {
  const publicTestimonials = TESTIMONIALS.filter(
    (testimonial) => testimonial.visibility === "public",
  )
    .slice()
    .sort(
      (first, second) => getDateValue(second.date) - getDateValue(first.date),
    );

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
      (jobCard?.querySelector(".jhead") as HTMLElement | null) ??
      jobCard ??
      experienceSection;
    scrollWithDynamicOffset(target, target !== experienceSection);
  };

  return (
    <section id="recommendations">
      <div className="container">
        <div className="shead">
          <span className="snum">04</span>
          <h2>Recommendations</h2>
          <div className="sline" />
        </div>
        <div className="testimonials">
          {publicTestimonials.map((testimonial) => (
            <blockquote
              key={`${testimonial.by}-${testimonial.date}`}
              className="testimonial-link"
              role="button"
              tabIndex={0}
              onClick={() => scrollToCompanyJob(testimonial.jobCompany)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  scrollToCompanyJob(testimonial.jobCompany);
                }
              }}
            >
              “{testimonial.quote}”
              <cite>
                {testimonial.by} · {testimonial.role} ·{" "}
                {formatRecommendationDate(testimonial.date)} ·{" "}
                {formatRelationship(
                  testimonial.relationship,
                  testimonial.jobCompany,
                )}
              </cite>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
};
