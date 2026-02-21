export const Footer = () => {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const activeSite = hostname.startsWith("react.") ? "react" : "vanilla";

  return (
    <footer>
      <div className="container">
        <div className="fname">Sam Latif</div>
        <div className="fline"></div>
        <div className="finfo">
          <a href="mailto:hello@samlatif.uk">hello@samlatif.uk</a>
          &nbsp;·&nbsp;
          <a href="tel:07851885776">07851 885 776</a>
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
        </div>
      </div>
    </footer>
  );
};
