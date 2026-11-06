import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "plus"
  | "search"
  | "trash"
  | "undo"
  | "redo"
  | "play"
  | "pause"
  | "prev"
  | "next"
  | "restart"
  | "zoomIn"
  | "zoomOut"
  | "fit"
  | "close"
  | "tree"
  | "check"
  | "alert"
  | "info"
  | "pencil"
  | "arrowLeft"
  | "arrowRight"
  | "chevronDown"
  | "sparkles"
  | "layers";

const PATHS: Record<IconName, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="m6 7 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  undo: (
    <>
      <path d="M9 7 4 12l5 5" />
      <path d="M20 17a7 7 0 0 0-7-7H4" />
    </>
  ),
  redo: (
    <>
      <path d="m15 7 5 5-5 5" />
      <path d="M4 17a7 7 0 0 1 7-7h9" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  prev: (
    <>
      <path d="M18 6.5v11L8.5 12 18 6.5Z" fill="currentColor" stroke="none" />
      <path d="M6 5v14" />
    </>
  ),
  next: (
    <>
      <path d="M6 6.5v11L15.5 12 6 6.5Z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </>
  ),
  restart: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v6h-6" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M11 8v6M8 11h6" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M8 11h6" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  fit: (
    <>
      <path d="M8 3H6a3 3 0 0 0-3 3v2" />
      <path d="M16 3h2a3 3 0 0 1 3 3v2" />
      <path d="M8 21H6a3 3 0 0 1-3-3v-2" />
      <path d="M16 21h2a3 3 0 0 0 3-3v-2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  tree: (
    <>
      <circle cx="12" cy="4.8" r="2.2" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M12 7v4.5" />
      <path d="M6 16.8v-2.6h12v2.6" />
      <path d="M12 11.5v2.7" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  sparkles: (
    <>
      <path d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
