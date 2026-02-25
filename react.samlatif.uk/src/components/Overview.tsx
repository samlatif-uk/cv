import { TESTIMONIALS } from "../data/cv";

export const Overview = () => {
  const recommendationsCount = TESTIMONIALS.filter(
    (testimonial) => testimonial.visibility === "public",
  ).length;

  return (
    <section id="overview">
      <div className="container">
        <div className="stats">
          <div className="stat">
            <div className="sn">15+</div>
            <div className="sl">Years Experience</div>
          </div>
          <div className="stat">
            <div className="sn">25+</div>
            <div className="sl">Client Engagements</div>
          </div>
          <div className="stat">
            <div className="sn">5</div>
            <div className="sl">Finance Institutions</div>
          </div>
          <div className="stat">
            <div className="sn">{recommendationsCount}</div>
            <div className="sl">Recommendations</div>
          </div>
        </div>
      </div>
    </section>
  );
};
