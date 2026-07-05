import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionHeader } from '../shared/SectionHeader';
import { StatusPill } from '../shared/StatusPill';
import type { SupplyChainNode, MetricStatus } from '../data/types';

interface SupplyChainMapProps {
  nodes: SupplyChainNode[];
}

const statusColors: Record<MetricStatus, string> = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  neutral: '#94a3b8',
};

const typeIcons: Record<SupplyChainNode['type'], string> = {
  warehouse: '🏭',
  supplier: '📦',
  distribution: '🚚',
  store: '🏪',
  manufacturing: '⚙️',
};

export function SupplyChainMap({ nodes }: SupplyChainMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredNode = nodes.find((n) => n.id === hoveredId);

  const connections = nodes.flatMap((node) =>
    node.connections.map((targetId) => {
      const target = nodes.find((n) => n.id === targetId);
      if (!target) return null;
      return { from: node, to: target };
    }).filter(Boolean)
  );

  return (
    <div className="neu-card p-5">
      <SectionHeader
        title="Supply Chain Network"
        subtitle={`${nodes.length} nodes · ${connections.length} connections`}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="12" r="2" />
            <circle cx="19" cy="5" r="2" />
            <circle cx="19" cy="19" r="2" />
            <path d="M7 11l10-4M7 13l10 4" />
          </svg>
        }
        action={<StatusPill status="warning" label="Live" />}
      />

      <div className="relative w-full aspect-[16/9] min-h-[200px]">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Supply chain map with ${nodes.length} nodes and ${connections.length} connections`}
        >
          {connections.map((conn, i) => (
            <motion.line
              key={`${conn!.from.id}-${conn!.to.id}`}
              x1={conn!.from.x}
              y1={conn!.from.y}
              x2={conn!.to.x}
              y2={conn!.to.y}
              stroke={hoveredId === conn!.from.id || hoveredId === conn!.to.id
                ? '#60a5fa'
                : '#334155'
              }
              strokeWidth="0.4"
              strokeDasharray={hoveredId === conn!.from.id || hoveredId === conn!.to.id ? '0' : '1.5 1'}
              aria-hidden="true"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: hoveredId ? 0.3 : 0.6 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.23, 1, 0.32, 1] }}
            />
          ))}

          {nodes.map((node, i) => (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <title>{`${node.label} — ${node.status} stock${node.metric ? ` · ${node.metric}` : ''}`}</title>
              {/* Invisible larger hit target for keyboard/finger */}
              <circle
                cx={node.x}
                cy={node.y}
                r={6}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${node.label}: ${node.status}${node.metric ? `, ${node.metric}` : ''}`}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                style={{ cursor: 'pointer' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setHoveredId(node.id);
                  }
                }}
                onFocus={() => setHoveredId(node.id)}
                onBlur={() => setHoveredId(null)}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={hoveredId === node.id ? 4.5 : 3.5}
                fill={statusColors[node.status]}
                fillOpacity={hoveredId === node.id ? 1 : 0.15}
                stroke={statusColors[node.status]}
                strokeWidth={hoveredId === node.id ? 1.2 : 0.8}
                style={{ transition: 'r 0.2s ease, fill-opacity 0.2s ease, stroke-width 0.2s ease' }}
              />
              <text
                x={node.x}
                y={node.y - 5.5}
                textAnchor="middle"
                className="fill-slate-700 dark:fill-slate-300 pointer-events-none"
                fontSize="2.8"
                fontWeight="500"
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.y + 0.3}
                textAnchor="middle"
                className="pointer-events-none"
                fontSize="3.2"
              >
                {typeIcons[node.type]}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>

      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-56 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{typeIcons[hoveredNode.type]}</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {hoveredNode.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <StatusPill status={hoveredNode.status} size="sm" />
              {hoveredNode.metric && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {hoveredNode.metric}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex items-center gap-4 mt-3 justify-center"
        role="list"
        aria-label="Map legend"
      >
        {(['healthy', 'warning', 'critical'] as MetricStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5" role="listitem">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[s] }} aria-hidden="true" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
