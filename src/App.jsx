import React, { useState, useEffect, useMemo } from 'react';
import MapComponent from './components/Map/MapComponent';
import Sidebar from './components/Sidebar/Sidebar';
import StatsCharts from './components/Charts/StatsCharts';
import './App.css';

function App() {
    const [statsData, setStatsData] = useState([]);
    const [loading, setLoading] = useState(true);

    // View State
    const [activeTab, setActiveTab] = useState('map'); // 'map' or 'charts'

    // State for interactivity
    const [activeLayers, setActiveLayers] = useState({
        ecosistemas_formaciones: true,
        ecosistemas_integrados: true,
        areas_protegidas: true,
        sitios_prioritarios: true
    });
    const [selectedEcoId, setSelectedEcoId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetThreshold, setTargetThreshold] = useState(30);

    // Fetch Statistics
    useEffect(() => {
        fetch('/data/statistics.json')
            .then(res => res.json())
            .then(data => {
                setStatsData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load statistics:", err);
                setLoading(false);
            });
    }, []);

    // Filter Logic
    const filteredStats = useMemo(() => {
        if (!statsData) return [];
        if (!searchTerm) return statsData;
        const lower = searchTerm.toLowerCase();

        // Prioritize exact match (e.g., searching for "P7" should not show "P74")
        const exactMatch = statsData.find(s => s.name.toLowerCase() === lower);
        if (exactMatch) {
            return [exactMatch];
        }

        return statsData.filter(s => s.name.toLowerCase().includes(lower));
    }, [statsData, searchTerm]);

    // Handlers
    const handleToggleLayer = (layerId) => {
        setActiveLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>Cargando datos del visor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen bg-slate-950 overflow-hidden font-inter text-slate-100">

            {/* Left Sidebar */}
            <aside className="w-80 flex-shrink-0 z-20 shadow-xl bg-slate-900 border-r border-slate-800 flex flex-col">
                <Sidebar
                    activeLayers={activeLayers}
                    onToggleLayer={handleToggleLayer}
                    onSearch={setSearchTerm}
                    searchTerm={searchTerm}
                    data={statsData}
                    targetThreshold={targetThreshold}
                    onThresholdChange={setTargetThreshold}
                />

                {/* Tab Switcher in Sidebar Bottom */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="grid grid-cols-3 gap-2 bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('map')}
                            className={`text-xs font-medium py-2 rounded-md transition-colors ${activeTab === 'map' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Mapa
                        </button>
                        <button
                            onClick={() => setActiveTab('charts')}
                            className={`text-xs font-medium py-2 rounded-md transition-colors ${activeTab === 'charts' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Estadísticas
                        </button>
                        <button
                            onClick={() => setActiveTab('iframe')}
                            className={`text-xs font-medium py-2 rounded-md transition-colors ${activeTab === 'iframe' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Sitios P.
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative bg-slate-950">

                {/* Map Tab */}
                <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${activeTab === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <MapComponent
                        activeLayers={activeLayers}
                        ecosystemStats={statsData}
                        onEcosystemSelect={(id) => {
                            setSelectedEcoId(id);
                        }}
                        onToggleLayer={handleToggleLayer}
                        searchTerm={searchTerm}
                        onSearch={setSearchTerm}
                    />
                </div>

                {/* Charts Tab */}
                <div className={`absolute inset-0 z-10 bg-slate-950 transition-opacity duration-300 flex flex-col ${activeTab === 'charts' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="p-6 h-full overflow-hidden">
                        <h2 className="text-2xl font-bold mb-6 text-slate-100 border-b border-slate-800 pb-4">
                            Análisis de Brechas y Representatividad
                        </h2>
                        <div className="h-[calc(100%-80px)]">
                            <StatsCharts
                                data={filteredStats}
                                selectedEcoId={selectedEcoId}
                                targetThreshold={targetThreshold}
                                fullData={statsData}
                            />
                        </div>
                    </div>
                </div>

                {/* Iframe Tab (Sitios P.) */}
                <div className={`absolute inset-0 z-10 bg-slate-950 transition-opacity duration-300 flex flex-col ${activeTab === 'iframe' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <iframe
                        src="https://monitor-sitios-prioritarios-dz6w2zl3rzjxshw7vevms4.streamlit.app/?embed=true"
                        title="Monitor Sitios Prioritarios"
                        className="w-full h-full border-none"
                        allowFullScreen
                    />
                </div>

            </main>
        </div>
    );
}

export default App;
