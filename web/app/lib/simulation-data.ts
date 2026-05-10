import fs from "node:fs/promises";
import path from "node:path";

export type Vector3 = {
  x: number;
  y?: number;
  z: number;
};

export type Persona = {
  name?: string;
  role?: string;
  occupation?: string;
  age?: string | number;
  gender?: string;
  pronouns?: string;
  personality_traits?: string;
  emotional_disposition?: string;
  motivations_goals?: string;
  communication_style?: string;
  knowledge_scope?: string;
  backstory?: string;
};

export type TrajectoryPoint = Vector3 & {
  time?: number;
  health?: number;
  health_status?: string | number;
};

export type MemoryEntry = {
  time?: number;
  description?: string;
};

export type ActionEntry = {
  time?: number;
  action_type?: string | number;
  movement_state?: string | number;
  dialog_text?: string;
  plan?: string;
  target_location?: Vector3;
};

export type ObservationEntry = {
  time?: number;
  observation?: {
    mood?: string;
    current_movement_state?: string;
    isHiding?: boolean;
    shooter_info?: {
      regionId?: string;
      distance?: number | string;
      isInLineOfSight?: boolean;
      direction?: string;
    } | null;
    surrounding_people?: Array<{
      name?: string;
      relationship?: string;
      health_status?: string | number;
    }>;
    neighbor_regions?: Array<{
      id?: string;
      distance?: number;
      description?: string;
      direction?: string;
    }>;
    interest_points?: Array<{
      id?: string;
      type?: string;
      description?: string;
      distance?: number;
      direction?: string;
    }> | null;
    surrounding_conversation?: Array<DialogEntry>;
    pending_events?: unknown[];
    available_action_ids?: string[];
    location?: {
      id?: string;
      description?: string;
    };
    current_location?: {
      id?: string;
      description?: string;
    };
    agent_specific_instruction?: string;
  };
};

export type DialogEntry = {
  uid?: string;
  time?: number;
  location?: Vector3;
  content?: string;
  speaker?: string;
};

export type AgentLog = {
  name: string;
  persona: Persona;
  traits?: Record<string, unknown>;
  memories: MemoryEntry[];
  actions: ActionEntry[];
  observations: ObservationEntry[];
  trajectory: TrajectoryPoint[];
  final_status?: string;
};

export type AgentSummary = {
  name: string;
  role: string;
  age: string;
  gender: string;
  status: string;
  behavior: string;
  memories: number;
  actions: number;
  observations: number;
  trajectoryPoints: number;
};

export type MapRegion = {
  id: string;
  description?: string;
  position?: Vector3;
  bounds?: {
    center: Vector3;
    size: Vector3;
  };
};

export type InterestPoint = {
  id: string;
  type: string;
  description?: string;
  occupant?: string;
  position: Vector3;
};

export type MapData = {
  regions: MapRegion[];
  interest_points?: InterestPoint[];
  region_connections?: unknown[];
};

export type BehaviorAnalysis = {
  simulation_id?: string;
  timestamp?: string;
  agents?: Record<
    string,
    {
      behavior?: {
        classification?: string;
        reasoning?: string;
        ranking?: string[];
        final_status?: string;
      };
    }
  >;
  statistics?: Record<string, unknown>;
};

export type SimulationMetadata = {
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  agent_count?: number;
  unity_version?: string;
  platform?: string;
  llm_usage?: {
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_requests?: number;
    total_cost_usd?: number;
  };
  sim_config?: Record<string, string | number | boolean>;
  trait_distributions?: Array<Record<string, string | number>>;
  behavior_distributions?: Array<{
    behavior_type?: string;
    instruction?: string;
    weight?: number;
    calculated_count?: number;
  }>;
};

