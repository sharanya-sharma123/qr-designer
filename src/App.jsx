import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import "./App.css";

const PRESETS = {
  Classic: { fg: "#000000", bg: "#ffffff" },
  Midnight: { fg: "#e2e8f0", bg: "#0f172a" },
  Ocean: { fg: "#0c4a6e", bg: "#e0f2fe" },
  Forest: { fg: "#14532d", bg: "#dcfce7" },
  Sunset: { fg: "#7c2d12", bg: "#ffedd5" },
};

const TYPES = ["URL", "Text", "Email", "Phone", "Wi-Fi"];

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const esc = (s) => s.replace(/([\\;,:"])/g, "\\$1");

function buildData(type, f) {
  switch (type) {
    case "URL": {
      if (!f.url.trim()) return { error: "Enter a URL." };
      try {
        const u = new URL(f.url.trim());
        if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad");
        return { data: u.href };
      } catch {
        return { error: "Enter a valid URL starting with http:// or https://" };
      }
    }
    case "Text":
      return f.text.trim() ? { data: f.text } : { error: "Enter some text." };
    case "Email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
        return { error: "Enter a valid email address." };
      const q = new URLSearchParams();
      if (f.subject) q.set("subject", f.subject);
      if (f.body) q.set("body", f.body);
      const qs = q.toString().replace(/\+/g, "%20");
      return { data: `mailto:${f.email}${qs ? "?" + qs : ""}` };
    }
    case "Phone":
      return /^\+?[0-9\s-]{7,15}$/.test(f.phone.trim())
        ? { data: `tel:${f.phone.replace(/[\s-]/g, "")}` }
        : { error: "Enter a valid phone number (7-15 digits, optional +)." };
    case "Wi-Fi":
      if (!f.ssid.trim()) return { error: "Network name (SSID) is required." };
      if (f.security !== "nopass" && f.password.length < 8)
        return { error: "Password must be at least 8 characters." };
      return {
        data: `WIFI:T:${f.security};S:${esc(f.ssid)};${
          f.security === "nopass" ? "" : `P:${esc(f.password)};`
        };`,
      };
    default:
      return { error: "Unknown type" };
  }
}

export default function App() {
  const [type, setType] = useState("URL");
  const [f, setF] = useState({
    url: "https://", text: "", email: "", subject: "", body: "",
    phone: "", ssid: "", password: "", security: "WPA",
  });
  const [style, setStyle] = useState({ size: 256, margin: 4, ecl: "M", ...PRESETS.Classic });
  const [preset, setPreset] = useState("Classic");
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("recentQRs")) || []; } catch { return []; }
  });
  const canvasRef = useRef(null);

  const { data, error } = buildData(type, f);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setS = (k, v) => {
    setStyle({ ...style, [k]: v });
    if (k === "fg" || k === "bg") setPreset("");
  };

  // warnings for scan reliability
  const warnings = [];
  const ratio = contrast(style.fg, style.bg);
  if (ratio < 3) warnings.push(`Low contrast (${ratio.toFixed(1)}:1). Aim for 4:1 or higher.`);
  if (luminance(style.fg) > luminance(style.bg)) warnings.push("Inverted colors (light on dark) may not scan on some readers.");
  if (style.margin < 4) warnings.push("Margin under 4 modules may hurt scanning.");
  if (style.size < 160) warnings.push("Small size may be hard to scan.");
  if (data && data.length > 300 && style.ecl === "H") warnings.push("Long data with High error correction makes a dense, harder-to-scan code.");

  // render preview
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: style.size, margin: style.margin, errorCorrectionLevel: style.ecl,
      color: { dark: style.fg, light: style.bg },
    }).catch(() => {});
  }, [data, style]);

  // save to recents (debounced), persisted to localStorage
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => {
      const entry = { id: Date.now(), type, f, style, preset, label: data.slice(0, 40) };
      setRecent((r) => {
        const sig = (x) => JSON.stringify([x.type, x.f, x.style]);
        const next = [entry, ...r.filter((x) => sig(x) !== sig(entry))].slice(0, 8);
        localStorage.setItem("recentQRs", JSON.stringify(next));
        return next;
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [data, style]); // eslint-disable-line

  const download = () => {
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `qr-${type.toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  };

  const reuse = (r) => { setType(r.type); setF(r.f); setStyle(r.style); setPreset(r.preset); };
  const clearRecent = () => { setRecent([]); localStorage.removeItem("recentQRs"); };

  const input = (label, key, props = {}) => (
    <label>{label}<input value={f[key]} onChange={set(key)} {...props} /></label>
  );

  return (
    <div className="app">
      <h1>QR Code Generator &amp; Designer</h1>
      <div className="grid">
        <section className="card">
          <div className="tabs">
            {TYPES.map((t) => (
              <button key={t} className={t === type ? "active" : ""} onClick={() => setType(t)}>{t}</button>
            ))}
          </div>

          {type === "URL" && input("URL", "url", { placeholder: "https://example.com" })}
          {type === "Text" && (
            <label>Text<textarea rows={4} value={f.text} onChange={set("text")} /></label>
          )}
          {type === "Email" && (<>
            {input("Email address", "email", { type: "email" })}
            {input("Subject (optional)", "subject")}
            {input("Body (optional)", "body")}
          </>)}
          {type === "Phone" && input("Phone number", "phone", { placeholder: "+91 98765 43210" })}
          {type === "Wi-Fi" && (<>
            {input("Network name (SSID)", "ssid")}
            <label>Security
              <select value={f.security} onChange={set("security")}>
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None</option>
              </select>
            </label>
            {f.security !== "nopass" && input("Password", "password", { type: "text" })}
          </>)}

          {error && <p className="error" role="alert">{error}</p>}

          <h3>Presets</h3>
          <div className="presets">
            {Object.entries(PRESETS).map(([name, p]) => (
              <button key={name} className={preset === name ? "active" : ""}
                onClick={() => { setPreset(name); setStyle({ ...style, ...p }); }}>
                <span className="swatch" style={{ background: p.bg, borderColor: p.fg, color: p.fg }}>■</span>{name}
              </button>
            ))}
          </div>

          <h3>Customize</h3>
          <label>Size: {style.size}px
            <input type="range" min="128" max="512" step="16" value={style.size} onChange={(e) => setS("size", +e.target.value)} /></label>
          <label>Margin: {style.margin} modules
            <input type="range" min="0" max="10" value={style.margin} onChange={(e) => setS("margin", +e.target.value)} /></label>
          <div className="row">
            <label>Foreground<input type="color" value={style.fg} onChange={(e) => setS("fg", e.target.value)} /></label>
            <label>Background<input type="color" value={style.bg} onChange={(e) => setS("bg", e.target.value)} /></label>
            <label>Error correction
              <select value={style.ecl} onChange={(e) => setS("ecl", e.target.value)}>
                <option value="L">L (7%)</option><option value="M">M (15%)</option>
                <option value="Q">Q (25%)</option><option value="H">H (30%)</option>
              </select></label>
          </div>
        </section>

        <section className="card preview">
          <h3>Preview</h3>
          {data ? <canvas ref={canvasRef} /> : <div className="placeholder">Fill in valid details to see your QR code</div>}
          {warnings.map((w) => <p key={w} className="warn">⚠ {w}</p>)}
          <button className="primary" disabled={!data} onClick={download}>Download PNG</button>
        </section>
      </div>

      <section className="card">
        <div className="row between">
          <h3>Recent QR codes</h3>
          {recent.length > 0 && <button onClick={clearRecent}>Clear</button>}
        </div>
        {recent.length === 0 && <p className="muted">Nothing yet. Generated codes appear here and survive refresh.</p>}
        <div className="recent">
          {recent.map((r) => (
            <button key={r.id} onClick={() => reuse(r)} title="Click to reuse">
              <strong>{r.type}</strong><span>{r.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}