import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  to?: string;
  actionLabel?: string;
  action?: ReactNode;
}

export function StatCard({
  title,
  value,
  detail,
  icon,
  to,
  actionLabel = 'Open',
  action,
}: StatCardProps) {
  const body = (
    <div className="card h-full border border-base-300 bg-base-100 shadow-sm transition-colors hover:border-primary/40">
      <div className="card-body gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold opacity-70">{title}</h2>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
          {icon && <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>}
        </div>
        {detail && <p className="text-sm opacity-70">{detail}</p>}
        {(to || action) && (
          <div className="card-actions justify-end">
            {action ? (
              action
            ) : to ? (
              <span className="btn btn-ghost btn-sm">{actionLabel}</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  if (!to) return body;
  return (
    <Link to={to} className="block h-full no-underline">
      {body}
    </Link>
  );
}
