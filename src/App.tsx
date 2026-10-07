import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import CockpitExecutivo from './components/CockpitExecutivo';
import TechnicalCockpit from './components/TechnicalCockpit';
import PlanejamentoOperacional from './components/PlanejamentoOperacional';
import ShipBerthForecast from './components/ShipBerthForecast';

type ViewTab = 'executivo' | 'tecnico' | 'planejamento' | 'previsao';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<ViewTab>('executivo');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={currentTab} onTabChange={(tab) => setCurrentTab(tab as ViewTab)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900">
          {currentTab === 'executivo' && <CockpitExecutivo />}
          {currentTab === 'tecnico' && <TechnicalCockpit />}
          {currentTab === 'planejamento' && <PlanejamentoOperacional />}
          {currentTab === 'previsao' && <ShipBerthForecast />}
        </main>
      </div>
    </div>
  );
};

export default App;