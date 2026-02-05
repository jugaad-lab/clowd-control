'use client';

import { useState, useMemo, useCallback } from 'react';
import { Task, TaskDependency } from '@/lib/supabase';
import { buildDependencyGraph, DependencyNode } from '@/lib/dependencies';
import { cn } from '@/lib/utils';

interface DependencyGraphProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  onTaskClick?: (task: Task) => void;
  highlightCriticalPath?: string[];
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  backlog: {
    bg: 'fill-zinc-100 dark:fill-zinc-800',
    border: 'stroke-zinc-400 dark:stroke-zinc-600',
    text: 'fill-zinc-700 dark:fill-zinc-300',
  },
  assigned: {
    bg: 'fill-blue-100 dark:fill-blue-900/50',
    border: 'stroke-blue-400 dark:stroke-blue-600',
    text: 'fill-blue-700 dark:fill-blue-300',
  },
  in_progress: {
    bg: 'fill-amber-100 dark:fill-amber-900/50',
    border: 'stroke-amber-400 dark:stroke-amber-600',
    text: 'fill-amber-700 dark:fill-amber-300',
  },
  blocked: {
    bg: 'fill-red-100 dark:fill-red-900/50',
    border: 'stroke-red-400 dark:stroke-red-600',
    text: 'fill-red-700 dark:fill-red-300',
  },
  review: {
    bg: 'fill-purple-100 dark:fill-purple-900/50',
    border: 'stroke-purple-400 dark:stroke-purple-600',
    text: 'fill-purple-700 dark:fill-purple-300',
  },
  done: {
    bg: 'fill-green-100 dark:fill-green-900/50',
    border: 'stroke-green-400 dark:stroke-green-600',
    text: 'fill-green-700 dark:fill-green-300',
  },
  cancelled: {
    bg: 'fill-zinc-200 dark:fill-zinc-700',
    border: 'stroke-zinc-400 dark:stroke-zinc-500',
    text: 'fill-zinc-500 dark:fill-zinc-400',
  },
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const LEVEL_GAP = 120;
const NODE_GAP = 20;

export function DependencyGraph({
  tasks,
  dependencies,
  onTaskClick,
  highlightCriticalPath = [],
}: DependencyGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const graphData = useMemo(() => {
    if (tasks.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

    const nodes = buildDependencyGraph(tasks, dependencies);

    // Group nodes by level
    const levelGroups = new Map<number, DependencyNode[]>();
    for (const node of nodes) {
      const level = node.level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(node);
    }

    // Calculate positions
    const positions = new Map<string, { x: number; y: number }>();
    let maxY = 0;

    for (const [level, levelNodes] of levelGroups) {
      const totalHeight = levelNodes.length * (NODE_HEIGHT + NODE_GAP) - NODE_GAP;
      const startY = 50;

      levelNodes.forEach((node, index) => {
        const x = 50 + level * (NODE_WIDTH + LEVEL_GAP);
        const y = startY + index * (NODE_HEIGHT + NODE_GAP);
        positions.set(node.id, { x, y });
        maxY = Math.max(maxY, y + NODE_HEIGHT);
      });
    }

    // Calculate edges
    const edges: { from: string; to: string; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[] = [];
    for (const dep of dependencies) {
      const fromPos = positions.get(dep.depends_on_task_id);
      const toPos = positions.get(dep.task_id);
      if (fromPos && toPos) {
        edges.push({
          from: dep.depends_on_task_id,
          to: dep.task_id,
          fromPos: { x: fromPos.x + NODE_WIDTH, y: fromPos.y + NODE_HEIGHT / 2 },
          toPos: { x: toPos.x, y: toPos.y + NODE_HEIGHT / 2 },
        });
      }
    }

    const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0);
    const width = 100 + (maxLevel + 1) * (NODE_WIDTH + LEVEL_GAP);
    const height = maxY + 50;

    return {
      nodes: nodes.map((n) => ({ ...n, pos: positions.get(n.id)! })),
      edges,
      width: Math.max(width, 400),
      height: Math.max(height, 200),
    };
  }, [tasks, dependencies]);

  const handleNodeClick = useCallback(
    (task: Task) => {
      onTaskClick?.(task);
    },
    [onTaskClick]
  );

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 dark:text-zinc-400">
        No tasks to display
      </div>
    );
  }

  if (dependencies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 dark:text-zinc-400">
        No dependencies defined. Add dependencies to see the graph.
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <svg
        width={graphData.width}
        height={graphData.height}
        className="min-w-full"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-zinc-400 dark:fill-zinc-500"
            />
          </marker>
          <marker
            id="arrowhead-critical"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" className="fill-orange-500" />
          </marker>
        </defs>

        {/* Edges */}
        {graphData.edges.map((edge, i) => {
          const isCritical =
            highlightCriticalPath.includes(edge.from) &&
            highlightCriticalPath.includes(edge.to);
          const isHovered = hoveredNode === edge.from || hoveredNode === edge.to;

          // Calculate control points for curved line
          const midX = (edge.fromPos.x + edge.toPos.x) / 2;

          return (
            <path
              key={i}
              d={`M ${edge.fromPos.x} ${edge.fromPos.y} C ${midX} ${edge.fromPos.y}, ${midX} ${edge.toPos.y}, ${edge.toPos.x} ${edge.toPos.y}`}
              className={cn(
                'fill-none transition-all duration-150',
                isCritical
                  ? 'stroke-orange-500 stroke-2'
                  : isHovered
                  ? 'stroke-blue-400 dark:stroke-blue-500 stroke-2'
                  : 'stroke-zinc-300 dark:stroke-zinc-600'
              )}
              strokeWidth={isCritical || isHovered ? 2 : 1.5}
              markerEnd={isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'}
            />
          );
        })}

        {/* Nodes */}
        {graphData.nodes.map((node) => {
          if (!node.pos) return null;

          const colors = STATUS_COLORS[node.task.status] || STATUS_COLORS.backlog;
          const isCritical = highlightCriticalPath.includes(node.id);
          const isHovered = hoveredNode === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${node.pos.x}, ${node.pos.y})`}
              onClick={() => handleNodeClick(node.task)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                className={cn(
                  colors.bg,
                  'transition-all duration-150',
                  isCritical
                    ? 'stroke-orange-500 stroke-2'
                    : isHovered
                    ? 'stroke-blue-500 stroke-2'
                    : colors.border
                )}
                strokeWidth={isCritical || isHovered ? 2 : 1.5}
              />
              <text
                x={NODE_WIDTH / 2}
                y={25}
                textAnchor="middle"
                className={cn(colors.text, 'text-xs font-medium')}
              >
                {node.task.title.length > 20
                  ? node.task.title.slice(0, 18) + '...'
                  : node.task.title}
              </text>
              <text
                x={NODE_WIDTH / 2}
                y={45}
                textAnchor="middle"
                className="fill-zinc-500 dark:fill-zinc-400 text-xs"
              >
                {node.task.status.replace('_', ' ')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
