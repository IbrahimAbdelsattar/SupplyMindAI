import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { TracingData } from './types';

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
    healthy: 'default',
    degraded: 'destructive',
    idle: 'secondary',
  };
  return <Badge variant={variant[status] ?? 'outline'}>{status}</Badge>;
}

export function TracingOverview({ data }: { data: TracingData | undefined }) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Agent Tracing</CardTitle>
          <CardDescription>LangSmith observability — no data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">AI Agent Tracing</CardTitle>
            <CardDescription>
              LangSmith observability — project: <code className="text-xs bg-muted px-1 py-0.5 rounded">{data.project}</code>
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Total calls (24h): <strong>{data.total_calls}</strong></span>
            <span>Errors: <strong className={data.errors_last_24h > 0 ? 'text-destructive' : ''}>{data.errors_last_24h}</strong></span>
            <Badge variant={data.enabled && data.api_key_configured ? 'default' : 'secondary'}>
              {data.enabled && data.api_key_configured ? 'Tracing Active' : 'Tracing Off'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Calls / 24h</TableHead>
              <TableHead className="text-right">Errors</TableHead>
              <TableHead className="text-right">Avg Latency</TableHead>
              <TableHead className="text-right">Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.agents.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No trace data available yet.
                </TableCell>
              </TableRow>
            )}
            {data.agents.map((agent) => {
              let latencyDisplay = '—';
              if (agent.avg_latency_seconds !== null) {
                latencyDisplay = agent.avg_latency_seconds < 1
                  ? `${(agent.avg_latency_seconds * 1000).toFixed(0)}ms`
                  : `${agent.avg_latency_seconds.toFixed(1)}s`;
              }

              let lastActiveDisplay = '—';
              if (agent.last_seen) {
                const d = new Date(agent.last_seen);
                const now = new Date();
                const diffMs = now.getTime() - d.getTime();
                const diffMin = Math.floor(diffMs / 60_000);
                lastActiveDisplay = diffMin < 1 ? 'Just now' : diffMin < 60 ? `${diffMin}m ago` : `${Math.floor(diffMin / 60)}h ago`;
              }

              return (
                <TableRow key={agent.name}>
                  <TableCell className="font-medium">{agent.label}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{agent.model}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={agent.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{agent.calls_last_24h}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono text-sm ${agent.errors_last_24h > 0 ? 'text-destructive font-semibold' : ''}`}>
                      {agent.errors_last_24h}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{latencyDisplay}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{lastActiveDisplay}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
