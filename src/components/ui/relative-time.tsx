"use client";

interface RelativeTimeProps {
  iso: string | null | undefined;
  className?: string;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1)  return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  if (hours < 24)    return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7)      return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5)     return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12)   return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

export function RelativeTime({ iso, className }: RelativeTimeProps) {
  if (!iso) return <span className={className}>—</span>;
  return <span className={className}>{formatRelative(iso)}</span>;
}
