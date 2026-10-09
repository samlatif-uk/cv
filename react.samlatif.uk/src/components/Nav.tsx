import { useLayoutEffect, useRef } from "react";

interface NavProps {
  activeNav: string;
}

export const Nav = ({ activeNav }: NavProps) => {
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const updateHeight = () => document.documentElement.style.setProperty("--section-nav-height", `${nav.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--section-nav-height");
    };
  }, []);
  return (
  <nav ref={navRef} aria-label="Sections">
    <div className="container">
      <div className="nav-inner">
        <a href="#overview" className={activeNav === "overview" ? "act" : ""}>
          Overview
        </a>
        <a href="#experience" className={activeNav === "experience" ? "act" : ""}>
          Experience
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
};
