interface ConfidenceBadgeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

function getColor(value: number) {
  if (value >= 90)
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  if (value >= 75)
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
  if (value >= 50)
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
}

export function ConfidenceBadge({ value, size = 'sm' }: ConfidenceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]} ${getColor(value)}`}
    >
      <svg
        className="w-3 h-3 mr-1 opacity-60"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM6.75 7.75a.75.75 0 000 1.5h.75v2a.75.75 0 001.5 0v-2.75H9a.75.75 0 000-1.5H6.75z" />
      </svg>
      {Math.round(value)}%
    </span>
  );
}
