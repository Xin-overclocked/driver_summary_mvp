import React, { useState, useMemo } from 'react';
import { 
  Upload, Download, AlertCircle, CheckCircle, 
  AlertTriangle, XCircle, Search, Truck, Calendar, FileCheck, ArrowRight, ChevronDown
} from 'lucide-react';
import { parseRatesCSV, parseDriverPDF, generateMismatchCSV, RateData, DriverReport, generatePDF } from './utils';

const App: React.FC = () => {
  const [rateData, setRateData] = useState<RateData | null>(null);
  const [reports, setReports] = useState<DriverReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDriverIndex, setActiveDriverIndex] = useState(0);

  // Derived state for stats
  const { totalMismatches, totalFuzzy, missingRoutes, totalTrips } = useMemo(() => {
    let mismatches = 0;
    let fuzzy = 0;
    let trips = 0;
    const routes = new Set<string>();

    reports.forEach(r => {
      mismatches += r.mismatchedTrips;
      fuzzy += r.fuzzyTrips;
      trips += r.transactions.length;
      r.transactions.forEach(t => {
        if (t.matchType === 'NONE') {
          routes.add(`${t.pickup} → ${t.drop}`);
        }
      });
    });

    return {
      totalMismatches: mismatches,
      totalFuzzy: fuzzy,
      totalTrips: trips,
      missingRoutes: Array.from(routes).sort()
    };
  }, [reports]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await parseRatesCSV(e.target.files[0]);
        setRateData(data);
      } catch (err) {
        setError("Failed to parse CSV file. Please check the format.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!rateData) {
      setError("Please upload the Rates CSV first.");
      return;
    }
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      setError(null);
      try {
        const processedReports = await parseDriverPDF(e.target.files[0], rateData);
        setReports(processedReports);
        setActiveDriverIndex(0);
      } catch (err) {
        console.error(err);
        setError("Failed to parse PDF file. Ensure it is a text-based PDF.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExport = () => {
    if (reports.length > 0) {
      generatePDF(reports);
    }
  };

  const resetAll = () => {
    setRateData(null);
    setReports([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Simple Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Truck className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl text-slate-800 tracking-tight">Driver Incentive Calculator</h1>
          </div>
          
          <div className="flex items-center gap-4">
             {reports.length > 0 && (
                <>
                  <button onClick={resetAll} className="text-slate-500 hover:text-slate-800 text-sm font-medium">Start Over</button>
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Error Notification */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* --- Upload Section (Only visible if no reports) --- */}
        {reports.length === 0 && (
          <div className="max-w-2xl mx-auto mt-10">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Import Data</h2>
              <p className="text-slate-500 mb-8">Upload your rate sheet and driver report to get started.</p>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className={`p-4 rounded-xl border-2 transition-all ${rateData ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-blue-400 bg-slate-50'}`}>
                  <label className="flex items-center justify-between cursor-pointer w-full">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rateData ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>1</div>
                      <div className="text-left">
                        <span className={`block font-semibold ${rateData ? 'text-emerald-900' : 'text-slate-700'}`}>Rates CSV</span>
                        <span className="text-xs text-slate-500">selected_columns.csv</span>
                      </div>
                    </div>
                    {rateData ? <CheckCircle className="text-emerald-600 w-5 h-5" /> : <span className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-medium text-slate-600 shadow-sm">Select File</span>}
                    <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                  </label>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                   <ArrowRight className="text-slate-300 w-5 h-5 rotate-90" />
                </div>

                {/* Step 2 */}
                 <div className={`p-4 rounded-xl border-2 transition-all ${!rateData ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400 cursor-pointer bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center justify-between cursor-pointer w-full">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">2</div>
                      <div className="text-left">
                        <span className="block font-semibold text-slate-700">Driver PDF</span>
                        <span className="text-xs text-slate-500">Summary Report</span>
                      </div>
                    </div>
                    <span className="bg-white px-3 py-1 rounded border border-slate-300 text-xs font-medium text-slate-600 shadow-sm">Select File</span>
                    <input type="file" accept=".pdf" onChange={handlePDFUpload} disabled={!rateData} className="hidden" />
                  </label>
                </div>
              </div>

              {isLoading && <div className="mt-6 text-sm text-blue-600 font-medium animate-pulse">Processing files...</div>}
            </div>
          </div>
        )}

        {/* --- Results Section --- */}
        {reports.length > 0 && (
          <div className="space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Total Trips</div>
                 <div className="text-2xl font-bold text-slate-900">{totalTrips}</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Mismatches</div>
                 <div className="text-2xl font-bold text-red-600">{totalMismatches}</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Fuzzy Matches</div>
                 <div className="text-2xl font-bold text-amber-500">{totalFuzzy}</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Drivers</div>
                 <div className="text-2xl font-bold text-slate-900">{reports.length}</div>
               </div>
            </div>

            {/* Mismatch Warning */}
            {totalMismatches > 0 && (
              <div className="bg-white border border-red-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                   <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5" />
                   <div>
                     <h3 className="font-semibold text-red-800">Review Required</h3>
                     <p className="text-sm text-red-600 mt-1">There are {totalMismatches} trips where the route (Pickup/Drop) could not be found in the rate sheet.</p>
                   </div>
                </div>
                <button 
                  onClick={() => generateMismatchCSV(reports)}
                  className="whitespace-nowrap flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Mismatches CSV
                </button>
              </div>
            )}

            {/* Driver Selector & Report View */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-sm font-medium text-slate-500">Driver:</span>
                    <div className="relative">
                      <select 
                        className="appearance-none bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2 font-medium"
                        value={activeDriverIndex}
                        onChange={(e) => setActiveDriverIndex(Number(e.target.value))}
                      >
                        {reports.map((r, i) => (
                          <option key={i} value={i}>{r.driverName} ({r.transactions.length} trips)</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                 </div>

                 <div className="text-right flex gap-6">
                    <div>
                      <span className="block text-xs text-slate-500 font-semibold uppercase">Old Total</span>
                      <span className="font-mono font-medium text-slate-500 line-through decoration-slate-400">
                        ${reports[activeDriverIndex].totalOriginalComm.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 font-semibold uppercase">New Total</span>
                      <span className={`font-mono font-bold text-lg ${reports[activeDriverIndex].totalNewComm >= reports[activeDriverIndex].totalOriginalComm ? 'text-emerald-600' : 'text-slate-900'}`}>
                        ${reports[activeDriverIndex].totalNewComm.toFixed(2)}
                      </span>
                    </div>
                 </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 whitespace-nowrap">Truck</th>
                      <th className="px-4 py-3">Route (Pickup → Drop)</th>
                      <th className="px-4 py-3 text-right">Wt</th>
                      <th className="px-4 py-3 text-right">Old Rate</th>
                      <th className="px-4 py-3 text-right">New Rate</th>
                      <th className="px-4 py-3 text-right">Old Comm</th>
                      <th className="px-4 py-3 text-right">New Comm</th>
                      <th className="px-4 py-3 text-right">Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports[activeDriverIndex].transactions.map((t, i) => {
                      const isError = t.matchType === 'NONE';
                      const isFuzzy = t.matchType === 'FUZZY';
                      return (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${isError ? 'bg-red-50/50' : ''}`}>
                          <td className="px-4 py-3 font-mono text-slate-600 text-xs whitespace-nowrap">{t.date}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{t.truck}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className={isError ? 'text-red-700 font-medium' : 'text-slate-800'}>
                                {t.pickup} <span className="text-slate-400">→</span> {t.drop}
                              </span>
                              {isFuzzy && (
                                <span className="text-amber-600 text-xs mt-0.5 flex items-center gap-1">
                                  <Search className="w-3 h-3" />
                                  Matched: {t.matchedPickup} → {t.matchedDrop}
                                </span>
                              )}
                              {isError && <span className="text-red-500 text-xs mt-0.5">Rate not found</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">{t.effWt.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400 line-through decoration-slate-300 text-xs">{t.originalEffRt.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">{t.newEffRt.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-400">{t.originalComm.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{t.newComm.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                             <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${t.diff > 0 ? 'bg-emerald-100 text-emerald-700' : t.diff < 0 ? 'bg-red-100 text-red-700' : 'text-slate-400'}`}>
                               {t.diff > 0 ? '+' : ''}{t.diff.toFixed(2)}
                             </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;