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

const WEEK_COLORS = [210, 150, 20, 320, 265];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const STORAGE_KEY = "entries-v3";
const MAX_DOTS = 4;
const MAX_RADAR_WEEKS = 4;

// ---- ユーティリティ --------------------------------------------------------

function formatDateKey(date) {
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, "0");
const d = String(date.getDate()).padStart(2, "0");
return `${y}-${m}-${d}`;
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

// 0(冷)→10(熱) を hsl で補間
function heatColor(avg) {
if (avg === null || avg === undefined) return "#d0d0d5";
const t = Math.max(0, Math.min(10, avg)) / 10;
const hue = 210 - t * 195; // 210(青) → 15(琥珀)
const sat = 55 + t * 25;
const light = 55 - t * 8;
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
const [viewYear, setViewYear] = useState(today.getFullYear());
const [viewMonth, setViewMonth] = useState(today.getMonth());
const [entries, setEntries] = useState({}); // { "YYYY-MM-DD": [ {id, ts, name, category, ...metrics} ] }
const [loading, setLoading] = useState(true);
const [privacyMode, setPrivacyMode] = useState(false);

const [selectedDateKey, setSelectedDateKey] = useState(null);
const [showHelp, setShowHelp] = useState(false);
const [editingId, setEditingId] = useState(null);
const [editorOpen, setEditorOpen] = useState(false);
const [draft, setDraft] = useState(null);

const [saveState, setSaveState] = useState("idle");
const [storageError, setStorageError] = useState(false);
const [backupMsg, setBackupMsg] = useState("");
const fileInputRef = useRef(null);

const weeks = useMemo(() => buildMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

// 初回読み込み
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

    setTimeout(() => {
      setSaveState("idle");
    }, 1000);
  } catch (e) {
    console.error("データの保存に失敗しました:", e);
    setStorageError(true);
    setSaveState("idle");
  }
}, []);

// ---- 日付選択(タップでトグル) ----

const toggleDay = (date) => {
if (!date) return;
const key = formatDateKey(date);
setShowHelp(false);
setSelectedDateKey((cur) => (cur === key ? null : key));
};

// ---- 編集ドロワー操作 ----

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

// ---- バックアップ(エクスポート/インポート) ----

const handleExport = () => {
const today8 = formatDateKey(new Date()).replace(/-/g, "");
downloadJson(`calendar-backup-${today8}.json`, { version: 1, exportedAt: new Date().toISOString(), entries });
setBackupMsg("エクスポートしました");
setTimeout(() => setBackupMsg(""), 2000);
};

const handleImportClick = () => {
fileInputRef.current?.click();
};

