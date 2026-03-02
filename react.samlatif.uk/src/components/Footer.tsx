import { PROFILE } from "../data/cv";

export const Footer = () => {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const activeSite = hostname.startsWith("react.")
    ? "react"
    : hostname.startsWith("network.")
      ? "network"
      : "vanilla";

  return (
    <footer>
      <div className="container">
        <div className="fname">{PROFILE.name}</div>
        <div className="fline"></div>
        <div className="finfo">
          <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
          &nbsp;·&nbsp;
          <a
            className={`site-link${activeSite === "vanilla" ? " active" : ""}`}
            href="https://samlatif.uk"
          >
            Vanilla Site
          </a>
          &nbsp;·&nbsp;
          <a
            className={`site-link${activeSite === "react" ? " active" : ""}`}
            href="https://react.samlatif.uk"
          >
            React Site
          </a>
          &nbsp;·&nbsp;
          <a
            className={`site-link${activeSite === "network" ? " active" : ""}`}
            href="https://network.samlatif.uk"
          >
            Network Site
          </a>
        </div>
      </div>
    </footer>
  );
};
