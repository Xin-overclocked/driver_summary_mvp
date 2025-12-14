import React, { useState, useMemo } from 'react';
import { 
  Upload, FileText, Download, AlertCircle, CheckCircle, 
  RefreshCw, AlertTriangle, XCircle, Search, ChevronRight, 
  MapPin, Truck, Calendar, FileCheck, ArrowRight
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                <Truck className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800">
                Incentive<span className="text-blue-600">Calc</span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {reports.length > 0 && (
                <>
                  <button 
                    onClick={resetAll}
                    className="text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
                  >
                    Start Over
                  </button>
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Notification */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0" />
            <p className="text-red-700 font-medium text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* --- Upload Phase --- */}
        {reports.length === 0 && (
          <div className="max-w-3xl mx-auto mt-12">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Upload Trip Data</h1>
              <p className="text-slate-500 text-lg">Process driver PDFs against your rate sheet in seconds.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              {/* Connector Line (Desktop) */}
              <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300 z-0">
                <ArrowRight className="w-8 h-8" />
              </div>

              {/* Step 1: CSV */}
              <div className={`relative z-10 bg-white p-8 rounded-2xl border-2 transition-all duration-300 shadow-sm group
                ${rateData ? 'border-emerald-400 ring-4 ring-emerald-50' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'}`}>
                
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold
                    ${rateData ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    1
                  </div>
                  {rateData && <CheckCircle className="text-emerald-500 w-6 h-6" />}
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Rate Sheet</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Upload <code className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-mono text-xs">selected_columns.csv</code> containing Pickup, Drop, and Driver Rev_Rate.
                </p>

                <label className="block">
                  <span className="sr-only">Upload CSV</span>
                  <div className={`w-full py-3 px-4 rounded-lg border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors
                    ${rateData ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'}`}>
                    {rateData ? <FileCheck className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    <span className="text-sm font-medium">{rateData ? 'CSV Loaded' : 'Select CSV File'}</span>
                  </div>
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>

              {/* Step 2: PDF */}
              <div className={`relative z-10 bg-white p-8 rounded-2xl border-2 transition-all duration-300 shadow-sm
                ${reports.length > 0 ? 'border-emerald-400' : 'border-slate-200'}
                ${!rateData ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:border-blue-400 hover:shadow-md'}`}>
                
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold
                    ${reports.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    2
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-2">Driver Report</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Upload the PDF summary. We'll match locations and recalculate rates automatically.
                </p>

                <label className={`block ${!rateData ? 'pointer-events-none' : ''}`}>
                  <span className="sr-only">Upload PDF</span>
                  <div className={`w-full py-3 px-4 rounded-lg border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors
                     ${!rateData ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400'}`}>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Select PDF File</span>
                  </div>
                  <input type="file" accept=".pdf" onChange={handlePDFUpload} disabled={!rateData} className="hidden" />
                </label>
              </div>
            </div>

            {isLoading && (
              <div className="mt-12 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600 font-medium">Processing trips...</p>
              </div>
            )}
          </div>
        )}

        {/* --- Results Phase --- */}
        {reports.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Trips</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-slate-900">{totalTrips}</span>
                  <Truck className="text-slate-300 w-5 h-5 mb-1" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Exact Matches</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-emerald-600">{totalTrips - totalMismatches - totalFuzzy}</span>
                  <CheckCircle className="text-emerald-100 w-5 h-5 mb-1" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">AI Fuzzy Matches</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-amber-500">{totalFuzzy}</span>
                  <Search className="text-amber-100 w-5 h-5 mb-1" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Missing Rates</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-red-600">{totalMismatches}</span>
                  <AlertTriangle className="text-red-100 w-5 h-5 mb-1" />
                </div>
              </div>
            </div>

            {/* Validation Panel */}
            {totalMismatches > 0 && (
              <div className="mb-6 bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-red-600 w-5 h-5" />
                    <h3 className="font-semibold text-red-900">Missing Routes Detected</h3>
                  </div>
                  
                  <button 
                    onClick={() => generateMismatchCSV(reports)}
                    className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV
                  </button>

                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-600 mb-3">The following routes were not found in your rate sheet. Calculations for these trips reverted to the original PDF rate.</p>
                  <div className="flex flex-wrap gap-2">
                    {missingRoutes.map((route, idx) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 shadow-sm font-mono">
                        {route}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)] min-h-[600px]">
              
              {/* Sidebar: Driver List */}
              <div className="lg:w-80 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-700">Drivers ({reports.length})</h2>
                </div>
                <div className="overflow-y-auto flex-1">
                  {reports.map((report, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveDriverIndex(idx)}
                      className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-all group relative
                        ${activeDriverIndex === idx ? 'bg-blue-50/60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-medium ${activeDriverIndex === idx ? 'text-blue-700' : 'text-slate-700'}`}>
                          {report.driverName}
                        </span>
                        <div className="flex gap-1">
                          {report.mismatchedTrips > 0 && <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />}
                          {report.fuzzyTrips > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5" />}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>{report.transactions.length} trips</span>
                        {activeDriverIndex === idx && <ChevronRight className="w-4 h-4 text-blue-500" />}
                      </div>
                      
                      {/* Active Indicator Bar */}
                      {activeDriverIndex === idx && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Area */}
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Driver Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-end bg-slate-50/30">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{reports[activeDriverIndex].driverName}</h2>
                    <div className="flex gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Report generated today
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Commission</p>
                    <div className="flex items-baseline gap-3 justify-end">
                      <span className="text-3xl font-bold text-slate-900">
                        ${reports[activeDriverIndex].totalNewComm.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-400 line-through">
                        ${reports[activeDriverIndex].totalOriginalComm.toFixed(2)}
                      </span>
                    </div>
                    <div className={`text-xs font-medium mt-1 ${
                       reports[activeDriverIndex].totalNewComm >= reports[activeDriverIndex].totalOriginalComm 
                       ? 'text-emerald-600' 
                       : 'text-red-600'
                    }`}>
                      {(reports[activeDriverIndex].totalNewComm - reports[activeDriverIndex].totalOriginalComm) >= 0 ? '+' : ''}
                      ${(reports[activeDriverIndex].totalNewComm - reports[activeDriverIndex].totalOriginalComm).toFixed(2)} difference
                    </div>
                  </div>
                </div>

                {/* Sticky Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-slate-500 font-semibold uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 w-24">Date</th>
                        <th className="px-6 py-4 w-24">Truck</th>
                        <th className="px-6 py-4">Pickup / Drop</th>
                        <th className="px-6 py-4 text-right">Wt</th>
                        <th className="px-6 py-4 text-right">Old Rate</th>
                        <th className="px-6 py-4 text-right">New Rate</th>
                        <th className="px-6 py-4 text-right">Old Comm</th>
                        <th className="px-6 py-4 text-right">New Comm</th>
                        <th className="px-6 py-4 text-right">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reports[activeDriverIndex].transactions.map((t, i) => {
                        const isFuzzy = t.matchType === 'FUZZY';
                        const isError = t.matchType === 'NONE';
                        const isChanged = t.newComm !== t.originalComm;

                        return (
                          <tr key={i} className={`group transition-colors hover:bg-slate-50 
                            ${isError ? 'bg-red-50/30 hover:bg-red-50/60' : ''}`}>
                            
                            <td className="px-6 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">{t.date}</td>
                            <td className="px-6 py-3 font-medium text-slate-700">{t.truck}</td>
                            
                            <td className="px-6 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                  <span className={isError ? 'text-red-700 font-medium' : isFuzzy ? 'text-amber-700' : 'text-slate-700'}>
                                    {t.pickup}
                                    {isFuzzy && t.matchedPickup && <span className="text-amber-500 text-xs ml-1 opacity-75">→ {t.matchedPickup}</span>}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                  <span className={isError ? 'text-red-700 font-medium' : isFuzzy ? 'text-amber-700' : 'text-slate-700'}>
                                    {t.drop}
                                    {isFuzzy && t.matchedDrop && <span className="text-amber-500 text-xs ml-1 opacity-75">→ {t.matchedDrop}</span>}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1">
                                {isFuzzy && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                    AI Matched
                                  </span>
                                )}
                                {isError && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                    Rate Missing
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-3 text-right font-mono text-slate-600">{t.effWt.toFixed(2)}</td>
                            
                            <td className="px-6 py-3 text-right font-mono text-slate-400 decoration-slate-300 line-through text-xs">
                              {t.originalEffRt.toFixed(2)}
                            </td>
                            
                            <td className="px-6 py-3 text-right">
                              <span className={`font-mono font-bold
                                ${isError ? 'text-red-600' : isChanged ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {t.newEffRt.toFixed(2)}
                              </span>
                            </td>

                            <td className="px-6 py-3 text-right font-mono text-slate-400 text-xs">
                              {t.originalComm.toFixed(2)}
                            </td>

                            <td className="px-6 py-3 text-right font-mono font-bold text-emerald-700">
                              {t.newComm.toFixed(2)}
                            </td>

                            <td className="px-6 py-3 text-right">
                              <span className={`font-mono text-xs font-medium px-2 py-1 rounded
                                ${t.diff > 0 ? 'bg-emerald-100 text-emerald-700' : t.diff < 0 ? 'bg-red-100 text-red-700' : 'text-slate-300'}`}>
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
          </div>
        )}
      </main>
    </div>
  );
};

export default App;