const handleImportFile = (e) => {
const file = e.target.files?.[0];
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
try {
const parsed = JSON.parse(String(reader.result));
const incoming = parsed && parsed.entries ? parsed.entries : parsed;
if (!incoming || typeof incoming !== "object") throw new Error("invalid");

// 既存データとマージ(同じIDの記録は上書き、それ以外は追加)
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

// 週次データ(直近 MAX_RADAR_WEEKS 週、entry単位で平均)→ レーダーチャート用に整形
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

// 選択中の日の統計(項目ごとの平均、全体平均)
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

return (
<div className="ic-root">

<style>{`
@import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;600;700&display=swap');

/* =========================================================
全体
========================================================= */

.ic-root {
--bg: #f5f6f8;
--card: rgba(255,255,255,0.92);
--card-solid: #ffffff;
--panel: #f1f2f5;
--line: #e5e7eb;
--text: #17181c;
--text-dim: #8b8e98;
--accent: #3478f6;
--accent-light: #eaf2ff;
--danger: #ff453a;
--shadow: 0 8px 30px rgba(20, 25, 35, 0.06);

font-family:
'Zen Kaku Gothic New',
-apple-system,
BlinkMacSystemFont,
'Hiragino Sans',
'Yu Gothic',
sans-serif;

background:
linear-gradient(
180deg,
#f8f9fb 0%,
#f5f6f8 45%,
#f3f4f6 100%
);

color: var(--text);
min-height: 100vh;
width: 100%;
padding: 18px 14px 60px;
box-sizing: border-box;
max-width: 520px;
margin: 0 auto;
position: relative;
}

.ic-root * {
box-sizing: border-box;
}

button,
input {
font-family: inherit;
}


/* =========================================================
ヘッダー
========================================================= */

.ic-header {
display: flex;
align-items: center;
justify-content: space-between;
margin-bottom: 14px;
padding: 2px 2px;
}

.ic-nav {
display: flex;
align-items: center;
gap: 2px;
}

.ic-nav-btn {
width: 34px;
height: 34px;
border: none;
background: transparent;
color: var(--text-dim);
border-radius: 50%;
padding: 0;
cursor: pointer;

display: flex;
align-items: center;
justify-content: center;

transition:
background 0.15s ease,
color 0.15s ease,
transform 0.1s ease;
}

.ic-nav-btn:hover {
background: #e9ebef;
color: var(--text);
}

.ic-nav-btn:active {
transform: scale(0.9);
color: var(--accent);
}

.ic-month {
font-size: 21px;
font-weight: 700;
letter-spacing: -0.4px;
min-width: 122px;
text-align: center;
}

.ic-header-actions {
display: flex;
gap: 6px;
}

.ic-icon-round {
background: rgba(255,255,255,0.9);
border: 1px solid #e4e6ea;
color: #777b86;
border-radius: 12px;
width: 36px;
height: 36px;

display: flex;
align-items: center;
justify-content: center;

cursor: pointer;

box-shadow: 0 2px 8px rgba(0,0,0,0.04);

transition:
background 0.15s ease,
color 0.15s ease,
transform 0.1s ease;
}

.ic-icon-round:hover {
background: #fff;
color: var(--accent);
}

.ic-icon-round:active {
transform: scale(0.92);
}


/* =========================================================
バックアップメッセージ
========================================================= */

.ic-backup-toast {
background: var(--accent-light);
color: var(--accent);
border-radius: 10px;
padding: 7px 10px;
margin: 0 auto 10px;
width: fit-content;

font-size: 11px;
font-weight: 600;

animation: ic-toast-in 0.2s ease;
}

@keyframes ic-toast-in {
from {
opacity: 0;
transform: translateY(-4px);
}

to {
opacity: 1;
transform: translateY(0);
}
}


/* =========================================================
プライバシーモード
========================================================= */

.ic-blurred {
filter: blur(14px);
pointer-events: none;
user-select: none;
}


/* =========================================================
曜日
========================================================= */

.ic-weekday-row {
display: grid;
grid-template-columns: repeat(7, 1fr);

background: rgba(255,255,255,0.7);

border: 1px solid var(--line);
border-bottom: none;

border-radius: 14px 14px 0 0;

padding: 8px 4px 7px;
}

.ic-weekday {
text-align: center;
font-size: 11px;
font-weight: 600;
color: #777b84;
}

.ic-weekday.ic-sun {
color: #ff453a;
}

.ic-weekday.ic-sat {
color: #3478f6;
}


/* =========================================================
カレンダー
========================================================= */

.ic-grid {
display: grid;
grid-template-columns: repeat(7, 1fr);

background: rgba(255,255,255,0.82);

border-left: 1px solid var(--line);
border-top: 1px solid var(--line);

overflow: hidden;

border-radius: 0 0 14px 14px;

box-shadow: var(--shadow);
}

.ic-cell {
min-height: 72px;

border-right: 1px solid var(--line);
border-bottom: 1px solid var(--line);

padding: 7px 3px 6px;

cursor: pointer;

display: flex;
flex-direction: column;
align-items: center;

background: rgba(255,255,255,0.75);

transition:
background 0.12s ease,
transform 0.1s ease;
}

.ic-cell:hover {
background: #f7faff;
}

.ic-cell:active {
transform: scale(0.98);
}

.ic-cell:nth-child(7n) {
border-right: none;
}

.ic-cell.ic-empty {
cursor: default;
background: #fafafa;
}

.ic-cell.ic-empty:active {
transform: none;
}

.ic-cell.ic-selected {
background: #edf4ff;
}

.ic-cell-day {
font-size: 13px;
font-weight: 600;

width: 27px;
height: 27px;

display: flex;
align-items: center;
justify-content: center;

border-radius: 50%;

color: var(--text);

transition:
background 0.15s ease,
color 0.15s ease,
border 0.15s ease;
}

.ic-cell-day.ic-sun {
color: #ff453a;
}

.ic-cell-day.ic-sat {
color: #3478f6;
}

.ic-cell-day.ic-today {
background: var(--accent);
color: white;

box-shadow:
0 3px 9px rgba(52,120,246,0.28);
}

.ic-cell-day.ic-selected-day {
border: 2px solid var(--accent);
color: var(--accent);
}

.ic-cell-day.ic-selected-day.ic-today {
color: white;
border-color: var(--accent);
}


/* =========================================================
カレンダーの記録ドット
========================================================= */

.ic-dots {
display: flex;
gap: 4px;

margin-top: 6px;

flex-wrap: wrap;
justify-content: center;

max-width: 42px;
}

.ic-dot {
width: 7px;
height: 7px;

border-radius: 50%;

box-shadow:
0 1px 3px rgba(0,0,0,0.15);

transition: transform 0.15s ease;
}

.ic-dot:hover {
transform: scale(1.25);
}

.ic-dot-more {
font-size: 9px;
font-weight: 600;
color: var(--text-dim);
line-height: 7px;
}


/* =========================================================
カレンダー凡例
========================================================= */

.ic-legend {
display: flex;
align-items: center;
gap: 9px;

margin: 11px 4px 0;

font-size: 10px;
font-weight: 500;

color: var(--text-dim);
}

.ic-legend-bar {
flex: 1;
height: 7px;

border-radius: 10px;

background:
linear-gradient(
90deg,
hsl(210,55%,55%),
hsl(170,65%,52%),
hsl(90,65%,52%),
hsl(45,75%,52%),
hsl(15,80%,47%)
);

box-shadow:
inset 0 0 0 1px rgba(0,0,0,0.03);
}


/* =========================================================
選択日のパネル
========================================================= */

.ic-day-panel {
margin-top: 18px;

background: rgba(255,255,255,0.92);

border: 1px solid #e3e5e9;
border-radius: 18px;

padding: 15px;

box-shadow: var(--shadow);

animation: ic-fade-in 0.18s ease;
}

@keyframes ic-fade-in {
from {
opacity: 0;
transform: translateY(-5px);
}

to {
opacity: 1;
transform: translateY(0);
}
}

.ic-day-panel-head {
display: flex;
justify-content: space-between;
align-items: flex-start;

margin-bottom: 13px;
}

.ic-day-panel-title {
font-size: 16px;
font-weight: 700;
letter-spacing: -0.2px;
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

border: 1px solid #e5e6ea;

color: #777b86;

border-radius: 50%;

cursor: pointer;

padding: 0;

display: flex;
align-items: center;
justify-content: center;

transition:
background 0.15s ease,
color 0.15s ease;
}

.ic-help-btn:hover {
background: var(--accent-light);
color: var(--accent);
}


/* =========================================================
ヘルプ
========================================================= */

.ic-help-box {
background: #f8f9fb;

border: 1px solid #e6e7eb;

border-radius: 13px;

padding: 9px 11px;

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
line-height: 1.5;

color: var(--text-dim);

margin-top: 1px;
}


/* =========================================================
その日の統計
========================================================= */

.ic-day-stats {
background:
linear-gradient(
145deg,
#ffffff,
#f8f9fb
);

border: 1px solid #e5e6ea;

border-radius: 14px;

padding: 13px;

margin-bottom: 13px;

box-shadow:
0 3px 12px rgba(20,25,35,0.035);
}

.ic-day-stats-title {
font-size: 11px;
font-weight: 700;

color: #777b84;

margin-bottom: 10px;
}

.ic-stat-row {
display: grid;

grid-template-columns: 78px 1fr 38px;

align-items: center;

gap: 8px;

margin-bottom: 8px;

font-size: 11px;
}

.ic-stat-bar-track {
height: 7px;

border-radius: 10px;

background: #e9ebef;

overflow: hidden;
}

.ic-stat-bar-fill {
height: 100%;

border-radius: 10px;

transition:
width 0.25s ease;
}

.ic-stat-value {
font-weight: 700;

text-align: right;

font-size: 11px;
}

.ic-stat-overall {
display: flex;

justify-content: flex-end;
align-items: baseline;

gap: 7px;

margin-top: 10px;

padding-top: 9px;

border-top: 1px solid #e8e9ec;

font-size: 11px;

color: var(--text-dim);
}

.ic-stat-overall strong {
font-size: 19px;
letter-spacing: -0.5px;
}


/* =========================================================
セクションタイトル
========================================================= */

.ic-section-title {
font-size: 15px;
font-weight: 700;

margin: 30px 3px 10px;

letter-spacing: -0.2px;

display: flex;
align-items: center;
gap: 7px;
}

.ic-section-title::before {
content: "";

width: 4px;
height: 17px;

border-radius: 4px;

background: var(--accent);
}


/* =========================================================
レーダーチャート
========================================================= */

.ic-chart-wrap {
background: rgba(255,255,255,0.92);

border: 1px solid #e3e5e9;

border-radius: 18px;

padding: 14px 7px 7px;

box-shadow: var(--shadow);

overflow: hidden;
}

.ic-empty-msg {
color: var(--text-dim);

font-size: 12px;

text-align: center;

padding: 30px 10px;
}


/* =========================================================
記録カード
========================================================= */

.ic-entry-card {
display: flex;
align-items: center;

gap: 10px;

background: #ffffff;

border: 1px solid #e5e6ea;

border-radius: 14px;

padding: 11px 10px 11px 9px;

margin-bottom: 8px;

cursor: pointer;

box-shadow:
0 2px 8px rgba(20,25,35,0.035);

transition:
transform 0.12s ease,
box-shadow 0.12s ease,
border-color 0.12s ease;
}

.ic-entry-card:hover {
border-color: #d4d9e2;

box-shadow:
0 5px 15px rgba(20,25,35,0.07);

transform: translateY(-1px);
}

.ic-entry-card:active {
transform: scale(0.985);
}

.ic-entry-bar {
width: 5px;

align-self: stretch;

border-radius: 5px;

flex-shrink: 0;

min-height: 38px;
}

.ic-entry-info {
flex: 1;
min-width: 0;
}

.ic-entry-name-row {
display: flex;
align-items: center;

gap: 6px;

min-width: 0;
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

padding: 3px 7px;

border-radius: 8px;

background: #eee9ff;
color: #694fd2;

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

padding: 3px 6px;

border-radius: 7px;

color: #fff;

font-weight: 600;

white-space: nowrap;

box-shadow:
0 1px 2px rgba(0,0,0,0.08);
}

.ic-entry-del {
background: #f4f5f7;

border: none;

color: #a0a3aa;

width: 32px;
height: 32px;

border-radius: 10px;

padding: 0;

cursor: pointer;

flex-shrink: 0;

display: flex;
align-items: center;
justify-content: center;

transition:
background 0.15s ease,
color 0.15s ease;
}

.ic-entry-del:hover {
background: #fff0ef;
color: var(--danger);
}


/* =========================================================
記録追加ボタン
========================================================= */

.ic-add-btn {
width: 100%;

border: 1.5px dashed #cbd0d8;

background: #f9fafb;

color: var(--accent);

border-radius: 14px;

padding: 13px;

font-size: 13px;
font-weight: 700;

display: flex;
align-items: center;
justify-content: center;

gap: 6px;

cursor: pointer;

margin-top: 5px;

transition:
background 0.15s ease,
border-color 0.15s ease,
transform 0.1s ease;
}

.ic-add-btn:hover {
background: var(--accent-light);
border-color: #a8c8ff;
}

.ic-add-btn:active {
transform: scale(0.98);
}


/* =========================================================
モーダル / ドロワー
========================================================= */

.ic-overlay {
position: fixed;

inset: 0;

background: rgba(15,18,25,0.42);

backdrop-filter: blur(4px);
-webkit-backdrop-filter: blur(4px);

z-index: 40;

display: flex;
align-items: flex-end;
justify-content: center;
}

.ic-drawer {
width: 100%;

max-width: 520px;

background: #ffffff;

border-top: 1px solid #e4e5e8;

border-radius: 22px 22px 0 0;

padding: 17px 18px 30px;

max-height: 88vh;

overflow-y: auto;

box-shadow:
0 -10px 40px rgba(0,0,0,0.12);

animation: ic-slide-up 0.22s cubic-bezier(.2,.8,.2,1);
}

@keyframes ic-slide-up {
from {
transform: translateY(35px);
opacity: 0;
}

to {
transform: translateY(0);
opacity: 1;
}
}

.ic-drawer-head {
display: flex;

justify-content: space-between;
align-items: center;

margin-bottom: 18px;
}

.ic-drawer-title {
font-size: 18px;
font-weight: 700;

letter-spacing: -0.3px;
}

.ic-icon-btn {
width: 34px;
height: 34px;

background: #f2f3f5;

border: none;

color: #777b84;

border-radius: 50%;

cursor: pointer;

padding: 0;

display: flex;
align-items: center;
justify-content: center;

transition:
background 0.15s ease,
color 0.15s ease;
}

.ic-icon-btn:hover {
background: #e8e9ed;
color: var(--text);
}


/* =========================================================
入力フォーム
========================================================= */

.ic-field-label {
font-size: 11px;

font-weight: 700;

color: #777b84;

margin-bottom: 8px;
}

.ic-category-row {
display: flex;

gap: 8px;

margin-bottom: 18px;
}

.ic-category-btn {
flex: 1;

border: 1px solid #e1e3e7;

background: #f6f7f9;

color: #4f525a;

border-radius: 12px;

padding: 12px 4px;

font-size: 13px;
font-weight: 700;

cursor: pointer;

transition:
background 0.15s ease,
color 0.15s ease,
border-color 0.15s ease,
transform 0.1s ease;
}

.ic-category-btn:hover {
background: #eef1f5;
}

.ic-category-btn:active {
transform: scale(0.97);
}

.ic-category-btn.ic-cat-selected {
background: var(--accent);

border-color: var(--accent);

color: #fff;

box-shadow:
0 4px 12px rgba(52,120,246,0.22);
}

.ic-name-input {
width: 100%;

border: 1px solid #dfe1e6;

background: #f7f8fa;

border-radius: 12px;

padding: 12px 13px;

font-size: 14px;

color: var(--text);

margin-bottom: 20px;

font-family: inherit;

transition:
border-color 0.15s ease,
background 0.15s ease,
box-shadow 0.15s ease;
}

.ic-name-input::placeholder {
color: #a4a7af;
}

.ic-name-input:focus {
outline: none;

background: #fff;

border-color: var(--accent);

box-shadow:
0 0 0 3px rgba(52,120,246,0.10);
}


/* =========================================================
スライダー
========================================================= */

.ic-metric-row {
margin-bottom: 18px;
}

.ic-metric-label-row {
display: flex;

justify-content: space-between;

margin-bottom: 8px;

font-size: 13px;
font-weight: 600;
}

.ic-metric-value {
font-weight: 800;

min-width: 25px;

text-align: right;

color: var(--accent);
}

.ic-slider {
-webkit-appearance: none;
appearance: none;

width: 100%;

height: 6px;

border-radius: 10px;

outline: none;

background:
linear-gradient(
90deg,
#e4e6ea,
#dfe2e7
);

cursor: pointer;
}

.ic-slider::-webkit-slider-thumb {
-webkit-appearance: none;

width: 22px;
height: 22px;

border-radius: 50%;

background: #fff;

cursor: pointer;

border: 2px solid var(--accent);

box-shadow:
0 2px 6px rgba(0,0,0,0.18);

transition:
transform 0.1s ease;
}

.ic-slider::-webkit-slider-thumb:active {
transform: scale(1.15);
}

.ic-slider::-moz-range-thumb {
width: 22px;
height: 22px;

border-radius: 50%;

background: #fff;

cursor: pointer;

border: 2px solid var(--accent);

box-shadow:
0 2px 6px rgba(0,0,0,0.18);
}


/* =========================================================
ボタン
========================================================= */

.ic-drawer-actions {
display: flex;

gap: 10px;

margin-top: 20px;
}

.ic-btn {
flex: 1;

border-radius: 12px;

padding: 13px;

font-size: 14px;
font-weight: 700;

border: none;

cursor: pointer;

transition:
transform 0.1s ease,
opacity 0.15s ease;
}

.ic-btn:active {
transform: scale(0.98);
}

.ic-btn-save {
background: var(--accent);

color: #fff;

box-shadow:
0 5px 14px rgba(52,120,246,0.22);
}

.ic-btn-save:hover {
opacity: 0.92;
}

.ic-btn-save:disabled {
background: #b8cbed;

cursor: not-allowed;

box-shadow: none;
}

.ic-btn-back {
background: #f0f1f4;

color: #45484f;
}

.ic-btn-back:hover {
background: #e8e9ed;
}


/* =========================================================
保存状態
========================================================= */

.ic-save-toast {
text-align: center;

font-size: 10px;

color: var(--text-dim);

margin-top: 10px;

height: 14px;
}

.ic-storage-warn {
font-size: 10px;

color: #c76b1f;

text-align: center;

margin-top: 8px;
}

.ic-req-hint {
font-size: 10px;

color: #c76b1f;

text-align: center;

margin-top: -5px;

margin-bottom: 10px;
}


/* =========================================================
スマホ最適化
========================================================= */

@media (max-width: 380px) {

.ic-root {
padding-left: 9px;
padding-right: 9px;
}

.ic-month {
font-size: 19px;
min-width: 110px;
}

.ic-icon-round {
width: 33px;
height: 33px;
}

.ic-cell {
min-height: 65px;
padding-top: 6px;
}

.ic-cell-day {
width: 25px;
height: 25px;
font-size: 12px;
}

.ic-entry-card {
padding: 9px 8px;
}

.ic-entry-scores {
gap: 3px;
}

.ic-score-chip {
font-size: 8px;
padding: 3px 5px;
}
}


/* =========================================================
スクロールバー
========================================================= */

.ic-drawer::-webkit-scrollbar {
width: 5px;
}

.ic-drawer::-webkit-scrollbar-track {
background: transparent;
}

.ic-drawer::-webkit-scrollbar-thumb {
background: #d5d7dc;
border-radius: 10px;
}


/* =========================================================
選択時のアニメーション
========================================================= */

.ic-cell.ic-selected .ic-cell-day {
animation: ic-pop 0.16s ease;
}

@keyframes ic-pop {
0% {
transform: scale(0.8);
}

100% {
transform: scale(1);
}
}
`}</style>

<div className="ic-header">
<div className="ic-nav">
<button className="ic-nav-btn" onClick={goPrevMonth}>
<ChevronLeft size={20} />
</button>
<div className="ic-month">{monthLabel}</div>
<button className="ic-nav-btn" onClick={goNextMonth}>
<ChevronRight size={20} />
</button>
</div>
<div className="ic-header-actions">
<button className="ic-icon-round" onClick={handleExport} aria-label="エクスポート" title="JSONでエクスポート">
<Download size={15} />
</button>
<button className="ic-icon-round" onClick={handleImportClick} aria-label="インポート" title="JSONからインポート">
<Upload size={15} />
</button>
<input
ref={fileInputRef}
type="file"
accept="application/json"
style={{ display: "none" }}
onChange={handleImportFile}
/>
<button className="ic-icon-round" onClick={() => setPrivacyMode((v) => !v)} aria-label="表示切り替え">
{privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
</button>
</div>
</div>

{backupMsg && <div className="ic-backup-toast">{backupMsg}</div>}

<div className={privacyMode ? "ic-blurred" : ""}>
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
aria-label="項目の説明"
title="項目の説明"
>
<HelpCircle size={18} />
</button>
</div>

{showHelp && (
<div className="ic-help-box">
{METRICS.map((m) => (
<div className="ic-help-row" key={m.key}>
<span className="ic-help-dot" style={{ background: `hsl(${m.hue}, 60%, 50%)` }} />
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
<strong style={{ color: heatColor(dayStats.overall) }}>
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
aria-label="削除"
>
<Trash2 size={16} />
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
<PolarGrid stroke="#e3e3e7" />
<PolarAngleAxis dataKey="metric" tick={{ fill: "#1c1c1e", fontSize: 11 }} />
<PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "#8a8a8e", fontSize: 10 }} tickCount={6} />
<Tooltip contentStyle={{ background: "#fff", border: "1px solid #e3e3e7", borderRadius: 8, fontSize: 12 }} />
<Legend wrapperStyle={{ fontSize: 11, color: "#8a8a8e" }} />
{radarInfo.weekLabels.map((w, idx) => {
const hue = WEEK_COLORS[idx % WEEK_COLORS.length];
return (
<Radar
key={w}
name={`${w}週`}
dataKey={w}
stroke={`hsl(${hue}, 60%, 50%)`}
fill={`hsl(${hue}, 60%, 55%)`}
fillOpacity={0.12}
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
<X size={20} />
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
placeholder="記録の名前(任意) 例:女優名、作品名、人物"
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
style={{ accentColor: `hsl(${m.hue}, 60%, 50%)` }}
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
{storageError && <div className="ic-storage-warn">保存に失敗しました。もう一度お試しください。</div>}
</div>
</div>
)}
</div>
);
}

