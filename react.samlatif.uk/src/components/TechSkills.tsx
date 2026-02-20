import { TECH_ROWS } from '../data/cv';

export const TechSkills = () => (
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
              <tr key={row.cat}>
                <td>{row.cat}</td>
                <td>
                  <div>
                    {row.items}
                    <span className="yrs">{row.yrs} yrs</span>
                  </div>
                  <div className="bar-wrap">
                    <div className="bar">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
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
