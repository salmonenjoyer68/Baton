import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioEngine, BPM, BEAT_SECONDS, LOOP_BEATS } from "./audio-engine";
import { CATEGORY_GROUPS } from "./sounds";
import { CHARACTERS, SLOT_COUNT } from "./characters";
import { handoff, takeBack } from "./model-play";
import "./style.css";

const DRAG_THRESHOLD = 6;
const BEAT_ANIMATION_MS = Math.round(BEAT_SECONDS * 500);

// 8-bit glyphs drawn as rectangles: no external sprites, no font icons.
const ICON_RECTS = {
  beats: [[2, 2, 8, 2], [1, 4, 10, 2], [2, 6, 8, 4], [3, 10, 2, 1], [7, 10, 2, 1]],
  melody: [[7, 2, 2, 7], [9, 2, 2, 2], [4, 7, 5, 3]],
  effects: [[5, 1, 2, 4], [5, 7, 2, 4], [1, 5, 4, 2], [7, 5, 4, 2], [5, 5, 2, 2]],
  voices: [[4, 1, 4, 6], [3, 7, 6, 2], [5, 9, 2, 2], [3, 11, 6, 1]]
};

function PixelIcon({ kind }) {
  return <svg className="pixel-art category-icon" viewBox="0 0 12 12" aria-hidden="true">
    {ICON_RECTS[kind].map(([x, y, width, height], index) =>
      <rect key={index} x={x} y={y} width={width} height={height} fill="currentColor" />
    )}
  </svg>;
}

function PixelBaton() {
  return <svg className="pixel-art logo-art" viewBox="0 0 20 20" role="img" aria-label="Baton pixel logo">
    <rect x="0" y="0" width="20" height="20" fill="var(--accent)" />
    <rect x="2" y="2" width="16" height="16" fill="var(--bg)" />
    <rect x="4" y="12" width="4" height="4" fill="var(--accent-2)" />
    <rect x="8" y="8" width="2" height="6" fill="var(--accent-2)" />
    <rect x="5" y="14" width="3" height="3" fill="var(--accent)" />
    <rect x="8" y="11" width="3" height="3" fill="var(--accent)" />
    <rect x="11" y="8" width="3" height="3" fill="var(--accent)" />
    <rect x="14" y="5" width="3" height="3" fill="var(--accent)" />
    <rect x="17" y="2" width="2" height="2" fill="var(--text)" />
  </svg>;
}

