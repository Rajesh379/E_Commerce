import React, { useEffect, useState } from 'react';

function normalizeAssetSrc(src?: string | null): string | null {
  if (!src) return null;
  if (src.startsWith('/images/')) {
    const base = import.meta.env.BASE_URL || '/';
    return `${base}${src.slice(1)}`.replace(/\/+/g, '/');
  }
  return src;
}

export function SafeAvatar({
  src,
  name,
  className = 'h-14 w-14 rounded-xl',
}: {
  src?: string | null;
  name?: string;
  className?: string;
}) {
  const resolvedSrc = normalizeAssetSrc(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  const initials = (name || 'EW')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      className={`shrink-0 overflow-hidden border border-slate-200 bg-[#0B1F3A] flex items-center justify-center text-white font-display font-bold ${className}`}
    >
      {resolvedSrc && !failed ? (
        <img
          src={resolvedSrc}
          alt={name || 'Profile photo'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials || 'EW'}</span>
      )}
    </div>
  );
}
