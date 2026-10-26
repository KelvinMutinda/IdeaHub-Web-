/* CSS-drawn cover art for a project. Variants: orbit | hill | sun | inbox */
export default function ProjectArt({ art }) {
  return (
    <div className={`art art--${art.variant}`} style={{ background: art.bg }} aria-hidden="true">
      <span className="art__label">{art.label}</span>
      <span className="art__orb" />
      <span className="art__ring" />
      <span className="art__hill" />
      <span className="art__card" />
      <span className="art__dot" />
    </div>
  )
}