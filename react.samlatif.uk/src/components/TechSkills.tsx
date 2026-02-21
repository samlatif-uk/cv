import {
  DATE_BASED_STACK_DEFAULTS,
  GLOBAL_STACK_DEFAULTS,
  JOBS,
  SKILLS,
  TECH_ROWS,
} from "../data/cv";
import { normalizeTechToken, splitTechItems } from "../utils/filterUtils";

interface TechSkillsProps {
  onAddTechFilters: (techs: string[]) => void;
}

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
