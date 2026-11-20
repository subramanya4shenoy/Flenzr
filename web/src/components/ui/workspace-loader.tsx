import { Logo } from "./logo";
import "./workspace-loader.css";

/** Shared, decorative brand animation. It never imposes a minimum waiting time. */
export function WorkspaceLoader({ label = "Loading your workspace…", compact = false }: { label?: string; compact?: boolean }) {
  return <div className="fl-workspace-loader" data-compact={compact} role="status" aria-live="polite">
    <span className="fl-workspace-loader-mark" aria-hidden="true"><Logo size={compact ? 27 : 42} variant="duotone-dark" /></span>
    <span className="fl-workspace-loader-label">{label}</span>
  </div>;
}
