import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Document, Page, Text, View, StyleSheet, PDFViewer, Image as PDFImage, PDFDownloadLink
} from '@react-pdf/renderer';
import {
  LayoutDashboard, LogOut, Loader2, Plus, School, User, Download,
  X, Eye, Trash2, ShieldCheck, Save, Menu, Upload, Users, Key
} from 'lucide-react';

// ==================== SUPABASE CONFIG ====================
const supabaseUrl = 'https://xtciiatfetqecsfxoicq.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0Y2lpYXRmZXRxZWNzZnhvaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNDEyMDIsImV4cCI6MjA4MDYxNzIwMn0.81K9w-XbCHWRWmKkq3rcJHxslx3hs5mGCSNIvyJRMuw'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== CONSTANTS & HELPERS ====================
const BEHAVIORAL_TRAITS = [
  'COOPERATION', 'LEADERSHIP', 'HONESTY', 'SELF DISCIPLINE',
  'RESPECT', 'RESPONSIBILITY', 'EMPATHY', 'PUNCTUALITY', 'NEATNESS', 'INITIATIVE'
];
const RATINGS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];

const isExamField = (str) => {
    if (!str) return false;
    const s = str.toLowerCase();
    return s.includes('exam') || s.includes('examination');
};

const calculateGrade = (obtained, maxPossible) => {
  if (!maxPossible || maxPossible === 0) return { grade: '-', remark: '-' };
  const percentage = (obtained / maxPossible) * 100;
  if (percentage >= 86) return { grade: 'A*', remark: 'Distinction' };
  if (percentage >= 76) return { grade: 'A', remark: 'Excellent' };
  if (percentage >= 66) return { grade: 'B', remark: 'Very Good' };
  if (percentage >= 60) return { grade: 'C', remark: 'Good' };
  if (percentage >= 50) return { grade: 'D', remark: 'Fairly Good' };
  if (percentage >= 40) return { grade: 'E', remark: 'Pass' };
  return { grade: 'F', remark: 'Fail' };
};

const generatePIN = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateAdmissionNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000); 
    return `${year}/${random}`;
};

const imageUrlToBase64 = async (url) => {
    if (!url) return null;
    try {
        const response = await fetch(url + '?t=' + new Date().getTime());
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Image convert error:", e);
        return null;
    }
};

const useAutoSave = (callback, delay = 2000) => {
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef(null);

  const trigger = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await callback();
      setSaving(false);
    }, delay);
  }, [callback, delay]);

  return { save: trigger, saving };
};

// ==================== PDF STYLES ====================
const pdfStyles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9, color: '#333' },
  watermarkContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: -1
  },
  watermarkImage: { width: 400, height: 400, opacity: 0.05 },
  headerContainer: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 15,
    borderBottomWidth: 2, borderBottomColor: '#0f172a', paddingBottom: 10,
  },
  logoBox: { width: 70, height: 70, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  logo: { width: '100%', height: '100%', objectFit: 'contain' },
  headerTextBox: { flex: 1 },
  schoolName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: 4 },
  schoolAddress: { fontSize: 9, color: '#444', marginBottom: 2 },
  contactRow: { fontSize: 9, color: '#444', fontStyle: 'italic' },
  reportTitleBox: { alignItems: 'center', marginBottom: 15, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 2 },
  reportTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#0f172a' },
  infoContainer: { marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 },
  infoRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', padding: 6 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  table: { width: '100%', marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: 6, alignItems: 'center' },
  headerText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', minHeight: 22, alignItems: 'center' },
  cell: { padding: 4, fontSize: 9 },
  colSN: { width: '6%', textAlign: 'center' }, 
  colSubject: { width: '30%' }, 
  colTotal: { width: '10%', fontFamily: 'Helvetica-Bold', textAlign: 'center' }, 
  colGrade: { width: '10%', textAlign: 'center' },
  colRemark: { width: '15%', textAlign: 'left', fontSize: 8 },
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  signatureBox: { width: '40%', alignItems: 'center', paddingTop: 5, borderTopWidth: 1, borderTopColor: '#94a3b8', height: 60, justifyContent: 'flex-end' },
  signatureImage: { height: 40, width: 100, objectFit: 'contain', marginBottom: 2 },
  signatureText: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' }
});

