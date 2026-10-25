import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioEngine, BPM, LOOP_BEATS } from "./audio-engine";
import "./style.css";

const CATEGORIES = [
  { id: "beats", label: "Beats", color: "coral", icon: "●" },
  { id: "melody", label: "Bass + Melody", color: "turquoise", icon: "≈" },
  { id: "effects", label: "Effects", color: "mango", icon: "✦" },
  { id: "voices", label: "Voices", color: "pink", icon: "◖" }
];
const SOUND_NAMES = [
  ["Kick bloom", "Clap snap", "Hi-hat fizz", "Conga pop", "Shaker sun"],
  ["Moon bass", "Palm pluck", "Lagoon lead", "Tide keys", "Coconut sub"],
  ["Sunrise sweep", "Wave wash", "Spark stab", "Heat shimmer", "Star burst"],
  ["Ooh breeze", "Hey hey", "Hum tide", "La la loop", "Vocal glow"]
];
const CHARACTERS = [
  ["Sol", "#FF6B5B", "sunglasses"], ["Pip", "#1FC8C3", "sunhat"], ["Momo", "#FF4D8D", "flower"],
  ["Bubbles", "#FF9F1C", "snorkel"], ["Nilla", "#7BDFF2", "cone"], ["Cove", "#B8E986", "ball"], ["Sunny", "#FFD23F", "straw"]
];
const SOUND_TYPES = ["noise", "noise", "noise", "noise", "noise", "bass", "melody", "melody", "melody", "bass", "effect", "effect", "effect", "effect", "effect", "voice", "voice", "voice", "voice", "voice"];
const SOUNDS = CATEGORIES.flatMap((category, categoryIndex) => SOUND_NAMES[categoryIndex].map((name, index) => ({
  id: `${category.id}-${index}`, name, category: category.id, color: category.color,
  type: SOUND_TYPES[categoryIndex * 5 + index], note: categoryIndex + index
})));

function CharacterArt({ color, accessory, active }) {
  return <svg className="character-art" viewBox="0 0 150 150" aria-hidden="true">
    <ellipse className="blob-shadow" cx="75" cy="136" rx="40" ry="7" />
    <path className="blob" fill={color} d={active ? "M28 88c-5-35 15-67 47-67s54 28 47 66c-4 33-25 48-49 48S33 121 28 88Z" : "M30 91c0-38 17-65 45-65s47 25 47 65c0 28-17 42-46 42S30 119 30 91Z"} />
    <circle className="eye" cx="58" cy="82" r="5" /><circle className="eye" cx="92" cy="82" r="5" />
    <path className={`mouth ${active ? "mouth-open" : ""}`} d={active ? "M58 101q17 15 34 0q-4 27-17 27t-17-27Z" : "M61 103q14 10 28 0"} />
    {accessory === "sunglasses" && <path className="accessory" d="M42 73h25l-3 17H46Zm41 0h25l-4 17H87Z M67 79h16" />}
    {accessory === "sunhat" && <path className="accessory" d="M28 55q47-24 94 0H28Zm17-8q4-27 30-27t31 27" />}
    {accessory === "flower" && <g className="accessory"><circle cx="112" cy="40" r="7"/><circle cx="123" cy="47" r="7"/><circle cx="112" cy="54" r="7"/><circle cx="102" cy="47" r="7"/><circle cx="112" cy="47" r="4"/></g>}
    {accessory === "snorkel" && <path className="accessory" d="M105 78q24-18 24 12v12h-15" />}
    {accessory === "cone" && <path className="accessory" d="m105 30 13 28h-26Z M98 37h10m-14 8h18" />}
    {accessory === "ball" && <circle className="accessory" cx="116" cy="116" r="18" />}
    {accessory === "straw" && <path className="accessory" d="M94 42q25-17 29 6M103 33h24" />}
  </svg>;
}

