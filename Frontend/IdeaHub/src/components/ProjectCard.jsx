import { TrendingUp, Heart, MessageCircle, Bookmark } from 'lucide-react'
import ProjectArt from './ProjectArt'

export default function ProjectCard({ project, saved, onToggleSave }) {
  const { title, author, description, tags, lift, likes, comments, art } = project

  return (
    <article className="pcard">
      <div className="pcard__top">
        <ProjectArt art={art} />
        <div className="pcard__body">
          <div className="pcard__author">
            <span className={`avatar avatar--sm avatar--${author.tone}`}>{author.initials}</span>
            <span>{author.name}</span>
          </div>
          <h3 className="pcard__title">{title}</h3>
          <p className="pcard__desc">{description}</p>
          <ul className="tags">
            {tags.map((t) => <li key={t} className="tag">{t}</li>)}
          </ul>
        </div>
      </div>

      <div className="pcard__footer">
        <div className="pcard__stats">
          <span><TrendingUp size={13} aria-hidden="true" /> {lift}% lift</span>
          <span><Heart size={13} aria-hidden="true" /> {likes}</span>
          <span><MessageCircle size={13} aria-hidden="true" /> {comments}</span>
        </div>
        <button
          type="button"
          className={'btn btn--outline' + (saved ? ' is-saved' : '')}
          aria-pressed={saved}
          onClick={() => onToggleSave(project.id)}
        >
          <Bookmark size={14} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  )
}