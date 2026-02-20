import { SKILLS } from '../data/cv';

interface StackTagsProps {
  activeCategory: string;
  activeTechs: string[];
  onCategoryChange: (category: string) => void;
  onTechClick: (tech: string) => void;
}

const categories = ['all', 'core', 'state', 'testing', 'ui', 'tooling', 'cms'];

const getCategoryLabel = (category: string) => {
  if (category === 'ui') return 'UI & Design';
  if (category === 'cms') return 'CMS / Other';
  return category[0].toUpperCase() + category.slice(1);
};

export const StackTags = ({ activeCategory, activeTechs, onCategoryChange, onTechClick }: StackTagsProps) => (
  <section id="skills">
    <div className="container">
      <div className="shead">
        <span className="snum">02</span>
        <h2>Stack at a Glance</h2>
        <div className="sline" />
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
        Filter by category — or click any tech tag in the timeline to highlight matching roles.
      </p>
      <div className="fbtns">
        {categories.map((category) => (
          <button
            key={category}
            className={`fbtn ${activeCategory === category ? 'on' : ''}`}
            onClick={() => onCategoryChange(category)}
            type="button"
          >
            {getCategoryLabel(category)}
          </button>
        ))}
      </div>
      <div className="swrap">
        {SKILLS.map((skill) => {
          const visible = activeCategory === 'all' || skill.c === activeCategory;
          const highlighted = activeTechs.includes(skill.n);

          return (
            <button
              key={skill.n}
              className={`stag ${visible ? '' : 'dim'} ${highlighted ? 'lit' : ''}`}
              onClick={() => onTechClick(skill.n)}
              type="button"
            >
              {skill.n}
            </button>
          );
        })}
      </div>
    </div>
  </section>
);
