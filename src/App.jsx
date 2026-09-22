import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
RadarChart,
Radar,
PolarGrid,
PolarAngleAxis,
PolarRadiusAxis,
Tooltip,
Legend,
ResponsiveContainer,
} from "recharts";
import {
ChevronLeft,
ChevronRight,
Eye,
EyeOff,
X,
Trash2,
Plus,
Download,
Upload,
HelpCircle,
Sun,
Moon,
} from "lucide-react";

// ---- 定数 ----------------------------------------------------------------

const METRICS = [
{ key: "condition", label: "コンディション", hue: 200, desc: "その日の回数、セットの間、寝不足" },
{ key: "haishutsu", label: "排出量", hue: 265, desc: "いっぱい出た?" },
{ key: "kairaku", label: "快楽度", hue: 38, desc: "気持ちよかった?💕" },
{ key: "okazu", label: "オカズ", hue: 320, desc: "オカズに対しての満足度" },
{ key: "kankyo", label: "環境", hue: 150, desc: "邪魔がないか" },
];

const CATEGORIES = [
{ key: "masturbation", label: "自慰" },
{ key: "toy", label: "玩具" },
{ key: "sex", label: "SEX" },
];

const WEEK_COLORS = [180, 210, 270, 320, 38];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const STORAGE_KEY = "entries-v3-dynamic-theme";
const MAX_DOTS = 4;
const MAX_RADAR_WEEKS = 4;

// ---- ユーティリティ --------------------------------------------------------

function formatDateKey(date) {
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, "0");
const d = String(date.getDate()).padStart(2, "0");
return `${y}-${m}-${d}`;
}
// --- ストリーク計算ロジックの例 ---
function calculateStreak(entries) {
let streak = 0;
const today = new Date();

// 今日から過去に向かって何日連続でエントリが存在するかチェック
for (let i = 0; i < 365; i++) {
const d = new Date(today);
d.setDate(today.getDate() - i);
const key = formatDateKey(d);

if (entries[key] && entries[key].length > 0) {
streak++;
} else if (i === 0) {
// 「今日」まだ記録していなくても、昨日の時点で連続していれば途切れさせない判定にする場合
continue;
} else {
break;
}
}
return streak;
}

function buildMonthMatrix(year, month) {
const firstDay = new Date(year, month, 1);
const startOffset = firstDay.getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();

const cells = [];
for (let i = 0; i < startOffset; i++) cells.push(null);
for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
while (cells.length % 7 !== 0) cells.push(null);

const weeks = [];
for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
return weeks;
}

