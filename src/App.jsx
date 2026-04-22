import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const FLOORS = ["Aussenbereich / Fassade","2. UG","1. UG","EG","1. OG","2. OG","3. OG","DG / Estrich"];
const DRINGLICHKEIT = ["–","I – Sofortmassnahmen","II – Sanierung empfohlen","III – Sanierung vormerken"];
const GEFAEHRDUNG = ["–","Keine unmittelbare Gefährdung","Instruierter Handwerker","SUVA anerkannter Sanierer"];
const SCHADSTOFFTYP = ["Asbest festgebunden","Asbest schwachgebunden","PCB","PAK","Schwermetall","Holzschutzmittel","Sonstiges"];
const BEURTEILUNG = ["kein Asbest entdeckt","Asbest nachgewiesen (Chrysotil)","Asbest nachgewiesen (Tremolit)","Asbest nachgewiesen (Aktinolith)","Diagnostikerentscheid","Schadstoffhaltig mangels Nachweis","PCB haltig mangels Nachweis"];
const ENTSORGUNG = ["–","Deponie Typ B / VeVA 17 06 98","Deponie Typ E / VeVA 17 06 05 S","KVA / VeVA 17 02 98 S","Stahlwerk","Sondermüll / VeVA 16 02 12 S","Elektroschrott"];
const POSITIVE_RESULTS = ["Asbest nachgewiesen (Chrysotil)","Asbest nachgewiesen (Tremolit)","Asbest nachgewiesen (Aktinolith)","Diagnostikerentscheid","Schadstoffhaltig mangels Nachweis","PCB haltig mangels Nachweis"];

/* ─── Utils ──────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).substr(2, 9);
const toDate = () => new Date().toLocaleDateString("de-CH");
const toBase64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(f); });
const isPos = (s) => POSITIVE_RESULTS.includes(s?.beurteilung);

const mkProject = (o = {}) => ({
  id: uid(), name: "", address: "", assekNr: "", parzelle: "",
  projektId: `B_${new Date().getFullYear().toString().slice(2)}_${String(new Date().getMonth()+1).padStart(2,"0")}_${Math.floor(1000+Math.random()*8999)}`,
  bauherrschaft: "", diagnostiker: "", type: "Abbruch", datum: toDate(),
  overviewPhoto: null, floorPlans: [], samples: [], nextTube: 1, ...o
});

const mkSample = (tubeNumber, o = {}) => ({
  id: uid(), tubeNumber, floor: "EG", keyword: "", photos: [],
  schadstofftyp: "Asbest festgebunden", beurteilung: "kein Asbest entdeckt",
  laborergebnis: "", sanierungsmassnahmen: "", gefaehrdungsstufe: "Instruierter Handwerker",
  dringlichkeit: "–", entsorgungsweg: "–", ausmass: "", notes: "", ...o
});

const mkFloorPlan = (o = {}) => ({ id: uid(), name: "", image: null, markers: [], ...o });

/* ─── Color Palette ──────────────────────────────────────────────────────────── */
const C = {
  p: "#1B6B5A", pd: "#134F42", pm: "#258870", pl: "#E3F2EE",
  bg: "#EDF2F0", w: "#FFFFFF", dk: "#19261F", tx: "#2A3D38",
  mu: "#6B8880", br: "#C4D8D2", br2: "#E2EDED",
  re: "#C0392B", rg: "#FDF0F0", rb: "#ff6b6b",
  wa: "#B07A00", wg: "#FEF7E0",
  gr: "#1A7A45", gg: "#E8F5EC",
};