export type SimulationData = {
  id: string;
  label: string;
  date: string;
  time: string;
  metadata: SimulationMetadata | null;
  map: MapData | null;
  shooterTrajectory: TrajectoryPoint[];
  dialog: DialogEntry[];
  behaviorAnalysis: BehaviorAnalysis | null;
  agents: AgentLog[];
  summaries: AgentSummary[];
  plots: string[];
};

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeStatus(status: string | number | undefined): string {
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

function normalizeActionType(actionType: string | number | undefined): string {
  if (actionType === 0 || actionType === "0") {
    return "MoveToLocation";
  }

  if (actionType === 1 || actionType === "1") {
    return "MoveToPerson";
  }

  if (actionType === 2 || actionType === "2") {
    return "Wait";
  }

  return actionType ? String(actionType) : "Unknown";
}

function normalizeMovementState(movementState: string | number | undefined): string {
  if (movementState === 0 || movementState === "0") {
    return "StayStill";
  }

  if (movementState === 1 || movementState === "1") {
    return "Walk";
  }

  if (movementState === 2 || movementState === "2") {
    return "Sprint";
  }

  return movementState ? String(movementState).replaceAll("_", " ") : "Unknown";
}

function prettifyBehavior(value: string | undefined): string {
  if (!value) {
    return "Unclassified";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseSimulationName(id: string) {
  const parts = id.split("_");
  const date = parts[1] ?? "";
  const time = parts[2]?.replaceAll("-", ":") ?? "";
  const label = date && time ? `Simulation on ${date} at ${time}` : id;

  return { date, time, label };
}

function sortByTime<T extends { time?: number }>(items: T[] | undefined): T[] {
  return [...(items ?? [])].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

function normalizeAgent(name: string, raw: Partial<AgentLog>): AgentLog {
  const trajectory = sortByTime(raw.trajectory).map((point) => ({
    ...point,
    health_status: normalizeStatus(point.health_status),
  }));

  return {
    name,
    persona: raw.persona ?? {},
    traits: raw.traits,
    memories: sortByTime(raw.memories),
    actions: sortByTime(raw.actions).map((action) => ({
      ...action,
      action_type: normalizeActionType(action.action_type),
      movement_state: normalizeMovementState(action.movement_state),
    })),
    observations: sortByTime(raw.observations),
    trajectory,
    final_status: normalizeStatus(raw.final_status ?? trajectory.at(-1)?.health_status),
  };
}

function buildSummary(agent: AgentLog, behaviorAnalysis: BehaviorAnalysis | null): AgentSummary {
  const behavior = prettifyBehavior(
    behaviorAnalysis?.agents?.[agent.name]?.behavior?.classification,
  );
  const role = agent.persona.role ?? agent.persona.occupation ?? "Unknown role";

  return {
    name: agent.name,
    role,
    age: String(agent.persona.age ?? "Unknown"),
    gender: agent.persona.gender ?? "Unknown",
    status: agent.final_status ?? "Unknown",
    behavior,
    memories: agent.memories.length,
    actions: agent.actions.length,
    observations: agent.observations.length,
    trajectoryPoints: agent.trajectory.length,
  };
}

async function listPlotPaths(simPath: string, simId: string) {
  try {
    const plots = await fs.readdir(path.join(simPath, "Plots"));

    return plots
      .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
      .sort()
      .map((file) => `/data/${simId}/Plots/${file}`);
  } catch {
    return [];
  }
}

export async function loadSimulationData(): Promise<SimulationData[]> {
  let folders: string[] = [];

  try {
    folders = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }

  const simulationFolders = folders.filter((folder) => folder.startsWith("Simulation_"));
  const simulations = await Promise.all(
    simulationFolders.map(async (id) => {
      const simPath = path.join(DATA_DIR, id);
      const { date, time, label } = parseSimulationName(id);
      const metadata = await readJson<SimulationMetadata | null>(
        path.join(simPath, "simulation_metadata.json"),
        null,
      );
      const behaviorAnalysis = await readJson<BehaviorAnalysis | null>(
        path.join(simPath, "behavior_analysis.json"),
        null,
      );
      const map = await readJson<MapData | null>(path.join(simPath, "map_data.json"), null);
      const shooterTrajectory = await readJson<TrajectoryPoint[]>(
        path.join(simPath, "shooter_traj.json"),
        [],
      );
      const dialog = await readJson<DialogEntry[]>(path.join(simPath, "dialog.json"), []);
      const plots = await listPlotPaths(simPath, id);

      const agentDir = path.join(simPath, "AgentLogs");
      let agentFiles: string[] = [];

      try {
        agentFiles = (await fs.readdir(agentDir)).filter((file) => file.endsWith(".json"));
      } catch {
        agentFiles = [];
      }

      const agents = await Promise.all(
        agentFiles.map(async (file) => {
          const name = path.basename(file, ".json");
          const raw = await readJson<Partial<AgentLog>>(path.join(agentDir, file), {});

          return normalizeAgent(name, raw);
        }),
      );

      agents.sort((a, b) => a.name.localeCompare(b.name));

      return {
        id,
        label,
        date,
        time,
        metadata,
        map,
        shooterTrajectory,
        dialog: sortByTime(dialog),
        behaviorAnalysis,
        agents,
        summaries: agents.map((agent) => buildSummary(agent, behaviorAnalysis)),
        plots,
      };
    }),
  );

  return simulations.sort((a, b) => b.id.localeCompare(a.id));
}
