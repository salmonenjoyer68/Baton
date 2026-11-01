import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioEngine, BPM, BEAT_SECONDS, LOOP_BEATS } from "./audio-engine";
import { CATEGORY_GROUPS } from "./sounds";
import { CHARACTERS, SLOT_COUNT } from "./characters";
import "./style.css";

const DRAG_THRESHOLD = 6;
const BEAT_ANIMATION_MS = Math.round(BEAT_SECONDS * 500);

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

// The layer's 8-beat pattern, with the beat that is sounding right now marked.
function StepDots({ sound, beat, playing }) {
  return <span className="steps" aria-hidden="true">{sound.steps.map((velocity, index) =>
    <i key={index} className={`${velocity ? "on" : ""}${playing && index === beat ? " now" : ""}`} />
  )}</span>;
}

function App() {
  const engine = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [selected, setSelected] = useState(null);
  const [dragView, setDragView] = useState(null);
  const [slots, setSlots] = useState(() => Array(SLOT_COUNT).fill(null));

  useEffect(() => {
    engine.current = new AudioEngine(setBeat);
    return () => engine.current?.pause();
  }, []);
  // A pointer released outside the window never delivers pointerup; drop the
  // drag so the ghost cannot get stuck on screen.
  useEffect(() => {
    const abort = () => { drag.current = null; setDragView(null); };
    window.addEventListener("blur", abort);
    return () => window.removeEventListener("blur", abort);
  }, []);

  const activeCount = slots.filter(Boolean).length;

  const setSlot = (slot, layer) => {
    setSlots((current) => { const next = [...current]; next[slot] = layer; return next; });
    engine.current?.setLayer(slot, layer);
  };
  const assign = (slot, sound) => {
    const previous = slots[slot];
    setSlot(slot, { sound, muted: previous?.muted ?? false, solo: previous?.solo ?? false });
    setSelected(null);
  };
  const remove = (slot) => setSlot(slot, null);
  const move = (from, to) => {
    const layer = slots[from];
    if (!layer) return;
    setSlot(to, layer);
    setSlot(from, null);
    setSelected(null);
  };
  const toggleLayer = (slot, key) => {
    const layer = slots[slot];
    if (!layer) return;
    setSlot(slot, { ...layer, [key]: !layer[key] });
  };
  const togglePlay = async () => {
    if (!started) setStarted(true);
    if (playing) engine.current.pause(); else await engine.current.start();
    setPlaying(!playing);
  };

  // Pointer-based drag and drop: works for mouse, touch, and pen. HTML5 drag
  // events are deliberately not used; touch never fires them.
  const slotAt = (x, y) => {
    const element = document.elementFromPoint(x, y);
    const slot = element && element.closest("[data-slot]");
    return slot ? Number(slot.dataset.slot) : null;
  };
  const beginDrag = (event, sound, from) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressClick.current = false;
    drag.current = { pointerId: event.pointerId, sound, from, startX: event.clientX, startY: event.clientY, moved: false };
  };
  const moveDrag = (event) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (!current.moved) {
      const travel = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
      if (travel < DRAG_THRESHOLD) return;
      if (!current.sound) { drag.current = null; return; }
      current.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    setDragView({ sound: current.sound, x: event.clientX, y: event.clientY, over: slotAt(event.clientX, event.clientY) });
  };
  const endDrag = (event) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    drag.current = null;
    setDragView(null);
    if (!current.moved) {
      if (current.from === null && current.sound) setSelected(current.sound);
      else if (current.from !== null && selected) assign(current.from, selected);
      return;
    }
    suppressClick.current = true;
    const target = slotAt(event.clientX, event.clientY);
    if (current.from === null) {
      if (target !== null) assign(target, current.sound);
    } else if (target === null) {
      remove(current.from);
    } else if (target !== current.from) {
      move(current.from, target);
    }
  };
  const cancelDrag = () => { drag.current = null; setDragView(null); };

  return <div className={`app active-${activeCount}${dragView ? " dragging" : ""}`} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}>
    {!started && <button className="start-overlay" onClick={togglePlay}><span className="sun-mark">☀</span><strong>Tap to start</strong><small>Build a beachside beat with Baton</small></button>}
    <div className="sun" /><div className="cloud cloud-one" /><div className="cloud cloud-two" />
    <header className="topbar"><div className="brand"><span className="brand-dot">♪</span><span>BATON</span></div><div className="tempo">{BPM} BPM · 8 BEAT LOOP</div><button className="play-button" onClick={togglePlay}>{playing ? "❚❚ Pause" : "▶ Play"}</button></header>
    <main>
      <section className="hero"><p className="eyebrow">SUMMER SOUND LAB</p><h1>Make waves.<br /><em>Make music.</em></h1><p className="intro">Pick a sound, place it on a friend, and let the beach party grow.</p></section>
      <section className="stage-section">
        <div className="section-heading"><h2>The crew <span>{activeCount}/{SLOT_COUNT}</span></h2><div className="beat-indicator" aria-label={`Beat ${beat + 1} of ${LOOP_BEATS}`}>{Array.from({ length: LOOP_BEATS }, (_, index) => <i className={index === beat && playing ? "current" : ""} key={index} />)}</div></div>
        <div className="stage" style={{ "--beat-ms": `${BEAT_ANIMATION_MS}ms` }}>{slots.map((layer, index) => {
          const sound = layer ? layer.sound : null;
          const character = CHARACTERS[index];
          return <div className={`slot ${sound ? "occupied" : ""} ${dragView?.over === index ? "drop-target" : ""}`} key={character.id} data-slot={index} onPointerDown={(event) => { if (event.target.closest("button")) return; beginDrag(event, sound, index); }}>
            <div className={`character ${playing && sound ? "character-beat" : ""}`} key={playing && sound ? beat : "rest"}><CharacterArt color={character.color} accessory={character.accessory} active={Boolean(sound) && playing} /></div>
            <strong>{character.name}</strong>
            {sound
              ? <>
                  <span className={`chip ${sound.category}`}>{sound.name}</span>
                  <StepDots sound={sound} beat={beat} playing={playing} />
                  <div className="slot-toggles">
                    <button className={layer.muted ? "on" : ""} aria-pressed={layer.muted} onClick={(event) => { event.stopPropagation(); toggleLayer(index, "muted"); }}>Mute</button>
                    <button className={layer.solo ? "on" : ""} aria-pressed={layer.solo} onClick={(event) => { event.stopPropagation(); toggleLayer(index, "solo"); }}>Solo</button>
                  </div>
                </>
              : <span className="empty-label">{selected ? "Tap to place" : "Empty spot"}</span>}
          </div>;
        })}</div>
      </section>
      <section className="palette">
        <div className="section-heading"><h2>Sound shelf</h2><span className="hint">Drag, or tap then choose a friend</span></div>
        {CATEGORY_GROUPS.map((category) => <div className="category" key={category.id}>
          <h3 className={`category-title ${category.color}`}><span>{category.icon}</span>{category.label}<em>{category.sounds.length}</em></h3>
          <div className="sound-grid">{category.sounds.map((sound) => <button className={`sound-tile ${sound.category} ${selected && selected.id === sound.id ? "selected" : ""}`} key={sound.id} onPointerDown={(event) => beginDrag(event, sound, null)} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setSelected(sound); }}>{sound.name}<i className="dot" /></button>)}</div>
        </div>)}
      </section>
    </main>
    {dragView && <div className="drag-ghost" style={{ left: dragView.x, top: dragView.y }}>{dragView.sound.name}</div>}
    <div className="waves" />
  </div>;
}

const root = globalThis.__batonRoot ?? createRoot(document.getElementById("app"));
globalThis.__batonRoot = root;
root.render(<App />);