/* ─── Shared UI ──────────────────────────────────────────────────────────────── */
const S = {
  page: { minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans', system-ui, sans-serif", color:C.tx },
  card: { background:C.w, borderRadius:12, border:`1px solid ${C.br}`, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" },
  label: { display:"block", fontSize:11, fontWeight:800, color:C.mu, textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:5 },
  input: { width:"100%", padding:"10px 13px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:15, color:C.tx, background:C.w, fontFamily:"inherit", boxSizing:"border-box", outline:"none" },
  select: { width:"100%", padding:"10px 13px", border:`1.5px solid ${C.br}`, borderRadius:8, fontSize:15, color:C.tx, background:C.w, fontFamily:"inherit", boxSizing:"border-box", outline:"none", cursor:"pointer" },
};

const FLabel = ({ children, required }) => <label style={S.label}>{children}{required && <span style={{color:C.re}}> *</span>}</label>;

const FInput = ({ label, value, onChange, placeholder="", type="text", required=false }) => (
  <div style={{marginBottom:14}}>
    {label && <FLabel required={required}>{label}</FLabel>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{...S.input, borderColor: required&&!value ? C.re+"80" : C.br}} />
  </div>
);

const FSelect = ({ label, value, onChange, options, required=false }) => (
  <div style={{marginBottom:14}}>
    {label && <FLabel required={required}>{label}</FLabel>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={S.select}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const FTextarea = ({ label, value, onChange, placeholder="", rows=3 }) => (
  <div style={{marginBottom:14}}>
    {label && <FLabel>{label}</FLabel>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{...S.input, resize:"vertical"}} />
  </div>
);

const Btn = ({ children, onClick, variant="primary", style={}, disabled=false, sm=false }) => {
  const v = {
    primary: {background:C.p, color:"#fff", border:"none"},
    secondary: {background:"transparent", color:C.p, border:`2px solid ${C.p}`},
    danger: {background:C.re, color:"#fff", border:"none"},
    ghost: {background:"transparent", color:C.mu, border:`1.5px solid ${C.br}`},
    white: {background:C.w, color:C.p, border:"none"},
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sm ? "7px 14px" : "11px 22px", borderRadius:9,
      fontFamily:"inherit", fontSize:sm?13:15, fontWeight:700, cursor:disabled?"not-allowed":"pointer",
      opacity:disabled?0.5:1, transition:"all .15s", display:"inline-flex", alignItems:"center", gap:7,
      ...v[variant], ...style,
    }}>{children}</button>
  );
};

const Badge = ({ children, type="neutral" }) => {
  const colors = {
    neutral: {bg:C.br2, tx:C.mu},
    danger: {bg:C.rg, tx:C.re},
    warning: {bg:C.wg, tx:C.wa},
    success: {bg:C.gg, tx:C.gr},
    primary: {bg:C.pl, tx:C.p},
  };
  const c = colors[type] || colors.neutral;
  return <span style={{background:c.bg, color:c.tx, fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.06em"}}>{children}</span>;
};

const TopBar = ({ title, subtitle, onBack, right }) => (
  <div style={{background:C.p, padding:"0 0 0", position:"sticky", top:0, zIndex:100}}>
    <div style={{padding:"14px 18px", display:"flex", alignItems:"center", gap:12}}>
      {onBack && (
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:34, height:34, borderRadius:8, cursor:"pointer", fontSize:18, display:"flex",alignItems:"center",justifyContent:"center", flexShrink:0}}>
          ‹
        </button>
      )}
      <div style={{flex:1, minWidth:0}}>
        <div style={{color:"#fff", fontWeight:800, fontSize:17, letterSpacing:"-0.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{title}</div>
        {subtitle && <div style={{color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:1}}>{subtitle}</div>}
      </div>
      {right}
    </div>
  </div>
);

const Divider = ({ label }) => (
  <div style={{display:"flex", alignItems:"center", gap:10, margin:"20px 0 12px"}}>
    {label && <span style={{fontSize:11, fontWeight:800, color:C.mu, textTransform:"uppercase", letterSpacing:"0.09em", whiteSpace:"nowrap"}}>{label}</span>}
    <div style={{flex:1, height:1, background:C.br}} />
  </div>
);

/* ─── Photo Capture Component ────────────────────────────────────────────────── */
function PhotoCapture({ photos, onChange }) {
  const fileRef = useRef();
  const handleFiles = async (files) => {
    const newPhotos = await Promise.all(Array.from(files).map(toBase64));
    onChange([...photos, ...newPhotos]);
  };
  return (
    <div>
      <FLabel>Fotos (min. 1) *</FLabel>
      <div style={{display:"flex", flexWrap:"wrap", gap:10, marginBottom:10}}>
        {photos.map((ph, i) => (
          <div key={i} style={{position:"relative"}}>
            <img src={ph} alt="" style={{width:80, height:80, objectFit:"cover", borderRadius:8, border:`1.5px solid ${C.br}`}} />
            <button onClick={() => onChange(photos.filter((_,j)=>j!==i))}
              style={{position:"absolute", top:-7, right:-7, background:C.re, color:"#fff", border:"none", borderRadius:"50%", width:20, height:20, cursor:"pointer", fontSize:12, display:"flex",alignItems:"center",justifyContent:"center", padding:0}}>
              ×
            </button>
          </div>
        ))}
        <button onClick={()=>fileRef.current.click()}
          style={{width:80, height:80, border:`2px dashed ${C.br}`, borderRadius:8, background:C.bg, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3}}>
          <span style={{fontSize:22, color:C.p}}>📷</span>
          <span style={{fontSize:10, color:C.mu, fontWeight:700}}>Foto</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}}
        onChange={e => { if(e.target.files?.length) handleFiles(e.target.files); e.target.value=""; }} />
      <input type="file" accept="image/*" multiple style={{fontSize:12, color:C.mu}}
        onChange={e => { if(e.target.files?.length) handleFiles(e.target.files); e.target.value=""; }} />
      <div style={{fontSize:11, color:C.mu, marginTop:4}}>Kamera oder Datei auswählen</div>
    </div>
  );
}

/* ─── Floor Plan Annotation ──────────────────────────────────────────────────── */
function FloorPlanAnnotation({ floorPlan, samples, onUpdate }) {
  const [addMode, setAddMode] = useState(false);
  const [pendingTube, setPendingTube] = useState("");
  const containerRef = useRef();

  const handleClick = (e) => {
    if (!addMode) return;
    const tubeNr = parseInt(pendingTube);
    if (!tubeNr) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const sample = samples.find(s => s.tubeNumber === tubeNr);
    const marker = { id: uid(), x, y, tubeNumber: tubeNr, keyword: sample?.keyword || "" };
    onUpdate({ markers: [...(floorPlan.markers || []), marker] });
    setPendingTube("");
    setAddMode(false);
  };

  const removeMarker = (markerId) => {
    onUpdate({ markers: (floorPlan.markers||[]).filter(m => m.id !== markerId) });
  };

  const sample4marker = (m) => samples.find(s => s.tubeNumber === m.tubeNumber);

  return (
    <div>
      {/* Controls */}
      <div style={{display:"flex", gap:10, alignItems:"center", marginBottom:14, flexWrap:"wrap"}}>
        {addMode ? (
          <>
            <select value={pendingTube} onChange={e=>setPendingTube(e.target.value)}
              style={{...S.select, width:"auto", minWidth:160}}>
              <option value="">Probe auswählen…</option>
              {samples.map(s => <option key={s.id} value={s.tubeNumber}>Probe {s.tubeNumber} – {s.keyword||s.floor}</option>)}
            </select>
            <Btn variant="ghost" sm onClick={() => { setAddMode(false); setPendingTube(""); }}>Abbrechen</Btn>
            {pendingTube && <span style={{fontSize:12, color:C.p, fontWeight:700}}>👆 Auf Plan klicken</span>}
          </>
        ) : (
          <Btn sm onClick={() => setAddMode(true)} variant="secondary">+ Probe markieren</Btn>
        )}
      </div>

      {/* Plan */}
      {floorPlan.image ? (
        <div ref={containerRef} onClick={handleClick}
          style={{position:"relative", display:"inline-block", maxWidth:"100%", cursor:addMode&&pendingTube?"crosshair":"default", userSelect:"none"}}>
          <img src={floorPlan.image} alt={floorPlan.name} style={{display:"block", maxWidth:"100%", borderRadius:8, border:`1.5px solid ${C.br}`}} />
          {(floorPlan.markers||[]).map(m => {
            const s = sample4marker(m);
            const pos = isPos(s);
            return (
              <div key={m.id} title={`Probe ${m.tubeNumber}: ${m.keyword}`}
                onClick={e=>{ e.stopPropagation(); if(window.confirm(`Marker Probe ${m.tubeNumber} entfernen?`)) removeMarker(m.id); }}
                style={{
                  position:"absolute", left:`${m.x}%`, top:`${m.y}%`,
                  transform:"translate(-50%,-50%)", width:28, height:28,
                  borderRadius:"50%", background:pos?C.re:C.gr,
                  color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:900, border:"2.5px solid #fff",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.4)", cursor:"pointer", zIndex:10,
                  transition:"transform .15s",
                }}>
                {m.tubeNumber}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{padding:"30px", textAlign:"center", background:C.br2, borderRadius:8, color:C.mu}}>Kein Plan hochgeladen</div>
      )}

      {/* Marker list */}
      {(floorPlan.markers||[]).length > 0 && (
        <div style={{marginTop:14}}>
          <div style={{fontSize:12, fontWeight:700, color:C.mu, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8}}>Markierte Proben</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
            {(floorPlan.markers||[]).map(m => {
              const s = sample4marker(m);
              return (
                <div key={m.id} style={{
                  background:isPos(s)?C.rg:C.gg, border:`1px solid ${isPos(s)?C.re+"40":C.gr+"40"}`,
                  borderRadius:20, padding:"4px 12px", fontSize:12, color:isPos(s)?C.re:C.gr, fontWeight:700,
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  <span style={{background:isPos(s)?C.re:C.gr, color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex",alignItems:"center",justifyContent:"center", fontSize:10}}>{m.tubeNumber}</span>
                  {m.keyword || s?.keyword || s?.floor || "–"}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Report Tab ─────────────────────────────────────────────────────────────── */
function ReportView({ project }) {
  const positives = project.samples.filter(isPos);
  const negatives = project.samples.filter(s => !isPos(s));

  const SampleCard = ({ sample }) => {
    const pos = isPos(sample);
    return (
      <div style={{
        background:C.w, border:`2px solid ${pos?C.re+"40":C.br}`,
        borderRadius:10, overflow:"hidden", breakInside:"avoid", marginBottom:16,
        pageBreakInside:"avoid",
      }}>
        <div style={{display:"flex", gap:0}}>
          {/* Photo */}
          <div style={{width:140, flexShrink:0, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", minHeight:120}}>
            {sample.photos[0]
              ? <img src={sample.photos[0]} alt="" style={{width:140, height:140, objectFit:"cover"}} />
              : <div style={{color:C.br, fontSize:32}}>📷</div>}
          </div>
          {/* Info */}
          <div style={{flex:1, padding:"10px 14px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
              <div>
                <div style={{fontSize:16, fontWeight:900, color:C.dk}}>Probe Nr. {sample.tubeNumber}</div>
                <div style={{fontSize:12, color:C.mu}}>{sample.keyword}</div>
              </div>
              <div style={{
                width:28, height:28, borderRadius:"50%",
                background:pos?"#fee":"#f0fff8", border:`2px solid ${pos?C.re:C.gr}`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
              }}>
                {pos?"⚠":"✓"}
              </div>
            </div>
            <table style={{width:"100%", fontSize:12, borderCollapse:"collapse"}}>
              <tbody>
                {[
                  ["Standort / Raum", sample.floor],
                  ["Bauteil / Material", sample.keyword],
                  ["Schadstofftyp", sample.schadstofftyp],
                  ["Beurteilung", sample.beurteilung],
                  sample.dringlichkeit!=="–" && ["Dringlichkeit", sample.dringlichkeit],
                  sample.gefaehrdungsstufe!=="–" && ["Gefährdungsstufe", sample.gefaehrdungsstufe],
                  sample.entsorgungsweg!=="–" && ["Entsorgungsweg", sample.entsorgungsweg],
                  sample.ausmass && ["Ausmass", sample.ausmass],
                  sample.laborergebnis && ["Laborergebnis", sample.laborergebnis],
                ].filter(Boolean).map(([k,v]) => (
                  <tr key={k} style={{borderBottom:`1px solid ${C.br2}`}}>
                    <td style={{padding:"4px 0", color:C.mu, fontWeight:600, whiteSpace:"nowrap", paddingRight:10, width:"45%"}}>{k}</td>
                    <td style={{padding:"4px 0", color: k==="Beurteilung"&&pos?C.re:k==="Beurteilung"?C.gr:C.tx, fontWeight:k==="Beurteilung"?800:400}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sample.notes && <div style={{fontSize:11, color:C.mu, marginTop:8, fontStyle:"italic"}}>{sample.notes}</div>}
          </div>
        </div>
        {/* Additional photos */}
        {sample.photos.length > 1 && (
          <div style={{display:"flex", gap:6, padding:"8px 14px", borderTop:`1px solid ${C.br2}`, flexWrap:"wrap"}}>
            {sample.photos.slice(1).map((ph,i) => (
              <img key={i} src={ph} alt="" style={{width:60, height:60, objectFit:"cover", borderRadius:6}} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{padding:16}}>
      {/* Print button */}
      <div style={{marginBottom:20, display:"flex", gap:10}}>
        <Btn onClick={() => window.print()} variant="primary">🖨️ Bericht drucken</Btn>
      </div>

      <div id="report-content">
        {/* Cover */}
        <div style={{
          background:`linear-gradient(135deg, ${C.p} 0%, ${C.pd} 100%)`,
          borderRadius:14, padding:"32px 28px", marginBottom:24, color:"#fff",
        }}>
          <div style={{fontSize:11, opacity:0.7, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700, marginBottom:8}}>
            Bau Schadstoff AG
          </div>
          <div style={{fontSize:22, fontWeight:900, letterSpacing:"-0.02em", marginBottom:4}}>
            Schadstoffkurzbericht
          </div>
          <div style={{fontSize:15, opacity:0.85, marginBottom:24}}>
            vor {project.type === "Abbruch" ? "Abbrucharbeiten" : "Umbauarbeiten"}
          </div>
          {project.overviewPhoto && (
            <img src={project.overviewPhoto} alt="Übersicht" style={{width:"100%", maxHeight:240, objectFit:"cover", borderRadius:10, marginBottom:20, border:"3px solid rgba(255,255,255,0.2)"}} />
          )}
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <tbody>
              {[
                ["Objektbeschrieb", project.name],
                ["Adresse", project.address],
                project.assekNr && ["Assek. Nr.", project.assekNr],
                project.parzelle && ["Parzelle", project.parzelle],
                ["Projektidentifikation", project.projektId],
                ["Art des Eingriffs", project.type],
                project.bauherrschaft && ["Bauherrschaft", project.bauherrschaft],
                project.diagnostiker && ["Diagnostiker", project.diagnostiker],
                ["Datum", project.datum],
              ].filter(Boolean).map(([k,v]) => v&&(
                <tr key={k}>
                  <td style={{padding:"5px 0", fontSize:13, opacity:0.8, width:"45%", verticalAlign:"top"}}>{k}</td>
                  <td style={{padding:"5px 0", fontSize:13, fontWeight:700, verticalAlign:"top"}}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{...S.card, padding:16, marginBottom:24}}>
          <div style={{fontWeight:800, fontSize:15, color:C.dk, marginBottom:12}}>Zusammenfassung</div>
          <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
            <div style={{flex:1, minWidth:100, background:C.bg, borderRadius:10, padding:"12px 16px", textAlign:"center"}}>
              <div style={{fontSize:28, fontWeight:900, color:C.p}}>{project.samples.length}</div>
              <div style={{fontSize:12, color:C.mu, fontWeight:600}}>Proben total</div>
            </div>
            <div style={{flex:1, minWidth:100, background:C.rg, borderRadius:10, padding:"12px 16px", textAlign:"center"}}>
              <div style={{fontSize:28, fontWeight:900, color:C.re}}>{positives.length}</div>
              <div style={{fontSize:12, color:C.re, fontWeight:600}}>Belastet</div>
            </div>
            <div style={{flex:1, minWidth:100, background:C.gg, borderRadius:10, padding:"12px 16px", textAlign:"center"}}>
              <div style={{fontSize:28, fontWeight:900, color:C.gr}}>{negatives.length}</div>
              <div style={{fontSize:12, color:C.gr, fontWeight:600}}>Schadstoffrei</div>
            </div>
          </div>
        </div>

        {/* Positive results */}
        {positives.length > 0 && (
          <div style={{marginBottom:24}}>
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
              <div style={{height:3, width:20, background:C.re, borderRadius:2}} />
              <div style={{fontWeight:900, fontSize:16, color:C.re}}>Schadstoffhaltige Materialien</div>
              <div style={{flex:1, height:1, background:C.br}} />
            </div>
            {positives.map(s => <SampleCard key={s.id} sample={s} />)}
          </div>
        )}

        {/* Negative results */}
        {negatives.length > 0 && (
          <div style={{marginBottom:24}}>
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
              <div style={{height:3, width:20, background:C.gr, borderRadius:2}} />
              <div style={{fontWeight:900, fontSize:16, color:C.gr}}>Schadstofffreie Materialien</div>
              <div style={{flex:1, height:1, background:C.br}} />
            </div>
            {negatives.map(s => <SampleCard key={s.id} sample={s} />)}
          </div>
        )}

        {/* Floor plans */}
        {project.floorPlans.filter(f=>f.image).map(fp => (
          <div key={fp.id} style={{...S.card, padding:16, marginBottom:16}}>
            <div style={{fontWeight:800, fontSize:14, color:C.dk, marginBottom:10}}>Grundriss: {fp.name||"Unbenannt"}</div>
            <div style={{position:"relative", display:"inline-block", maxWidth:"100%"}}>
              <img src={fp.image} alt={fp.name} style={{maxWidth:"100%", borderRadius:8, display:"block"}} />
              {(fp.markers||[]).map(m => {
                const s = project.samples.find(s=>s.tubeNumber===m.tubeNumber);
                return (
                  <div key={m.id} style={{
                    position:"absolute", left:`${m.x}%`, top:`${m.y}%`,
                    transform:"translate(-50%,-50%)", width:24, height:24,
                    borderRadius:"50%", background:isPos(s)?C.re:C.gr, color:"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:900, border:"2px solid #fff",
                    boxShadow:"0 2px 6px rgba(0,0,0,0.35)",
                  }}>{m.tubeNumber}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Sample Screen ───────────────────────────────────────────────────────────── */
function SampleScreen({ sample, project, onBack, onUpdate, onDelete }) {
  const [s, setS] = useState({...sample});
  const changed = JSON.stringify(s) !== JSON.stringify(sample);

  const upd = (k, v) => setS(prev => ({...prev, [k]:v}));

  const save = () => { onUpdate(s); onBack(); };

  const pos = isPos(s);

  return (
    <div style={S.page}>
      <TopBar
        title={`Probe Nr. ${s.tubeNumber}`}
        subtitle={s.keyword || "Neue Probe"}
        onBack={onBack}
        right={
          <Btn variant="white" sm onClick={save} disabled={!changed}>
            Speichern
          </Btn>
        }
      />
      <div style={{padding:16, maxWidth:640, margin:"0 auto"}}>
        {/* Tube indicator */}
        <div style={{
          background:`linear-gradient(135deg, ${C.p}, ${C.pm})`,
          borderRadius:12, padding:"14px 18px", marginBottom:20, color:"#fff",
          display:"flex", alignItems:"center", gap:14,
        }}>
          <div style={{
            width:44, height:44, borderRadius:"50%", background:"rgba(255,255,255,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, flexShrink:0,
          }}>{s.tubeNumber}</div>
          <div>
            <div style={{fontSize:13, opacity:0.8}}>Reagenzglas Nr.</div>
            <div style={{fontSize:20, fontWeight:900}}>{s.tubeNumber}</div>
          </div>
          <div style={{marginLeft:"auto"}}>
            {pos
              ? <Badge type="danger">Belastet</Badge>
              : <Badge type="success">Negativ</Badge>}
          </div>
        </div>

        {/* Basic info */}
        <div style={{...S.card, padding:16, marginBottom:16}}>
          <Divider label="Grunddaten" />
          <FInput label="Stichwort / Bauteil *" value={s.keyword} onChange={v=>upd("keyword",v)} placeholder="z.B. Decke EG, Wandfliesenkleber" required />
          <FSelect label="Stockwerk *" value={s.floor} onChange={v=>upd("floor",v)} options={FLOORS} required />
        </div>

        {/* Photos */}
        <div style={{...S.card, padding:16, marginBottom:16}}>
          <Divider label="Fotos" />
          <PhotoCapture photos={s.photos} onChange={v=>upd("photos",v)} />
        </div>

        {/* Technical data */}
        <div style={{...S.card, padding:16, marginBottom:16}}>
          <Divider label="Schadstoffbeurteilung" />
          <FSelect label="Schadstofftyp" value={s.schadstofftyp} onChange={v=>upd("schadstofftyp",v)} options={SCHADSTOFFTYP} />
          <FSelect label="Beurteilung / Laborergebnis" value={s.beurteilung} onChange={v=>upd("beurteilung",v)} options={BEURTEILUNG} />

          {pos && (
            <div style={{background:C.rg, border:`1px solid ${C.re}30`, borderRadius:8, padding:"10px 14px", marginBottom:14}}>
              <div style={{fontSize:12, fontWeight:800, color:C.re, marginBottom:6}}>⚠ Schadstoff nachgewiesen</div>
              <FSelect label="Sanierungsdringlichkeit" value={s.dringlichkeit} onChange={v=>upd("dringlichkeit",v)} options={DRINGLICHKEIT} />
              <FSelect label="Gefährdungsstufe" value={s.gefaehrdungsstufe} onChange={v=>upd("gefaehrdungsstufe",v)} options={GEFAEHRDUNG} />
              <FSelect label="Entsorgungsweg" value={s.entsorgungsweg} onChange={v=>upd("entsorgungsweg",v)} options={ENTSORGUNG} />
            </div>
          )}

          <FInput label="Ausmass / Menge" value={s.ausmass} onChange={v=>upd("ausmass",v)} placeholder="z.B. ca. 12 m², 3 Stück" />
          <FInput label="Sanierungsmassnahmen (Factsheet)" value={s.sanierungsmassnahmen} onChange={v=>upd("sanierungsmassnahmen",v)} placeholder="z.B. Factsheet 33031, EKAS 6503 Ziff. 7" />
          <FTextarea label="Laborergebnis / Zusätzliche Angaben" value={s.laborergebnis} onChange={v=>upd("laborergebnis",v)} placeholder="Optionale Angaben zum Labor oder Analyseergebnis" />
        </div>

        {/* Notes */}
        <div style={{...S.card, padding:16, marginBottom:16}}>
          <Divider label="Notizen" />
          <FTextarea label="Bemerkungen" value={s.notes} onChange={v=>upd("notes",v)} placeholder="Weitere Bemerkungen zur Probe…" rows={4} />
        </div>

        {/* Actions */}
        <div style={{display:"flex", gap:12, marginBottom:32}}>
          <Btn onClick={save} disabled={!changed} style={{flex:2, justifyContent:"center"}}>
            ✓ Speichern
          </Btn>
          <Btn variant="danger" sm onClick={() => { if(window.confirm("Probe löschen?")) { onDelete(); } }} style={{flex:1, justifyContent:"center"}}>
            Löschen
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ─── Floor Plan Screen ───────────────────────────────────────────────────────── */
function FloorPlanScreen({ floorPlan, project, onBack, onUpdate }) {
  const [fp, setFp] = useState({...floorPlan, markers: floorPlan.markers||[]});
  const fileRef = useRef();

  const upd = (k, v) => {
    const next = typeof k === "object" ? {...fp,...k} : {...fp,[k]:v};
    setFp(next);
    onUpdate(next);
  };

  const handleImage = async (files) => {
    const b64 = await toBase64(files[0]);
    upd("image", b64);
  };

  return (
    <div style={S.page}>
      <TopBar title={fp.name || "Grundriss"} subtitle={project.name} onBack={onBack} />
      <div style={{padding:16, maxWidth:700, margin:"0 auto"}}>
        {/* Name */}
        <div style={{...S.card, padding:16, marginBottom:16}}>
          <FInput label="Bezeichnung des Grundrisses" value={fp.name} onChange={v=>upd("name",v)} placeholder="z.B. Erdgeschoss, 1. OG" />
          <div>
            <FLabel>Plan hochladen</FLabel>
            <div style={{display:"flex", gap:10, alignItems:"center"}}>
              <Btn variant="secondary" sm onClick={()=>fileRef.current.click()}>
                📁 Datei wählen
              </Btn>
              <button onClick={()=>fileRef.current.click()}
                style={{background:C.p+"15", border:`1.5px dashed ${C.p}`, color:C.p, padding:"8px 14px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700}}>
                📷 Kamera
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{if(e.target.files[0]) handleImage(e.target.files); e.target.value="";}} />
          </div>
        </div>

        {/* Annotation */}
        <div style={{...S.card, padding:16}}>
          <div style={{fontWeight:800, fontSize:14, color:C.dk, marginBottom:14}}>Proben-Markierungen</div>
          <FloorPlanAnnotation
            floorPlan={fp}
            samples={project.samples}
            onUpdate={(updates) => { const next={...fp,...updates}; setFp(next); onUpdate(next); }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── AI Lab Result Mapper ───────────────────────────────────────────────────── */
function mapBeurteilung(aiResult) {
  if (!aiResult.positive) return "kein Asbest entdeckt";
  const t = (aiResult.asbestType || "").toLowerCase();
  if (t.includes("chrysotil")) return "Asbest nachgewiesen (Chrysotil)";
  if (t.includes("tremolit")) return "Asbest nachgewiesen (Tremolit)";
  if (t.includes("aktinolith") || t.includes("actinolith")) return "Asbest nachgewiesen (Aktinolith)";
  const s = (aiResult.schadstoffTyp || "").toLowerCase();
  if (s.includes("pcb")) return "PCB haltig mangels Nachweis";
  if (s.includes("pak") || s.includes("pah")) return "Schadstoffhaltig mangels Nachweis";
  return "Diagnostikerentscheid";
}

function mapGefaehrdung(aiResult) {
  if (!aiResult.positive) return "Keine unmittelbare Gefährdung";
  const t = (aiResult.asbestType || "").toLowerCase();
  if (t.includes("chrysotil")) return "Instruierter Handwerker";
  return "SUVA anerkannter Sanierer";
}

function mapEntsorgung(aiResult) {
  if (!aiResult.positive) return "–";
  const t = (aiResult.schadstoffTyp || aiResult.asbestType || "").toLowerCase();
  if (t.includes("schwach") || t.includes("lose")) return "Deponie Typ E / VeVA 17 06 05 S";
  return "Deponie Typ B / VeVA 17 06 98";
}

/* ─── Labor Analyse Tab ──────────────────────────────────────────────────────── */
function LaborAnalyseTab({ project, onUpdateSample }) {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(new Set());
  const [applyAll_done, setApplyAllDone] = useState(false);
  const fileRef = useRef();

  const handleFile = async (f) => {
    setFile(f);
    setResults(null);
    setError(null);
    setApplied(new Set());
    setApplyAllDone(false);
    const b64full = await toBase64(f);
    const b64 = b64full.split(",")[1];
    setFileData(b64);
    const isPdf = f.type === "application/pdf";
    setFileType(isPdf ? "pdf" : "image");
    setPreview(isPdf ? null : b64full);
  };

  const analyze = async () => {
    if (!fileData) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const contentItem = fileType === "pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileData } }
        : { type: "image", source: { type: "base64", media_type: file.type, data: fileData } };

      const systemPrompt = `Du bist ein Experte für Bauschadstoff-Analyseberichte (Schweizer Norm). Analysiere Laborberichte präzise.`;

      const userPrompt = `Extrahiere ALLE Probenresultate aus diesem Laborbericht. Berücksichtige Asbest-, PAK-, PCB- und andere Schadstoffanalysen.

Folgende Proben existieren im Projekt (zur Orientierung):
${project.samples.map(s => `Probe ${s.tubeNumber}: ${s.floor} – ${s.keyword||"?"}`).join("\n")}

Gib NUR ein valides JSON-Array zurück (keine Markdown-Backticks, keine Erklärungen, nur JSON).
Jedes Element:
{
  "tubeNumber": <Zahl>,
  "location": "<Standort aus Bericht>",
  "material": "<Material aus Bericht>",
  "positive": <true/false>,
  "result": "<exakter Ergebnistext>",
  "asbestType": "<Chrysotil|Tremolit|Aktinolith|null>",
  "schadstoffTyp": "<Asbest|PAK|PCB|Sonstiges>",
  "dringlichkeit": "<I|II|III|null>",
  "rawText": "<Originalzeile aus Bericht>"
}

Probenummer-Formate im Bericht: "3 / Fassade // Schindeln West", "Probe 8", "8 / EG // Eingang", etc.`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: [contentItem, { type: "text", text: userPrompt }] }]
        })
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(Array.isArray(parsed) ? parsed : []);
    } catch(e) {
      setError(`KI-Fehler: ${e.message}. Bitte erneut versuchen.`);
    }
    setLoading(false);
  };

  const applySingle = (r) => {
    const sample = project.samples.find(s => s.tubeNumber === r.tubeNumber);
    if (!sample) return;
    const beurteilung = mapBeurteilung(r);
    const updates = {
      beurteilung,
      laborergebnis: r.rawText || r.result || "",
      gefaehrdungsstufe: mapGefaehrdung(r),
      entsorgungsweg: mapEntsorgung(r),
    };
    if (r.dringlichkeit && ["I","II","III"].includes(r.dringlichkeit)) {
      const map = {"I":"I – Sofortmassnahmen","II":"II – Sanierung empfohlen","III":"III – Sanierung vormerken"};
      updates.dringlichkeit = map[r.dringlichkeit] || "–";
    }
    onUpdateSample(sample.id, updates);
    setApplied(prev => new Set([...prev, r.tubeNumber]));
  };

  const applyAllResults = () => {
    if (!results) return;
    results.forEach(r => {
      const sample = project.samples.find(s => s.tubeNumber === r.tubeNumber);
      if (sample) applySingle(r);
    });
    setApplyAllDone(true);
  };

  const matched = results ? results.filter(r => project.samples.some(s => s.tubeNumber === r.tubeNumber)) : [];
  const unmatched = results ? results.filter(r => !project.samples.some(s => s.tubeNumber === r.tubeNumber)) : [];

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      {/* Header card */}
      <div style={{
        background: `linear-gradient(135deg, #1A2F6A 0%, #0D1F52 100%)`,
        borderRadius: 14, padding: "20px 20px", marginBottom: 20, color: "#fff",
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
          KI-gestützte Auswertung
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Labor-Analyse Upload</div>
        <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
          Laden Sie den Laborbericht (PDF oder Foto) hoch. Die KI erkennt alle Probenresultate automatisch und ordnet sie den korrekten Proben zu.
        </div>
      </div>

      {/* Upload area */}
      <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
        <FLabel>Laborbericht hochladen (PDF oder Foto)</FLabel>
        <div
          onClick={() => fileRef.current.click()}
          style={{
            border: `2.5px dashed ${file ? C.p : C.br}`,
            borderRadius: 12, padding: "28px 20px", textAlign: "center",
            cursor: "pointer", background: file ? C.pl : C.bg,
            transition: "all .2s",
          }}
        >
          {file ? (
            <div>
              {preview && <img src={preview} alt="" style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 8, marginBottom: 10, objectFit: "contain" }} />}
              {!preview && <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>}
              <div style={{ fontWeight: 800, color: C.p, fontSize: 15 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: C.mu, marginTop: 4 }}>
                {(file.size / 1024).toFixed(0)} KB • {fileType === "pdf" ? "PDF-Dokument" : "Bild"}
              </div>
              <div style={{ fontSize: 12, color: C.p, marginTop: 8, fontWeight: 700 }}>Klicken zum Ersetzen</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🔬</div>
              <div style={{ fontWeight: 800, color: C.tx, fontSize: 15, marginBottom: 4 }}>Laborbericht hochladen</div>
              <div style={{ fontSize: 13, color: C.mu }}>PDF oder Foto des Analyseberichts • Klicken oder Datei ablegen</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />

        {file && (
          <Btn
            onClick={analyze}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: 14, padding: "13px 0", fontSize: 16,
              background: loading ? C.mu : "linear-gradient(135deg, #1A2F6A, #2A4AA8)" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                KI analysiert Laborbericht…
              </span>
            ) : "🤖 Mit KI analysieren"}
          </Btn>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: C.rg, border: `1px solid ${C.re}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: C.re, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { v: results.length, l: "Erkannte Proben", bg: "#EEF2FF", c: "#1A2F6A" },
              { v: matched.length, l: "Zugeordnet", bg: C.gg, c: C.gr },
              { v: results.filter(r=>r.positive).length, l: "Positiv (belastet)", bg: C.rg, c: C.re },
            ].map(d => (
              <div key={d.l} style={{ background: d.bg, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: d.c }}>{d.v}</div>
                <div style={{ fontSize: 11, color: d.c, fontWeight: 600, opacity: 0.8 }}>{d.l}</div>
              </div>
            ))}
          </div>

          {/* Apply all button */}
          {matched.length > 0 && !applyAll_done && (
            <div style={{ ...S.card, padding: 16, marginBottom: 16, background: "#EEF2FF", border: "1.5px solid #A5B4FC" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1A2F6A" }}>Alle Ergebnisse übernehmen</div>
                  <div style={{ fontSize: 12, color: "#4B5EA8", marginTop: 2 }}>
                    {matched.length} Proben werden automatisch aktualisiert (Beurteilung, Gefährdung, Entsorgungsweg)
                  </div>
                </div>
                <Btn onClick={applyAllResults}
                  style={{ background: "#1A2F6A", color: "#fff", border: "none", whiteSpace: "nowrap" }}>
                  ✓ Alle {matched.length} übernehmen
                </Btn>
              </div>
            </div>
          )}
          {applyAll_done && (
            <div style={{ background: C.gg, border: `1px solid ${C.gr}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: C.gr, fontWeight: 700, fontSize: 14 }}>
              ✅ Alle Ergebnisse wurden erfolgreich auf die Proben übertragen!
            </div>
          )}

          {/* Matched results */}
          {matched.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <Divider label={`Zugeordnete Proben (${matched.length})`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {matched.map(r => {
                  const sample = project.samples.find(s => s.tubeNumber === r.tubeNumber);
                  const done = applied.has(r.tubeNumber) || applyAll_done;
                  return (
                    <div key={r.tubeNumber} style={{
                      ...S.card, padding: 14,
                      borderLeft: `4px solid ${r.positive ? C.re : C.gr}`,
                      opacity: done ? 0.75 : 1,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        {/* Tube number */}
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          background: r.positive ? C.rg : C.gg,
                          border: `2.5px solid ${r.positive ? C.re : C.gr}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 15, fontWeight: 900, color: r.positive ? C.re : C.gr,
                        }}>{r.tubeNumber}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Sample name */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: C.dk }}>
                              {sample?.keyword || sample?.floor || `Probe ${r.tubeNumber}`}
                            </span>
                            <Badge type={r.positive ? "danger" : "success"}>
                              {r.positive ? "Belastet" : "Negativ"}
                            </Badge>
                            {done && <Badge type="primary">✓ Übernommen</Badge>}
                          </div>
                          {/* Lab result */}
                          <div style={{ fontSize: 13, color: r.positive ? C.re : C.gr, fontWeight: 700, marginBottom: 4 }}>
                            {r.result}
                          </div>
                          <div style={{ fontSize: 12, color: C.mu }}>
                            {r.location} {r.material && `• ${r.material}`}
                          </div>
                          {/* New beurteilung preview */}
                          <div style={{ marginTop: 8, background: C.bg, borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                            <span style={{ color: C.mu, fontWeight: 600 }}>Neue Beurteilung: </span>
                            <span style={{ color: C.tx, fontWeight: 700 }}>{mapBeurteilung(r)}</span>
                          </div>
                        </div>

                        {/* Action */}
                        {!done && (
                          <Btn sm variant="secondary" onClick={() => applySingle(r)}
                            style={{ flexShrink: 0 }}>
                            Übernehmen
                          </Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unmatched */}
          {unmatched.length > 0 && (
            <div>
              <Divider label={`Nicht zugeordnet (${unmatched.length})`} />
              <div style={{ ...S.card, padding: 14 }}>
                <div style={{ fontSize: 12, color: C.mu, marginBottom: 10 }}>
                  Diese Proben aus dem Laborbericht wurden keiner Probe im Projekt zugeordnet (Probennummer fehlt im Projekt):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unmatched.map(r => (
                    <div key={r.tubeNumber} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.bg, borderRadius: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.br2, border: `1.5px solid ${C.br}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.mu }}>{r.tubeNumber}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.tx }}>{r.location} – {r.material}</div>
                        <div style={{ fontSize: 12, color: r.positive ? C.re : C.gr }}>{r.result}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Project Screen ─────────────────────────────────────────────────────────── */
function ProjectScreen({ project, activeTab, setActiveTab, onBack, onUpdateProject, onAddSample, onEditSample, onDeleteSample, onEditFloorPlan, onUpdateSampleDirect }) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({...project});
  const ovRef = useRef();

  const tabs = [
    { id:"overview", label:"Übersicht" },
    { id:"samples", label:`Proben (${project.samples.length})` },
    { id:"floorplans", label:`Pläne (${project.floorPlans.length})` },
    { id:"labor", label:"🤖 Labor-KI" },
    { id:"report", label:"Bericht" },
  ];

  const handleOvPhoto = async (files) => {
    const b64 = await toBase64(files[0]);
    onUpdateProject({ overviewPhoto: b64 });
  };

  const addFloorPlan = () => {
    const fp = mkFloorPlan({ name:"Grundriss" });
    onUpdateProject({ floorPlans: [...project.floorPlans, fp] });
    onEditFloorPlan(fp.id);
  };

  const deleteFloorPlan = (fpId) => {
    onUpdateProject({ floorPlans: project.floorPlans.filter(f=>f.id!==fpId) });
  };

  const saveEdit = () => {
    onUpdateProject(editData);
    setEditMode(false);
  };

  const positiveCount = project.samples.filter(isPos).length;

  return (
    <div style={S.page}>
      <TopBar
        title={project.name || "Projekt"}
        subtitle={`${project.type} • ${project.datum}`}
        onBack={onBack}
        right={
          <button onClick={() => { setEditData({...project}); setEditMode(v=>!v); }}
            style={{background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit"}}>
            {editMode ? "✕" : "✏️"}
          </button>
        }
      />

      {/* Tab bar */}
      <div style={{background:C.pd, display:"flex", overflowX:"auto"}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding:"10px 16px", border:"none", cursor:"pointer", fontFamily:"inherit",
            fontWeight:700, fontSize:13, whiteSpace:"nowrap", flexShrink:0,
            background: activeTab===t.id ? "rgba(255,255,255,0.15)" : "transparent",
            color: activeTab===t.id ? "#fff" : "rgba(255,255,255,0.6)",
            borderBottom: activeTab===t.id ? "3px solid #fff" : "3px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{maxWidth:700, margin:"0 auto"}}>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div style={{padding:16}}>
            {editMode ? (
              <div style={{...S.card, padding:16, marginBottom:16}}>
                <Divider label="Projektdaten bearbeiten" />
                <div style={{display:"flex", gap:10, marginBottom:16}}>
                  {["Abbruch","Sanierung"].map(t => (
                    <button key={t} onClick={()=>setEditData(p=>({...p,type:t}))} style={{
                      flex:1, padding:"10px 0", border:"2px solid",
                      borderColor:editData.type===t?C.p:C.br, borderRadius:8,
                      background:editData.type===t?C.pl:C.w, color:editData.type===t?C.p:C.mu,
                      fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"inherit",
                    }}>{t}</button>
                  ))}
                </div>
                <FInput label="Objektname" value={editData.name} onChange={v=>setEditData(p=>({...p,name:v}))} />
                <FInput label="Adresse" value={editData.address} onChange={v=>setEditData(p=>({...p,address:v}))} />
                <FInput label="Assek. Nr." value={editData.assekNr} onChange={v=>setEditData(p=>({...p,assekNr:v}))} />
                <FInput label="Parzelle" value={editData.parzelle} onChange={v=>setEditData(p=>({...p,parzelle:v}))} />
                <FInput label="Projekt-ID" value={editData.projektId} onChange={v=>setEditData(p=>({...p,projektId:v}))} />
                <FInput label="Bauherrschaft" value={editData.bauherrschaft} onChange={v=>setEditData(p=>({...p,bauherrschaft:v}))} />
                <FInput label="Diagnostiker" value={editData.diagnostiker} onChange={v=>setEditData(p=>({...p,diagnostiker:v}))} />
                <FInput label="Datum" type="date" value={editData.datum} onChange={v=>setEditData(p=>({...p,datum:v}))} />
                <Btn onClick={saveEdit} style={{width:"100%",justifyContent:"center",marginTop:6}}>Speichern</Btn>
              </div>
            ) : (
              <>
                {/* Overview photo */}
                <div style={{...S.card, padding:16, marginBottom:16}}>
                  <div style={{fontWeight:800, fontSize:14, color:C.dk, marginBottom:12}}>Übersichtsfoto</div>
                  {project.overviewPhoto ? (
                    <div style={{position:"relative"}}>
                      <img src={project.overviewPhoto} alt="Übersicht" style={{width:"100%", maxHeight:280, objectFit:"cover", borderRadius:8, display:"block"}} />
                      <button onClick={()=>ovRef.current.click()}
                        style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                        📷 Ersetzen
                      </button>
                    </div>
                  ) : (
                    <div onClick={()=>ovRef.current.click()} style={{
                      width:"100%", height:200, border:`2px dashed ${C.br}`, borderRadius:8,
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      gap:8, cursor:"pointer", background:C.bg,
                    }}>
                      <span style={{fontSize:40}}>📷</span>
                      <div style={{fontWeight:700, color:C.p, fontSize:14}}>Übersichtsfoto aufnehmen</div>
                      <div style={{fontSize:12, color:C.mu}}>Kamera oder Datei</div>
                    </div>
                  )}
                  <input ref={ovRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
                    onChange={e=>{if(e.target.files[0]) handleOvPhoto(e.target.files); e.target.value="";}} />
                </div>

                {/* Project info */}
                <div style={{...S.card, padding:16, marginBottom:16}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                    <div style={{fontWeight:800, fontSize:14, color:C.dk}}>Projektdaten</div>
                    <Badge type={project.type==="Abbruch"?"danger":"warning"}>{project.type}</Badge>
                  </div>
                  <table style={{width:"100%", fontSize:13, borderCollapse:"collapse"}}>
                    <tbody>
                      {[
                        ["Objekt", project.name],
                        ["Adresse", project.address],
                        project.assekNr && ["Assek. Nr.", project.assekNr],
                        project.parzelle && ["Parzelle", project.parzelle],
                        ["Projekt-ID", project.projektId],
                        project.bauherrschaft && ["Bauherrschaft", project.bauherrschaft],
                        project.diagnostiker && ["Diagnostiker", project.diagnostiker],
                        ["Datum", project.datum],
                      ].filter(Boolean).map(([k,v]) => v&&(
                        <tr key={k} style={{borderBottom:`1px solid ${C.br2}`}}>
                          <td style={{padding:"7px 0", color:C.mu, fontWeight:600, width:"40%"}}>{k}</td>
                          <td style={{padding:"7px 0", color:C.tx, fontWeight:500}}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Stats */}
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16}}>
                  {[
                    {label:"Proben total", value:project.samples.length, color:C.p, bg:C.pl},
                    {label:"Belastet", value:positiveCount, color:C.re, bg:C.rg},
                    {label:"Negativ", value:project.samples.length-positiveCount, color:C.gr, bg:C.gg},
                  ].map(d => (
                    <div key={d.label} style={{background:d.bg, borderRadius:10, padding:"14px 10px", textAlign:"center"}}>
                      <div style={{fontSize:26, fontWeight:900, color:d.color}}>{d.value}</div>
                      <div style={{fontSize:11, color:d.color, fontWeight:600, opacity:0.8}}>{d.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Samples Tab ── */}
        {activeTab === "samples" && (
          <div style={{padding:16}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
              <div style={{fontWeight:800, fontSize:16, color:C.dk}}>{project.samples.length} Proben</div>
              <Btn onClick={onAddSample}>+ Neue Probe</Btn>
            </div>

            {project.samples.length === 0 ? (
              <div style={{...S.card, padding:40, textAlign:"center"}}>
                <div style={{fontSize:40, marginBottom:12}}>🧪</div>
                <div style={{fontWeight:700, fontSize:16, color:C.tx, marginBottom:6}}>Noch keine Proben</div>
                <div style={{fontSize:13, color:C.mu, marginBottom:20}}>Erstellen Sie eine neue Beprobung</div>
                <Btn onClick={onAddSample}>+ Erste Probe hinzufügen</Btn>
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:10}}>
                {project.samples.map(s => {
                  const pos = isPos(s);
                  return (
                    <div key={s.id} style={{
                      ...S.card, overflow:"hidden", cursor:"pointer",
                      borderLeft:`4px solid ${pos?C.re:C.gr}`,
                    }} onClick={() => onEditSample(s.id)}>
                      <div style={{display:"flex", gap:10, padding:12}}>
                        {/* Tube number */}
                        <div style={{
                          width:44, height:44, borderRadius:"50%", flexShrink:0,
                          background:pos?C.rg:C.gg, border:`2.5px solid ${pos?C.re:C.gr}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:16, fontWeight:900, color:pos?C.re:C.gr,
                        }}>{s.tubeNumber}</div>
                        {/* Info */}
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                            <div style={{fontWeight:800, fontSize:15, color:C.dk, marginBottom:2}}>
                              {s.keyword || "Ohne Bezeichnung"}
                            </div>
                            <span style={{fontSize:11}}>{s.photos.length > 0 ? "📷" : "⚠️"}</span>
                          </div>
                          <div style={{fontSize:12, color:C.mu, marginBottom:4}}>{s.floor}</div>
                          <div style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
                            <Badge type={pos?"danger":"success"}>
                              {pos ? "Belastet" : "Negativ"}
                            </Badge>
                            {s.dringlichkeit && s.dringlichkeit!=="–" && (
                              <Badge type="warning">{s.dringlichkeit.split("–")[0].trim()}</Badge>
                            )}
                          </div>
                        </div>
                        {/* Photo thumb */}
                        {s.photos[0] && (
                          <img src={s.photos[0]} alt="" style={{width:52, height:52, objectFit:"cover", borderRadius:7, flexShrink:0}} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Floor Plans Tab ── */}
        {activeTab === "floorplans" && (
          <div style={{padding:16}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
              <div style={{fontWeight:800, fontSize:16, color:C.dk}}>{project.floorPlans.length} Grundrisse</div>
              <Btn onClick={addFloorPlan}>+ Plan hochladen</Btn>
            </div>

            {project.floorPlans.length === 0 ? (
              <div style={{...S.card, padding:40, textAlign:"center"}}>
                <div style={{fontSize:40, marginBottom:12}}>🗺️</div>
                <div style={{fontWeight:700, fontSize:16, color:C.tx, marginBottom:6}}>Keine Grundrisse</div>
                <div style={{fontSize:13, color:C.mu, marginBottom:20}}>Laden Sie Grundrisse hoch und markieren Sie Probenstellen</div>
                <Btn onClick={addFloorPlan}>+ Ersten Grundriss hochladen</Btn>
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:12}}>
                {project.floorPlans.map(fp => (
                  <div key={fp.id} style={{...S.card, overflow:"hidden"}}>
                    {fp.image ? (
                      <div style={{position:"relative"}}>
                        <img src={fp.image} alt={fp.name} style={{width:"100%", height:160, objectFit:"cover", display:"block"}} />
                        {(fp.markers||[]).map(m => {
                          const s = project.samples.find(s=>s.tubeNumber===m.tubeNumber);
                          return (
                            <div key={m.id} style={{
                              position:"absolute", left:`${m.x}%`, top:`${m.y}%`,
                              transform:"translate(-50%,-50%)", width:24, height:24,
                              borderRadius:"50%", background:isPos(s)?C.re:C.gr, color:"#fff",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:10, fontWeight:900, border:"2px solid #fff",
                              boxShadow:"0 2px 6px rgba(0,0,0,0.4)",
                            }}>{m.tubeNumber}</div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{height:80, background:C.br2, display:"flex",alignItems:"center",justifyContent:"center",color:C.mu,fontSize:13}}>Kein Bild</div>
                    )}
                    <div style={{padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:700, fontSize:14, color:C.dk}}>{fp.name || "Unbenannt"}</div>
                        <div style={{fontSize:12, color:C.mu}}>{(fp.markers||[]).length} Proben markiert</div>
                      </div>
                      <div style={{display:"flex", gap:8}}>
                        <Btn variant="secondary" sm onClick={() => onEditFloorPlan(fp.id)}>Bearbeiten</Btn>
                        <Btn variant="ghost" sm onClick={() => { if(window.confirm("Grundriss löschen?")) deleteFloorPlan(fp.id); }}>✕</Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Labor KI Tab ── */}
        {activeTab === "labor" && (
          <LaborAnalyseTab
            project={project}
            onUpdateSample={(sampleId, upd) => onUpdateSampleDirect(sampleId, upd)}
          />
        )}

        {/* ── Report Tab ── */}
        {activeTab === "report" && <ReportView project={project} />}
      </div>
    </div>
  );
}

/* ─── Home Screen ─────────────────────────────────────────────────────────────── */
function HomeScreen({ projects, setProjects, onOpenProject, onDeleteProject }) {
  const [newMode, setNewMode] = useState(false);
  const [np, setNp] = useState(mkProject());

  const saveNew = () => {
    if (!np.name) return;
    setProjects(prev => [...prev, np]);
    onOpenProject(np.id);
  };

  if (newMode) {
    return (
      <div style={S.page}>
        <TopBar title="Neues Projekt" onBack={() => setNewMode(false)} />
        <div style={{padding:16, maxWidth:600, margin:"0 auto"}}>
          {/* Type selection */}
          <div style={{marginBottom:20}}>
            <FLabel required>Art des Eingriffs</FLabel>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
              {["Abbruch","Sanierung"].map(t => (
                <button key={t} onClick={()=>setNp(p=>({...p,type:t}))} style={{
                  padding:"20px 10px", border:"2.5px solid",
                  borderColor:np.type===t?C.p:C.br, borderRadius:12,
                  background:np.type===t?C.pl:C.w,
                  cursor:"pointer", fontFamily:"inherit",
                  transition:"all .15s",
                }}>
                  <div style={{fontSize:28, marginBottom:6}}>{t==="Abbruch"?"🏚️":"🔨"}</div>
                  <div style={{fontWeight:800, fontSize:16, color:np.type===t?C.p:C.tx}}>{t}</div>
                  <div style={{fontSize:11, color:C.mu, marginTop:3}}>
                    {t==="Abbruch"?"Vollständiger Abbruch":"Teilsanierung / Umbau"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{...S.card, padding:16, marginBottom:16}}>
            <FInput label="Objektname *" value={np.name} onChange={v=>setNp(p=>({...p,name:v}))} placeholder="MFH mit Gewerbe" required />
            <FInput label="Adresse" value={np.address} onChange={v=>setNp(p=>({...p,address:v}))} placeholder="Musterstrasse 1, 9000 St. Gallen" />
            <FInput label="Assek. Nr." value={np.assekNr} onChange={v=>setNp(p=>({...p,assekNr:v}))} placeholder="811" />
            <FInput label="Parzelle" value={np.parzelle} onChange={v=>setNp(p=>({...p,parzelle:v}))} placeholder="244" />
            <FInput label="Projekt-ID" value={np.projektId} onChange={v=>setNp(p=>({...p,projektId:v}))} />
          </div>
          <div style={{...S.card, padding:16, marginBottom:20}}>
            <FInput label="Bauherrschaft / Auftraggeber" value={np.bauherrschaft} onChange={v=>setNp(p=>({...p,bauherrschaft:v}))} placeholder="Muster AG" />
            <FInput label="Diagnostiker" value={np.diagnostiker} onChange={v=>setNp(p=>({...p,diagnostiker:v}))} placeholder="Max Mustermann" />
            <FInput label="Untersuchungsdatum" type="date" value={np.datum} onChange={v=>setNp(p=>({...p,datum:v}))} />
          </div>

          <Btn onClick={saveNew} disabled={!np.name} style={{width:"100%",justifyContent:"center",padding:"14px 0",fontSize:16}}>
            Projekt erstellen →
          </Btn>
        </div>
      </div>
    );
  }

  const totalSamples = projects.reduce((a,p)=>a+p.samples.length,0);
  const totalPositive = projects.reduce((a,p)=>a+p.samples.filter(isPos).length,0);

  return (
    <div style={S.page}>
      {/* Hero header */}
      <div style={{background:`linear-gradient(160deg, ${C.p} 0%, ${C.pd} 100%)`, padding:"0 20px 0"}}>
        <div style={{paddingTop:24, paddingBottom:0}}>
          <div style={{fontSize:10, color:"rgba(255,255,255,0.6)", letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700, marginBottom:4}}>
            Bau Schadstoff AG
          </div>
          <div style={{fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-0.02em", lineHeight:1.1}}>
            Beprobungs-
            <br />verwaltung
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginTop:20, marginBottom:0}}>
            {[
              {v:projects.length, l:"Projekte"},
              {v:totalSamples, l:"Proben"},
              {v:totalPositive, l:"Belastet"},
            ].map(d => (
              <div key={d.l} style={{background:"rgba(255,255,255,0.12)", borderRadius:"10px 10px 0 0", padding:"12px 10px", textAlign:"center"}}>
                <div style={{fontSize:22, fontWeight:900, color:"#fff"}}>{d.v}</div>
                <div style={{fontSize:11, color:"rgba(255,255,255,0.65)", fontWeight:600}}>{d.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:16, maxWidth:600, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, marginTop:4}}>
          <div style={{fontWeight:800, fontSize:16, color:C.dk}}>Projekte</div>
          <Btn onClick={()=>{setNp(mkProject());setNewMode(true);}}>+ Neues Projekt</Btn>
        </div>

        {projects.length === 0 ? (
          <div style={{...S.card, padding:48, textAlign:"center"}}>
            <div style={{fontSize:52, marginBottom:14}}>🏗️</div>
            <div style={{fontWeight:800, fontSize:18, color:C.tx, marginBottom:6}}>Noch keine Projekte</div>
            <div style={{fontSize:14, color:C.mu, marginBottom:24}}>Erstellen Sie Ihr erstes Bauschadstoff-Projekt</div>
            <Btn onClick={()=>{setNp(mkProject());setNewMode(true);}}>Erstes Projekt erstellen</Btn>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            {projects.map(p => {
              const pCount = p.samples.filter(isPos).length;
              return (
                <div key={p.id} style={{...S.card, cursor:"pointer", overflow:"hidden"}} onClick={()=>onOpenProject(p.id)}>
                  <div style={{display:"flex", gap:0}}>
                    {p.overviewPhoto && (
                      <img src={p.overviewPhoto} alt="" style={{width:88, height:88, objectFit:"cover", flexShrink:0}} />
                    )}
                    <div style={{flex:1, padding:"12px 14px", minWidth:0}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4}}>
                        <Badge type={p.type==="Abbruch"?"danger":"warning"}>{p.type}</Badge>
                        <button onClick={e=>{e.stopPropagation();if(window.confirm("Projekt löschen?"))onDeleteProject(p.id);}}
                          style={{background:"none",border:"none",color:C.mu,cursor:"pointer",fontSize:15,padding:0}}>✕</button>
                      </div>
                      <div style={{fontWeight:800, fontSize:15, color:C.dk, marginBottom:2, whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {p.name||"Unbenannt"}
                      </div>
                      <div style={{fontSize:12, color:C.mu, marginBottom:6, whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {p.address}
                      </div>
                      <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                        <span style={{fontSize:12, color:C.mu}}><strong style={{color:C.tx}}>{p.samples.length}</strong> Proben</span>
                        {pCount > 0 && <span style={{fontSize:12, color:C.re}}><strong>{pCount}</strong> belastet</span>}
                        <span style={{fontSize:12, color:C.mu}}>{p.datum}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @media print {
          body > div > div:first-child { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

/* ─── Main App ────────────────────────────────────────────────────────────────── */
export default function AsbestApp() {
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("home");
  const [curProjectId, setCurProjectId] = useState(null);
  const [curSampleId, setCurSampleId] = useState(null);
  const [curFpId, setCurFpId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("asbestProjects_v2");
      if (v) setProjects(JSON.parse(v));
    } catch(_) {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("asbestProjects_v2", JSON.stringify(projects)); }
    catch(e) { console.error("Storage:", e); }
  }, [projects, ready]);

  const curProject = projects.find(p => p.id === curProjectId);
  const curSample = curProject?.samples.find(s => s.id === curSampleId);
  const curFp = curProject?.floorPlans.find(f => f.id === curFpId);

  const updProject = useCallback((id, upd) => {
    setProjects(prev => prev.map(p => p.id===id ? {...p,...upd} : p));
  }, []);

  const addSample = useCallback((projectId) => {
    let ns;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      ns = mkSample(p.nextTube);
      return {...p, samples:[...p.samples, ns], nextTube:p.nextTube+1};
    }));
    return ns;
  }, []);

  const updSample = useCallback((projectId, sampleId, upd) => {
    setProjects(prev => prev.map(p => p.id!==projectId ? p : {
      ...p, samples: p.samples.map(s => s.id===sampleId ? {...s,...upd} : s)
    }));
  }, []);

  const delSample = useCallback((projectId, sampleId) => {
    setProjects(prev => prev.map(p => p.id!==projectId ? p : {
      ...p, samples: p.samples.filter(s => s.id!==sampleId)
    }));
  }, []);

  const updFp = useCallback((projectId, fpId, upd) => {
    setProjects(prev => prev.map(p => p.id!==projectId ? p : {
      ...p, floorPlans: p.floorPlans.map(f => f.id===fpId ? {...f,...upd} : f)
    }));
  }, []);

  if (!ready) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.p,fontWeight:700,fontSize:16,fontFamily:"system-ui"}}>Laden…</div>
    </div>
  );

  if (view === "sample" && curProject && curSample) {
    return <SampleScreen
      sample={curSample} project={curProject}
      onBack={() => setView("project")}
      onUpdate={(u) => updSample(curProjectId, curSampleId, u)}
      onDelete={() => { delSample(curProjectId, curSampleId); setView("project"); }}
    />;
  }

  if (view === "floorplan" && curProject && curFp) {
    return <FloorPlanScreen
      floorPlan={curFp} project={curProject}
      onBack={() => setView("project")}
      onUpdate={(u) => updFp(curProjectId, curFpId, u)}
    />;
  }

  if (view === "project" && curProject) {
    return <ProjectScreen
      project={curProject}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onBack={() => setView("home")}
      onUpdateProject={(u) => updProject(curProjectId, u)}
      onAddSample={() => {
        const s = addSample(curProjectId);
        if (s) { setCurSampleId(s.id); setView("sample"); }
      }}
      onEditSample={(id) => { setCurSampleId(id); setView("sample"); }}
      onDeleteSample={(id) => delSample(curProjectId, id)}
      onEditFloorPlan={(id) => { setCurFpId(id); setView("floorplan"); }}
      onUpdateSampleDirect={(sampleId, upd) => updSample(curProjectId, sampleId, upd)}
    />;
  }

  return (
    <HomeScreen
      projects={projects}
      setProjects={setProjects}
      onOpenProject={(id) => { setCurProjectId(id); setActiveTab("overview"); setView("project"); }}
      onDeleteProject={(id) => setProjects(prev => prev.filter(p=>p.id!==id))}
    />
  );
}
