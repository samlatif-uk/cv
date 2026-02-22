export const Education = () => (
  <section id="education">
    <div className="container">
      <div className="shead">
        <span className="snum">05</span>
        <h2>Education</h2>
        <div className="sline" />
      </div>
      <div className="edugrid">
        <div className="educard">
          <div className="edudeg">MSc Computer Games &amp; Entertainment</div>
          <div className="eduuni">Goldsmiths, University of London</div>
          <div className="edumeta">2011 – 2012</div>
          <div className="edugrade">Merit · 67%</div>
          <div className="edunote">
            Final project deferred to maintain quality of concurrent client
            commitments.
          </div>
        </div>
        <div className="educard">
          <div className="edudeg">BSc Computer Games Technologies</div>
          <div className="eduuni">University of East London</div>
          <div className="edumeta">2007 – 2010</div>
          <div className="edugrade">1st Class Honours</div>
          <div className="edunote">
            Modules: Games Programming, 3D Graphics, Virtual Environments,
            Network Gaming, Advanced Animation, Project Management.
          </div>
        </div>
        <div className="educard">
          <div className="edudeg">
            BSc Cognitive Science{" "}
            <span
              style={{ fontSize: "12px", fontWeight: 400, fontStyle: "italic" }}
            >
              (1st year attended)
            </span>
          </div>
          <div className="eduuni">University of Leeds</div>
          <div className="edumeta">2005 – 2006</div>
          <div className="edugrade">Year 1 Completed</div>
          <div className="edunote">
            Foundations in HCI, UX design, human behaviour and logic — directly
            relevant to frontend and UX work. Transferred to pursue a CS-focused
            degree.
          </div>
        </div>
      </div>
    </div>
  </section>
);