function CharacterArt({ color, accessory, active }) {
  return <svg className="character-art pixel-art" viewBox="0 0 150 150" aria-hidden="true">
    <rect x="44" y="134" width="62" height="6" fill="var(--muted)" />
    <path
      d="M44 24H106V32H118V44H126V112H118V124H106V132H44V124H32V112H24V44H32V32H44Z"
      style={{ fill: color }}
      stroke="var(--bg)"
      strokeWidth="8"
      strokeLinejoin="miter"
      paintOrder="stroke"
    />
    <rect x="56" y="66" width="10" height="12" fill="var(--bg)" />
    <rect x="84" y="66" width="10" height="12" fill="var(--bg)" />
    {active
      ? <>
          <rect x="58" y="94" width="34" height="20" fill="var(--bg)" />
          <rect x="70" y="106" width="10" height="6" fill="var(--danger)" />
        </>
      : <rect x="62" y="100" width="26" height="5" fill="var(--bg)" />}
    {accessory === "sunglasses" && <g fill="var(--bg)">
      <rect x="46" y="62" width="24" height="14" />
      <rect x="80" y="62" width="24" height="14" />
      <rect x="70" y="67" width="10" height="4" />
    </g>}
    {accessory === "sunhat" && <g>
      <rect x="50" y="22" width="50" height="20" fill="var(--bg)" />
      <rect x="50" y="36" width="50" height="5" fill="var(--danger)" />
      <rect x="28" y="42" width="94" height="10" fill="var(--bg)" />
    </g>}
    {accessory === "flower" && <g>
      <rect x="104" y="28" width="10" height="10" fill="var(--bg)" />
      <rect x="114" y="38" width="10" height="10" fill="var(--bg)" />
      <rect x="94" y="38" width="10" height="10" fill="var(--bg)" />
      <rect x="104" y="48" width="10" height="10" fill="var(--bg)" />
      <rect x="104" y="38" width="10" height="10" fill="var(--accent)" />
    </g>}
    {accessory === "snorkel" && <g>
      <rect x="112" y="52" width="8" height="46" fill="var(--bg)" />
      <rect x="120" y="52" width="10" height="8" fill="var(--bg)" />
      <rect x="96" y="94" width="24" height="8" fill="var(--bg)" />
      <rect x="112" y="60" width="8" height="8" fill="var(--accent-2)" />
    </g>}
    {accessory === "cone" && <g>
      <rect x="104" y="12" width="20" height="8" fill="var(--danger)" />
      <rect x="100" y="20" width="28" height="8" fill="var(--bg)" />
      <rect x="96" y="28" width="36" height="8" fill="var(--bg)" />
      <rect x="92" y="36" width="44" height="8" fill="var(--bg)" />
    </g>}
    {accessory === "ball" && <g>
      <rect x="108" y="96" width="16" height="4" fill="var(--bg)" />
      <rect x="104" y="100" width="24" height="4" fill="var(--bg)" />
      <rect x="100" y="104" width="32" height="16" fill="var(--bg)" />
      <rect x="104" y="120" width="24" height="4" fill="var(--bg)" />
      <rect x="108" y="124" width="16" height="4" fill="var(--bg)" />
      <rect x="104" y="104" width="24" height="16" fill="var(--accent-2)" />
      <rect x="108" y="108" width="16" height="4" fill="var(--bg)" />
    </g>}
    {accessory === "straw" && <g fill="var(--bg)">
      <rect x="96" y="40" width="8" height="26" />
      <rect x="104" y="32" width="8" height="8" />
      <rect x="112" y="24" width="8" height="8" />
      <rect x="120" y="16" width="6" height="8" />
    </g>}
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
  const [starting, setStarting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [selected, setSelected] = useState(null);
  const [dragView, setDragView] = useState(null);
  const [slots, setSlots] = useState(() => Array(SLOT_COUNT).fill(null));
  // Overlay is modal until audio starts: everything behind it is inert.
  const inertWhenStopped = started ? undefined : "";

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
    // A replacement is a fresh assignment: the conductor owns it again and no
    // take or override survives the old instrument.
    setSlot(slot, {
      sound,
      performer: "conductor",
      muted: previous?.muted ?? false,
      solo: previous?.solo ?? false,
      override: null,
      takes: []
    });
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
  // Handoff is a per-slot toggle: model takes the assignment, or gives it back
  // with the override and take log cleared.
  const togglePerformer = (slot) => {
    const layer = slots[slot];
    if (!layer) return;
    const next = layer.performer === "model" ? takeBack(slots, slot) : handoff(slots, slot);
    setSlots(next);
    engine.current?.setLayer(slot, next[slot]);
  };
  const togglePlay = async () => {
    if (starting || !engine.current) return;
    if (!started) setStarted(true);
    if (playing) {
      engine.current.pause();
      setPlaying(false);
      return;
    }
    setStarting(true);
    try {
      await engine.current.start();
      setPlaying(true);
    } finally {
      setStarting(false);
    }
  };
  const handleSlotKey = (event, index) => {
    if (event.target !== event.currentTarget) return;
    if (selected && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      assign(index, selected);
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && slots[index]) {
      event.preventDefault();
      remove(index);
    }
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
    window.setTimeout(() => { suppressClick.current = false; }, 0);
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

  return <div className={`app${dragView ? " dragging" : ""}`} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag} onDragStart={(event) => event.preventDefault()}>
    {!started && <div className="start-overlay" role="dialog" aria-modal="true" aria-labelledby="start-title">
      <div className="start-panel pixel">
        <div className="start-inner">
          <div className="start-logo"><PixelBaton /></div>
          <p className="start-kicker">BATON // 8-BIT BEAT LAB</p>
          <h2 className="start-title" id="start-title">TAP TO<br />START</h2>
          <p className="start-copy">Baton needs one tap to wake the audio engine. Then drop sounds on seven characters and build a loop that stays on time.</p>
          <button type="button" className="start-button pixel pixel-btn" onClick={togglePlay} disabled={starting} autoFocus>
            <span>{starting ? "WAKING UP..." : "START THE MIX"}</span>
          </button>
          <p className="start-foot">Headphones recommended. All twenty sounds are synthesised live in your browser.</p>
        </div>
      </div>
    </div>}
    <header className="topbar" inert={inertWhenStopped}>
      <a className="brand" href="#top" aria-label="Baton home">
        <PixelBaton />
        <span className="brand-name">BATON</span>
      </a>
      <nav className="nav" aria-label="Sections">
        <a className="nav-link" href="#stage">STAGE</a>
        <a className="nav-link" href="#sounds">SOUNDS</a>
      </nav>
      <div className="topbar-actions">
        <span className="bpm-badge">{BPM} BPM</span>
        <button type="button" className="play-button pixel pixel-btn" onClick={togglePlay} disabled={starting} aria-pressed={playing}>
          <span>{playing ? "PAUSE" : "PLAY"}</span>
        </button>
      </div>
    </header>
    <main id="top" inert={inertWhenStopped}>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">7 CHARACTERS / 20 SOUNDS / 1 LOOP</p>
          <h1>BUILD A BEAT<br /><span>WITH THE CREW.</span></h1>
          <p className="intro">Baton is a browser beat lab. Drop a sound on a character, stack layers until the loop feels good, and mute anything that gets in the way. Every sound is generated live and locked to the same eight-beat grid.</p>
          <div className="hero-actions">
            <a className="primary-link pixel pixel-btn" href="#stage"><span>OPEN THE STAGE</span></a>
          </div>
        </div>
      </section>
      <section className="stage-section" id="stage">
        <div className="section-head">
          <div>
            <p className="section-kicker">01 // STAGE</p>
            <h2>THE CREW <span>{activeCount}/{SLOT_COUNT}</span></h2>
          </div>
          <div className="beat-indicator" role="img" aria-label={`Beat ${beat + 1} of ${LOOP_BEATS}`}>
            {Array.from({ length: LOOP_BEATS }, (_, index) =>
              <span className={index === beat && playing ? "current" : ""} key={index} aria-hidden="true">{index + 1}</span>
            )}
          </div>
        </div>
        <p className="section-hint">An {LOOP_BEATS}-beat loop in C minor pentatonic: 20 instruments across {SLOT_COUNT} characters. Drag a sound onto a character. Drag a character's sound off the stage to clear the slot. Tap works too. With a keyboard, pick a sound, then press Enter on a character.</p>
        <div className="stage" style={{ "--beat-ms": `${BEAT_ANIMATION_MS}ms` }}>{slots.map((layer, index) => {
          const sound = layer ? layer.sound : null;
          const character = CHARACTERS[index];
          return <div
            className={`slot pixel ${sound ? `occupied ${sound.category}` : "empty"} ${dragView?.over === index ? "drop-target" : ""}`}
            key={character.id}
            data-slot={index}
            tabIndex={0}
            role="group"
            aria-label={`${character.name} slot, ${sound ? `${sound.name}, played by ${layer.performer === "model" ? "the model" : "the conductor"}` : "empty"}${selected ? ", selected sound ready" : ""}`}
            onKeyDown={(event) => handleSlotKey(event, index)}
            onPointerDown={(event) => { if (event.target.closest("button")) return; beginDrag(event, sound, index); }}
          >
            <div className="slot-top">
              <span className="slot-number">{String(index + 1).padStart(2, "0")}</span>
              {sound && <span className={`slot-performer ${layer.performer === "model" ? "is-model" : ""}`}>
                {layer.performer === "model" ? "MODEL" : "CONDUCTOR"}
              </span>}
              <span className={`slot-state ${sound ? "state-on" : ""}`}>{sound ? "ON" : "OFF"}</span>
            </div>
            <div className={`character ${playing && sound ? "character-beat" : ""}`} key={playing && sound ? beat : "rest"}>
              <CharacterArt color={character.color} accessory={character.accessory} active={Boolean(sound) && playing} />
            </div>
            <strong className="character-name">{character.name}</strong>
            {sound
              ? <>
                  <span className={`chip ${sound.category}`}>{sound.name}</span>
                  <StepDots sound={sound} beat={beat} playing={playing} />
                  <div className="slot-toggles">
                    <button type="button" className={`toggle-btn pixel pixel-btn ${layer.muted ? "on" : ""}`} aria-pressed={layer.muted} onClick={(event) => { event.stopPropagation(); toggleLayer(index, "muted"); }}><span>MUTE</span></button>
                    <button type="button" className={`toggle-btn pixel pixel-btn ${layer.solo ? "on" : ""}`} aria-pressed={layer.solo} onClick={(event) => { event.stopPropagation(); toggleLayer(index, "solo"); }}><span>SOLO</span></button>
                    <button type="button" className={`toggle-btn handoff pixel pixel-btn ${layer.performer === "model" ? "on" : ""}`} aria-pressed={layer.performer === "model"} aria-label={layer.performer === "model" ? `Take ${sound.name} back from the model` : `Hand ${sound.name} to the model`} onClick={(event) => { event.stopPropagation(); togglePerformer(index); }}><span>MODEL</span></button>
                  </div>
                </>
              : <span className="empty-label">{selected ? "TAP TO PLACE" : "NO SOUND"}</span>}
          </div>;
        })}</div>
      </section>
      <section className="palette" id="sounds">
        <div className="section-head">
          <div>
            <p className="section-kicker">02 // SOUND SHELF</p>
            <h2>TWENTY SOUNDS</h2>
          </div>
          <span className="count-badge">20 TOTAL</span>
        </div>
        <p className="section-hint">Tap a sound, then tap a character. Or drag a tile straight onto the stage. Replace a sound by dropping another on top of it.</p>
        {CATEGORY_GROUPS.map((category) => <div className="category" key={category.id}>
          <h3 className={`category-title ${category.id}`}><PixelIcon kind={category.id} />{category.label}<em>{category.sounds.length}/5</em></h3>
          <div className="sound-grid">{category.sounds.map((sound) => <button
            type="button"
            className={`sound-tile pixel ${sound.category} ${selected?.id === sound.id ? "selected" : ""}`}
            key={sound.id}
            aria-pressed={selected?.id === sound.id}
            onPointerDown={(event) => beginDrag(event, sound, null)}
            onClick={() => {
              if (suppressClick.current) { suppressClick.current = false; return; }
              setSelected(sound);
            }}
          >
            <span className="sound-name">{sound.name}</span>
            <span className="dot" aria-hidden="true" />
          </button>)}</div>
        </div>)}
      </section>
    </main>
    <footer className="footer" inert={inertWhenStopped}>
      <strong>BATON</strong>
      <p>Seven friends, twenty procedural sounds, zero audio files. Built with Web Audio and a shared eight-beat clock.</p>
      <p className="footer-meta">{BPM} BPM / {LOOP_BEATS}-BEAT LOOP / C MINOR PENTATONIC</p>
    </footer>
    {dragView && <div className={`drag-ghost pixel ${dragView.sound.category}`} style={{ left: dragView.x, top: dragView.y }}><span>{dragView.sound.name}</span></div>}
  </div>;
}

createRoot(document.getElementById("app")).render(<App />);
