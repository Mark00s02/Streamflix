import React from 'react';

// Stroke icons (24×24 grid). Filled shapes use fill="currentColor" explicitly.
const PATHS = {
  play:     <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />,
  info:     <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></>,
  plus:     <path d="M12 5v14M5 12h14" />,
  check:    <path d="M5 12.5l4.5 4.5L19 7" />,
  close:    <path d="M6 6l12 12M18 6L6 18" />,
  menu:     <path d="M4 7h16M4 12h16M4 17h16" />,
  search:   <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  left:     <path d="M15 5l-7 7 7 7" />,
  right:    <path d="M9 5l7 7-7 7" />,
  back:     <path d="M19 12H5M11 6l-6 6 6 6" />,
  shield:   <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />,
  globe:    <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" /></>,
  alert:    <><path d="M12 3.5L2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
  pip:      <><rect x="2.5" y="4" width="19" height="15" rx="2" /><rect x="12" y="11" width="7" height="5.5" rx="1" fill="currentColor" stroke="none" /></>,
  expand:   <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />,
  star:     <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor" stroke="none" />,
  flame:    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.5-5.4 3.6-8.8.3 1.8 1.3 3 2.4 3.6.3-2.8 1.7-5.3 4-6.6-.5 2.6.6 4.4 1.9 6.1 1.1 1.4 1.6 3 1.6 5.2 0 4-2.8 6.7-7 6.7z" />,
  phone:    <><rect x="6.5" y="2.5" width="11" height="19" rx="2.2" /><path d="M10.5 18.5h3" /></>,
  list:     <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  bookmark: <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />,
  user:     <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>,
  logout:   <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
};

export default function Icon({ name, size = 18, className = '', title, ...rest }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}

// The StreamFlix mark: a projector-beam play triangle inside a rounded frame.
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="sf-beam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#e8892b" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="#14161e" stroke="url(#sf-beam)" strokeWidth="2" />
      <path d="M12.5 9.5v13l10-6.5z" fill="url(#sf-beam)" />
    </svg>
  );
}
