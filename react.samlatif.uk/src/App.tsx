import { useEffect, useState } from "react";
import { Education } from "./components/Education";
import { Experience } from "./components/Experience";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Nav } from "./components/Nav";
import { Overview } from "./components/Overview";
import { Recommendations } from "./components/Recommendations";
import { StackTags } from "./components/StackTags";
import { TechSkills } from "./components/TechSkills";

const SECTION_IDS = [
  "overview",
  "techskills",
  "skills",
  "experience",
  "recommendations",
  "education",
];

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

const scrollWithDynamicOffset = (target: HTMLElement) => {
  const targetY =
    target.getBoundingClientRect().top + window.scrollY - getStickyNavOffset();

  window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
};

function App() {
  const [activeTechs, setActiveTechs] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeNav, setActiveNav] = useState("techskills");

  useEffect(() => {
    const handleScroll = () => {
      const currentSection = SECTION_IDS.reduce((current, id) => {
        const sectionElement = document.getElementById(id);
        if (
          sectionElement &&
          window.scrollY >= sectionElement.offsetTop - getStickyNavOffset()
        ) {
          return id;
        }

        return current;
      }, "");

      if (currentSection) {
        setActiveNav(currentSection);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const navLinks = Array.from(
      document.querySelectorAll('nav a[href^="#"]'),
    ) as HTMLAnchorElement[];

    const unsubs = navLinks.map((link) => {
      const onClick = (event: MouseEvent) => {
        const href = link.getAttribute("href") || "";
        const id = href.replace("#", "");
        const target = document.getElementById(id);

        if (!target || !SECTION_IDS.includes(id)) {
          return;
        }

        event.preventDefault();
        scrollWithDynamicOffset(target);
        window.history.replaceState(null, "", `#${id}`);
      };

      link.addEventListener("click", onClick);
      return () => link.removeEventListener("click", onClick);
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const handleTechClick = (tech: string) => {
    setActiveTechs((current) =>
      current.includes(tech)
        ? current.filter((item) => item !== tech)
        : [...current, tech],
    );
  };

  const handleAddTechFilters = (techs: string[]) => {
    setActiveTechs((current) => Array.from(new Set([...current, ...techs])));
  };

  return (
    <>
      <Header />
      <Nav activeNav={activeNav} />
      <Overview />
      <TechSkills onAddTechFilters={handleAddTechFilters} />
      <StackTags
        activeCategory={activeCategory}
        activeTechs={activeTechs}
        onCategoryChange={setActiveCategory}
        onTechClick={handleTechClick}
      />
      <Experience
        activeTechs={activeTechs}
        onTechClick={handleTechClick}
        onClearTech={() => setActiveTechs([])}
      />
      <Recommendations />
      <Education />
      <Footer />
    </>
  );
}

export default App;
