import { TESTIMONIALS } from "../data/cv";

const toCompanyKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getFilterBarHeight = () => {
  const filterBar = document.getElementById("fbar");
  if (!filterBar || !filterBar.classList.contains("show")) {
    return 0;
  }

  const styles = window.getComputedStyle(filterBar);
  const marginBottom = parseFloat(styles.marginBottom) || 0;
  return filterBar.offsetHeight + marginBottom;
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

export const Recommendations = () => {
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
      (jobCard?.querySelector(".jhead") as HTMLElement | null) ??
      jobCard ??
      experienceSection;
    const targetY =
      target.getBoundingClientRect().top +
      window.scrollY -
      (120 + getFilterBarHeight());

    window.scrollTo({ top: targetY, behavior: "smooth" });
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
          {TESTIMONIALS.filter(
            (testimonial) => testimonial.visibility === "public",
          ).map((testimonial) => (
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