const ResultPDF = ({ school, student, results, classInfo, comments, behaviors = [], reportType = 'full', logoBase64, principalSigBase64, teacherSigBase64 }) => {
  const isMidTerm = reportType === 'mid';
  const config = school.assessment_config || [];
  
  const displayFields = isMidTerm 
    ? config.filter(f => !isExamField(f.code) && !isExamField(f.name)) 
    : config;
  
  const maxPossibleScore = displayFields.reduce((sum, f) => sum + parseInt(f.max), 0);

  const fixedWidths = 6 + 30 + 10 + 10 + 15; 
  const remainingWidth = 100 - fixedWidths;
  const scoreColWidth = displayFields.length > 0 ? `${remainingWidth / displayFields.length}%` : '0%';

  const processedResults = results.map(r => {
    const rawScores = r.scores || {};
    let total = 0;
    displayFields.forEach(f => total += (parseFloat(rawScores[f.code]) || 0));
    const { grade, remark } = calculateGrade(total, maxPossibleScore);
    return { ...r, scores: rawScores, total, grade, remark };
  });

  const totalScore = processedResults.reduce((acc, r) => acc + r.total, 0);
  const average = ((totalScore / (results.length * maxPossibleScore)) * 100).toFixed(1);
  const behaviorMap = Object.fromEntries(behaviors.map(b => [b.trait, b.rating]));
  const teacherComment = isMidTerm ? (comments?.midterm_tutor_comment || "No mid-term comment.") : (comments?.tutor_comment || "No comment.");

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {logoBase64 && <View style={pdfStyles.watermarkContainer}><PDFImage src={logoBase64} style={pdfStyles.watermarkImage} /></View>}
        <View style={pdfStyles.headerContainer}>
          <View style={pdfStyles.logoBox}>{logoBase64 ? <PDFImage src={logoBase64} style={pdfStyles.logo} /> : null}</View>
          <View style={pdfStyles.headerTextBox}>
            <Text style={pdfStyles.schoolName}>{school?.name || 'SCHOOL NAME'}</Text>
            {school?.address && <Text style={pdfStyles.schoolAddress}>{school.address}</Text>}
            <Text style={pdfStyles.contactRow}>{school?.email || ''} {school?.email && school?.contact ? '|' : ''} {school?.contact || ''}</Text>
          </View>
        </View>
        <View style={pdfStyles.reportTitleBox}>
            <Text style={pdfStyles.reportTitle}>{isMidTerm ? 'MID-TERM CONTINUOUS ASSESSMENT' : 'END OF TERM REPORT'} - {school?.current_term?.toUpperCase()}</Text>
            <Text style={{fontSize: 9, color: '#64748b', marginTop: 2}}>{school?.current_session} SESSION</Text>
        </View>
        <View style={pdfStyles.infoContainer}>
            <View style={pdfStyles.infoRow}>
                <View style={pdfStyles.infoCol}><Text style={pdfStyles.infoLabel}>Student Name</Text><Text style={pdfStyles.infoValue}>{student.name}</Text></View>
                <View style={pdfStyles.infoCol}><Text style={pdfStyles.infoLabel}>Admission No</Text><Text style={pdfStyles.infoValue}>{student.admission_no}</Text></View>
                <View style={pdfStyles.infoCol}><Text style={pdfStyles.infoLabel}>Class</Text><Text style={pdfStyles.infoValue}>{classInfo?.name}</Text></View>
            </View>
            <View style={[pdfStyles.infoRow, {borderBottomWidth: 0}]}>
                <View style={pdfStyles.infoCol}><Text style={pdfStyles.infoLabel}>Gender</Text><Text style={pdfStyles.infoValue}>{student.gender}</Text></View>
                <View style={pdfStyles.infoCol}><Text style={pdfStyles.infoLabel}>Total Obtained</Text><Text style={pdfStyles.infoValue}>{totalScore} / {results.length * maxPossibleScore}</Text></View>
                <View style={pdfStyles.infoCol}><Text style={pdfStyles.infoLabel}>Percentage</Text><Text style={pdfStyles.infoValue}>{isNaN(average) ? '0.0' : average}%</Text></View>
            </View>
        </View>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.cell, pdfStyles.colSN, pdfStyles.headerText]}>S/N</Text>
            <Text style={[pdfStyles.cell, pdfStyles.colSubject, pdfStyles.headerText]}>SUBJECT</Text>
            {displayFields.map(f => <Text key={f.code} style={[pdfStyles.cell, {width: scoreColWidth, textAlign: 'center'}, pdfStyles.headerText]}>{f.name.toUpperCase()}</Text>)}
            <Text style={[pdfStyles.cell, pdfStyles.colTotal, pdfStyles.headerText]}>TOT</Text>
            <Text style={[pdfStyles.cell, pdfStyles.colGrade, pdfStyles.headerText]}>GRD</Text>
            <Text style={[pdfStyles.cell, pdfStyles.colRemark, pdfStyles.headerText]}>REMARK</Text>
          </View>
          {processedResults.map((r, i) => (
            <View key={i} style={[pdfStyles.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }]}>
              <Text style={[pdfStyles.cell, pdfStyles.colSN]}>{i + 1}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.colSubject]}>{r.subjects?.name}</Text>
              {displayFields.map(f => <Text key={f.code} style={[pdfStyles.cell, {width: scoreColWidth, textAlign: 'center'}]}>{r.scores[f.code] || 0}</Text>)}
              <Text style={[pdfStyles.cell, pdfStyles.colTotal]}>{r.total}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.colGrade]}>{r.grade}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.colRemark]}>{r.remark}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 15 }}>
            {!isMidTerm && (
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#e2e8f0', padding: 8 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>BEHAVIOURAL TRAITS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {BEHAVIORAL_TRAITS.map(t => (<View key={t} style={{ width: '50%', marginBottom: 3 }}><Text style={{ fontSize: 7, color: '#64748b' }}>{t}</Text><Text style={{ fontSize: 8 }}>{behaviorMap[t] || 'Good'}</Text></View>))}
                </View>
            </View>
            )}
            <View style={{ flex: 1 }}>
                <View style={{ marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 8 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>CLASS TUTOR'S REMARK</Text>
                    <Text style={{ fontSize: 8, fontStyle: 'italic', marginTop: 3 }}>{teacherComment}</Text>
                </View>
                {!isMidTerm && (
                <View style={{ borderWidth: 1, borderColor: '#e2e8f0', padding: 8 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>PRINCIPAL'S REMARK</Text>
                    <Text style={{ fontSize: 8, fontStyle: 'italic', marginTop: 3 }}>{comments?.principal_comment || 'Result Verified and Approved.'}</Text>
                </View>
                )}
            </View>
        </View>
        <View style={pdfStyles.footerContainer}>
            <View style={pdfStyles.signatureBox}>
                {teacherSigBase64 ? <PDFImage src={teacherSigBase64} style={pdfStyles.signatureImage} /> : null}
                <Text style={pdfStyles.signatureText}>Class Tutor Signature</Text>
            </View>
            {!isMidTerm && (
            <View style={pdfStyles.signatureBox}>
                {principalSigBase64 ? <PDFImage src={principalSigBase64} style={pdfStyles.signatureImage} /> : null}
                <Text style={pdfStyles.signatureText}>Principal Signature</Text>
            </View>
            )}
        </View>
      </Page>
    </Document>
  );
};

// ==================== SCHOOL ADMIN COMPONENT ====================
const SchoolAdmin = ({ profile, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [reportType, setReportType] = useState('full');
  const [previewData, setPreviewData] = useState(null);
  const [newConfig, setNewConfig] = useState({ name: '', max: 10, code: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { fetchSchoolData(); }, [profile]);

  const fetchSchoolData = async () => {
    setLoading(true);
    const { data: s } = await supabase.from('schools').select('*').eq('owner_id', profile.id).single();
    if(!s && profile.school_id) {
       // Handle co-admins
       const { data: subS } = await supabase.from('schools').select('*').eq('id', profile.school_id).single();
       setSchool(subS);
       await loadRelated(subS.id);
    } else {
       setSchool(s);
       if(s) await loadRelated(s.id);
    }
    setLoading(false);
  };

  const loadRelated = async (schoolId) => {
      const { data: cls } = await supabase.from('classes').select('*, profiles(full_name)').eq('school_id', schoolId);
      setClasses(cls || []);
      const { data: stu } = await supabase.from('students').select('*, classes(name, form_tutor_id, profiles(signature_url)), comments(submission_status)').eq('school_id', schoolId).order('name');
      setStudents(stu || []);
      const { data: tch } = await supabase.from('profiles').select('*').eq('school_id', schoolId).eq('role', 'teacher');
      setTeachers(tch || []);
      const { data: adm } = await supabase.from('profiles').select('*').eq('school_id', schoolId).eq('role', 'admin');
      setAdmins(adm || []);
  };

  const updateSchool = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const file = formData.get('logo_file');
    let logo_url = school.logo_url;
    if (file && file.size > 0) {
        const fileName = `logo-${school.id}-${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('school-assets').upload(fileName, file);
        if (!error) {
            const { data } = supabase.storage.from('school-assets').getPublicUrl(fileName);
            logo_url = data.publicUrl;
        }
    }
    const sigFile = formData.get('sig_file');
    let principal_signature_url = school.principal_signature_url;
    if (sigFile && sigFile.size > 0) {
        const fileName = `sig-${school.id}-${Date.now()}.${sigFile.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('school-assets').upload(fileName, sigFile);
        if (!error) {
            const { data } = supabase.storage.from('school-assets').getPublicUrl(fileName);
            principal_signature_url = data.publicUrl;
        }
    }
    const updates = {
        name: formData.get('name'), address: formData.get('address'),
        contact: formData.get('contact'), email: formData.get('email'),
        current_term: formData.get('current_term'), current_session: formData.get('current_session'),
        logo_url, principal_signature_url
    };
    const { error } = await supabase.from('schools').update(updates).eq('id', school.id);
    if(!error) { setSchool(prev => ({ ...prev, ...updates })); window.alert('School Info Updated!'); } 
    else { window.alert('Update Failed: ' + error.message); }
    setLoading(false);
  };

  const addStudent = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    if (students.length >= school.max_students) return window.alert("Limit reached!");
    const pin = generatePIN();
    const autoAdm = generateAdmissionNumber();
    const { error } = await supabase.from('students').insert({
      school_id: school.id, name: data.name, admission_no: autoAdm,
      gender: data.gender, class_id: data.class_id, parent_pin: pin
    });
    if (error) window.alert(error.message); 
    else { window.alert(`Added! Adm: ${autoAdm}, PIN: ${pin}`); e.target.reset(); fetchSchoolData(); }
  };

  const inviteAdmin = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const email = fd.get('email');
      const name = fd.get('name');
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const currentInvites = school.admin_invites || []; // Using a JSONB column in 'schools' for simplicity
      // Schema needs: schools table has a column 'admin_invites' type jsonb default []
      
      const newInvite = { email, name, code, created_at: new Date().toISOString() };
      const updatedInvites = [...currentInvites, newInvite];

      const { error } = await supabase.from('schools').update({ admin_invites: updatedInvites }).eq('id', school.id);
      if(!error) {
          window.alert(`Invite Created! Code: ${code}\nShare this code with the user to register.`);
          e.target.reset();
          fetchSchoolData();
      } else {
          // If the column doesn't exist, we fallback or handle error. 
          // Assuming schema flexibility or JSON column exists.
          window.alert("Error creating invite (Ensure DB has admin_invites column): " + error.message);
      }
  };

  const addConfigField = async () => {
    if(!newConfig.name || !newConfig.max) return;
    const code = newConfig.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const updated = [...(school.assessment_config || []), { ...newConfig, code }];
    await supabase.from('schools').update({ assessment_config: updated }).eq('id', school.id);
    setNewConfig({ name: '', max: 10, code: '' });
    fetchSchoolData();
  };

  const loadStudentResult = async (student, type) => {
    setViewingStudent(student);
    setReportType(type);
    const { data: results } = await supabase.from('results').select('*, subjects(*)').eq('student_id', student.id);
    const { data: comments } = await supabase.from('comments').select('*').eq('student_id', student.id).maybeSingle();
    const behaviorList = comments?.behaviors ? JSON.parse(comments.behaviors) : {};
    const behaviorArray = BEHAVIORAL_TRAITS.map(trait => ({ trait, rating: behaviorList[trait] || 'Good' }));
    
    const logoBase64 = await imageUrlToBase64(school.logo_url);
    const principalSigBase64 = await imageUrlToBase64(school.principal_signature_url);
    const teacherUrl = student.classes?.profiles?.signature_url;
    const teacherSigBase64 = await imageUrlToBase64(teacherUrl);

    setPreviewData({ 
        school, student, classInfo: student.classes, 
        results: results || [], comments: comments || {}, behaviors: behaviorArray, 
        logoBase64, principalSigBase64, teacherSigBase64 
    });
  };

  // Preview Modal
  if (viewingStudent && previewData) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 h-screen w-screen">
            <div className="bg-white p-4 shadow flex justify-between items-center z-10">
                <button onClick={() => setViewingStudent(null)} className="flex items-center gap-2"><X /> Close</button>
                <div className="flex gap-3">
                    <PDFDownloadLink document={<ResultPDF {...previewData} reportType={reportType} logoBase64={previewData.logoBase64} principalSigBase64={previewData.principalSigBase64} teacherSigBase64={previewData.teacherSigBase64} />} fileName={`${viewingStudent.name}.pdf`}>
                      <button className="bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-2 text-sm"><Download size={16} /> PDF</button>
                    </PDFDownloadLink>
                </div>
            </div>
            <div className="flex-1 w-full relative">
                 <PDFViewer className="absolute inset-0 w-full h-full"><ResultPDF {...previewData} reportType={reportType} logoBase64={previewData.logoBase64} principalSigBase64={previewData.principalSigBase64} teacherSigBase64={previewData.teacherSigBase64} /></PDFViewer>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-20 sticky top-0">
          <h2 className="font-bold flex items-center gap-2"><School size={20}/> Admin</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></button>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-10 inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col p-4 transition duration-200 ease-in-out`}>
        <div className="hidden md:flex items-center gap-2 font-bold text-xl mb-8"><School /> Admin Panel</div>
        <nav className="space-y-2 flex-1 mt-4 md:mt-0">
          {['dashboard', 'info', 'admins', 'students', 'classes'].map(t => (
              <button key={t} onClick={()=>{setActiveTab(t); setSidebarOpen(false);}} className={`w-full text-left p-3 rounded capitalize flex gap-2 ${activeTab===t?'bg-blue-600':''}`}>
                  {t === 'dashboard' ? <LayoutDashboard size={18}/> : t==='admins' ? <Key size={18}/> : t==='students'?<User size={18}/> : <Menu size={18}/>} {t}
              </button>
          ))}
        </nav>
        <button onClick={onLogout} className="flex items-center gap-2 text-red-400 mt-auto mb-4 md:mb-0"><LogOut size={18}/> Logout</button>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
           <div>
               <h1 className="text-xl md:text-2xl font-bold mb-6 text-slate-800">Welcome, {school?.name}</h1>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500"><h3>Students</h3><p className="text-3xl font-bold text-slate-700">{students.length}</p></div>
                   <div className="bg-white p-6 rounded shadow border-l-4 border-green-500"><h3>Teachers</h3><p className="text-3xl font-bold text-slate-700">{teachers.length}</p></div>
                   <div className="bg-white p-6 rounded shadow border-l-4 border-purple-500"><h3>Admins</h3><p className="text-3xl font-bold text-slate-700">{admins.length}</p></div>
               </div>
           </div>
        )}

        {activeTab === 'admins' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">Manage Admins</h2>
                    <p className="text-sm text-gray-500 mb-4">Invite a colleague to be an admin. They will use the code to create their account.</p>
                    <form onSubmit={inviteAdmin} className="space-y-4">
                        <input name="name" placeholder="Colleague Name" className="w-full p-2 border rounded" required />
                        <input name="email" type="email" placeholder="Colleague Email" className="w-full p-2 border rounded" required />
                        <button className="bg-blue-600 text-white w-full py-2 rounded font-bold">Generate Invite Code</button>
                    </form>
                    
                    <div className="mt-8">
                        <h3 className="font-bold border-b pb-2 mb-2">Pending Invites</h3>
                        {(school?.admin_invites || []).length === 0 && <p className="text-sm text-gray-400">No pending invites.</p>}
                        {(school?.admin_invites || []).map((inv, i) => (
                             <div key={i} className="flex justify-between items-center bg-yellow-50 p-2 mb-2 rounded border border-yellow-200">
                                 <div>
                                     <p className="text-xs font-bold">{inv.name}</p>
                                     <p className="text-xs">{inv.email}</p>
                                 </div>
                                 <div className="text-right">
                                     <p className="text-lg font-mono font-bold text-blue-600">{inv.code}</p>
                                 </div>
                             </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded shadow">
                    <h3 className="font-bold mb-4">Current Admins</h3>
                    {admins.map(a => (
                        <div key={a.id} className="p-3 border-b flex justify-between items-center">
                            <div>
                                <p className="font-bold">{a.full_name}</p>
                                <p className="text-xs text-gray-500">{a.id === profile.id ? '(You)' : 'Co-Admin'}</p>
                            </div>
                            <User size={16} className="text-gray-400"/>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">School Details</h2>
                    <form onSubmit={updateSchool} className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500">SCHOOL NAME</label><input name="name" defaultValue={school?.name} className="w-full p-2 border rounded" /></div>
                        <div><label className="text-xs font-bold text-gray-500">ADDRESS</label><input name="address" defaultValue={school?.address} className="w-full p-2 border rounded" placeholder="Street Address, State" /></div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-gray-500">PHONE</label><input name="contact" defaultValue={school?.contact} className="w-full p-2 border rounded" /></div>
                             <div><label className="text-xs font-bold text-gray-500">EMAIL</label><input name="email" defaultValue={school?.email} className="w-full p-2 border rounded" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500">CURRENT TERM</label><input name="current_term" defaultValue={school?.current_term} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-gray-500">SESSION</label><input name="current_session" defaultValue={school?.current_session} className="w-full p-2 border rounded" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold mb-1">Logo</label><input type="file" name="logo_file" className="text-xs border p-2 w-full rounded" /></div>
                            <div><label className="block text-sm font-bold mb-1">Signature</label><input type="file" name="sig_file" className="text-xs border p-2 w-full rounded" /></div>
                        </div>
                        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded w-full flex justify-center mt-4">{loading ? <Loader2 className="animate-spin"/> : 'Save Changes'}</button>
                    </form>
                </div>
                <div className="bg-white p-6 rounded shadow h-fit">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">Assessment Config</h2>
                    <div className="space-y-2 mb-4">
                        {(school?.assessment_config || []).map(c => (
                            <div key={c.code} className="flex justify-between bg-gray-50 p-2 rounded items-center border">
                                <span className="font-bold text-sm text-slate-700">{c.name} ({c.max} marks)</span>
                                <button onClick={async()=>{
                                     const updated = school.assessment_config.filter(x => x.code !== c.code);
                                     await supabase.from('schools').update({ assessment_config: updated }).eq('id', school.id);
                                     fetchSchoolData();
                                }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 bg-gray-100 p-2 rounded">
                        <input placeholder="Title" className="border p-2 rounded flex-1 text-sm" value={newConfig.name} onChange={e=>setNewConfig({...newConfig, name:e.target.value})} />
                        <input placeholder="Max" type="number" className="border p-2 rounded w-16 text-sm" value={newConfig.max} onChange={e=>setNewConfig({...newConfig, max:parseInt(e.target.value)})} />
                        <button onClick={addConfigField} className="bg-green-600 text-white px-3 rounded text-sm font-bold">Add</button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'students' && (
            <div>
                <h2 className="text-xl font-bold mb-4">Manage Students</h2>
                <div className="bg-white p-4 rounded shadow mb-6">
                    <form onSubmit={addStudent} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <input name="name" placeholder="Student Full Name" className="border p-2 rounded" required />
                        <select name="gender" className="border p-2 rounded"><option>Male</option><option>Female</option></select>
                        <select name="class_id" className="border p-2 rounded" required>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <button className="bg-green-600 text-white p-2 rounded font-bold flex items-center justify-center gap-2"><Plus size={18}/> Register</button>
                    </form>
                </div>
                <div className="bg-white rounded shadow overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                        <thead className="bg-slate-100 border-b">
                            <tr><th className="p-3">Name</th><th className="p-3">Adm No</th><th className="p-3">Class</th><th className="p-3">PIN</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                        </thead>
                        <tbody>
                            {students.map(s => {
                                const status = s.comments?.[0]?.submission_status || s.comments?.submission_status || 'draft';
                                return (
                                <tr key={s.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-medium">{s.name}</td>
                                    <td className="p-3 font-mono text-gray-600">{s.admission_no}</td>
                                    <td className="p-3">{s.classes?.name}</td>
                                    <td className="p-3 font-mono bg-yellow-50">{s.parent_pin}</td>
                                    <td className="p-3">
                                        {status === 'approved' ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Approved</span> :
                                         status === 'awaiting_approval' ? <button onClick={async()=>{
                                             await supabase.from('comments').update({ submission_status: 'approved' }).eq('student_id', s.id);
                                             fetchSchoolData();
                                         }} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs hover:bg-orange-200 font-bold border border-orange-200">Approve?</button> :
                                         <span className="text-gray-400 text-xs italic">Draft</span>}
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => loadStudentResult(s, 'full')} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Eye size={16}/></button>
                                        <button onClick={async()=>{if(window.confirm('Delete?')) { await supabase.from('students').delete().eq('id', s.id); fetchSchoolData(); }}} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'classes' && (
            <div className="bg-white p-6 rounded shadow w-full md:max-w-3xl">
                <h2 className="text-xl font-bold mb-4">Classes & Tutors</h2>
                <form onSubmit={async(e)=>{
                    e.preventDefault(); const fd=new FormData(e.target);
                    await supabase.from('classes').insert({school_id:school.id, name:fd.get('name'), form_tutor_id:fd.get('tid')||null});
                    e.target.reset(); fetchSchoolData();
                }} className="flex flex-col md:flex-row gap-4 items-end mb-6">
                    <input name="name" placeholder="Class Name (e.g. JSS 1)" className="border p-2 rounded w-full md:flex-1" required />
                    <select name="tid" className="border p-2 rounded w-full md:flex-1"><option value="">Select Form Tutor</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold w-full md:w-auto">Create Class</button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{classes.map(c=>(
                    <div key={c.id} className="border p-4 rounded flex justify-between items-center bg-gray-50">
                        <div><h3 className="font-bold">{c.name}</h3><span className="text-xs text-gray-500">{c.profiles?.full_name || 'No Tutor Assigned'}</span></div>
                        <button onClick={async()=>{if(window.confirm('Delete Class?')) { await supabase.from('classes').delete().eq('id', c.id); fetchSchoolData(); }}} className="text-red-500"><Trash2 size={16}/></button>
                    </div>
                ))}</div>
            </div>
        )}
      </div>
    </div>
  );
};

// ==================== TEACHER DASHBOARD ====================
const TeacherDashboard = ({ profile, onLogout }) => {
  const [classes, setClasses] = useState([]);
  const [curClass, setCurClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [scores, setScores] = useState({});
  const [behaviors, setBehaviors] = useState({});
  const [comments, setComments] = useState({ full: "", mid: "" });
  const [previewData, setPreviewData] = useState(null);
  const [schoolConfig, setSchoolConfig] = useState([]);
  const [schoolData, setSchoolData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { save, saving } = useAutoSave(async () => {
    if (!selectedStudent) return;
    await saveResultToDB();
  }, 1500);

  useEffect(() => {
    const init = async () => {
        const { data: cls } = await supabase.from('classes').select('*, schools(*)').eq('form_tutor_id', profile.id);
        setClasses(cls || []);
        if (cls?.[0]) {
            setSchoolConfig(cls[0].schools.assessment_config || []);
            setSchoolData(cls[0].schools);
            loadClass(cls[0].id);
        }
    };
    init();
  }, [profile]);

  const loadClass = async (classId) => {
    const cls = classes.find(c => c.id === classId);
    setCurClass(cls);
    setSelectedStudent(null);
    const { data: sub } = await supabase.from('subjects').select('*').eq('class_id', classId);
    setSubjects(sub || []);
    const { data: stu } = await supabase.from('students').select('*, classes(profiles(signature_url))').eq('class_id', classId).order('name');
    setStudents(stu || []);
    setSidebarOpen(false); // Close sidebar on mobile on select
  };

  const uploadSignature = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fileName = `sig-user-${profile.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('school-assets').upload(fileName, file);
      if(!error) {
          const { data } = supabase.storage.from('school-assets').getPublicUrl(fileName);
          await supabase.from('profiles').update({ signature_url: data.publicUrl }).eq('id', profile.id);
          window.alert("Signature Uploaded!");
      }
  };

  const loadStudentData = async (student) => {
    setSelectedStudent(null);
    const { data: res } = await supabase.from('results').select('*, subjects(*)').eq('student_id', student.id);
    const scoreMap = {};
    subjects.forEach(s => {
      const existing = res?.find(r => r.subject_id === s.id);
      scoreMap[s.id] = existing?.scores || {};
    });
    setScores(scoreMap);
    const { data: comm } = await supabase.from('comments').select('*').eq('student_id', student.id).maybeSingle();
    setComments({ full: comm?.tutor_comment || "", mid: comm?.midterm_tutor_comment || "" });
    setBehaviors(comm?.behaviors ? JSON.parse(comm.behaviors) : {});
    setSelectedStudent(student);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const updateScore = (subId, code, value, max) => {
    const num = Math.min(parseFloat(value) || 0, max);
    setScores(prev => ({ ...prev, [subId]: { ...prev[subId], [code]: num } }));
    save();
  };

  const saveResultToDB = async (status = null) => {
    if(!selectedStudent) return;
    const resultsPayload = subjects.map(s => {
      const subScores = scores[s.id] || {};
      let total = 0;
      schoolConfig.forEach(c => total += (subScores[c.code] || 0));
      return { student_id: selectedStudent.id, subject_id: s.id, scores: subScores, total };
    });
    await supabase.from('results').delete().eq('student_id', selectedStudent.id);
    await supabase.from('results').insert(resultsPayload);
    
    const payload = { 
        student_id: selectedStudent.id, school_id: curClass.school_id, 
        tutor_comment: comments.full, midterm_tutor_comment: comments.mid,
        behaviors: JSON.stringify(behaviors) 
    };
    if (status) payload.submission_status = status;
    await supabase.from('comments').upsert(payload, { onConflict: 'student_id' });
  };

  const handlePreview = async () => {
    await saveResultToDB();
    const { data: results } = await supabase.from('results').select('*, subjects(*)').eq('student_id', selectedStudent.id);
    const behaviorArray = BEHAVIORAL_TRAITS.map(trait => ({ trait, rating: behaviors[trait] || 'Good' }));
    
    const logoBase64 = await imageUrlToBase64(schoolData.logo_url);
    const principalSigBase64 = await imageUrlToBase64(schoolData.principal_signature_url);
    
    const { data: teacherProfile } = await supabase.from('profiles').select('signature_url').eq('id', profile.id).single();
    const teacherSigBase64 = await imageUrlToBase64(teacherProfile?.signature_url);

    setPreviewData({ 
        school: schoolData, student: selectedStudent, classInfo: { ...curClass }, 
        results: results || [], comments: { tutor_comment: comments.full, midterm_tutor_comment: comments.mid }, behaviors: behaviorArray, 
        logoBase64, principalSigBase64, teacherSigBase64
    });
  };

  if (previewData) {
      return (
          <div className="fixed inset-0 bg-gray-100 flex flex-col z-50">
              <div className="bg-white p-4 shadow flex justify-between items-center">
                  <button onClick={() => setPreviewData(null)} className="flex items-center gap-2"><X /> Close</button>
                  <div className="flex gap-2">
                     <button onClick={async()=>{if(window.confirm('Submit to Admin?')){ await saveResultToDB('awaiting_approval'); setPreviewData(null); }}} className="bg-green-600 text-white px-3 py-2 rounded flex items-center gap-2 text-xs md:text-sm"><ShieldCheck size={16}/> Submit</button>
                     <PDFDownloadLink document={<ResultPDF {...previewData} reportType="mid" logoBase64={previewData.logoBase64} principalSigBase64={previewData.principalSigBase64} teacherSigBase64={previewData.teacherSigBase64} />} fileName="MidTerm.pdf"><button className="bg-blue-100 text-blue-700 px-3 py-2 rounded flex items-center gap-2 font-bold text-xs md:text-sm">Mid-Term</button></PDFDownloadLink>
                     <PDFDownloadLink document={<ResultPDF {...previewData} reportType="full" logoBase64={previewData.logoBase64} principalSigBase64={previewData.principalSigBase64} teacherSigBase64={previewData.teacherSigBase64} />} fileName="FullTerm.pdf"><button className="bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-2 font-bold text-xs md:text-sm">Full-Term</button></PDFDownloadLink>
                  </div>
              </div>
              <PDFViewer className="flex-1 w-full"><ResultPDF {...previewData} reportType="full" logoBase64={previewData.logoBase64} principalSigBase64={previewData.principalSigBase64} teacherSigBase64={previewData.teacherSigBase64} /></PDFViewer>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow sticky top-0 z-20">
          <h2 className="font-bold">{profile.full_name}</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></button>
      </div>

      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-10 inset-y-0 left-0 w-80 bg-white border-r flex flex-col transition duration-200 ease-in-out`}>
        <div className="p-4 bg-slate-900 text-white hidden md:block">
            <h2 className="font-bold truncate text-lg">{profile.full_name}</h2>
            <button onClick={onLogout} className="text-xs text-red-300 flex items-center gap-1 mt-2"><LogOut size={12}/> Logout</button>
        </div>
        <div className="p-4 bg-slate-800 md:bg-slate-900 border-t border-slate-700">
             <div className="flex items-center gap-2 mb-2">
                <input type="file" id="t-sig" className="hidden" onChange={uploadSignature} />
                <label htmlFor="t-sig" className="bg-slate-700 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-slate-600 flex items-center gap-1"><Upload size={10}/> Upload Signature</label>
             </div>
             <select className="w-full text-black p-2 rounded text-sm" onChange={(e) => loadClass(parseInt(e.target.value))}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>

        <div className="flex-1 overflow-y-auto">
            {curClass && (
                <>
                <div className="p-3 bg-gray-100 font-bold text-xs flex justify-between border-b"><span>SUBJECTS</span><button onClick={async()=>{const n=window.prompt('Subject Name:'); if(n){await supabase.from('subjects').insert({class_id:curClass.id,name:n}); loadClass(curClass.id);}}}><Plus size={16}/></button></div>
                <div className="p-2 flex flex-wrap gap-2 border-b">{subjects.map(s => (<span key={s.id} className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded flex gap-1 border border-blue-200">{s.name} <button onClick={async()=>{if(window.confirm('Del?')) {await supabase.from('subjects').delete().eq('id', s.id); loadClass(curClass.id);}}} className="text-red-500">×</button></span>))}</div>
                <div className="p-3 bg-gray-100 font-bold text-xs border-b">STUDENTS</div>
                {students.map(s => (
                    <div key={s.id} onClick={() => loadStudentData(s)} className={`p-3 border-b cursor-pointer hover:bg-gray-50 text-sm ${selectedStudent?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>{s.name}</div>
                ))}
                </>
            )}
        </div>
        <button onClick={onLogout} className="md:hidden p-4 text-red-600 border-t font-bold">Logout</button>
      </div>
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {!selectedStudent ? <div className="text-center mt-20 text-gray-400">Select a student from the menu</div> : (
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">{selectedStudent.name}</h1>
                    <div className="flex gap-2 items-center w-full md:w-auto justify-between md:justify-end">
                        {saving && <span className="text-green-600 text-xs flex items-center gap-1"><Save size={12} className="animate-pulse"/> Saving...</span>}
                        <button onClick={handlePreview} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition text-sm"><Eye size={16}/> Preview</button>
                    </div>
                </div>

                <div className="bg-white rounded shadow overflow-x-auto mb-8 border">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-3 text-left w-1/4">Subject</th>{schoolConfig.map(c => <th key={c.code} className="p-2 text-center w-24">{c.name}<br/><span className="text-xs text-gray-500">/{c.max}</span></th>)}<th className="p-3 text-center w-20 bg-gray-50">Total</th></tr>
                        </thead>
                        <tbody>
                            {subjects.map(s => {
                                let total = 0; schoolConfig.forEach(c => total += (scores[s.id]?.[c.code] || 0));
                                return (
                                    <tr key={s.id} className="border-b hover:bg-slate-50">
                                        <td className="p-3 font-medium">{s.name}</td>
                                        {schoolConfig.map(c => (
                                            <td key={c.code} className="p-2 text-center">
                                                <input type="number" className="w-16 text-center border rounded p-1 focus:ring-2 focus:ring-blue-200 outline-none" 
                                                    value={scores[s.id]?.[c.code] || ''} onChange={(e) => updateScore(s.id, c.code, e.target.value, c.max)} 
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 text-center font-bold bg-gray-50">{total}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded shadow border">
                        <h3 className="font-bold mb-4 border-b pb-2">Behavioral Traits</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {BEHAVIORAL_TRAITS.map(t => (
                                <div key={t}>
                                    <label className="text-xs block text-gray-500 font-bold mb-1">{t}</label>
                                    <select className="w-full border rounded text-sm p-1.5" value={behaviors[t] || 'Good'} onChange={(e) => { setBehaviors(p => ({...p, [t]: e.target.value})); save(); }}>
                                        {RATINGS.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded shadow h-fit border">
                            <h3 className="font-bold mb-2 border-b pb-2 text-blue-600">Mid-Term Comment</h3>
                            <textarea className="w-full border rounded p-3 h-24 text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none" value={comments.mid} onChange={(e) => { setComments(p => ({...p, mid: e.target.value})); save(); }} />
                        </div>
                        <div className="bg-white p-6 rounded shadow h-fit border">
                            <h3 className="font-bold mb-2 border-b pb-2 text-green-600">Full Term Comment</h3>
                            <textarea className="w-full border rounded p-3 h-24 text-sm focus:ring-2 focus:ring-green-200 outline-none resize-none" value={comments.full} onChange={(e) => { setComments(p => ({...p, full: e.target.value})); save(); }} />
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// ==================== AUTH & PORTALS ====================
const Auth = ({ onLogin, onParent }) => {
    const [mode, setMode] = useState('login'); 
    const [form, setForm] = useState({ email: '', password: '', name: '', pin: '', schoolCode: '' });
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            if (mode === 'central') {
                if (form.email === 'oluwatoyin' && form.password === 'Funmilola') onLogin({ role: 'central' });
            } else if (mode === 'school_reg') {
                const { data: pinData } = await supabase.from('subscription_pins').select('*').eq('code', form.pin).eq('is_used', false).single();
                if (!pinData) throw new Error('Invalid or Used PIN');
                const { data: auth } = await supabase.auth.signUp({ email: form.email, password: form.password });
                if(auth.user) {
                    const { data: school } = await supabase.from('schools').insert({ owner_id: auth.user.id, name: 'My School', max_students: pinData.student_limit }).select().single();
                    await supabase.from('profiles').insert({ id: auth.user.id, full_name: form.name, role: 'admin', school_id: school.id });
                    await supabase.from('subscription_pins').update({ is_used: true }).eq('id', pinData.id);
                    window.alert("Registration Successful! Please Login."); setMode('login');
                }
            } else if (mode === 'teacher_reg' || mode === 'admin_reg') {
                 // Logic for Staff Registration
                 const role = mode === 'teacher_reg' ? 'teacher' : 'admin';
                 let schoolId = null;

                 if (role === 'teacher') {
                     const { data: sch } = await supabase.from('schools').select('id').eq('id', form.schoolCode).single();
                     if (!sch) throw new Error('Invalid School Code');
                     schoolId = sch.id;
                 } else {
                     // Check Admin Invite
                     // Note: To be secure, we need to iterate schools to find who issued this code, or use a specific invites table.
                     // Since we used a JSONB column on schools, we must query schools that contain this invite.
                     // Supabase PostgREST allows searching JSON arrays.
                     const { data: schs } = await supabase.from('schools').select('*'); 
                     const targetSchool = schs?.find(s => (s.admin_invites || []).some(inv => inv.code === form.schoolCode && inv.email === form.email));
                     
                     if (!targetSchool) throw new Error("Invalid Invite Code or Email mismatch.");
                     schoolId = targetSchool.id;

                     // Remove invite logic would ideally be here, but we need auth first.
                     // We will remove it after successful creation if possible, or leave it.
                     // For this simple version, we proceed.
                 }

                 const { data: auth } = await supabase.auth.signUp({ email: form.email, password: form.password });
                 if(auth.user){
                    await supabase.from('profiles').insert({ id: auth.user.id, full_name: form.name, role: role, school_id: schoolId });
                    
                    // Cleanup invite if admin
                    if(role === 'admin') {
                        const { data: s } = await supabase.from('schools').select('admin_invites').eq('id', schoolId).single();
                        const updated = (s.admin_invites || []).filter(inv => inv.code !== form.schoolCode);
                        await supabase.from('schools').update({ admin_invites: updated }).eq('id', schoolId);
                    }

                    window.alert(`${role === 'admin' ? 'Admin' : 'Teacher'} Registered! Please Login.`); setMode('login');
                 }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
                if (error) throw error;
            }
        } catch (err) { window.alert(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border-t-4 border-blue-600">
                <div className="text-center mb-6"><div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><School className="text-blue-600" size={32} /></div><h1 className="text-2xl font-bold text-slate-800">Springforth Results</h1></div>
                <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs font-bold border-b pb-2">
                    {['login', 'school_reg', 'teacher_reg', 'admin_reg'].map(m => <button key={m} onClick={()=>setMode(m)} className={`capitalize pb-1 ${mode===m?'text-blue-600 border-b-2 border-blue-600':''}`}>{m.replace('school_reg', 'Start School').replace('teacher_reg', 'Join (Tutor)').replace('admin_reg', 'Join (Admin)').replace('_', ' ')}</button>)}
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    {(mode.includes('reg')) && <input placeholder="Full Name" className="w-full p-3 border rounded bg-gray-50" onChange={e=>setForm({...form, name:e.target.value})} required />}
                    <input type="email" placeholder="Email Address" className="w-full p-3 border rounded bg-gray-50" onChange={e=>setForm({...form, email:e.target.value})} required />
                    <input type="password" placeholder="Password" className="w-full p-3 border rounded bg-gray-50" onChange={e=>setForm({...form, password:e.target.value})} required />
                    {mode === 'school_reg' && <input placeholder="Subscription PIN" className="w-full p-3 border rounded bg-gray-50" onChange={e=>setForm({...form, pin:e.target.value})} required />}
                    {mode === 'teacher_reg' && <input placeholder="School ID (Ask Admin)" className="w-full p-3 border rounded bg-gray-50" onChange={e=>setForm({...form, schoolCode:e.target.value})} required />}
                    {mode === 'admin_reg' && <input placeholder="Invite Code (From Admin)" className="w-full p-3 border rounded bg-gray-50" onChange={e=>setForm({...form, schoolCode:e.target.value})} required />}
                    <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold transition flex justify-center">{loading ? <Loader2 className="animate-spin"/> : 'Access Portal'}</button>
                </form>
                {mode === 'login' && (
                    <div className="mt-6 pt-4 border-t">
                        <button onClick={onParent} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold flex items-center justify-center gap-2"><User size={20}/> Check Student Result</button>
                        <button onClick={()=>setMode('central')} className="text-xs text-gray-300 mt-4 mx-auto block">Central Admin</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ParentPortal = ({ onBack }) => {
    const [creds, setCreds] = useState({ adm: '', pin: '' });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchResult = async (e) => {
        e.preventDefault(); setLoading(true);
        const { data: stu } = await supabase.from('students').select('*, schools(*), classes(*, profiles(signature_url)), comments(*), results(*, subjects(*))').eq('admission_no', creds.adm).eq('parent_pin', creds.pin).maybeSingle();
        if (!stu) { window.alert('Invalid Credentials'); setLoading(false); return; }
        
        const comm = Array.isArray(stu.comments) ? stu.comments[0] : stu.comments;
        if (comm?.submission_status !== 'approved') { window.alert("Result not yet approved by school."); setLoading(false); return; }

        const behaviors = comm?.behaviors ? JSON.parse(comm.behaviors) : {};
        const behaviorArray = BEHAVIORAL_TRAITS.map(trait => ({ trait, rating: behaviors[trait] || 'Good' }));
        const logoBase64 = await imageUrlToBase64(stu.schools.logo_url);
        const principalSigBase64 = await imageUrlToBase64(stu.schools.principal_signature_url);
        const teacherSigBase64 = await imageUrlToBase64(stu.classes?.profiles?.signature_url);

        setData({ 
            student: stu, school: stu.schools, classInfo: stu.classes, 
            results: stu.results, comments: comm || {}, behaviors: behaviorArray, 
            logoBase64, principalSigBase64, teacherSigBase64 
        });
        setLoading(false);
    };

    if (data) return (
        <div className="fixed inset-0 bg-slate-800 z-50 flex flex-col h-screen">
            <div className="bg-white p-4 shadow flex justify-between items-center">
                <button onClick={()=>setData(null)} className="flex items-center gap-2 font-bold"><X /> Exit Portal</button>
                <div className="flex gap-3">
                    <PDFDownloadLink document={<ResultPDF {...data} reportType="mid" logoBase64={data.logoBase64} principalSigBase64={data.principalSigBase64} teacherSigBase64={data.teacherSigBase64} />} fileName="MidTerm.pdf"><button className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-bold text-sm">Mid-Term PDF</button></PDFDownloadLink>
                    <PDFDownloadLink document={<ResultPDF {...data} reportType="full" logoBase64={data.logoBase64} principalSigBase64={data.principalSigBase64} teacherSigBase64={data.teacherSigBase64} />} fileName="FullTerm.pdf"><button className="bg-green-600 text-white px-3 py-2 rounded font-bold shadow text-sm">Full-Term PDF</button></PDFDownloadLink>
                </div>
            </div>
            <PDFViewer className="flex-1 w-full"><ResultPDF {...data} reportType="full" logoBase64={data.logoBase64} principalSigBase64={data.principalSigBase64} teacherSigBase64={data.teacherSigBase64} /></PDFViewer>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
            <form onSubmit={fetchResult} className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm border-t-4 border-green-600">
                <h2 className="text-2xl font-bold text-center mb-2">Parent Portal</h2>
                <p className="text-center text-gray-500 mb-6 text-sm">Enter student details to view result.</p>
                <input placeholder="Admission Number (e.g. 2024/1234)" className="w-full p-3 border rounded mb-3 bg-gray-50" onChange={e=>setCreds({...creds, adm:e.target.value})} required />
                <input type="password" placeholder="Access PIN" className="w-full p-3 border rounded mb-4 bg-gray-50" onChange={e=>setCreds({...creds, pin:e.target.value})} required />
                <button disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold transition">{loading ? 'Checking...' : 'Check Result'}</button>
                <button type="button" onClick={onBack} className="w-full text-center text-sm mt-4 text-gray-500">Back to Login</button>
            </form>
        </div>
    );
};

const CentralAdmin = ({ onLogout }) => {
    const [pins, setPins] = useState([]);
    useEffect(()=>{ const f = async () => { const {data} = await supabase.from('subscription_pins').select('*'); setPins(data||[]); }; f(); },[]);
    return (
        <div className="p-8 bg-slate-900 min-h-screen text-white font-mono">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Central Admin</h1>
                <button onClick={onLogout} className="text-red-400 border border-red-400 px-3 py-1 rounded hover:bg-red-400 hover:text-white transition">Logout</button>
            </div>
            <button onClick={async()=>{ await supabase.from('subscription_pins').insert({ code: `SUB-${Math.floor(Math.random()*90000)}` }); window.location.reload(); }} className="bg-blue-600 px-6 py-3 rounded font-bold mb-6 hover:bg-blue-500 transition block w-full md:w-auto">+ Generate New PIN</button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pins.map(p=><div key={p.id} className={`p-4 rounded border ${p.is_used ? 'bg-slate-800 border-slate-700 text-gray-500' : 'bg-green-900 border-green-700 text-green-100'}`}><p className="text-xl font-bold">{p.code}</p><p className="text-xs mt-1">{p.is_used?'USED':'ACTIVE'}</p></div>)}
            </div>
        </div>
    );
};

// ==================== APP ROOT ====================
const App = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('auth');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if(!session) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); if (!session) { setProfile(null); setView('auth'); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        setProfile(data); setLoading(false);
      };
      fetchProfile();
    }
  }, [session]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48}/></div>;

  if (view === 'central') return <CentralAdmin onLogout={() => setView('auth')} />;
  if (view === 'parent') return <ParentPortal onBack={() => setView('auth')} />;
  if (!session) return <Auth onLogin={(d) => setView(d.role === 'central' ? 'central' : 'dashboard')} onParent={() => setView('parent')} />;
  if (!profile) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Profile Error. Please contact support.</div>;

  return profile.role === 'admin' ? <SchoolAdmin profile={profile} onLogout={() => supabase.auth.signOut()} /> : <TeacherDashboard profile={profile} onLogout={() => supabase.auth.signOut()} />;
};

export default App;
