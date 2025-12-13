import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---

export interface RateMap {
  [key: string]: number;
}

export interface RateData {
  rateMap: RateMap;
  validPickups: string[];
  validDrops: string[];
}

export type MatchType = 'EXACT' | 'FUZZY' | 'NONE';

export interface Transaction {
  truck: string;
  date: string;
  pickup: string;
  drop: string;
  doNumber: string;
  effWt: number;
  originalEffRt: number;
  newEffRt: number;
  originalComm: number;
  newComm: number;
  diff: number;
  ot: string;
  matchType: MatchType;
  matchedPickup?: string; // The CSV location we matched to (if fuzzy)
  matchedDrop?: string;   // The CSV location we matched to (if fuzzy)
}

export interface DriverReport {
  driverName: string;
  transactions: Transaction[];
  totalOriginalComm: number;
  totalNewComm: number;
  mismatchedTrips: number;
  fuzzyTrips: number;
  rawTextLines: string[];
}

// --- Similarity Helpers ---

// Levenshtein distance for typo tolerance
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// Calculate similarity score (0 to 1)
const getSimilarityScore = (str1: string, str2: string): number => {
  const s1 = str1.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
  const s2 = str2.toUpperCase().replace(/[^A-Z0-9\s]/g, '');

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9; // Strong substring match

  // Token matching (e.g. "VANCE-NIBONG" vs "NIBONG TEBAL")
  const tokens1 = s1.split(/\s+/).filter(t => t.length > 2);
  const tokens2 = s2.split(/\s+/).filter(t => t.length > 2);
  
  let sharedTokens = 0;
  tokens1.forEach(t1 => {
    if (tokens2.some(t2 => t2 === t1 || (t1.length > 3 && t2.includes(t1)) || (t2.length > 3 && t1.includes(t2)))) {
      sharedTokens++;
    }
  });

  if (sharedTokens > 0) {
      // Return a high score based on token overlap
      return 0.7 + (0.2 * (sharedTokens / Math.max(tokens1.length, tokens2.length)));
  }

  // Fallback to Levenshtein for typos
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 0;
  
  return 1 - (distance / maxLength);
};

const findBestMatch = (target: string, candidates: string[]): { match: string, score: number } | null => {
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
        const score = getSimilarityScore(target, candidate);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    // Threshold for accepting a fuzzy match
    return bestScore > 0.55 ? { match: bestMatch!, score: bestScore } : null;
};

// --- CSV Parser ---

export const parseRatesCSV = (file: File): Promise<RateData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rateMap: RateMap = {};
        const pickups = new Set<string>();
        const drops = new Set<string>();

        results.data.forEach((row: any) => {
          const pick = row['PickLoc']?.trim().toUpperCase();
          const drop = row['DropLoc']?.trim().toUpperCase();
          const rate = parseFloat(row['Driver Rev_Rate']);

          if (pick && drop && !isNaN(rate)) {
            const key = `${pick}|${drop}`;
            rateMap[key] = rate;
            pickups.add(pick);
            drops.add(drop);
          }
        });
        resolve({
            rateMap,
            validPickups: Array.from(pickups),
            validDrops: Array.from(drops)
        });
      },
      error: (err) => reject(err),
    });
  });
};

// --- PDF Parser ---

const isTransactionRow = (items: string[]) => {
    if (items.length < 8) return false;
    const dateRegex = /\d{2}-\d{2}-\d{4}/;
    return dateRegex.test(items[1]); 
};

