import {
  DATE_BASED_STACK_DEFAULTS,
  GLOBAL_STACK_DEFAULTS,
  JOBS,
  SKILLS,
  TECH_ROWS,
} from "../data/cv";

interface TechSkillsProps {
  onAddTechFilters: (techs: string[]) => void;
}

const splitTechItems = (items: string) => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of items) {
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      const token = current.trim();
      if (token) {
        parts.push(token);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) {
    parts.push(last);
  }

  return parts;
};

const normalizeTechToken = (token: string) => {
  const aliasMap: Record<string, string[]> = {
    "JS (OOP, Functional, FRP)": ["JavaScript (ES5)", "JavaScript (ES6+)"],
    "CSS / SCSS / SASS / LESS": ["CSS3 / SCSS / LESS"],
    "Magento/OSCommerce": ["Magento"],
    "Canvas (FabricJS, PixiJS)": ["Canvas"],
  };

  return aliasMap[token] ?? [token];
};

const getFilterableTechSet = () => {
  const techSet = new Set<string>([
    ...SKILLS.map((skill) => skill.n),
    ...DATE_BASED_STACK_DEFAULTS.map((rule) => rule.skill),
    ...GLOBAL_STACK_DEFAULTS,
  ]);

  JOBS.forEach((job) => {
    job.stack.forEach((tech) => techSet.add(tech));
  });

  return techSet;
};

export const TechSkills = ({ onAddTechFilters }: TechSkillsProps) => {
  const filterableTechSet = getFilterableTechSet();

  const handleRowClick = (items: string) => {
    const parsedTechs = splitTechItems(items)
      .flatMap((token) => normalizeTechToken(token))
      .filter((tech) => filterableTechSet.has(tech));

    if (parsedTechs.length) {
      onAddTechFilters(parsedTechs);
    }
  };

  return (
    <section id="techskills">
      <div className="container">
        <div className="shead">
          <span className="snum">01</span>
          <h2>Technical Skills</h2>
          <div className="sline" />
        </div>
        <table className="tech-table">
          <tbody>
            {TECH_ROWS.map((row) => {
              const pct = Math.min(100, (parseInt(row.yrs, 10) * 100) / 15);
              return (
                <tr
                  className="tech-filterable"
                  key={row.cat}
                  onClick={() => handleRowClick(row.items)}
                >
                  <td>{row.cat}</td>
                  <td>
                    <div>
                      {row.items}
                      <span className="yrs">{row.yrs} yrs</span>
                    </div>
                    <div className="bar-wrap">
                      <div className="bar">
                        <div
                          className="bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
