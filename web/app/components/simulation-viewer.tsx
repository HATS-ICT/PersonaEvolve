"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentLog,
  AgentSummary,
  DialogEntry,
  MapData,
  SimulationData,
  TrajectoryPoint,
  Vector3,
} from "../lib/simulation-data";

type DetailTab = "overview" | "timeline" | "observations" | "dialog" | "trajectory";

type SimulationViewerProps = {
  simulations: SimulationData[];
};

const statusStyles: Record<string, string> = {
  Alive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Escaped: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Injured: "border-amber-200 bg-amber-50 text-amber-700",
  Dead: "border-rose-200 bg-rose-50 text-rose-700",
  Unknown: "border-slate-200 bg-slate-50 text-slate-600",
};

function formatNumber(value: number | undefined, options?: Intl.NumberFormatOptions) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", options).format(value);
}

function formatSeconds(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  return `${value.toFixed(1)}s`;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function statusClass(status: string) {
  return statusStyles[status] ?? statusStyles.Unknown;
}

function displayStatus(status: string | number | undefined) {
  if (status === 0 || status === "0") {
    return "Alive";
  }

  if (status === 1 || status === "1") {
    return "Injured";
  }

  if (status === 2 || status === "2") {
    return "Dead";
  }

  return status ? String(status) : "Unknown";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function lower(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function DistributionBars({
  counts,
  tone = "blue",
}: {
  counts: Record<string, number>;
  tone?: "blue" | "slate";
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, count]) => count), 1);
  const barColor = tone === "blue" ? "bg-blue-600" : "bg-slate-700";

  return (
    <div className="space-y-3">
      {entries.map(([label, count]) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{label}</span>
            <span className="text-slate-500">{count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${Math.max(5, (count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentRow({
  agent,
  selected,
  onSelect,
}: {
  agent: AgentSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-[40px_1fr] gap-3 rounded-lg border p-3 text-left transition ${
        selected
          ? "border-blue-400 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {getInitials(agent.name)}
      </span>
      <span className="min-w-0">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate font-semibold text-slate-950">{agent.name}</span>
          <Badge className={statusClass(agent.status)}>{agent.status}</Badge>
        </span>
        <span className="mt-1 block truncate text-sm text-slate-600">{agent.role}</span>
        <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{agent.behavior}</span>
          <span>{agent.actions} actions</span>
        </span>
      </span>
    </button>
  );
}

function PersonaPanel({ agent }: { agent: AgentLog }) {
  const persona = agent.persona;
  const rows = [
    ["Role", persona.role ?? persona.occupation],
    ["Age", persona.age],
    ["Gender", persona.gender],
    ["Pronouns", persona.pronouns],
    ["Disposition", persona.emotional_disposition],
    ["Communication", persona.communication_style],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Persona</h3>
        <dl className="mt-4 space-y-3">
          {rows.map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm text-slate-800">{String(value ?? "Unknown")}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Context</h3>
        <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
          {persona.personality_traits ? (
            <p>
              <span className="font-semibold text-slate-950">Traits: </span>
              {persona.personality_traits}
            </p>
          ) : null}
          {persona.motivations_goals ? (
            <p>
              <span className="font-semibold text-slate-950">Motivations: </span>
              {persona.motivations_goals}
            </p>
          ) : null}
          {persona.knowledge_scope ? (
            <p>
              <span className="font-semibold text-slate-950">Knowledge: </span>
              {persona.knowledge_scope}
            </p>
          ) : null}
          {persona.backstory ? <p>{persona.backstory}</p> : null}
        </div>
      </div>
    </div>
  );
}

function TimelinePanel({ agent }: { agent: AgentLog }) {
  const events: Array<{
    type: "Memory" | "Action";
    time?: number;
    title: string;
    body: string;
    meta?: string;
  }> = [
    ...agent.memories.map((memory) => ({
      type: "Memory" as const,
      time: memory.time,
      title: memory.description ?? "Recorded memory",
      body: "",
    })),
    ...agent.actions.map((action) => ({
      type: "Action" as const,
      time: action.time,
      title: String(action.action_type ?? "Action"),
      body: action.plan ?? action.dialog_text ?? "",
      meta: String(action.movement_state ?? ""),
    })),
  ].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          No memories or actions recorded.
        </p>
      ) : null}
      {events.map((event, index) => (
        <div key={`${event.type}-${event.time}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className={event.type === "Action" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}>
                {event.type}
              </Badge>
              {event.meta ? <span className="text-sm text-slate-500">{event.meta}</span> : null}
            </div>
            <span className="text-sm font-medium text-slate-500">{formatSeconds(event.time)}</span>
          </div>
          <p className="mt-3 font-medium text-slate-950">{event.title}</p>
          {event.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{event.body}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ObservationsPanel({ agent }: { agent: AgentLog }) {
  return (
    <div className="space-y-3">
      {agent.observations.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          No observations recorded.
        </p>
      ) : null}
      {agent.observations.map((entry, index) => {
        const observation = entry.observation;
        const location = observation?.location ?? observation?.current_location;
        const shooterSeen =
          observation?.shooter_info && observation.shooter_info.regionId && observation.shooter_info.regionId !== "unknown";

        return (
          <div key={`${entry.time}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge className={shooterSeen ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                  {shooterSeen ? "Shooter detected" : "Shooter not detected"}
                </Badge>
                {observation?.mood ? (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                    Mood: {observation.mood}
                  </Badge>
                ) : null}
                {observation?.isHiding ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Hiding</Badge>
                ) : null}
              </div>
              <span className="text-sm font-medium text-slate-500">{formatSeconds(entry.time)}</span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">Location and state</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {location?.id ?? "Unknown location"}
                  {location?.description ? ` - ${location.description}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Movement: {observation?.current_movement_state?.replaceAll("_", " ") ?? "Unknown"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-950">Nearby people</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {observation?.surrounding_people?.length ?? 0} people observed
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {observation?.surrounding_people?.slice(0, 6).map((person) => (
                    <Badge key={`${person.name}-${person.health_status}`} className={statusClass(displayStatus(person.health_status))}>
                      {person.name ?? "Unknown"}: {displayStatus(person.health_status)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {observation?.agent_specific_instruction ? (
              <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-800">
                {observation.agent_specific_instruction}
              </p>
            ) : null}

            {observation?.neighbor_regions?.length ? (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-950">Neighbor regions</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {observation.neighbor_regions.map((region) => (
                    <Badge key={`${region.id}-${region.direction}`} className="border-slate-200 bg-slate-50 text-slate-600">
                      {region.id} {region.direction ? `(${region.direction})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DialogPanel({ dialog }: { dialog: DialogEntry[] }) {
  return (
    <div className="space-y-3">
      {dialog.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          No matching dialog recorded.
        </p>
      ) : null}
      {dialog.slice(0, 80).map((entry, index) => (
        <div key={entry.uid ?? `${entry.time}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-semibold text-slate-950">{entry.speaker ?? "Unknown speaker"}</span>
            <span className="text-sm font-medium text-slate-500">{formatSeconds(entry.time)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{entry.content}</p>
        </div>
      ))}
    </div>
  );
}

function projectPoint(
  point: Pick<Vector3, "x" | "z">,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  width: number,
  height: number,
) {
  const padding = 28;
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanZ);
  const mapWidth = spanX * scale;
  const mapHeight = spanZ * scale;
  const offsetX = (width - mapWidth) / 2;
  const offsetY = (height - mapHeight) / 2;

  return {
    x: offsetX + (point.x - bounds.minX) * scale,
    y: height - offsetY - (point.z - bounds.minZ) * scale,
    scale,
  };
}

function calculateBounds(
  map: MapData | null,
  selectedTrajectory: TrajectoryPoint[],
  allTrajectories: TrajectoryPoint[][],
  shooterTrajectory: TrajectoryPoint[],
) {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  const addPoint = (point?: Pick<Vector3, "x" | "z">) => {
    if (!point || typeof point.x !== "number" || typeof point.z !== "number") {
      return;
    }

    bounds.minX = Math.min(bounds.minX, point.x);
    bounds.maxX = Math.max(bounds.maxX, point.x);
    bounds.minZ = Math.min(bounds.minZ, point.z);
    bounds.maxZ = Math.max(bounds.maxZ, point.z);
  };

  map?.regions.forEach((region) => {
    if (!region.bounds) {
      addPoint(region.position);
      return;
    }

    const { center, size } = region.bounds;
    addPoint({ x: center.x - size.x / 2, z: center.z - size.z / 2 });
    addPoint({ x: center.x + size.x / 2, z: center.z + size.z / 2 });
  });
  map?.interest_points?.forEach((point) => addPoint(point.position));
  selectedTrajectory.forEach(addPoint);
  shooterTrajectory.forEach(addPoint);
  allTrajectories.forEach((trajectory) => trajectory.forEach(addPoint));

  if (!Number.isFinite(bounds.minX)) {
    return { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
  }

  return bounds;
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius = 4,
  cross = false,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (cross) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.55, y - radius * 0.55);
    ctx.lineTo(x + radius * 0.55, y + radius * 0.55);
    ctx.moveTo(x + radius * 0.55, y - radius * 0.55);
    ctx.lineTo(x - radius * 0.55, y + radius * 0.55);
    ctx.stroke();
  }
}

function TrajectoryCanvas({
  map,
  agent,
  agents,
  shooterTrajectory,
}: {
  map: MapData | null;
  agent: AgentLog;
  agents: AgentLog[];
  shooterTrajectory: TrajectoryPoint[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showOthers, setShowOthers] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, rect.width, rect.height);

      const otherTrajectories = agents
        .filter((item) => item.name !== agent.name)
        .map((item) => item.trajectory)
        .filter((trajectory) => trajectory.length > 0);
      const bounds = calculateBounds(
        map,
        agent.trajectory,
        showOthers ? otherTrajectories : [],
        shooterTrajectory,
      );

      map?.regions.forEach((region) => {
        if (!region.bounds) {
          return;
        }

        const { center, size } = region.bounds;
        const topLeft = projectPoint({ x: center.x - size.x / 2, z: center.z + size.z / 2 }, bounds, rect.width, rect.height);
        const bottomRight = projectPoint({ x: center.x + size.x / 2, z: center.z - size.z / 2 }, bounds, rect.width, rect.height);
        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.fillRect(topLeft.x, topLeft.y, width, height);
        ctx.strokeRect(topLeft.x, topLeft.y, width, height);

        if (showLabels) {
          const label = projectPoint(center, bounds, rect.width, rect.height);
          ctx.fillStyle = "#64748b";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(region.id, label.x, label.y);
        }
      });

      map?.interest_points?.forEach((point) => {
        const projected = projectPoint(point.position, bounds, rect.width, rect.height);
        const isExit = lower(point.type).includes("exit");
        drawMarker(ctx, projected.x, projected.y, isExit ? "#dc2626" : "#16a34a", 4, isExit);
      });

      const drawPath = (trajectory: TrajectoryPoint[], color: string, lineWidth: number) => {
        if (trajectory.length === 0) {
          return;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        trajectory.forEach((point, index) => {
          const projected = projectPoint(point, bounds, rect.width, rect.height);
          if (index === 0) {
            ctx.moveTo(projected.x, projected.y);
          } else {
            ctx.lineTo(projected.x, projected.y);
          }
        });
        ctx.stroke();
      };

      if (showOthers) {
        otherTrajectories.forEach((trajectory) => drawPath(trajectory, "rgba(100, 116, 139, 0.24)", 1));
      }

      drawPath(shooterTrajectory, "rgba(220, 38, 38, 0.82)", 2.2);
      drawPath(agent.trajectory, "#2563eb", 2.6);

      if (shooterTrajectory.length) {
        const first = projectPoint(shooterTrajectory[0], bounds, rect.width, rect.height);
        const last = projectPoint(shooterTrajectory[shooterTrajectory.length - 1], bounds, rect.width, rect.height);
        drawMarker(ctx, first.x, first.y, "#dc2626", 5);
        drawMarker(ctx, last.x, last.y, "#991b1b", 6, true);
      }

      if (agent.trajectory.length) {
        const first = projectPoint(agent.trajectory[0], bounds, rect.width, rect.height);
        const lastPoint = agent.trajectory[agent.trajectory.length - 1];
        const last = projectPoint(lastPoint, bounds, rect.width, rect.height);
        drawMarker(ctx, first.x, first.y, "#2563eb", 6);
        drawMarker(ctx, last.x, last.y, lower(lastPoint.health_status).includes("dead") ? "#dc2626" : "#16a34a", 7, lower(lastPoint.health_status).includes("dead"));
      }
    };

    render();
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [agent, agents, map, shooterTrajectory, showLabels, showOthers]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Trajectory map</h3>
          <p className="text-sm text-slate-500">Blue is selected agent. Red is shooter path.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input
              checked={showOthers}
              onChange={(event) => setShowOthers(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Other agents
          </label>
          <label className="flex items-center gap-2">
            <input
              checked={showLabels}
              onChange={(event) => setShowLabels(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Labels
          </label>
        </div>
      </div>
      <canvas ref={canvasRef} className="h-[520px] w-full rounded-lg border border-slate-200" />
    </div>
  );
}

function AgentDetail({
  simulation,
  agent,
  summary,
}: {
  simulation: SimulationData;
  agent: AgentLog;
  summary: AgentSummary;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const behavior = simulation.behaviorAnalysis?.agents?.[agent.name]?.behavior;
  const dialog = simulation.dialog.filter((entry) => entry.speaker === agent.name);
  const tabs: Array<[DetailTab, string]> = [
    ["overview", "Overview"],
    ["timeline", `Timeline (${agent.memories.length + agent.actions.length})`],
    ["observations", `Observations (${agent.observations.length})`],
    ["dialog", `Dialog (${dialog.length})`],
    ["trajectory", `Trajectory (${agent.trajectory.length})`],
  ];

  return (
    <section className="min-w-0">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-950 text-lg font-semibold text-white">
              {getInitials(agent.name)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold text-slate-950">{agent.name}</h2>
              <p className="mt-1 text-slate-600">{summary.role}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={statusClass(summary.status)}>{summary.status}</Badge>
            <Badge className="border-blue-200 bg-blue-50 text-blue-700">{summary.behavior}</Badge>
          </div>
        </div>

        {behavior?.reasoning ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Behavior reasoning</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{behavior.reasoning}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex min-w-max">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === value
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-950"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {tab === "overview" ? <PersonaPanel agent={agent} /> : null}
        {tab === "timeline" ? <TimelinePanel agent={agent} /> : null}
        {tab === "observations" ? <ObservationsPanel agent={agent} /> : null}
        {tab === "dialog" ? <DialogPanel dialog={dialog} /> : null}
        {tab === "trajectory" ? (
          <TrajectoryCanvas
            map={simulation.map}
            agent={agent}
            agents={simulation.agents}
            shooterTrajectory={simulation.shooterTrajectory}
          />
        ) : null}
      </div>
    </section>
  );
}

export default function SimulationViewer({ simulations }: SimulationViewerProps) {
  const [selectedSimulationId, setSelectedSimulationId] = useState(simulations[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [behaviorFilter, setBehaviorFilter] = useState("All");
  const [selectedAgentName, setSelectedAgentName] = useState(simulations[0]?.summaries[0]?.name ?? "");

  const simulation = useMemo(
    () => simulations.find((item) => item.id === selectedSimulationId) ?? simulations[0],
    [selectedSimulationId, simulations],
  );

  const statusCounts = useMemo(() => countBy(simulation?.summaries ?? [], (agent) => agent.status), [simulation]);
  const behaviorCounts = useMemo(() => countBy(simulation?.summaries ?? [], (agent) => agent.behavior), [simulation]);
  const statuses = ["All", ...Object.keys(statusCounts).sort()];
  const behaviors = ["All", ...Object.keys(behaviorCounts).sort()];

  const filteredAgents = useMemo(() => {
    if (!simulation) {
      return [];
    }

    const term = query.trim().toLowerCase();

    return simulation.summaries.filter((agent) => {
      const matchesSearch =
        !term ||
        [agent.name, agent.role, agent.gender, agent.status, agent.behavior].some((value) =>
          value.toLowerCase().includes(term),
        );
      const matchesStatus = statusFilter === "All" || agent.status === statusFilter;
      const matchesBehavior = behaviorFilter === "All" || agent.behavior === behaviorFilter;

      return matchesSearch && matchesStatus && matchesBehavior;
    });
  }, [behaviorFilter, query, simulation, statusFilter]);

  if (!simulation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
          No bundled sample data was found in public/data.
        </div>
      </main>
    );
  }

  const activeAgentName = filteredAgents.some((agent) => agent.name === selectedAgentName)
    ? selectedAgentName
    : filteredAgents[0]?.name ?? "";
  const selectedAgent = simulation.agents.find((agent) => agent.name === activeAgentName);
  const selectedSummary = simulation.summaries.find((agent) => agent.name === selectedAgent?.name) ?? simulation.summaries[0];
  const metadata = simulation.metadata;
  const llmUsage = metadata?.llm_usage;
  const selectedAgentDialog = simulation.dialog.filter((entry) => entry.speaker === selectedAgent?.name);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">PEBA ASI sample demo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Bundled simulation viewer
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Load a fixed sample from public/data and explore agent personas, behavior classifications, observations, conversations, and paths.
            </p>
          </div>
          <label className="w-full max-w-sm">
            <span className="text-sm font-medium text-slate-700">Sample data</span>
            <select
              value={selectedSimulationId}
              onChange={(event) => setSelectedSimulationId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {simulations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Agents"
            value={formatNumber(simulation.agents.length)}
            detail={`${statusCounts.Alive ?? 0} alive, ${statusCounts.Dead ?? 0} dead, ${statusCounts.Injured ?? 0} injured`}
          />
          <StatCard
            label="Duration"
            value={formatSeconds(metadata?.duration_seconds)}
            detail={`${simulation.date} ${simulation.time}`}
          />
          <StatCard
            label="LLM requests"
            value={formatNumber(llmUsage?.total_requests)}
            detail={llmUsage?.model ?? "model unavailable"}
          />
          <StatCard
            label="Estimated cost"
            value={
              typeof llmUsage?.total_cost_usd === "number"
                ? `$${llmUsage.total_cost_usd.toFixed(3)}`
                : "n/a"
            }
            detail={`${formatNumber(llmUsage?.prompt_tokens)} prompt tokens`}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">Health status</h2>
              <span className="text-sm text-slate-500">{simulation.agents.length} agents</span>
            </div>
            <DistributionBars counts={statusCounts} tone="slate" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">Behavior classes</h2>
              <span className="text-sm text-slate-500">classified from behavior_analysis.json</span>
            </div>
            <DistributionBars counts={behaviorCounts} />
          </div>
        </section>

        {simulation.plots.length ? (
          <section className="grid gap-4 lg:grid-cols-3">
            {simulation.plots.map((plot) => (
              <div key={plot} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="relative h-64 overflow-hidden rounded-md bg-white">
                  <Image src={plot} alt={plot.split("/").at(-1) ?? "Simulation plot"} fill className="object-contain" sizes="(min-width: 1024px) 33vw, 100vw" />
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-950">Agents</h2>
                <span className="text-sm text-slate-500">{filteredAgents.length} shown</span>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  placeholder="Search name, role, behavior..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <select
                    value={behaviorFilter}
                    onChange={(event) => setBehaviorFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    {behaviors.map((behavior) => (
                      <option key={behavior}>{behavior}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 max-h-[760px] space-y-3 overflow-y-auto pr-1">
                {filteredAgents.map((agent) => (
                  <AgentRow
                    key={agent.name}
                    agent={agent}
                    selected={agent.name === activeAgentName}
                    onSelect={() => setSelectedAgentName(agent.name)}
                  />
                ))}
                {!filteredAgents.length ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No agents match the current filters.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>

          {selectedAgent && selectedSummary ? (
            <div className="space-y-4">
              <section className="grid gap-4 md:grid-cols-4">
                <StatCard label="Memories" value={formatNumber(selectedAgent.memories.length)} />
                <StatCard label="Actions" value={formatNumber(selectedAgent.actions.length)} />
                <StatCard label="Observations" value={formatNumber(selectedAgent.observations.length)} />
                <StatCard label="Dialog lines" value={formatNumber(selectedAgentDialog.length)} />
              </section>
              <AgentDetail simulation={simulation} agent={selectedAgent} summary={selectedSummary} />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
              Select an agent to inspect details.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
