import { JOBS } from '../data/cv';

interface ExperienceProps {
  activeTechs: string[];
  onTechClick: (tech: string) => void;
  onClearTech: () => void;
}

export const Experience = ({ activeTechs, onTechClick, onClearTech }: ExperienceProps) => (
  <section id="experience">
    <div className="container">
      <div className="shead">
        <span className="snum">03</span>
        <h2>Experience</h2>
        <div className="sline" />
      </div>
      <div className={`fbar ${activeTechs.length ? 'show' : ''}`}>
        <span>
          Filtering by: <strong>{activeTechs.join(', ')}</strong>
        </span>
        <button className="fclear" onClick={onClearTech} type="button">
          Clear ×
        </button>
      </div>
      <div className="tl">
        {JOBS.map((job, index) => {
          const stackWithDefaults = job.stack.includes('JavaScript (ES6+)') ? job.stack : ['JavaScript (ES6+)', ...job.stack];
          const matched = activeTechs.length
            ? activeTechs.some((activeTech) => stackWithDefaults.some((tech) => tech.toLowerCase().includes(activeTech.toLowerCase())))
            : false;
          const filtered = activeTechs.length > 0 && !matched;

          return (
            <div
              key={`${job.co}-${job.date}`}
              className={`job vis ${matched ? 'match' : ''} ${filtered ? 'filtered' : ''}`}
              style={{ transitionDelay: `${index * 0.03}s` }}
            >
              <div className="jhead">
                <div className="jco">{job.co}</div>
                <div className="jdate">{job.date}</div>
              </div>
              <div className="jtitle">{job.title}</div>
              <div className="jdesc">{job.desc}</div>

              {job.bullets.length > 0 && (
                <ul className="jbuls">
                  {job.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}

              {stackWithDefaults.length > 0 && (
                <div className="jstack">
                  {stackWithDefaults.map((tech) => (
                    <button key={`${job.co}-${tech}`} className="jtag" onClick={() => onTechClick(tech)} type="button">
                      {tech}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
