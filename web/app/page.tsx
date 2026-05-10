import SimulationViewer from "./components/simulation-viewer";
import { loadSimulationData } from "./lib/simulation-data";

export default async function Home() {
  const simulations = await loadSimulationData();

  return <SimulationViewer simulations={simulations} />;
}