function entryAverage(entry) {
const vals = METRICS.map((m) => entry[m.key]).filter((v) => typeof v === "number");
if (vals.length === 0) return null;
return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function heatColor(avg) {
if (avg === null || avg === undefined) return "var(--dot-empty)";
const t = Math.max(0, Math.min(10, avg)) / 10;
const hue = 190 - t * 175;
const sat = 70 + t * 15;
const light = 50 + t * 5;
return `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
}

function getWeekStart(date) {
const d = new Date(date);
d.setDate(d.getDate() - d.getDay());
d.setHours(0, 0, 0, 0);
return d;
}

function weekLabel(date) {
return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatTime(ts) {
const d = new Date(ts);
const h = String(d.getHours()).padStart(2, "0");
const m = String(d.getMinutes()).padStart(2, "0");
return `${h}:${m}`;
}

function categoryLabel(key) {
return CATEGORIES.find((c) => c.key === key)?.label || null;
}

function defaultDraft() {
const d = { name: "", category: null };
METRICS.forEach((m) => (d[m.key] = 5));
return d;
}

function downloadJson(filename, dataObj) {
const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}

// ---- メインコンポーネント ---------------------------------------------------

export default function App() {
const today = new Date();
const streek = calculateStreak(entries);
  
const [viewYear, setViewYear] = useState(today.getFullYear());
const [viewMonth, setViewMonth] = useState(today.getMonth());
const [entries, setEntries] = useState({});
const [loading, setLoading] = useState(true);
const [privacyMode, setPrivacyMode] = useState(false);

// テーマ設定（'system', 'light', 'dark'）
const [themeMode, setThemeMode] = useState("system");
const [isDark, setIsDark] = useState(false);

const [selectedDateKey, setSelectedDateKey] = useState(null);
const [showHelp, setShowHelp] = useState(false);
const [editingId, setEditingId] = useState(null);
const [editorOpen, setEditorOpen] = useState(false);
const [draft, setDraft] = useState(null);

const [saveState, setSaveState] = useState("idle");
const [storageError, setStorageError] = useState(false);
const [backupMsg, setBackupMsg] = useState("");
const fileInputRef = useRef(null);

// システムのダークモード変更を監視・反映
useEffect(() => {
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

const updateTheme = () => {
if (themeMode === "system") {
setIsDark(mediaQuery.matches);
} else {
setIsDark(themeMode === "dark");
}
};

updateTheme();
mediaQuery.addEventListener("change", updateTheme);
return () => mediaQuery.removeEventListener("change", updateTheme);
}, [themeMode]);

const weeks = useMemo(() => buildMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

useEffect(() => {
try {
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
const parsed = JSON.parse(saved);
setEntries(parsed && typeof parsed === "object" ? parsed : {});
} else {
setEntries({});
}
} catch (e) {
console.error("データの読み込みに失敗しました:", e);
setEntries({});
} finally {
setLoading(false);
}
}, []);

const persist = useCallback((next) => {
setSaveState("saving");
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
setSaveState("saved");
setStorageError(false);
setTimeout(() => setSaveState("idle"), 1000);
} catch (e) {
console.error("データの保存に失敗しました:", e);
setStorageError(true);
setSaveState("idle");
}
}, []);

const toggleDay = (date) => {
if (!date) return;
const key = formatDateKey(date);
setShowHelp(false);
setSelectedDateKey((cur) => (cur === key ? null : key));
};

const openNewEntry = () => {
if (!selectedDateKey) return;
setEditingId(null);
setDraft(defaultDraft());
setEditorOpen(true);
};

const openEditEntry = (entry) => {
setEditingId(entry.id);
const d = { name: entry.name || "", category: entry.category || null };
METRICS.forEach((m) => (d[m.key] = entry[m.key]));
setDraft(d);
setEditorOpen(true);
};

const closeEditor = () => {
setEditorOpen(false);
setDraft(null);
setEditingId(null);
};

const saveDraft = () => {
if (!selectedDateKey || !draft || !draft.category) return;
const list = entries[selectedDateKey] ? [...entries[selectedDateKey]] : [];
if (editingId) {
const idx = list.findIndex((e) => e.id === editingId);
if (idx >= 0) list[idx] = { ...list[idx], ...draft };
} else {
list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), ...draft });
}
list.sort((a, b) => a.ts - b.ts);
const next = { ...entries, [selectedDateKey]: list };
setEntries(next);
persist(next);
closeEditor();
};

const deleteEntry = (dateKey, id) => {
const list = (entries[dateKey] || []).filter((e) => e.id !== id);
const next = { ...entries };
if (list.length > 0) next[dateKey] = list;
else delete next[dateKey];
setEntries(next);
persist(next);
};

const goPrevMonth = () => {
if (viewMonth === 0) {
setViewYear((y) => y - 1);
setViewMonth(11);
} else setViewMonth((m) => m - 1);
};
const goNextMonth = () => {
if (viewMonth === 11) {
setViewYear((y) => y + 1);
setViewMonth(0);
} else setViewMonth((m) => m + 1);
};

const handleExport = () => {
const today8 = formatDateKey(new Date()).replace(/-/g, "");
downloadJson(`calendar-backup-${today8}.json`, { version: 1, exportedAt: new Date().toISOString(), entries });
setBackupMsg("エクスポートしました");
setTimeout(() => setBackupMsg(""), 2000);
};

const handleImportClick = () => fileInputRef.current?.click();

const handleImportFile = (e) => {
const file = e.target.files?.[0];
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
try {
const parsed = JSON.parse(String(reader.result));
const incoming = parsed && parsed.entries ? parsed.entries : parsed;
if (!incoming || typeof incoming !== "object") throw new Error("invalid");

const merged = { ...entries };
let importedCount = 0;
Object.entries(incoming).forEach(([dateKey, list]) => {
if (!Array.isArray(list)) return;
const current = merged[dateKey] ? [...merged[dateKey]] : [];
list.forEach((imp) => {
if (!imp || !imp.id) return;
const idx = current.findIndex((e) => e.id === imp.id);
if (idx >= 0) current[idx] = imp;
else current.push(imp);
importedCount++;
});
current.sort((a, b) => a.ts - b.ts);
merged[dateKey] = current;
});

setEntries(merged);
persist(merged);
setBackupMsg(`${importedCount}件のデータを読み込みました`);
} catch (err) {
setBackupMsg("読み込みに失敗しました。ファイルを確認してください");
} finally {
setTimeout(() => setBackupMsg(""), 3000);
}
};
reader.readAsText(file);
e.target.value = "";
};

const radarInfo = useMemo(() => {
const byWeek = {};
Object.values(entries).forEach((list) => {
list.forEach((entry) => {
const wStart = getWeekStart(new Date(entry.ts));
const wKey = formatDateKey(wStart);
if (!byWeek[wKey]) byWeek[wKey] = { date: wStart, items: [] };
byWeek[wKey].items.push(entry);
});
});
const weekRows = Object.values(byWeek)
.sort((a, b) => a.date - b.date)
.map(({ date, items }) => {
const row = { week: weekLabel(date) };
METRICS.forEach((m) => {
const vals = items.map((it) => it[m.key]).filter((v) => typeof v === "number");
row[m.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
});
return row;
})
.slice(-MAX_RADAR_WEEKS);

const data = METRICS.map((m) => {
const row = { metric: m.label };
weekRows.forEach((w) => {
row[w.week] = w[m.key] !== null && w[m.key] !== undefined ? Number(w[m.key].toFixed(1)) : null;
});
return row;
});

return { weekLabels: weekRows.map((w) => w.week), data };
}, [entries]);

const monthLabel = `${viewYear}年${viewMonth + 1}月`;
const selectedList = selectedDateKey ? entries[selectedDateKey] || [] : [];
const selectedDateLabel = selectedDateKey
? (() => {
const d = new Date(selectedDateKey + "T00:00:00");
return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
})()
: "";

const dayStats = useMemo(() => {
if (selectedList.length === 0) return null;
const perMetric = {};
METRICS.forEach((m) => {
const vals = selectedList.map((e) => e[m.key]).filter((v) => typeof v === "number");
perMetric[m.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
});
const overallVals = Object.values(perMetric).filter((v) => v !== null);
const overall = overallVals.length ? overallVals.reduce((a, b) => a + b, 0) / overallVals.length : null;
return { perMetric, overall };
}, [selectedList]);

// テーマ切替のトグル処理
const cycleTheme = () => {
if (themeMode === "system") setThemeMode("light");
else if (themeMode === "light") setThemeMode("dark");
else setThemeMode("system");
};

return (
<div className={`ic-root ${isDark ? "theme-dark" : "theme-light"}`}>
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;600;700&display=swap');

/* =========================================================
テーマ変数定義（ライト / ダーク）
========================================================= */
.ic-root.theme-light {
--bg: #f8fafc;
--card: #ffffff;
--panel: #f1f5f9;
--line: #e2e8f0;
--text: #0f172a;
--text-dim: #64748b;
--accent: #0d9488;
--accent-light: rgba(13, 148, 136, 0.1);
--danger: #ef4444;
--shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
--cell-bg: #ffffff;
--cell-hover: #f8fafc;
--dot-empty: #cbd5e1;
}

.ic-root.theme-dark {
--bg: #0d1117;
--card: #161b22;
--panel: #21262d;
--line: #30363d;
--text: #f0f6fc;
--text-dim: #8b949e;
--accent: #2dd4bf;
--accent-light: rgba(45, 212, 191, 0.12);
--danger: #f87171;
--shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
--cell-bg: rgba(22, 27, 34, 0.6);
--cell-hover: #21262d;
--dot-empty: #3a3f4b;
}

.ic-root {
font-family: 'Zen Kaku Gothic New', -apple-system, BlinkMacSystemFont, sans-serif;
background: var(--bg);
color: var(--text);
min-height: 100vh;
width: 100%;
padding: 18px 14px 60px;
box-sizing: border-box;
max-width: 520px;
margin: 0 auto;
position: relative;
transition: background 0.25s ease, color 0.25s ease;
}

.ic-root * {
box-sizing: border-box;
}

button, input {
font-family: inherit;
}

/* =========================================================
ヘッダー
========================================================= */
.ic-header {
display: flex;
align-items: center;
justify-content: space-between;
margin-bottom: 16px;
padding: 0 4px;
}

.ic-nav {
display: flex;
align-items: center;
gap: 4px;
}

.ic-nav-btn {
width: 36px;
height: 36px;
border: 1px solid var(--line);
background: var(--card);
color: var(--text-dim);
border-radius: 10px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
transition: all 0.15s ease;
}

.ic-nav-btn:hover {
background: var(--panel);
color: var(--text);
}

.ic-month {
font-size: 20px;
font-weight: 700;
letter-spacing: -0.4px;
min-width: 122px;
text-align: center;
color: var(--text);
}

.ic-header-actions {
display: flex;
gap: 6px;
}

.ic-icon-round {
background: var(--card);
border: 1px solid var(--line);
color: var(--text-dim);
border-radius: 10px;
width: 36px;
height: 36px;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
transition: all 0.15s ease;
}

.ic-icon-round:hover {
background: var(--panel);
color: var(--accent);
border-color: var(--accent);
}


/* =========================================================
ストリーク表示
========================================================= */
.ic-streak-card {
background: var(--card);
border: 1px solid var(--line);
border-radius: 14px;
padding: 12px 14px;
margin-bottom: 14px;
display: flex;
align-items: center;
justify-content: space-between;
box-shadow: var(--shadow);
}

.ic-streak-left {
display: flex;
align-items: center;
gap: 10px;
}

.ic-streak-fire {
font-size: 22px;
line-height: 1;
}

.ic-streak-label {
font-size: 11px;
color: var(--text-dim);
}

.ic-streak-number {
font-size: 20px;
font-weight: 800;
color: var(--accent);
}

.ic-streak-days {
font-size: 11px;
color: var(--text-dim);
}

.ic-backup-toast {
background: var(--accent-light);
color: var(--accent);
border: 1px solid var(--accent);
border-radius: 10px;
padding: 7px 10px;
margin: 0 auto 12px;
width: fit-content;
font-size: 11px;
font-weight: 600;
}

.ic-blurred {
filter: blur(14px);
pointer-events: none;
user-select: none;
}

/* =========================================================
カレンダー周り
========================================================= */
.ic-weekday-row {
display: grid;
grid-template-columns: repeat(7, 1fr);
background: var(--card);
border: 1px solid var(--line);
border-bottom: none;
border-radius: 14px 14px 0 0;
padding: 10px 4px;
}

.ic-weekday {
text-align: center;
font-size: 11px;
font-weight: 600;
color: var(--text-dim);
}

.ic-weekday.ic-sun { color: var(--danger); }
.ic-weekday.ic-sat { color: #3b82f6; }

.ic-grid {
display: grid;
grid-template-columns: repeat(7, 1fr);
background: var(--card);
border-left: 1px solid var(--line);
border-top: 1px solid var(--line);
border-radius: 0 0 14px 14px;
overflow: hidden;
box-shadow: var(--shadow);
}

.ic-cell {
min-height: 75px;
border-right: 1px solid var(--line);
border-bottom: 1px solid var(--line);
padding: 6px 2px;
cursor: pointer;
display: flex;
flex-direction: column;
align-items: center;
background: var(--cell-bg);
transition: background 0.12s ease;
}

.ic-cell:hover {
background: var(--cell-hover);
}

.ic-cell.ic-empty {
cursor: default;
background: var(--bg);
}

.ic-cell.ic-selected {
background: var(--accent-light);
}

.ic-cell-day {
font-size: 13px;
font-weight: 600;
width: 26px;
height: 26px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
color: var(--text);
}

.ic-cell-day.ic-sun { color: var(--danger); }
.ic-cell-day.ic-sat { color: #3b82f6; }

.ic-cell-day.ic-today {
background: var(--accent);
color: var(--card);
font-weight: 700;
}

.ic-cell-day.ic-selected-day {
border: 2px solid var(--accent);
color: var(--accent);
}

.ic-cell-day.ic-selected-day.ic-today {
color: var(--card);
background: var(--accent);
}

.ic-dots {
display: flex;
gap: 3px;
margin-top: 6px;
flex-wrap: wrap;
justify-content: center;
max-width: 42px;
}

.ic-dot {
width: 6px;
height: 6px;
border-radius: 50%;
}

.ic-dot-more {
font-size: 8px;
color: var(--text-dim);
}

.ic-legend {
display: flex;
align-items: center;
gap: 10px;
margin: 12px 4px 0;
font-size: 10px;
color: var(--text-dim);
}

.ic-legend-bar {
flex: 1;
height: 6px;
border-radius: 10px;
background: linear-gradient(90deg, #38bdf8, #2dd4bf, #a3e635, #fbbf24, #f87171);
}

/* =========================================================
パネル・カード
========================================================= */
.ic-day-panel {
margin-top: 18px;
background: var(--card);
border: 1px solid var(--line);
border-radius: 16px;
padding: 16px;
box-shadow: var(--shadow);
}

.ic-day-panel-head {
display: flex;
justify-content: space-between;
align-items: flex-start;
margin-bottom: 14px;
}

.ic-day-panel-title {
font-size: 16px;
font-weight: 700;
}

.ic-day-panel-sub {
font-size: 11px;
color: var(--text-dim);
margin-top: 2px;
}

.ic-help-btn {
width: 32px;
height: 32px;
background: var(--panel);
border: 1px solid var(--line);
color: var(--text-dim);
border-radius: 50%;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
transition: all 0.15s ease;
}

.ic-help-btn:hover {
color: var(--accent);
border-color: var(--accent);
}

.ic-help-box {
background: var(--panel);
border: 1px solid var(--line);
border-radius: 12px;
padding: 10px 12px;
margin-bottom: 12px;
}

.ic-help-row {
display: flex;
align-items: flex-start;
gap: 9px;
padding: 6px 0;
}

.ic-help-dot {
width: 8px;
height: 8px;
border-radius: 50%;
margin-top: 4px;
flex-shrink: 0;
}

.ic-help-label {
font-size: 12px;
font-weight: 700;
}

.ic-help-desc {
font-size: 10px;
color: var(--text-dim);
margin-top: 1px;
}

.ic-day-stats {
background: var(--panel);
border: 1px solid var(--line);
border-radius: 12px;
padding: 12px;
margin-bottom: 14px;
}

.ic-day-stats-title {
font-size: 11px;
font-weight: 700;
color: var(--text-dim);
margin-bottom: 10px;
}

.ic-stat-row {
display: grid;
grid-template-columns: 85px 1fr 38px;
align-items: center;
gap: 8px;
margin-bottom: 8px;
font-size: 11px;
}

.ic-stat-bar-track {
height: 6px;
border-radius: 10px;
background: var(--line);
overflow: hidden;
}

.ic-stat-bar-fill {
height: 100%;
border-radius: 10px;
}

.ic-stat-value {
font-weight: 700;
text-align: right;
}

.ic-stat-overall {
display: flex;
justify-content: flex-end;
align-items: baseline;
gap: 6px;
margin-top: 10px;
padding-top: 8px;
border-top: 1px solid var(--line);
font-size: 11px;
color: var(--text-dim);
}

.ic-stat-overall strong {
font-size: 18px;
color: var(--accent);
}

.ic-section-title {
font-size: 15px;
font-weight: 700;
margin: 28px 4px 10px;
display: flex;
align-items: center;
gap: 8px;
color: var(--text);
}

.ic-section-title::before {
content: "";
width: 4px;
height: 16px;
border-radius: 4px;
background: var(--accent);
}

.ic-entry-card {
display: flex;
align-items: center;
gap: 10px;
background: var(--panel);
border: 1px solid var(--line);
border-radius: 12px;
padding: 10px;
margin-bottom: 8px;
cursor: pointer;
transition: all 0.15s ease;
}

.ic-entry-card:hover {
border-color: var(--accent);
}

.ic-entry-bar {
width: 4px;
align-self: stretch;
border-radius: 4px;
flex-shrink: 0;
}

.ic-entry-info {
flex: 1;
min-width: 0;
}

.ic-entry-name-row {
display: flex;
align-items: center;
gap: 6px;
}

.ic-entry-name {
font-size: 13px;
font-weight: 700;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

.ic-cat-badge {
font-size: 9px;
font-weight: 700;
padding: 2px 6px;
border-radius: 6px;
background: var(--accent-light);
color: var(--accent);
flex-shrink: 0;
}

.ic-entry-time {
font-size: 10px;
color: var(--text-dim);
margin-top: 2px;
}

.ic-entry-scores {
display: flex;
flex-wrap: wrap;
gap: 4px;
margin-top: 6px;
}

.ic-score-chip {
font-size: 9px;
padding: 2px 6px;
border-radius: 6px;
color: #ffffff;
font-weight: 700;
}

.ic-entry-del {
background: transparent;
border: none;
color: var(--text-dim);
width: 30px;
height: 30px;
border-radius: 8px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
transition: all 0.15s ease;
}

.ic-entry-del:hover {
background: rgba(239, 68, 68, 0.15);
color: var(--danger);
}

.ic-add-btn {
width: 100%;
border: 1px dashed var(--line);
background: var(--panel);
color: var(--accent);
border-radius: 12px;
padding: 12px;
font-size: 13px;
font-weight: 700;
display: flex;
align-items: center;
justify-content: center;
gap: 6px;
cursor: pointer;
margin-top: 6px;
transition: all 0.15s ease;
}

.ic-add-btn:hover {
background: var(--accent-light);
border-color: var(--accent);
}

.ic-chart-wrap {
background: var(--card);
border: 1px solid var(--line);
border-radius: 16px;
padding: 14px 6px 6px;
box-shadow: var(--shadow);
}

.ic-empty-msg {
color: var(--text-dim);
font-size: 12px;
text-align: center;
padding: 30px 10px;
}

/* =========================================================
モーダル・入力ドロワー
========================================================= */
.ic-overlay {
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.5);
backdrop-filter: blur(4px);
z-index: 40;
display: flex;
align-items: flex-end;
justify-content: center;
}

.ic-drawer {
width: 100%;
max-width: 520px;
background: var(--card);
border: 1px solid var(--line);
border-radius: 20px 20px 0 0;
padding: 18px 18px 32px;
max-height: 88vh;
overflow-y: auto;
box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
}

.ic-drawer-head {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 16px;
}

.ic-drawer-title {
font-size: 18px;
font-weight: 700;
}

.ic-icon-btn {
width: 34px;
height: 34px;
background: var(--panel);
border: 1px solid var(--line);
color: var(--text-dim);
border-radius: 50%;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
}

.ic-icon-btn:hover {
color: var(--text);
border-color: var(--text-dim);
}

.ic-field-label {
font-size: 11px;
font-weight: 700;
color: var(--text-dim);
margin-bottom: 8px;
}

.ic-category-row {
display: flex;
gap: 8px;
margin-bottom: 16px;
}

.ic-category-btn {
flex: 1;
border: 1px solid var(--line);
background: var(--panel);
color: var(--text-dim);
border-radius: 10px;
padding: 10px;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition: all 0.15s ease;
}

.ic-category-btn.ic-cat-selected {
background: var(--accent);
border-color: var(--accent);
color: #ffffff;
}

.ic-name-input {
width: 100%;
border: 1px solid var(--line);
background: var(--panel);
border-radius: 10px;
padding: 11px 12px;
font-size: 14px;
color: var(--text);
margin-bottom: 18px;
outline: none;
}

.ic-name-input:focus {
border-color: var(--accent);
}

.ic-metric-row {
margin-bottom: 16px;
}

.ic-metric-label-row {
display: flex;
justify-content: space-between;
margin-bottom: 6px;
font-size: 12px;
font-weight: 600;
}

.ic-metric-value {
font-weight: 800;
color: var(--accent);
}

.ic-slider {
-webkit-appearance: none;
appearance: none;
width: 100%;
height: 6px;
border-radius: 10px;
background: var(--line);
outline: none;
cursor: pointer;
}

.ic-slider::-webkit-slider-thumb {
-webkit-appearance: none;
width: 20px;
height: 20px;
border-radius: 50%;
background: var(--text);
cursor: pointer;
border: 2px solid var(--accent);
}

.ic-drawer-actions {
display: flex;
gap: 10px;
margin-top: 20px;
}

.ic-btn {
flex: 1;
border-radius: 10px;
padding: 12px;
font-size: 14px;
font-weight: 700;
border: none;
cursor: pointer;
}

.ic-btn-save {
background: var(--accent);
color: #ffffff;
}

.ic-btn-save:disabled {
background: var(--line);
color: var(--text-dim);
cursor: not-allowed;
}

.ic-btn-back {
background: var(--panel);
color: var(--text);
border: 1px solid var(--line);
}

.ic-save-toast {
text-align: center;
font-size: 10px;
color: var(--text-dim);
margin-top: 10px;
height: 14px;
}

.ic-storage-warn {
font-size: 10px;
color: var(--danger);
text-align: center;
margin-top: 6px;
}

.ic-req-hint {
font-size: 10px;
color: var(--danger);
text-align: center;
margin-bottom: 10px;
}
`}</style>

{/* ヘッダー */}
<div className="ic-header">
<div className="ic-nav">
<button className="ic-nav-btn" onClick={goPrevMonth}>
<ChevronLeft size={18} />
</button>
<div className="ic-month">{monthLabel}</div>
<button className="ic-nav-btn" onClick={goNextMonth}>
<ChevronRight size={18} />
</button>
</div>
<div className="ic-header-actions">
{/* テーマ手動切替ボタン */}
<button
className="ic-icon-round"
onClick={cycleTheme}
title={`テーマ切替 (現在: ${themeMode === "system" ? "自動" : themeMode === "dark" ? "ダーク" : "ライト"})`}
>
{themeMode === "dark" ? <Moon size={15} /> : themeMode === "light" ? <Sun size={15} /> : (isDark ? <Moon size={15} /> : <Sun size={15} />)}
</button>
<button className="ic-icon-round" onClick={handleExport} title="エクスポート">
<Download size={15} />
</button>
<button className="ic-icon-round" onClick={handleImportClick} title="インポート">
<Upload size={15} />
</button>
<input
ref={fileInputRef}
type="file"
accept="application/json"
style={{ display: "none" }}
onChange={handleImportFile}
/>
<button className="ic-icon-round" onClick={() => setPrivacyMode((v) => !v)} title="プライバシーモード">
{privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
</button>
</div>
</div>

{backupMsg && <div className="ic-backup-toast">{backupMsg}</div>}

<div className={privacyMode ? "ic-blurred" : ""}>

 {backupMsg && <div className="ic-backup-toast">{backupMsg}</div>}

<div className={privacyMode ? "ic-blurred" : ""}>

<div className="ic-streak-card">
<div className="ic-streak-left">
<span className="ic-streak-fire">🔥</span>
<div>
<div className="ic-streak-label">連続記録</div>
<div className="ic-streak-number">{streak}日</div>
</div>
</div>
<div className="ic-streak-days">
{streak > 0 ? "継続中！" : "記録を始めよう"}
</div>
</div> 

<div className="ic-weekday-row">
{WEEKDAYS.map((w, i) => (
<div className={`ic-weekday ${i === 0 ? "ic-sun" : i === 6 ? "ic-sat" : ""}`} key={w}>
{w}
</div>
))}
</div>

{loading ? (
<div className="ic-empty-msg">読み込み中…</div>
) : (
<div className="ic-grid">
{weeks.flat().map((date, i) => {
if (!date) return <div className="ic-cell ic-empty" key={i} />;
const key = formatDateKey(date);
const list = entries[key] || [];
const isToday = formatDateKey(today) === key;
const isSelected = selectedDateKey === key;
const dow = date.getDay();
const shown = list.slice(0, MAX_DOTS);
const extra = list.length - shown.length;
return (
<div
key={i}
className={`ic-cell ${isSelected ? "ic-selected" : ""}`}
onClick={() => toggleDay(date)}
>
<span
className={`ic-cell-day ${isToday ? "ic-today" : dow === 0 ? "ic-sun" : dow === 6 ? "ic-sat" : ""} ${
isSelected ? "ic-selected-day" : ""
}`}
>
{date.getDate()}
</span>
{list.length > 0 && (
<div className="ic-dots">
{shown.map((e) => (
<span key={e.id} className="ic-dot" style={{ background: heatColor(entryAverage(e)) }} />
))}
{extra > 0 && <span className="ic-dot-more">+{extra}</span>}
</div>
)}
</div>
);
})}
</div>
)}

<div className="ic-legend">
<span>低</span>
<div className="ic-legend-bar" />
<span>高</span>
</div>

{selectedDateKey && (
<div className="ic-day-panel">
<div className="ic-day-panel-head">
<div>
<div className="ic-day-panel-title">{selectedDateLabel}</div>
<div className="ic-day-panel-sub">{selectedList.length}件の記録</div>
</div>
<button
className="ic-help-btn"
onClick={() => setShowHelp((v) => !v)}
title="項目の説明"
>
<HelpCircle size={16} />
</button>
</div>

{showHelp && (
<div className="ic-help-box">
{METRICS.map((m) => (
<div className="ic-help-row" key={m.key}>
<span className="ic-help-dot" style={{ background: `hsl(${m.hue}, 70%, 55%)` }} />
<div>
<div className="ic-help-label">{m.label}</div>
<div className="ic-help-desc">{m.desc}</div>
</div>
</div>
))}
</div>
)}

{dayStats && (
<div className="ic-day-stats">
<div className="ic-day-stats-title">その日の統計</div>
{METRICS.map((m) => {
const v = dayStats.perMetric[m.key];
return (
<div className="ic-stat-row" key={m.key}>
<span>{m.label}</span>
<div className="ic-stat-bar-track">
<div
className="ic-stat-bar-fill"
style={{ width: `${v !== null ? v * 10 : 0}%`, background: heatColor(v) }}
/>
</div>
<span className="ic-stat-value" style={{ color: heatColor(v) }}>
{v !== null ? v.toFixed(1) : "-"}
</span>
</div>
);
})}
<div className="ic-stat-overall">
平均
<strong>
{dayStats.overall !== null ? dayStats.overall.toFixed(1) : "-"}
</strong>
</div>
</div>
)}

{selectedList.map((entry) => {
const avg = entryAverage(entry);
return (
<div className="ic-entry-card" key={entry.id} onClick={() => openEditEntry(entry)}>
<span className="ic-entry-bar" style={{ background: heatColor(avg) }} />
<div className="ic-entry-info">
<div className="ic-entry-name-row">
<span className="ic-entry-name">{entry.name ? entry.name : "無題の記録"}</span>
{categoryLabel(entry.category) && (
<span className="ic-cat-badge">{categoryLabel(entry.category)}</span>
)}
</div>
<div className="ic-entry-time">{formatTime(entry.ts)}</div>
<div className="ic-entry-scores">
{METRICS.map((m) => (
<span key={m.key} className="ic-score-chip" style={{ background: heatColor(entry[m.key]) }}>
{m.label} {entry[m.key]}
</span>
))}
</div>
</div>
<button
className="ic-entry-del"
onClick={(e) => {
e.stopPropagation();
deleteEntry(selectedDateKey, entry.id);
}}
title="削除"
>
<Trash2 size={15} />
</button>
</div>
);
})}

<button className="ic-add-btn" onClick={openNewEntry}>
<Plus size={16} /> 記録を追加
</button>
</div>
)}

<div className="ic-section-title">傾向レーダー(直近{radarInfo.weekLabels.length || 0}週)</div>
<div className="ic-chart-wrap">
{radarInfo.weekLabels.length === 0 ? (
<div className="ic-empty-msg">記録が増えるとここにグラフが表示されます</div>
) : (
<ResponsiveContainer width="100%" height={280}>
<RadarChart data={radarInfo.data} outerRadius="72%">
<PolarGrid stroke={isDark ? "#30363d" : "#e2e8f0"} />
<PolarAngleAxis dataKey="metric" tick={{ fill: isDark ? "#f0f6fc" : "#0f172a", fontSize: 11 }} />
<PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: isDark ? "#8b949e" : "#64748b", fontSize: 10 }} tickCount={6} />
<Tooltip contentStyle={{ background: isDark ? "#161b22" : "#ffffff", border: `1px solid ${isDark ? "#30363d" : "#e2e8f0"}`, borderRadius: 8, fontSize: 12, color: isDark ? "#f0f6fc" : "#0f172a" }} />
<Legend wrapperStyle={{ fontSize: 11, color: isDark ? "#8b949e" : "#64748b" }} />
{radarInfo.weekLabels.map((w, idx) => {
const hue = WEEK_COLORS[idx % WEEK_COLORS.length];
return (
<Radar
key={w}
name={`${w}週`}
dataKey={w}
stroke={`hsl(${hue}, 75%, 55%)`}
fill={`hsl(${hue}, 75%, 55%)`}
fillOpacity={0.15}
strokeWidth={2}
connectNulls
/>
);
})}
</RadarChart>
</ResponsiveContainer>
)}
</div>
</div>

