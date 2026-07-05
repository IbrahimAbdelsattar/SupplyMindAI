import { useMemo } from 'react';

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function SparkLine({
  data,
  width = 80,
  height = 28,
  color,
  className = '',
}: SparkLineProps) {
  const { pathD, lastY } = useMemo(() => {
    if (data.length < 2) return { pathD: '', lastY: 0 };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);

    const path = data
      .map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    const lastVal = data[data.length - 1];
    const lastCy = height - ((lastVal - min) / range) * (height - 4) - 2;

    return { pathD: path, lastY: lastCy };
  }, [data, width, height]);

  const lastValue = data[data.length - 1];
  const firstValue = data[0];
  const isUp = lastValue >= firstValue;
  const computedColor =
    color ?? (isUp ? 'var(--health-healthy)' : 'var(--health-warning)');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={computedColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={lastY}
        r={2.5}
        fill={computedColor}
      />
    </svg>
  );
}