export const parseDriverPDF = async (file: File, rateData: RateData): Promise<DriverReport[]> => {
  const { rateMap, validPickups, validDrops } = rateData;
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const reports: DriverReport[] = [];

  let currentDriver: DriverReport | null = null;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const rows: { y: number; items: { x: number; str: string }[] }[] = [];
    
    textContent.items.forEach((item: any) => {
      const existingRow = rows.find(r => Math.abs(r.y - item.transform[5]) < 5);
      if (existingRow) {
        existingRow.items.push({ x: item.transform[4], str: item.str });
      } else {
        rows.push({ y: item.transform[5], items: [{ x: item.transform[4], str: item.str }] });
      }
    });

    rows.sort((a, b) => b.y - a.y);
    rows.forEach(row => row.items.sort((a, b) => a.x - b.x));

    for (const row of rows) {
        const rowText = row.items.map(it => it.str.trim()).filter(s => s.length > 0);
        const fullLine = rowText.join(' ');

        if (fullLine.includes("Driver Name :")) {
            if (currentDriver) {
                reports.push(currentDriver);
            }
            const namePart = fullLine.split("Driver Name :")[1]?.trim() || "Unknown";
            currentDriver = {
                driverName: namePart,
                transactions: [],
                totalOriginalComm: 0,
                totalNewComm: 0,
                mismatchedTrips: 0,
                fuzzyTrips: 0,
                rawTextLines: []
            };
            continue;
        }

        if (!currentDriver) continue;

        if (isTransactionRow(rowText)) {
            const truck = rowText[0];
            const date = rowText[1];
            const pickup = rowText[2];
            const drop = rowText[3];
            const doNumber = rowText[4];
            const effWt = parseFloat(rowText[5]);
            const originalEffRt = parseFloat(rowText[6]);

            let commIndex = 9;
            if(rowText.length < 11) {
               commIndex = rowText.length - 2;
            }

             const originalComm = parseFloat(rowText[commIndex]);
             const ot = rowText[rowText.length - 1];

             if (!isNaN(effWt)) {
                 const exactKey = `${pickup.toUpperCase()}|${drop.toUpperCase()}`;
                 
                 let newRate = originalEffRt;
                 let matchType: MatchType = 'NONE';
                 let matchedPickup: string | undefined;
                 let matchedDrop: string | undefined;

                 // 1. Try Exact Match
                 if (rateMap.hasOwnProperty(exactKey)) {
                     newRate = rateMap[exactKey];
                     matchType = 'EXACT';
                 } 
                 // 2. Try Fuzzy Match
                 else {
                     const fuzzyPick = findBestMatch(pickup, validPickups);
                     const fuzzyDrop = findBestMatch(drop, validDrops);

                     if (fuzzyPick && fuzzyDrop) {
                         const fuzzyKey = `${fuzzyPick.match}|${fuzzyDrop.match}`;
                         if (rateMap.hasOwnProperty(fuzzyKey)) {
                             newRate = rateMap[fuzzyKey];
                             matchType = 'FUZZY';
                             matchedPickup = fuzzyPick.match;
                             matchedDrop = fuzzyDrop.match;
                         }
                     }
                 }
                 
                 const newComm = effWt * newRate;

                 currentDriver.transactions.push({
                     truck,
                     date,
                     pickup,
                     drop,
                     doNumber,
                     effWt,
                     originalEffRt,
                     newEffRt: newRate,
                     originalComm,
                     newComm,
                     diff: newComm - originalComm,
                     ot,
                     matchType,
                     matchedPickup,
                     matchedDrop
                 });

                 currentDriver.totalOriginalComm += originalComm;
                 currentDriver.totalNewComm += newComm;
                 
                 if (matchType === 'NONE') {
                     currentDriver.mismatchedTrips += 1;
                 } else if (matchType === 'FUZZY') {
                     currentDriver.fuzzyTrips += 1;
                 }
             }
        }
    }
  }

  if (currentDriver) {
    reports.push(currentDriver);
  }

  return reports;
};

// --- PDF Generator ---

export const generatePDF = (reports: DriverReport[]) => {
  const doc = new jsPDF();

  reports.forEach((report, index) => {
    if (index > 0) doc.addPage();

    doc.setFontSize(14);
    doc.text(`Driver Incentive Report (Revised)`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Driver Name: ${report.driverName}`, 14, 22);
    
    const tableData = report.transactions.map(t => {
        let note = '';
        if (t.matchType === 'FUZZY') {
            note = `*Matched to: ${t.matchedPickup}->${t.matchedDrop}`;
        }
        
        return [
            t.truck,
            t.date,
            t.pickup + (t.matchedPickup ? `\n(${t.matchedPickup})` : ''),
            t.drop + (t.matchedDrop ? `\n(${t.matchedDrop})` : ''),
            t.doNumber,
            t.effWt.toFixed(2),
            t.originalEffRt.toFixed(2),
            t.newEffRt.toFixed(2),
            t.originalComm.toFixed(2),
            t.newComm.toFixed(2),
            (t.newComm - t.originalComm).toFixed(2)
        ];
    });

    // Footer row
    tableData.push([
        '', '', '', '', 'TOTAL',
        '',
        '',
        '',
        report.totalOriginalComm.toFixed(2),
        report.totalNewComm.toFixed(2),
        (report.totalNewComm - report.totalOriginalComm).toFixed(2)
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Truck', 'Date', 'Pickup', 'Drop', 'DO#', 'Wt', 'Old Rt', 'New Rt', 'Old Comm', 'New Comm', 'Diff']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 }, // Reduced font size for wrapping
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
          7: { fontStyle: 'bold', textColor: [0, 100, 0] },
          10: { fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        // Highlighting
      }
    });
  });

  doc.save('Updated_Driver_Incentive_Report.pdf');
};
