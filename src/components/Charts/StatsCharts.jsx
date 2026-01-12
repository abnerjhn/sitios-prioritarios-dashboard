import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
    Cell, ComposedChart, Line
} from 'recharts';

const StatsCharts = ({ data, selectedEcoId, targetThreshold, fullData }) => {

    // Sort data by percentage protected for better visualization
    const sortedData = useMemo(() => {
        if (!data) return [];
        // Clone and sort descending by total potential protection
        return [...data].map(item => {
            const ap = item.pct_protected || 0;
            const sp = item.pct_sp_Contribution || 0;
            const gap = Math.max(0, 100 - (ap + sp));
            return { ...item, pct_gap: gap };
        }).sort((a, b) => b.pct_total_potential - a.pct_total_potential);
    }, [data]);

    // Calculate Global KPIs for a mini-header (from CURRENT data view)
    const globalStats = useMemo(() => {
        if (!data) return { total: 0, protected: 0, sp: 0, consolidated: 0 };
        const total = data.reduce((acc, cur) => acc + cur.total_has, 0);
        const protectedSum = data.reduce((acc, cur) => acc + cur.protected_has, 0);
        const spSum = data.reduce((acc, cur) => acc + cur.sp_net_has, 0);
        const gapSum = total - protectedSum - spSum;
        const consolidatedSum = protectedSum + spSum;

        return {
            total,
            protected: protectedSum,
            sp: spSum,
            consolidated: consolidatedSum,
            gap: gapSum,
            pct_protected: (protectedSum / total) * 100,
            pct_sp: (spSum / total) * 100,
            pct_consolidated: (consolidatedSum / total) * 100,
            pct_gap: (gapSum / total) * 100
        };
    }, [data]);

    // Calculate National Benchmark (from FULL data)
    const nationalStats = useMemo(() => {
        if (!fullData) return { pct_total_protected: 0 };
        const total = fullData.reduce((acc, cur) => acc + cur.total_has, 0);
        const protectedSum = fullData.reduce((acc, cur) => acc + cur.protected_has, 0);
        const spSum = fullData.reduce((acc, cur) => acc + cur.sp_net_has, 0);
        return {
            pct_total_protected: ((protectedSum + spSum) / total) * 100
        };
    }, [fullData]);

    if (!data || data.length === 0) return <div className="p-4 text-gray-400">Cargando datos estadísticos...</div>;

    const displayData = sortedData;
    const chartHeight = Math.max(400, displayData.length * 25); // Dynamic height to fit all

    return (
        <div className="charts-container h-full flex flex-col gap-6 p-4 overflow-y-auto custom-scrollbar">

            {/* Global Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2 flex-shrink-0">
                <div className="bg-card p-4 rounded-xl border border-gray-700 shadow-sm">
                    <h3 className="text-secondary text-sm font-medium">Superficie Total</h3>
                    <p className="text-2xl font-bold text-primary">{Math.round(globalStats.total).toLocaleString()} has</p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-gray-700 shadow-sm">
                    <h3 className="text-secondary text-sm font-medium">Protección Oficial (AP)</h3>
                    <p className="text-2xl font-bold text-blue-500">
                        {Math.round(globalStats.pct_protected)}%
                        <span className="text-xs text-gray-400 ml-2">({Math.round(globalStats.protected).toLocaleString()} has)</span>
                    </p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-gray-700 shadow-sm">
                    <h3 className="text-secondary text-sm font-medium">Aporte Sitios Prioritarios</h3>
                    <p className="text-2xl font-bold text-purple-500">
                        +{Math.round(globalStats.pct_sp)}%
                        <span className="text-xs text-gray-400 ml-2">({Math.round(globalStats.sp).toLocaleString()} has)</span>
                    </p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-gray-700 shadow-sm">
                    <h3 className="text-secondary text-sm font-medium">Total (AP + SP)</h3>
                    <p className="text-2xl font-bold text-emerald-500">
                        {Math.round(globalStats.pct_consolidated)}%
                        <span className="text-xs text-gray-400 ml-2">({Math.round(globalStats.consolidated).toLocaleString()} has)</span>
                    </p>
                </div>
            </div>

            {/* Gap Analysis Chart */}
            <div className="bg-card p-4 rounded-xl border border-gray-700 flex-1 min-h-[400px] flex flex-col">
                <h3 className="text-md font-bold mb-4 text-gray-200 flex-shrink-0">Representatividad (%)</h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div style={{ height: `${chartHeight}px`, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                layout="vertical"
                                data={displayData}
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                                <YAxis type="category" dataKey="name" width={220} stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    formatter={(value) => `${value.toFixed(1)}%`}
                                    itemSorter={(item) => -item.value}
                                />
                                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />

                                <ReferenceLine
                                    x={nationalStats.pct_total_protected}
                                    stroke="#3b82f6"
                                    strokeDasharray="3 3"
                                    label={{ position: 'top', value: `Actual (${nationalStats.pct_total_protected.toFixed(1)}%)`, fill: '#3b82f6', fontSize: 10 }}
                                />
                                <ReferenceLine
                                    x={targetThreshold}
                                    stroke="#10b981"
                                    label={{ position: 'top', value: `Meta (${targetThreshold}%)`, fill: '#10b981', fontSize: 10 }}
                                />

                                <Bar dataKey="pct_protected" name="% Protegido AP" stackId="a" fill="#3b82f6" barSize={12} />
                                <Bar dataKey="pct_sp_Contribution" name="% Aporte SP" stackId="a" fill="#a855f7" barSize={12} />
                                <Bar dataKey="pct_gap" name="% No Protegido (Brecha)" stackId="a" fill="#334155" barSize={12} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default StatsCharts;
