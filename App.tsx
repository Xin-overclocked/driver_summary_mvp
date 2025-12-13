import React, { useState, useMemo } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle, ArrowRight, RefreshCw, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { parseRatesCSV, parseDriverPDF, RateData, DriverReport, generatePDF } from './utils';

const App: React.FC = () => {
  const [rateData, setRateData] = useState<RateData | null>(null);
  const [reports, setReports] = useState<DriverReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDriverIndex, setActiveDriverIndex] = useState(0);

  // Derived state for stats
  const { totalMismatches, totalFuzzy, missingRoutes } = useMemo(() => {
    let mismatches = 0;
    let fuzzy = 0;
    const routes = new Set<string>();

    reports.forEach(r => {
      mismatches += r.mismatchedTrips;
      fuzzy += r.fuzzyTrips;
      r.transactions.forEach(t => {
        if (t.matchType === 'NONE') {
          routes.add(`${t.pickup} → ${t.drop}`);
        }
      });
    });

    return {
      totalMismatches: mismatches,
      totalFuzzy: fuzzy,
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
        setError("Failed to parse CSV file.");
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
      } catch (err) {
        console.error(err);
        setError("Failed to parse PDF file. Ensure it is a valid text-based PDF.");
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

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <RefreshCw className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Driver Incentive Calcs</h1>
          </div>
          <div className="flex items-center gap-4">
             {reports.length > 0 && (
                 <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium shadow-sm"
                 >
                    <Download className="w-4 h-4" />
                    Export Updated PDF
                 </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Error Banner */}
        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md shadow-sm animate-fade-in">
                <div className="flex items-center gap-2">
                    <AlertCircle className="text-red-500 w-5 h-5" />
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            </div>
        )}

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* CSV Card */}
            <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${rateData ? 'border-green-400 bg-green-50/30' : 'border-dashed border-gray-300 bg-white hover:border-blue-400'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${rateData ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <h2 className="font-semibold text-gray-900">Step 1: Rate Sheet</h2>
                        </div>
                        {rateData && <CheckCircle className="text-green-500 w-5 h-5" />}
                    </div>
                    
                    <div className="flex-grow">
                        <p className="text-sm text-gray-500 mb-4">
                            Upload <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 font-mono text-xs">selected_columns.csv</code>. 
                            Must contain PickLoc, DropLoc, and Driver Rev_Rate columns.
                        </p>
                    </div>

                    <label className="block mt-auto">
                        <span className="sr-only">Choose CSV</span>
                        <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleCSVUpload}
                            className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            cursor-pointer"
                        />
                    </label>
                </div>
            </div>

            {/* PDF Card */}
            <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${reports.length > 0 ? 'border-green-400 bg-green-50/30' : 'border-dashed border-gray-300 bg-white hover:border-blue-400'} ${!rateData ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-full ${reports.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                <Upload className="w-5 h-5" />
                            </div>
                            <h2 className="font-semibold text-gray-900">Step 2: Driver Report</h2>
                        </div>
                        {reports.length > 0 && <CheckCircle className="text-green-500 w-5 h-5" />}
                    </div>

                    <div className="flex-grow">
                        <p className="text-sm text-gray-500 mb-4">
                            Upload the driver summary PDF. The app will match locations and recalculate rates.
                        </p>
                    </div>

                    <label className="block mt-auto">
                        <span className="sr-only">Choose PDF</span>
                        <input 
                            type="file" 
                            accept=".pdf"
                            onChange={handlePDFUpload}
                            disabled={!rateData}
                            className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            cursor-pointer"
                        />
                    </label>
                </div>
            </div>
        </div>

        {isLoading && (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Processing files...</p>
            </div>
        )}

        {/* Validation Errors Section */}
        {reports.length > 0 && (
            <div className={`mb-8 rounded-xl p-6 shadow-sm border ${totalMismatches > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${totalMismatches > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                         {totalMismatches > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Processing Summary</h3>
                        
                        <div className="flex gap-6 mb-4">
                            <div className="text-sm">
                                <span className="block text-gray-500">Total Trips</span>
                                <span className="font-semibold text-gray-900">{reports.reduce((acc, r) => acc + r.transactions.length, 0)}</span>
                            </div>
                            <div className="text-sm">
                                <span className="block text-gray-500">Auto-Matched (Fuzzy)</span>
                                <span className="font-semibold text-orange-600">{totalFuzzy}</span>
                            </div>
                             <div className="text-sm">
                                <span className="block text-gray-500">No Rate Found</span>
                                <span className="font-semibold text-red-600">{totalMismatches}</span>
                            </div>
                        </div>

                        {totalMismatches > 0 && (
                            <div className="bg-white border border-amber-100 rounded-lg p-4 mt-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Missing Routes in CSV</h4>
                                <div className="flex flex-wrap gap-2">
                                    {missingRoutes.map((route, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                            {route}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Report Display */}
        {reports.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 min-h-[600px]">
                {/* Sidebar Drivers List */}
                <div className="col-span-3 border-r border-gray-200 bg-gray-50/50">
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <h3 className="font-semibold text-gray-700">Drivers ({reports.length})</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[800px]">
                        {reports.map((report, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveDriverIndex(idx)}
                                className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-100 hover:bg-gray-100 transition-colors flex justify-between items-center ${activeDriverIndex === idx ? 'bg-blue-50 text-blue-700 border-l-4 border-l-blue-600' : 'text-gray-600 border-l-4 border-l-transparent'}`}
                            >
                                <div>
                                    {report.driverName}
                                    <div className="text-xs text-gray-400 font-normal mt-1">
                                        {report.transactions.length} Trips
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {report.mismatchedTrips > 0 && (
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold" title={`${report.mismatchedTrips} missing`}>!</span>
                                    )}
                                    {report.fuzzyTrips > 0 && (
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold" title={`${report.fuzzyTrips} fuzzy matched`}>~</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-span-9 p-6 overflow-x-auto">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-900">{reports[activeDriverIndex].driverName}</h2>
                                {reports[activeDriverIndex].mismatchedTrips > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <XCircle className="w-3 h-3" />
                                        {reports[activeDriverIndex].mismatchedTrips} Mismatches
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Transaction Breakdown & Re-calculations</p>
                        </div>
                        <div className="text-right">
                             <div className="text-sm text-gray-500">Total New Commission</div>
                             <div className="text-2xl font-bold text-green-600">
                                {reports[activeDriverIndex].totalNewComm.toFixed(2)}
                             </div>
                             <div className="text-xs text-gray-400">
                                Old: {reports[activeDriverIndex].totalOriginalComm.toFixed(2)}
                             </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Truck</th>
                                    <th className="px-4 py-3 font-medium">Pickup</th>
                                    <th className="px-4 py-3 font-medium">Drop</th>
                                    <th className="px-4 py-3 font-medium text-right">Wt</th>
                                    <th className="px-4 py-3 font-medium text-right bg-red-50/50">Old Rate</th>
                                    <th className="px-4 py-3 font-medium text-right bg-green-50/50">New Rate</th>
                                    <th className="px-4 py-3 font-medium text-right bg-red-50/50">Old Comm</th>
                                    <th className="px-4 py-3 font-medium text-right bg-green-50/50">New Comm</th>
                                    <th className="px-4 py-3 font-medium text-right">Diff</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reports[activeDriverIndex].transactions.map((t, i) => {
                                    const isRateChanged = t.newEffRt !== t.originalEffRt;
                                    const isFuzzy = t.matchType === 'FUZZY';
                                    const isError = t.matchType === 'NONE';
                                    
                                    return (
                                        <tr key={i} className={`hover:bg-gray-50 ${isError ? 'bg-red-50 hover:bg-red-100' : isFuzzy ? 'bg-orange-50/40' : isRateChanged ? 'bg-yellow-50/30' : ''}`}>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-500">{t.date}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{t.truck}</td>
                                            
                                            {/* Pickup Column with Tooltip */}
                                            <td className={`px-4 py-3 font-medium ${isError ? 'text-red-700' : isFuzzy ? 'text-orange-700' : 'text-gray-600'}`}>
                                                <div className="flex flex-col">
                                                    <span>{t.pickup}</span>
                                                    {isFuzzy && t.matchedPickup && (
                                                        <span className="text-[10px] text-orange-500">→ {t.matchedPickup}</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Drop Column with Tooltip */}
                                            <td className={`px-4 py-3 font-medium ${isError ? 'text-red-700' : isFuzzy ? 'text-orange-700' : 'text-gray-600'}`}>
                                                <div className="flex flex-col">
                                                    <span>{t.drop}</span>
                                                    {isFuzzy && t.matchedDrop && (
                                                        <span className="text-[10px] text-orange-500">→ {t.matchedDrop}</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-right text-gray-900">{t.effWt.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500 bg-red-50/30">{t.originalEffRt.toFixed(2)}</td>
                                            <td className={`px-4 py-3 text-right font-semibold bg-green-50/30 ${isError ? 'text-red-600' : isFuzzy ? 'text-orange-600' : isRateChanged ? 'text-green-600' : 'text-gray-500'}`}>
                                                {t.newEffRt.toFixed(2)}
                                                {isError && <span title="Rate not found" className="ml-1 text-[10px] align-top text-red-500">*</span>}
                                                {isFuzzy && <span title="Auto-matched via AI" className="ml-1 text-[10px] align-top text-orange-500">~</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-500 bg-red-50/30">{t.originalComm.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900 bg-green-50/30">{t.newComm.toFixed(2)}</td>
                                            <td className={`px-4 py-3 text-right font-medium ${t.diff > 0 ? 'text-green-600' : t.diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {t.diff > 0 ? '+' : ''}{t.diff.toFixed(2)}
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
