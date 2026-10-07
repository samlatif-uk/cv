import './explore-cards.css';

export const ExploreCards = () => (
  <div className="explore-previews" aria-label="Explore my work">
    <a className="explore-card work-preview" href="/lab/stories/">
      <div className="preview-art" aria-hidden="true">
        <div className="mini-deck"><span>DELIVERY REVIEW</span><strong>75<span>%</span></strong><i /><small>From information to insight.</small></div>
        <div className="mini-seats">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
        <span className="art-caption">SPACE · AUTOMATION · PERFORMANCE</span>
      </div>
      <div className="preview-copy"><span className="preview-label">01 / TRY THE IDEAS</span><h2>Work in practice <span aria-hidden="true">↗</span></h2><p>Three interactive demonstrations of problems I’ve solved.</p><span className="preview-cta">Explore the case studies <span aria-hidden="true">→</span></span></div>
    </a>
    <a className="explore-card atlas-preview" href="/lab/">
      <div className="preview-art" aria-hidden="true">
        <svg viewBox="0 0 440 210" fill="none"><ellipse cx="220" cy="106" rx="150" ry="68" stroke="#604820" /><ellipse cx="220" cy="106" rx="150" ry="68" stroke="#604820" transform="rotate(-20 220 106)" /><path d="M95 90 165 48 245 80 335 52 308 151 207 172 126 145 95 90 245 80 207 172 165 48 308 151 126 145 335 52" stroke="#a47a27" strokeOpacity=".65" />{[[95,90],[165,48],[245,80],[335,52],[308,151],[207,172],[126,145]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={i===2?8:4} fill={i%2?'#f0e8d8':'#f0a500'} />)}<circle cx="245" cy="80" r="15" stroke="#f0a500" /></svg>
        <span className="art-caption">PEOPLE · PROJECTS · CONNECTIONS</span>
      </div>
      <div className="preview-copy"><span className="preview-label">02 / FOLLOW THE CONNECTIONS</span><h2>Career atlas <span aria-hidden="true">↗</span></h2><p>Explore the clients and technologies behind my work in 3D.</p><span className="preview-cta">Enter the atlas <span aria-hidden="true">→</span></span></div>
    </a>
  </div>
);