function App() {
  const engine = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [selected, setSelected] = useState(null);
  const [layers, setLayers] = useState(() => Array(7).fill(null));
  const [muted, setMuted] = useState(() => Array(7).fill(false));
  const [solo, setSolo] = useState(() => Array(7).fill(false));

  useEffect(() => {
    engine.current = new AudioEngine(setBeat);
    return () => engine.current?.pause();
  }, []);
  const activeCount = layers.filter(Boolean).length;
  const assign = (slot, sound) => {
    setLayers((current) => { const next = [...current]; next[slot] = sound; return next; });
    engine.current?.setLayer(slot, sound, muted[slot], solo[slot]);
    setSelected(null);
  };
  const togglePlay = async () => {
    if (!started) setStarted(true);
    if (playing) engine.current.pause(); else await engine.current.start();
    setPlaying(!playing);
  };
  const toggleState = (slot, key) => {
    const setter = key === "muted" ? setMuted : setSolo;
    setter((current) => { const next = [...current]; next[slot] = !next[slot]; engine.current?.setLayer(slot, layers[slot], key === "muted" ? next[slot] : muted[slot], key === "solo" ? next[slot] : solo[slot]); return next; });
  };
  const remove = (slot) => { setLayers((current) => { const next = [...current]; next[slot] = null; return next; }); engine.current?.removeLayer(slot); };
  const categories = useMemo(() => CATEGORIES.map((category) => ({ ...category, sounds: SOUNDS.filter((sound) => sound.category === category.id) })), []);

  return <div className={`app active-${activeCount}`}>
    {!started && <button className="start-overlay" onClick={togglePlay}><span className="sun-mark">☀</span><strong>Tap to start</strong><small>Build a beachside beat with Baton</small></button>}
    <div className="sun" /><div className="cloud cloud-one" /><div className="cloud cloud-two" />
    <header className="topbar"><div className="brand"><span className="brand-dot">♪</span><span>BATON</span></div><div className="tempo">{BPM} BPM · 8 BEAT LOOP</div><button className="play-button" onClick={togglePlay}>{playing ? "❚❚ Pause" : "▶ Play"}</button></header>
    <main>
      <section className="hero"><p className="eyebrow">SUMMER SOUND LAB</p><h1>Make waves.<br /><em>Make music.</em></h1><p className="intro">Pick a sound, place it on a friend, and let the beach party grow.</p></section>
      <section className="stage-section"><div className="section-heading"><h2>The crew <span>{activeCount}/7</span></h2><div className="beat-indicator" aria-label={`Beat ${beat + 1} of ${LOOP_BEATS}`}>{Array.from({ length: LOOP_BEATS }, (_, index) => <i className={index === beat && playing ? "current" : ""} key={index} />)}</div></div>
        <div className="stage">{layers.map((sound, index) => <div className={`slot ${sound ? "occupied" : ""} ${playing && sound ? "performing" : ""}`} key={index} onClick={() => selected && assign(index, selected)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = SOUNDS.find((item) => item.id === event.dataTransfer.getData("sound")); if (dropped) assign(index, dropped); }} onPointerUp={(event) => { if (selected) assign(index, selected); else if (event.currentTarget === event.target && sound) remove(index); }}>
          <div className="character"><CharacterArt color={CHARACTERS[index][1]} accessory={CHARACTERS[index][2]} active={Boolean(sound) && playing} /></div>
          <strong>{CHARACTERS[index][0]}</strong>{sound ? <><span className="assigned">{sound.name}</span><div className="slot-controls"><button onClick={(event) => { event.stopPropagation(); toggleState(index, "muted"); }}>{muted[index] ? "Muted" : "Mute"}</button><button onClick={(event) => { event.stopPropagation(); toggleState(index, "solo"); }}>{solo[index] ? "Soloing" : "Solo"}</button></div></> : <span className="empty-label">{selected ? "Tap to place" : "Empty spot"}</span>}
        </div>)}</div>
      </section>
      <section className="palette"><div className="section-heading"><h2>Sound shelf</h2><span className="hint">Drag, or tap then choose a friend</span></div>{categories.map((category) =>       <div className="category" key={category.id}><h3 className={`category-title ${category.color}`}><span>{category.icon}</span>{category.label}</h3><div className="sound-grid">{category.sounds.map((sound) => <button className={`sound-tile ${sound.color} ${selected?.id === sound.id ? "selected" : ""}`} key={sound.id} onClick={() => setSelected(sound)} onPointerDown={(event) => { setSelected(sound); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { if (event.currentTarget.releasePointerCapture) event.currentTarget.releasePointerCapture(event.pointerId); }} draggable onDragStart={(event) => event.dataTransfer.setData("sound", sound.id)}>{sound.name}<span>{category.icon}</span></button>)}</div></div>)}</section>
    </main>
    <div className="waves" />
  </div>;
}

const root = globalThis.__batonRoot ?? createRoot(document.getElementById("app"));
globalThis.__batonRoot = root;
root.render(<App />);
