import { CockpitExecutivo } from './components/CockpitExecutivo';

/**
 * Compatibility entry point for older imports of `src/Dashboard`.
 * The main application is mounted through `src/App.tsx`.
 */
export default function Dashboard() {
  return <CockpitExecutivo />;
}