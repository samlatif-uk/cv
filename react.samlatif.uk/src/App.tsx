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

function App() {
  const [activeTechs, setActiveTechs] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeNav, setActiveNav] = useState("techskills");

  useEffect(() => {
    const handleScroll = () => {
      const currentSection = SECTION_IDS.reduce((current, id) => {
        const sectionElement = document.getElementById(id);
        if (sectionElement && window.scrollY >= sectionElement.offsetTop - 80) {
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
