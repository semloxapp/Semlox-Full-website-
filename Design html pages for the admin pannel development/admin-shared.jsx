const AdminIc=({p,size=15})=><svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={p}/></svg>;
const AdminI={
  grid:"M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z",
  layers:"M8 2l6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3",
  target:"M8 14A6 6 0 108 2a6 6 0 000 12zM8 11a3 3 0 100-6 3 3 0 000 6zM8 8.5a.5.5 0 100-1 .5.5 0 000 1z",
  edit:"M11 2l3 3-8 8H3v-3z",
  search:"M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5",
  gauge:"M8 14A6 6 0 118 2a6 6 0 010 12zM8 8L11 5M8 8v0",
  brain:"M5 3a2 2 0 012 2v6a2 2 0 11-4 0 2 2 0 01-1-3.7A2 2 0 015 3zM11 3a2 2 0 00-2 2v6a2 2 0 104 0 2 2 0 001-3.7A2 2 0 0011 3z",
  bug:"M8 4a3 3 0 013 3v3a3 3 0 11-6 0V7a3 3 0 013-3zM5 7H2M14 7h-3M5 11H2M14 11h-3M8 1v3",
  doc:"M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5L9 1zM9 1v4h4",
  sun:"M8 11A3 3 0 108 5a3 3 0 000 6zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3",
  moon:"M9 2a7 7 0 00-7 7 7 7 0 007 7 7 7 0 004.9-2.1A5 5 0 019 2z",
  bell:"M8 1a4 4 0 014 4v4l1.5 2H.5L2 9V5a4 4 0 014-4zM6.5 13a1.5 1.5 0 003 0",
  more:"M4 8h.01M8 8h.01M12 8h.01",
  check:"M2 8l4 4 8-6",
  warn:"M8 2l6 11H2L8 2zM8 7v3M8 11v.5",
  x:"M3 3l10 10M13 3L3 13",
  chevronRight:"M6 3l5 5-5 5",
  filter:"M2 3h12M4 8h8M6.5 13h3",
  download:"M8 2v8M5 7l3 3 3-3M3 13h10",
  upload:"M8 11V3M5 6l3-3 3 3M3 13h10",
  clock:"M8 4v4l3 2M14 8A6 6 0 112 8a6 6 0 0112 0z",
  compare:"M5 2v12M11 2v12M2 5h3M2 11h3M11 5h3M11 11h3",
};

function AdminSidebar({active}){
  const items=[
    ['overview','AI Test Overview',AdminI.grid,'Semlox Admin AI Overview.html'],
    ['runs','Evaluation Runs',AdminI.layers,'Semlox Admin Evaluation Runs.html'],
    ['field','Field Intelligence',AdminI.target,'Semlox Admin Field Intelligence.html'],
    ['corrections','Human Corrections',AdminI.edit,'Semlox Admin Human Corrections.html'],
    ['audit','Document Audit',AdminI.search,'Semlox Admin Document Audit.html'],
    ['performance','Performance & Failures',AdminI.gauge,'Semlox Admin Performance Failures.html'],
  ];
  return (
    <div className="sidebar">
      <div className="sb-logo"><div className="sb-mark">S</div><div><div className="sb-name">Semlo<em>X</em></div><div className="sb-tag">AI Test Console</div></div></div>
      <div className="sb-body">
        <div className="sb-sec">Testing & Evaluation</div>
        {items.map(([key,label,icon,href])=>(
          <a key={key} href={href} className={`nav-item ${active===key?'active':''}`}><span className="nav-icon"><AdminIc p={icon}/></span>{label}</a>
        ))}
      </div>
      <div className="sb-div"/>
      <div className="sb-health">
        <div className="sb-health-name"><div style={{width:7,height:7,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 6px #10b981'}}/>TEST RUN 004 ACTIVE</div>
        <div className="sb-health-row"><span>Documents</span><span className="ok">486</span></div>
        <div className="sb-health-row"><span>Model</span><span className="ok">v1.2</span></div>
      </div>
      <div className="sb-footer">
        <a href="#" className="sb-user"><div className="sb-av">SX</div><div><div className="sb-uname">SemloX Admin</div><div className="sb-urole">Platform · Internal</div></div><div style={{marginLeft:'auto',color:'#64748b',display:'flex'}}><AdminIc p={AdminI.more}/></div></a>
      </div>
    </div>
  );
}

function AdminTopbar({title,sub,theme,setTheme}){
  return (
    <div className="topbar">
      <div><div className="tb-title">{title}</div><div className="tb-sub">{sub}</div></div>
      <div className="tb-right">
        <span className="role-pill"><AdminIc p={AdminI.brain} size={11}/>PLATFORM ADMIN</span>
        <div className="theme-toggle">
          <button className={`tt-btn ${theme==='light'?'active':''}`} onClick={()=>setTheme('light')}><AdminIc p={AdminI.sun} size={12}/>Light</button>
          <button className={`tt-btn ${theme==='dark'?'active':''}`} onClick={()=>setTheme('dark')}><AdminIc p={AdminI.moon} size={12}/>Dark</button>
        </div>
        <div className="icon-btn"><AdminIc p={AdminI.bell} size={14}/><div className="notif-dot"/></div>
        <div className="av-sm">SX</div>
      </div>
    </div>
  );
}

function ConfidenceBadge({v}){
  const cls=v>=90?'badge-green':v>=75?'badge-amber':'badge-red';
  return <span className={`badge ${cls}`}>{v}%</span>;
}
function StatusBadge({status}){
  const map={
    'Issued':'badge-green','Validated':'badge-green','Success':'badge-green',
    'Review Required':'badge-amber','Draft':'badge-amber','Partially Reviewed':'badge-amber',
    'Failed':'badge-red','Cancelled':'badge-red',
    'Extracting':'badge-blue','Uploaded':'badge-blue',
  };
  return <span className={`badge ${map[status]||'badge-gray'}`}>{status}</span>;
}
function useAdminTheme(){
  const [theme,setTheme]=React.useState('dark');
  React.useEffect(()=>{document.documentElement.setAttribute('data-theme',theme)},[theme]);
  return [theme,setTheme];
}
Object.assign(window,{AdminIc,AdminI,AdminSidebar,AdminTopbar,ConfidenceBadge,StatusBadge,useAdminTheme});