{editorOpen && draft && (
<div className="ic-overlay" onClick={closeEditor}>
<div className="ic-drawer" onClick={(e) => e.stopPropagation()}>
<div className="ic-drawer-head">
<div className="ic-drawer-title">{editingId ? "記録を編集" : "新しい記録"}</div>
<button className="ic-icon-btn" onClick={closeEditor}>
<X size={18} />
</button>
</div>

<div className="ic-field-label">種類</div>
<div className="ic-category-row">
{CATEGORIES.map((c) => (
<button
key={c.key}
type="button"
className={`ic-category-btn ${draft.category === c.key ? "ic-cat-selected" : ""}`}
onClick={() => setDraft((d) => ({ ...d, category: c.key }))}
>
{c.label}
</button>
))}
</div>

<input
className="ic-name-input"
type="text"
placeholder="記録の名前(任意)"
value={draft.name}
onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
maxLength={40}
/>

{METRICS.map((m) => (
<div className="ic-metric-row" key={m.key}>
<div className="ic-metric-label-row">
<span>{m.label}</span>
<span className="ic-metric-value">{draft[m.key]}</span>
</div>
<input
className="ic-slider"
type="range"
min="0"
max="10"
step="1"
value={draft[m.key]}
onChange={(e) => setDraft((d) => ({ ...d, [m.key]: Number(e.target.value) }))}
style={{ accentColor: `hsl(${m.hue}, 70%, 55%)` }}
/>
</div>
))}

{!draft.category && <div className="ic-req-hint">種類を選択すると保存できます</div>}

<div className="ic-drawer-actions">
<button className="ic-btn ic-btn-back" onClick={closeEditor}>
キャンセル
</button>
<button className="ic-btn ic-btn-save" onClick={saveDraft} disabled={!draft.category}>
保存する
</button>
</div>
<div className="ic-save-toast">
{saveState === "saving" ? "保存中…" : saveState === "saved" ? "保存しました" : ""}
</div>
{storageError && <div className="ic-storage-warn">保存に失敗しました。</div>}
</div>
</div>
)}
</div>
);
}
