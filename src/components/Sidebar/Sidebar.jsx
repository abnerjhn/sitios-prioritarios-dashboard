import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Search, Map as MapIcon, Info, Table, X, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Sidebar = ({ activeLayers, onToggleLayer, onSearch, searchTerm, data, targetThreshold, onThresholdChange }) => {
    const [showFormationsModal, setShowFormationsModal] = useState(false);
    const [showSPModal, setShowSPModal] = useState(false);
    const [spAnalysisResults, setSpAnalysisResults] = useState({ title: '', items: [] });

    const [formations, setFormations] = useState([]);
    const [relations, setRelations] = useState({});

    useEffect(() => {
        // Fetch Formations
        fetch('/data/formations.json')
            .then(res => res.json())
            .then(data => {
                data.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' }));
                setFormations(data);
            })
            .catch(err => console.error("Failed to load formations:", err));

        // Fetch Relations for Analysis
        fetch('/data/relations.json')
            .then(res => res.json())
            .then(data => setRelations(data))
            .catch(err => console.error("Failed to load relations:", err));
    }, []);

    const handleTableFilter = (code) => {
        if (data) {
            const eco = data.find(d => d.id === code);
            if (eco) {
                onSearch(eco.name);
                setShowFormationsModal(false);
            }
        }
    };

    // Analysis Logic
    const analyzeSPs = (mode) => {
        if (!data || !relations) return;

        const isOver = mode === 'OVER';
        const title = isOver
            ? `Sitios Prioritarios en Ecosistemas Sobrerepresentados (>= ${targetThreshold}%)`
            : `Sitios Prioritarios en Ecosistemas Subrepresentados (< ${targetThreshold}%)`;

        // 1. Build a map of all SPs and their ecosystems with status
        const spMap = {}; // { "SP_ID": [{ name: "EcoName", pct: 12.5, meets: false }, ...] }

        data.forEach(eco => {
            const totalPct = eco.pct_total_potential || 0;
            const meetsTarget = totalPct >= targetThreshold;

            const ecoRel = relations[eco.id];
            if (ecoRel && ecoRel.sps) {
                ecoRel.sps.forEach(spId => {
                    if (!spMap[spId]) spMap[spId] = [];
                    spMap[spId].push({
                        name: eco.name,
                        pct: totalPct,
                        meets: meetsTarget
                    });
                });
            }
        });

        // 2. Filter SPs based on the criterion
        // "Include if at least one ecosystem meets the criteria"
        const filteredSPs = Object.entries(spMap).filter(([spId, ecos]) => {
            if (isOver) {
                // Show if it has ANY over-represented ecosystem
                return ecos.some(e => e.meets);
            } else {
                // Show if it has ANY under-represented ecosystem
                return ecos.some(e => !e.meets);
            }
        });

        // 3. Format for display
        const results = filteredSPs.map(([spId, ecos]) => ({
            id: spId,
            ecosystems: ecos.sort((a, b) => {
                // Sort ecosystems: matching criteria first, then by name
                const aMatch = isOver ? a.meets : !a.meets;
                const bMatch = isOver ? b.meets : !b.meets;
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return a.name.localeCompare(b.name);
            })
        })).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

        setSpAnalysisResults({ title, items: results });
        setShowSPModal(true);
    };

    // Calculate Metrics for Selected Ecosystem
    const selectedEcoStats = useMemo(() => {
        if (!data || !searchTerm) return null;
        return data.find(d => d.name === searchTerm);
    }, [data, searchTerm]);

    // Computed Metrics for Table
    const tableMetrics = useMemo(() => {
        if (!selectedEcoStats) return null;

        const totalHa = selectedEcoStats.total_has;

        // AP
        const apPct = selectedEcoStats.pct_protected || 0;
        const apHa = (apPct / 100) * totalHa;

        // SP
        const spPct = selectedEcoStats.pct_sp_Contribution || 0;
        const spHa = (spPct / 100) * totalHa;

        // Total
        const totalPct = selectedEcoStats.pct_total_potential;
        const totalConservedHa = (totalPct / 100) * totalHa;

        // Gap (Dynamic based on targetThreshold)
        const currentTarget = targetThreshold;
        const gapPct = Math.max(0, currentTarget - totalPct);
        const gapHa = (gapPct / 100) * totalHa;
        const isGapMet = gapPct === 0;

        return {
            totalHa,
            ap: { pct: apPct, ha: apHa },
            sp: { pct: spPct, ha: spHa },
            total: { pct: totalPct, ha: totalConservedHa },
            gap: { pct: gapPct, ha: gapHa, isMet: isGapMet, target: currentTarget }
        };
    }, [selectedEcoStats, targetThreshold]);

    const pieData = useMemo(() => {
        if (!selectedEcoStats) return [];
        const ap = selectedEcoStats.pct_protected || 0;
        const sp = selectedEcoStats.pct_sp_Contribution || 0;
        const gap = Math.max(0, 100 - (ap + sp));

        return [
            { name: 'AP', value: ap, color: '#3b82f6' }, // Blue
            { name: 'SP', value: sp, color: '#a855f7' }, // Purple
            { name: 'Brecha', value: gap, color: '#334155' } // Slate-700
        ];
    }, [selectedEcoStats]);

    const formatNumber = (num) => {
        return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(num);
    };

    return (
        <div className="flex-1 w-full flex flex-col bg-slate-900 border-r border-slate-700 relative min-h-0 overflow-hidden">

            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <MapIcon className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Ecosistemas y Sitios Prioritarios - Ley 21.600
                    </h1>
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">

                {/* Layer Control */}
                <div className="mb-6">
                    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Capas
                    </h2>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700">
                            <input
                                type="checkbox"
                                checked={activeLayers.areas_protegidas}
                                onChange={() => onToggleLayer('areas_protegidas')}
                                className="w-4 h-4 rounded text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                            />
                            <span className="text-sm font-medium text-slate-200 flex-1">Áreas Protegidas</span>
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        </label>

                        <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700">
                            <input
                                type="checkbox"
                                checked={activeLayers.sitios_prioritarios}
                                onChange={() => onToggleLayer('sitios_prioritarios')}
                                className="w-4 h-4 rounded text-purple-500 bg-slate-700 border-slate-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-slate-200 block">Sitios Prioritarios</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        </label>

                        <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700">
                            <input
                                type="checkbox"
                                checked={activeLayers.ecosistemas_formaciones}
                                onChange={() => onToggleLayer('ecosistemas_formaciones')}
                                className="w-4 h-4 rounded text-slate-400 bg-slate-700 border-slate-600 focus:ring-slate-400 focus:ring-offset-slate-900"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-slate-200 block">Ecosistemas (Formaciones)</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        </label>

                        <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700">
                            <input
                                type="checkbox"
                                checked={activeLayers.ecosistemas_integrados}
                                onChange={() => onToggleLayer('ecosistemas_integrados')}
                                className="w-4 h-4 rounded text-cyan-500 bg-slate-700 border-slate-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-slate-200 block">Ecosistemas (Cruce)</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-cyan-500 border border-slate-400"></div>
                        </label>
                    </div>
                </div>

                {/* Global Analysis Tools */}
                <div className="mb-6 border-t border-slate-800 pt-6">
                    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4" /> Análisis de Brechas
                    </h2>

                    {/* Threshold Control */}
                    <div className="mb-6 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                        <label className="text-xs text-slate-400 mb-2 block flex justify-between">
                            <span>Umbral Objetivo (Meta)</span>
                            <span className="text-emerald-400 font-bold">{targetThreshold}%</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={targetThreshold}
                            onChange={(e) => onThresholdChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Analysis Buttons */}
                    <div className="grid grid-cols-1 gap-2">
                        <button
                            onClick={() => analyzeSPs('OVER')}
                            className="w-full py-2 px-3 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-900/50 rounded-lg text-xs text-emerald-200 transition-colors text-left flex items-center gap-2"
                        >
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            Ver SP en Ecosistemas Sobrerepresentados {'>'} {targetThreshold}%
                        </button>
                        <button
                            onClick={() => analyzeSPs('UNDER')}
                            className="w-full py-2 px-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded-lg text-xs text-red-200 transition-colors text-left flex items-center gap-2"
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            Ver SP en Ecosistemas Subrepresentados {'<'} {targetThreshold}%
                        </button>
                    </div>
                </div>

                {/* Ecosystem Filter Section */}
                <div className="border-t border-slate-800 pt-6 mb-8">
                    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3 flex items-center gap-2">
                        <Search className="w-4 h-4" /> Filtros
                    </h2>
                    <button
                        onClick={() => setShowFormationsModal(true)}
                        className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Search className="w-4 h-4" /> Buscar Ecosistema
                    </button>
                    {searchTerm && (
                        <button
                            onClick={() => onSearch('')}
                            className="w-full mt-2 py-2 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 flex items-center justify-center gap-2 transition-colors"
                        >
                            <X className="w-3 h-3" /> Limpiar Filtro ({searchTerm.substring(0, 15)}...)
                        </button>
                    )}
                </div>

                {/* Data Metrics Section (Specific Ecosystem) */}
                {selectedEcoStats && tableMetrics && (
                    <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-400" />
                            Detalle: {selectedEcoStats.name}
                        </h3>

                        {/* Summary Table */}
                        <div className="bg-slate-900/50 rounded-lg p-3 mb-4 space-y-3">
                            {/* Header Row */}
                            <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                                <span className="text-slate-400 font-semibold">Superficie Total</span>
                                <span className="font-mono text-slate-200">{formatNumber(tableMetrics.totalHa)} ha</span>
                            </div>

                            {/* AP Row */}
                            <div className="flex justify-between items-center text-xs group">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-slate-400">Áreas Protegidas</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-blue-400 font-bold block">{tableMetrics.ap.pct.toFixed(2)}%</span>
                                    <span className="font-mono text-slate-500 text-[10px]">{formatNumber(tableMetrics.ap.ha)} ha</span>
                                </div>
                            </div>

                            {/* SP Row */}
                            <div className="flex justify-between items-center text-xs group">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    <span className="text-slate-400">Sitios Prioritarios</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-purple-400 font-bold block">{tableMetrics.sp.pct.toFixed(2)}%</span>
                                    <span className="font-mono text-slate-500 text-[10px]">{formatNumber(tableMetrics.sp.ha)} ha</span>
                                </div>
                            </div>

                            {/* Total AP+SP Row */}
                            <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2">
                                <span className="text-slate-300 font-medium">Total Consolidado</span>
                                <div className="text-right">
                                    <span className="font-mono text-emerald-400 font-bold block">{tableMetrics.total.pct.toFixed(2)}%</span>
                                    <span className="font-mono text-slate-400 text-[10px]">{formatNumber(tableMetrics.total.ha)} ha</span>
                                </div>
                            </div>

                            {/* Gap Row (Dynamic) */}
                            <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2 bg-slate-800/30 -mx-1 px-1 rounded">
                                <span className="text-slate-400">Brecha para Meta ({tableMetrics.gap.target}%)</span>
                                <div className="text-right">
                                    <span className={`font-mono font-bold block ${tableMetrics.gap.isMet ? 'text-emerald-500' : 'text-red-400'}`}>
                                        {tableMetrics.gap.isMet ? 'CUMPLIDA' : `${tableMetrics.gap.pct.toFixed(2)}%`}
                                    </span>
                                    {!tableMetrics.gap.isMet && (
                                        <span className="font-mono text-red-900/70 text-[10px]">{formatNumber(tableMetrics.gap.ha)} ha</span>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Chart */}
                        <div className="h-48 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                        formatter={(value) => `${value.toFixed(1)}%`}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Label */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                <div className="text-center">
                                    <span className="text-xs text-slate-500 block">Total</span>
                                    <span
                                        className={`text-lg font-bold ${selectedEcoStats.pct_total_potential >= targetThreshold ? 'text-emerald-400' : 'text-red-400'}`}
                                    >
                                        {selectedEcoStats.pct_total_potential.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <div className="p-4 border-t border-slate-800 text-center">
                <span className="text-xs text-green-400 font-bold">v1.0.6 (Debug Active)</span>
            </div>

            {/* Formations Modal */}
            {showFormationsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Search className="w-5 h-5 text-blue-500" /> Filtrar Ecosistema
                            </h3>
                            <button
                                onClick={() => setShowFormationsModal(false)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="overflow-auto flex-1 p-4">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 rounded-tl-lg bg-slate-900">Código</th>
                                        <th className="px-6 py-3 bg-slate-900">Piso Vegetacional</th>
                                        <th className="px-6 py-3 bg-slate-900">Formación</th>
                                        <th className="px-6 py-3 rounded-tr-lg text-center bg-slate-900">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {formations.map((f, i) => (
                                        <tr key={i} className="hover:bg-slate-800/30 group">
                                            <td className="px-6 py-3 font-mono text-blue-400">{f.codigo}</td>
                                            <td className="px-6 py-3">{f.piso}</td>
                                            <td className="px-6 py-3 font-medium text-emerald-400">{f.formacion}</td>
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    onClick={() => handleTableFilter(f.codigo)}
                                                    className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                    title="Filtrar en Mapa"
                                                >
                                                    <Search className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* SP Analysis Modal */}
            {showSPModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Layers className="w-5 h-5 text-purple-500" /> {spAnalysisResults.title}
                            </h3>
                            <button
                                onClick={() => setShowSPModal(false)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-4 py-2 bg-slate-800/50 text-xs text-slate-400 border-b border-slate-800">
                            Se encontraron <strong>{spAnalysisResults.items.length}</strong> Sitios Prioritarios asociados a estos ecosistemas.
                        </div>
                        <div className="overflow-auto flex-1 p-4">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 rounded-tl-lg bg-slate-900">Código Sitio</th>
                                        <th className="px-6 py-3 rounded-tr-lg bg-slate-900">Ecosistemas Asociados</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {spAnalysisResults.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-800/30">
                                            <td className="px-6 py-3 font-mono text-purple-400 align-top whitespace-nowrap">
                                                {item.id}
                                            </td>
                                            <td className="px-6 py-3 text-slate-400 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.ecosystems.map((eco, j) => (
                                                        <span
                                                            key={j}
                                                            className={`px-2 py-0.5 rounded-full border text-[10px] flex items-center gap-1 ${eco.meets
                                                                ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300'
                                                                : 'bg-red-900/30 border-red-800 text-red-300'
                                                                }`}
                                                            title={`${eco.name}: ${eco.pct.toFixed(1)}%`}
                                                        >
                                                            {eco.name}
                                                            <span className="opacity-70 text-[9px]">({eco.pct.toFixed(0)}%)</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Debug Version Indicator */}
            <div className="absolute bottom-1 right-2 text-[10px] text-slate-600 opacity-50 pointer-events-none">
                v1.0.5 (Debug)
            </div>
        </div>
    );
};

export default Sidebar;
