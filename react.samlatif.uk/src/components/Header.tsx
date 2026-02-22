import { PROFILE } from "../data/cv";

export const Header = () => {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const activeSite = hostname.startsWith("react.") ? "react" : "vanilla";

  const nameParts = PROFILE.name.trim().split(" ");
  const firstName = nameParts.slice(0, -1).join(" ") || PROFILE.name;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  return (
    <header>
      <div className="container">
        <div className="eyebrow">
          {PROFILE.headline} &nbsp;·&nbsp; {PROFILE.location}
        </div>
        <h1>
          {firstName}{" "}
          {lastName ? <span className="acc">{lastName}</span> : null}
        </h1>
        <div className="role">{PROFILE.headline}</div>
        <div className="hcontact">
          <a href="tel:07851885776">
            <em>◆</em>07851 885 776
          </a>
          <a href={`mailto:${PROFILE.email}`}>
            <em>◆</em>
            {PROFILE.email}
          </a>
          <a
            className={`site-link${activeSite === "vanilla" ? " active" : ""}`}
            href="https://samlatif.uk"
          >
            <em>◆</em>Vanilla Site
          </a>
          <a
            className={`site-link${activeSite === "react" ? " active" : ""}`}
            href="https://react.samlatif.uk"
          >
            <em>◆</em>React Site
          </a>
          <a href="https://uk.linkedin.com/in/samlatifuk" target="_blank">
            <em>◆</em>LinkedIn
          </a>
          <a href="https://github.com/samlatif-uk" target="_blank">
            <em>◆</em>GitHub
          </a>
        </div>
        <div className="summary">
          <p>{PROFILE.bio}</p>
          <p>
            An early adopter of React, with deep expertise spanning every major
            version from 0.13 to 18, and a track record of bringing it into
            organisations before it became mainstream.
          </p>
          <p>
            Strong eye for design and UX, with a habit of dogfooding work
            personally — features are QA&apos;d before they ship, eliminating
            the &quot;chuck it over the fence&quot; bottleneck and getting
            polished, production-ready work into users&apos; hands faster.
          </p>
          <p>
            This CV is intentionally published as both Vanilla JS and React
            versions to demonstrate the same product thinking and UX decisions
            across different delivery styles — useful when teams need either
            framework flexibility or zero-dependency performance.
          </p>
        </div>
        <div className="hire-cta">
          <strong>Available for contract roles from July 2026.</strong>
          <a
            className="hire-btn"
            href="mailto:hello@samlatif.uk?subject=Contract%20Opportunity"
          >
            Hire Me
          </a>
        </div>
      </div>
    </header>
  );
};
