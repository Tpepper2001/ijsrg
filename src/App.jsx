import React, { useState, useRef } from 'react';
import * as mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * IJSR MANUSCRIPT CONVERTER - VERSION 2.0 (High-Fidelity Template)
 * Matches the International Journal of Scholarly Resources Visual Format
 */

const pdfConfig = {
  format: 'a4',
  unit: 'mm',
  margins: { top: 35, bottom: 20, left: 18, right: 18 },
  colGap: 8,
  colors: {
    mainBlue: [0, 51, 102],
    lightBlueBg: [240, 245, 255],
    borderGray: [180, 180, 180],
    textGray: [80, 80, 80]
  }
};

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Metadata for the "How to Cite" and "Received" boxes
  const [meta, setMeta] = useState({
    received: "26th Dec 2025",
    accepted: "27th Dec 2025",
    published: "30th Dec 2025",
    volume: "1",
    issue: "1",
    issn: "1234-5678",
    year: "2025"
  });

  const fileInputRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    setLoading(true);
    setProgress(20);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract Text for structure
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const lines = textResult.value.split('\n').filter(l => l.trim().length > 0);
      
      // Extract HTML for tables
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlResult.value, 'text/html');

      setProgress(60);

      // Advanced Parsing Logic
      const parsed = {
        title: lines[0] || "Untitled Manuscript",
        authors: lines[1] || "Author names not found",
        affiliations: lines.slice(2, 5),
        abstract: "",
        keywords: "",
        sections: [],
        tables: []
      };

      // Extract Abstract & Keywords
      const fullText = textResult.value;
      const absMatch = fullText.match(/Abstract([\s\S]*?)(Keywords|1\.|Introduction)/i);
      if (absMatch) parsed.abstract = absMatch[1].trim();
      
      const keyMatch = fullText.match(/Keywords:?([\s\S]*?)(1\.|Introduction)/i);
      if (keyMatch) parsed.keywords = keyMatch[1].trim();

      // Extract Sections
      let currentSection = null;
      lines.forEach(line => {
        const isHeader = /^(Introduction|Methodology|Literature Review|Result|Discussion|Conclusion|References)/i.test(line.trim());
        if (isHeader) {
          if (currentSection) parsed.sections.push(currentSection);
          currentSection = { title: line.trim(), content: "" };
        } else if (currentSection) {
          currentSection.content += line + " ";
        }
      });
      if (currentSection) parsed.sections.push(currentSection);

      // Extract Tables
      const tables = doc.querySelectorAll('table');
      tables.forEach((t, i) => {
        const rows = Array.from(t.querySelectorAll('tr')).map(tr => 
          Array.from(tr.querySelectorAll('td, th')).map(td => td.innerText.trim())
        );
        parsed.tables.push({ head: [rows[0]], body: rows.slice(1) });
      });

      setData(parsed);
      setProgress(100);
    } catch (err) {
      alert("Error parsing Word file: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const { margins, colGap, colors } = pdfConfig;
    const pageWidth = doc.internal.pageSize.getWidth();
    const colWidth = (pageWidth - (margins.left + margins.right) - colGap) / 2;

    const drawHeader = (pageNo) => {
      // Lines
      doc.setDrawColor(...colors.mainBlue);
      doc.setLineWidth(0.3);
      doc.line(margins.left, 15, pageWidth - margins.right, 15);
      doc.line(margins.left, 28, pageWidth - margins.right, 28);

      // Left Header Text
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...colors.mainBlue);
      doc.text("International Journal of Scholarly Resources", margins.left, 21);
      
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.text("Business & Management Studies — A Peer-Reviewed Academic Publication", margins.left, 25);

      // Right Header Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.text("Email: editor@ijsr.org.ng", pageWidth - margins.right, 21, { align: 'right' });
      doc.text("Website: www.ijsr.org.ng", pageWidth - margins.right, 25, { align: 'right' });
    };

    const drawFooter = (pageNo, total) => {
      const y = doc.internal.pageSize.getHeight() - 10;
      doc.setDrawColor(200);
      doc.line(margins.left, y - 4, pageWidth - margins.right, y - 4);
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      const footerText = `International Journal of Scholarly Resources | ISSN: ${meta.issn} | Page ${pageNo} of ${total}`;
      doc.text(footerText, pageWidth / 2, y, { align: 'center' });
    };

    // --- PAGE 1 CONTENT ---
    drawHeader(1);
    let currY = 45;

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...colors.mainBlue);
    const titleLines = doc.splitTextToSize(data.title.toUpperCase(), pageWidth - 40);
    doc.text(titleLines, pageWidth / 2, currY, { align: 'center' });
    currY += (titleLines.length * 8) + 5;

    // Author Box
    doc.setDrawColor(...colors.mainBlue);
    doc.setFillColor(255, 255, 255);
    doc.rect(margins.left, currY, pageWidth - (margins.left * 2), 35);
    
    doc.setFontSize(11);
    doc.text(data.authors, margins.left + 5, currY + 7);
    
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    const affilLines = doc.splitTextToSize(data.affiliations.join('\n'), pageWidth - 50);
    doc.text(affilLines, margins.left + 5, currY + 13);
    currY += 40;

    // Metadata Box (Received/Accepted/Cite)
    doc.setFillColor(...colors.lightBlueBg);
    doc.rect(margins.left, currY, pageWidth - (margins.left * 2), 15, 'F');
    doc.setFontSize(8);
    doc.text(`Received: [${meta.received}]    |    Accepted: [${meta.accepted}]`, pageWidth - margins.right - 5, currY + 5, { align: 'right' });
    doc.setFont("times", "bold");
    doc.text(`How to cite: `, margins.left + 5, currY + 11);
    doc.setFont("times", "normal");
    const citeText = `${data.authors.split(',')[0]} (${meta.year}). ${data.title}. International Journal of Scholarly Resources, ISSN: ${meta.issn}.`;
    doc.text(doc.splitTextToSize(citeText, pageWidth - 50), margins.left + 22, currY + 11);
    currY += 25;

    // --- TWO COLUMN SECTION ---
    const startY = currY;
    let col = 0; // 0 = left, 1 = right
    let y = startY;

    // Helper to add drop cap
    const addDropCap = (char, x, yStart) => {
      doc.setFont("times", "bold");
      doc.setFontSize(30);
      doc.setTextColor(...colors.mainBlue);
      doc.text(char, x, yStart + 6);
      return 10; // offset for next text
    };

    // Abstract (Left Column Boxed)
    doc.setDrawColor(...colors.mainBlue);
    doc.setFillColor(252, 252, 255);
    doc.rect(margins.left, y - 5, colWidth, 120, 'D');
    
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("Abstract", margins.left + (colWidth/2), y, { align: 'center' });
    y += 8;

    const firstLetter = data.abstract.charAt(0);
    const remainingAbs = data.abstract.slice(1);
    addDropCap(firstLetter, margins.left + 2, y);
    
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0);
    const absLines = doc.splitTextToSize(remainingAbs, colWidth - 12);
    doc.text(absLines, margins.left + 11, y + 2);
    
    // Keywords
    const keyY = y + 105;
    doc.setFont("times", "bold");
    doc.text("Keywords: ", margins.left + 5, keyY);
    doc.setFont("times", "normal");
    doc.text(doc.splitTextToSize(data.keywords, colWidth - 25), margins.left + 20, keyY);

    // Introduction (Right Column)
    col = 1;
    y = startY;
    const rightX = margins.left + colWidth + colGap;

    const intro = data.sections.find(s => /Introduction/i.test(s.title));
    if (intro) {
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...colors.mainBlue);
      doc.text("Introduction", rightX, y);
      y += 10;
      
      const introFirst = intro.content.trim().charAt(0);
      const introRest = intro.content.trim().slice(1);
      addDropCap(introFirst, rightX, y);
      
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);
      const introLines = doc.splitTextToSize(introRest, colWidth - 10);
      doc.text(introLines, rightX + 10, y + 2);
    }

    // Process remaining sections on new pages
    data.sections.filter(s => !/Introduction/i.test(s.title)).forEach(sec => {
      doc.addPage();
      drawHeader();
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.text(sec.title, margins.left, 40);
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(sec.content, pageWidth - 40);
      doc.text(lines, margins.left, 48);
    });

    // Process Tables
    data.tables.forEach((table, i) => {
      doc.addPage();
      drawHeader();
      doc.autoTable({
        startY: 40,
        head: table.head,
        body: table.body,
        theme: 'striped',
        headStyles: { fillColor: colors.mainBlue },
        styles: { font: 'times', fontSize: 9 }
      });
    });

    // Add footers to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for(let i=1; i<=totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
    }

    doc.save(`IJSR_Manuscript_${meta.year}.pdf`);
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="bg-gradient-to-r from-[#003366] to-[#00509e] text-white p-10 rounded-t-2xl shadow-xl text-center">
          <h1 className="text-3xl font-bold tracking-tight">IJSR Manuscript to PDF</h1>
          <p className="mt-2 text-blue-100 italic">Professional Scholarly Formatting Engine</p>
        </header>

        <main className="bg-white p-8 shadow-2xl rounded-b-2xl">
          {/* Upload Area */}
          {!data ? (
            <div 
              onClick={() => fileInputRef.current.click()}
              className="border-4 border-dashed border-blue-100 rounded-xl p-16 text-center cursor-pointer hover:bg-blue-50 transition-all"
            >
              <input type="file" ref={fileInputRef} hidden accept=".docx" onChange={handleFileUpload} />
              <div className="text-6xl mb-4">📄</div>
              <h2 className="text-xl font-semibold text-slate-700">Upload Manuscript (.docx)</h2>
              <p className="text-slate-400 mt-2">The system will automatically parse Title, Authors, and Sections</p>
              {loading && (
                <div className="mt-8 w-64 mx-auto bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Received Date</label>
                  <input className="w-full p-2 mt-1 border rounded" value={meta.received} onChange={e => setMeta({...meta, received: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Accepted Date</label>
                  <input className="w-full p-2 mt-1 border rounded" value={meta.accepted} onChange={e => setMeta({...meta, accepted: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">ISSN</label>
                  <input className="w-full p-2 mt-1 border rounded" value={meta.issn} onChange={e => setMeta({...meta, issn: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Volume / Issue</label>
                  <div className="flex gap-2">
                    <input className="w-1/2 p-2 mt-1 border rounded" placeholder="Vol" value={meta.volume} onChange={e => setMeta({...meta, volume: e.target.value})} />
                    <input className="w-1/2 p-2 mt-1 border rounded" placeholder="Issue" value={meta.issue} onChange={e => setMeta({...meta, issue: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="border border-blue-100 p-6 rounded-xl">
                <h3 className="text-blue-900 font-bold mb-2">Structure Detected:</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>✅ <strong>Title:</strong> {data.title.substring(0, 80)}...</li>
                  <li>✅ <strong>Authors:</strong> {data.authors}</li>
                  <li>✅ <strong>Abstract:</strong> {data.abstract.split(' ').length} words</li>
                  <li>✅ <strong>Sections:</strong> {data.sections.length} found</li>
                  <li>✅ <strong>Tables:</strong> {data.tables.length} found</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={generatePDF}
                  className="flex-1 bg-[#003366] text-white py-4 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/20"
                >
                  Download IJSR Formatted PDF
                </button>
                <button 
                  onClick={() => setData(null)}
                  className="px-6 py-4 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </main>
        
        <footer className="mt-8 text-center text-slate-400 text-xs">
          Internal Publishing Tool | © {new Date().getFullYear()} International Journal of Scholarly Resources
        </footer>
      </div>
    </div>
  );
}
