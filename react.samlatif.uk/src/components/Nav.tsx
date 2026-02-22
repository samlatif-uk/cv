interface NavProps {
  activeNav: string;
}

export const Nav = ({ activeNav }: NavProps) => (
  <nav>
    <div className="container">
      <div className="nav-inner">
        <a href="#overview" className={activeNav === "overview" ? "act" : ""}>
          Overview
        </a>
        <a
          href="#techskills"
          className={activeNav === "techskills" ? "act" : ""}
        >
          Tech Skills
        </a>
        <a href="#skills" className={activeNav === "skills" ? "act" : ""}>
          Stack Tags
        </a>
        <a
          href="#experience"
          className={activeNav === "experience" ? "act" : ""}
        >
          Experience
        </a>
        <a
          href="#recommendations"
          className={activeNav === "recommendations" ? "act" : ""}
        >
          Recommendations
        </a>
        <a href="#education" className={activeNav === "education" ? "act" : ""}>
          Education
        </a>
      </div>
    </div>
  </nav>
);
