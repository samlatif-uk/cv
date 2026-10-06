import { PROFILE } from "../data/cv";

export const Header = () => {
  const activeSite: string = "react";

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
          <a href="/lab/">Explore in 3D ↗</a>
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
          <a
            href="https://uk.linkedin.com/in/samlatifuk"
            target="_blank"
            rel="noopener noreferrer"
          >
            <em>◆</em>LinkedIn
          </a>
          <a
            href="https://github.com/samlatif-uk"
            target="_blank"
            rel="noopener noreferrer"
          >
            <em>◆</em>GitHub
          </a>
          <button
            type="button"
            className="pdf-btn"
            onClick={() => window.print()}
          >
            <em>◆</em>Export PDF
          </button>
        </div>
        <div className="hero-grid">
          <div className="hero-intro">
            <h2 className="hero-title">
              Complex products.<br /><span>Considered experiences.</span>
            </h2>
            <div className="summary">
              <p>{PROFILE.bio}</p>
              <p>I bring frontend engineering and an eye for UX to demanding products — from financial platforms to fast-moving digital businesses.</p>
            </div>
            <div className="hero-actions">
              <a className="hire-btn" href={`mailto:${PROFILE.email}?subject=Contract%20Opportunity`}>
                Let’s talk <span aria-hidden="true">↗</span>
              </a>
              <a className="experience-link" href="#experience">
                Explore my experience <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="availability">Available for contract roles from July 2026.</p>
          </div>
          <aside className="hero-proof" aria-label="Selected client experience">
            <p className="proof-label">EXPERIENCE THAT DELIVERS</p>
            <p className="proof-intro">Trusted with complex challenges.</p>
            <ul className="client-list">
              <li>Bank of America <span>Engineering</span></li>
              <li>Goldman Sachs <span>Trading platforms</span></li>
              <li>Visa <span>Frontend delivery</span></li>
              <li>Deutsche Bank <span>Modernisation</span></li>
            </ul>
            <p className="proof-note">React · TypeScript · Fullstack · UX</p>
          </aside>
        </div>
      </div>
    </header>
  );
};
