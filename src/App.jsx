import React, { useState, useRef } from 'react';
import * as mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * IJSR WORD TO PDF CONVERTER
 * A single-file production-ready React application.
 */

// --- Configuration & Constants ---
const pdfConfig = {
  format: 'a4',
  orientation: 'portrait',
  unit: 'mm',
  margins: { top: 35, bottom: 25, left: 20, right: 20 },
  columns: 2,
  columnGap: 10,
};

const colors = {
  headerBlue: [0, 51, 102],      
  textBlue: [0, 51, 102],        
  accentBlue: [230, 240, 255],   
  borderBlue: [102, 153, 204],
  footerGray: [128, 128, 128],   
  rowLight: [245, 248, 255]      
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#333',
    backgroundColor: '#f4f7f9',
    minHeight: '100vh',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    padding: '30px',
    marginBottom: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    background: 'linear-gradient(135deg, #003366 0%, #00509e 100%)',
    padding: '40px',
    borderRadius: '12px',
    color: 'white',
  },
  uploadZone: {
    border: '2px dashed #00509e',
    borderRadius: '10px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#f8fbff',
    transition: 'all 0.2s ease',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '15px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  primaryBtn: { backgroundColor: '#003366', color: 'white' },
  secondaryBtn: { backgroundColor: '#e0e0e0', color: '#333' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' },
  inputGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' },
  input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: '#e3f2fd',
    color: '#00509e',
    fontWeight: 'bold',
  }
};

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Custom metadata states
  const [metadata, setMetadata] = useState({
    receivedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    acceptedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    publishedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    issn: '2833-2172',
    volume: '5',
    issue: '2',
    useTwoColumn: true
  });

  const fileInputRef = useRef();

  // --- Core Functions ---

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.docx')) {
      setError("Please upload a valid .docx file.");
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    await processWordFile(selectedFile);
  };

  const processWordFile = async (file) => {
    setLoading(true);
    setProgress(10);
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // 1. Extract raw text for metadata logic
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const lines = textResult.value.split('\n').filter(l => l.trim() !== '');
      
      // 2. Extract HTML for table parsing
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlResult.value;

      setProgress(40);

      // --- Parsing Logic ---
      const data = {
        title: lines[0] || "Untitled Manuscript",
        authors: lines[1] || "Author names not found",
        affiliations: lines.slice(2, 5).filter(l => l.length > 10 && !l.toLowerCase().includes('abstract')),
        abstract: "",
        keywords: "",
        sections: [],
        tables: [],
        references: []
      };

      // Extract Abstract & Keywords
      const fullText = textResult.value;
      const abstractMatch = fullText.match(/Abstract:?([\s\S]*?)(Keywords:?|1\.|Introduction)/i);
      if (abstractMatch) data.abstract = abstractMatch[1].trim();

      const keywordMatch = fullText.match(/Keywords:?([\s\S]*?)(1\.|Introduction|Methodology)/i);
      if (keywordMatch) data.keywords = keywordMatch[1].trim();

      // Extract Tables
      const htmlTables = tempDiv.querySelectorAll('table');
      htmlTables.forEach((table, index) => {
        const rows = Array.from(table.querySelectorAll('tr')).map(tr => 
          Array.from(tr.querySelectorAll('td, th')).map(td => td.innerText.trim())
        );
        if (rows.length > 0) {
          data.tables.push({
            caption: `Table ${index + 1}: Data visualization from manuscript`,
            head: [rows[0]],
            body: rows.slice(1)
          });
        }
      });

      // Extract Sections (Simplified logic: looking for common heading keywords)
      const sectionKeywords = ["Introduction", "Methodology", "Results", "Discussion", "Conclusion", "References"];
      let currentSection = null;

      lines.forEach(line => {
        const isHeading = sectionKeywords.some(k => line.toUpperCase().startsWith(k.toUpperCase())) && line.length < 50;
        if (isHeading) {
          if (currentSection) data.sections.push(currentSection);
          currentSection = { title: line, content: "" };
        } else if (currentSection) {
          currentSection.content += line + "\n\n";
        }
      });
      if (currentSection) data.sections.push(currentSection);

      setProgress(100);
      setParsedData(data);
    } catch (err) {
      setError("Failed to parse Word document: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!parsedData) return;
    
    const doc = new jsPDF(pdfConfig);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = pdfConfig.margins;
    const colWidth = (pageWidth - margin.left - margin.right - pdfConfig.columnGap) / 2;

    const addHeader = (data) => {
      // Top bar
      doc.setDrawColor(...colors.headerBlue);
      doc.setLineWidth(0.5);
      doc.line(margin.left, 15, pageWidth - margin.right, 15);

      // Journal Title
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...colors.headerBlue);
      doc.text("International Journal of Scholarly Resources", margin.left, 22);
      
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.text("Business & Management Studies — A Peer-Reviewed Academic Publication", margin.left, 27);

      // Contact info right aligned
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Email: editor@ijsr.org.ng`, pageWidth - margin.right, 22, { align: 'right' });
      doc.text(`Website: www.ijsr.org.ng`, pageWidth - margin.right, 26, { align: 'right' });
      
      doc.line(margin.left, 30, pageWidth - margin.right, 30);
    };

    const addFooter = (pageNum, totalPages) => {
      const y = doc.internal.pageSize.getHeight() - 15;
      doc.setDrawColor(200);
      doc.line(margin.left, y - 5, pageWidth - margin.right, y - 5);
      doc.setFontSize(8);
      doc.setTextColor(...colors.footerGray);
      doc.text(`International Journal of Scholarly Resources | ISSN: ${metadata.issn} | Volume ${metadata.volume} | Issue ${metadata.issue}`, pageWidth/2, y, { align: 'center' });
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin.right, y, { align: 'right' });
    };

    // --- Start Page 1 ---
    addHeader();
    let currY = 45;

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...colors.textBlue);
    const splitTitle = doc.splitTextToSize(parsedData.title.toUpperCase(), pageWidth - margin.left - margin.right);
    doc.text(splitTitle, pageWidth/2, currY, { align: 'center' });
    currY += (splitTitle.length * 8) + 5;

    // Authors
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    doc.text(parsedData.authors, pageWidth/2, currY, { align: 'center' });
    currY += 10;

    // Dates Box
    doc.setFillColor(...colors.accentBlue);
    doc.rect(margin.left, currY, pageWidth - margin.left - margin.right, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(50);
    const dateText = `Received: ${metadata.receivedDate} | Accepted: ${metadata.acceptedDate} | Published: ${metadata.publishedDate}`;
    doc.text(dateText, pageWidth/2, currY + 6.5, { align: 'center' });
    currY += 20;

    // Abstract Box
    doc.setDrawColor(...colors.borderBlue);
    doc.setFillColor(252, 252, 255);
    const absLines = doc.splitTextToSize(`ABSTRACT: ${parsedData.abstract}`, pageWidth - margin.left - margin.right - 10);
    const absHeight = (absLines.length * 5) + 15;
    doc.rect(margin.left, currY, pageWidth - margin.left - margin.right, absHeight, 'DF');
    
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(absLines, margin.left + 5, currY + 8);
    
    // Keywords
    doc.setFont("times", "bold");
    doc.text(`Keywords: `, margin.left + 5, currY + absHeight - 5);
    doc.setFont("times", "normal");
    doc.text(parsedData.keywords.substring(0, 100), margin.left + 25, currY + absHeight - 5);
    currY += absHeight + 15;

    // --- Main Content (Sections) ---
    doc.setFontSize(10);
    let currentColumn = 0;
    let colY = currY;

    parsedData.sections.forEach((section) => {
      // Heading
      if (colY > 240) {
        if (metadata.useTwoColumn && currentColumn === 0) {
          currentColumn = 1;
          colY = currY;
        } else {
          doc.addPage();
          addHeader();
          currentColumn = 0;
          colY = margin.top + 10;
          currY = colY;
        }
      }

      const xPos = currentColumn === 0 ? margin.left : margin.left + colWidth + pdfConfig.columnGap;
      const activeWidth = metadata.useTwoColumn ? colWidth : pageWidth - margin.left - margin.right;

      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...colors.headerBlue);
      doc.text(section.title.toUpperCase(), xPos, colY);
      colY += 7;

      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);
      const textLines = doc.splitTextToSize(section.content, activeWidth);
      
      textLines.forEach(line => {
        if (colY > 260) {
          if (metadata.useTwoColumn && currentColumn === 0) {
            currentColumn = 1;
            colY = currY;
          } else {
            doc.addPage();
            addHeader();
            currentColumn = 0;
            colY = margin.top + 10;
            currY = colY;
          }
        }
        const currentX = currentColumn === 0 ? margin.left : margin.left + colWidth + pdfConfig.columnGap;
        doc.text(line, currentX, colY);
        colY += 5;
      });
      colY += 10;
    });

    // Add Tables
    parsedData.tables.forEach((table, i) => {
      doc.addPage();
      addHeader();
      doc.setFont("times", "bold");
      doc.text(table.caption, margin.left, 45);
      doc.autoTable({
        startY: 50,
        head: table.head,
        body: table.body,
        theme: 'striped',
        headStyles: { fillColor: colors.headerBlue, textColor: 255 },
        alternateRowStyles: { fillColor: colors.rowLight },
        margin: { left: margin.left, right: margin.right }
      });
    });

    // Add Final Footers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    doc.save(`IJSR_Manuscript_${Date.now()}.pdf`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>IJSR Manuscript Converter</h1>
        <p style={{ opacity: 0.9, marginTop: '10px' }}>Convert Word (.docx) to IJSR Journal Template PDF</p>
      </header>

      <main>
        {/* Upload Section */}
        <div style={styles.card}>
          <div 
            style={styles.uploadZone} 
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) processWordFile(droppedFile);
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept=".docx" 
              onChange={handleFileChange} 
            />
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
            <h3 style={{ margin: '0 0 10px 0' }}>{file ? file.name : "Click or Drag Word Document"}</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Only .docx files are supported</p>
            {loading && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ width: '100%', height: '6px', background: '#eee', borderRadius: '3px' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#00509e', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                </div>
                <p style={{ fontSize: '12px', color: '#00509e', marginTop: '5px' }}>Processing... {progress}%</p>
              </div>
            )}
          </div>
          {error && <p style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>{error}</p>}
        </div>

        {parsedData && (
          <>
            {/* Configuration Options */}
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Journal Metadata</h3>
              <div style={styles.grid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>ISSN</label>
                  <input 
                    style={styles.input} 
                    value={metadata.issn} 
                    onChange={e => setMetadata({...metadata, issn: e.target.value})} 
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Received Date</label>
                  <input 
                    style={styles.input} 
                    value={metadata.receivedDate} 
                    onChange={e => setMetadata({...metadata, receivedDate: e.target.value})} 
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Volume / Issue</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input style={styles.input} placeholder="Vol" value={metadata.volume} onChange={e => setMetadata({...metadata, volume: e.target.value})} />
                    <input style={styles.input} placeholder="Issue" value={metadata.issue} onChange={e => setMetadata({...metadata, issue: e.target.value})} />
                  </div>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Layout Mode</label>
                  <select 
                    style={styles.input} 
                    value={metadata.useTwoColumn} 
                    onChange={e => setMetadata({...metadata, useTwoColumn: e.target.value === 'true'})}
                  >
                    <option value="true">Double Column (Academic)</option>
                    <option value="false">Single Column (Standard)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div style={styles.card}>
              <h3 style={{ marginTop: 0 }}>Manuscript Preview</h3>
              <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px', fontSize: '14px' }}>
                <p><strong>Title:</strong> {parsedData.title}</p>
                <p><strong>Authors:</strong> {parsedData.authors}</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={styles.badge}>{parsedData.sections.length} Sections Found</span>
                  <span style={styles.badge}>{parsedData.tables.length} Tables Found</span>
                  <span style={styles.badge}>{parsedData.abstract.length > 0 ? "Abstract Detected" : "No Abstract"}</span>
                </div>
              </div>

              <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                <button 
                  onClick={generatePDF}
                  style={{ ...styles.button, ...styles.primaryBtn, flex: 1, justifyContent: 'center' }}
                >
                  Download IJSR PDF
                </button>
                <button 
                  onClick={() => { setFile(null); setParsedData(null); }}
                  style={{ ...styles.button, ...styles.secondaryBtn }}
                >
                  Clear
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', color: '#888', fontSize: '12px', marginTop: '40px' }}>
        &copy; {new Date().getFullYear()} International Journal of Scholarly Resources (IJSR). Internal Tool.
      </footer>
    </div>
  );
}
