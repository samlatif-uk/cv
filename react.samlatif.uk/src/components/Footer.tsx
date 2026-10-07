import { PROFILE } from "../data/cv";

export const Footer = () => {


  return (
    <footer>
      <div className="container">
        <div className="fname">{PROFILE.name}</div>
        <div className="fline"></div>
        <div className="finfo">
          <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
          &nbsp;·&nbsp;
          <a href="/lab/stories/">Work in practice</a>
          &nbsp;·&nbsp;
          <a href="/lab/">Career atlas</a>
        </div>
      </div>
    </footer>
  );
};
