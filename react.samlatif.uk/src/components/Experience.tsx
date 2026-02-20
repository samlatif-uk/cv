import { useEffect } from 'react';
import { JOBS } from '../data/cv';

const shouldIncludeES6 = (date: string) => {
  const years = date.match(/\d{4}/g);
  if (!years?.length) {
    return false;
  }

  return Number(years[0]) >= 2015;
};

const shouldIncludeES5 = (date: string) => {
  const years = date.match(/\d{4}/g);
  if (!years?.length) {
    return false;
  }

  return Number(years[0]) < 2015;
};

interface ExperienceProps {
  activeTechs: string[];
  onTechClick: (tech: string) => void;
  onClearTech: () => void;
}

export const Experience = ({ activeTechs, onTechClick, onClearTech }: ExperienceProps) => {
  useEffect(() => {
    if (!activeTechs.length) {
      return;
    }

    const firstMatch = document.querySelector('#experience .job:not(.filtered)') as HTMLElement | null;
    if (firstMatch) {
      const target = (firstMatch.querySelector('.jhead') as HTMLElement | null) ?? firstMatch;
      const targetY = target.getBoundingClientRect().top + window.scrollY - 50;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, [activeTechs]);

  return (
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
          let stackWithDefaults = job.stack;
          if (shouldIncludeES6(job.date) && !stackWithDefaults.includes('JavaScript (ES6+)')) {
            stackWithDefaults = ['JavaScript (ES6+)', ...stackWithDefaults];
          }
          if (shouldIncludeES5(job.date) && !stackWithDefaults.includes('JavaScript (ES5)')) {
            stackWithDefaults = ['JavaScript (ES5)', ...stackWithDefaults];
          }
          const matched = activeTechs.length
            ? activeTechs.every((activeTech) => stackWithDefaults.includes(activeTech))
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
};
