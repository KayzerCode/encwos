// components/Breadcrumbs.tsx
import type { Folder } from '../types/folder';

interface BreadcrumbsProps {
  path: Folder[];
}

export default function Breadcrumbs({ path }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {path.map(f => (
        <span key={f.id} className="crumb">
          {f.parentId && <span className="sep">/ </span>}
          <span className="name">{f.name}</span>
        </span>
      ))}
    </nav>
  );
}