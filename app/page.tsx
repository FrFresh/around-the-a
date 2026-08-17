"use client";

import { useEffect, useState } from "react";
import { PlayerSelector } from "../src/components/PlayerSelector";
import {
  createBrowserGameManager,
  type GameManager,
  type GameSnapshot,
} from "../src/game-engine";
import { defaultPlayer } from "../src/game/player-state";
import type { EvaluationResult } from "../src/game/types";
import { fivePoints } from "../src/scenarios/five-points";
import type { PlayerId } from "../src/types";

type View = "map" | "scenario" | "success" | "passport" | "players";

const stops = [
  {
    id: "five-points",
    name: "Five Points",
    area: "Downtown",
    icon: "✦",
    x: 42,
    y: 72,
  },
  {
    id: "ponce",
    name: "Ponce City Market",
    area: "Old Fourth Ward",
    icon: "P",
    x: 64,
    y: 43,
  },
  {
    id: "career",
    name: "Career Route",
    area: "Coming later",
    icon: "C",
    x: 19,
    y: 20,
  },
  {
    id: "creator",
    name: "Creator Route",
    area: "Coming later",
    icon: "✎",
    x: 39,
    y: 12,
  },
  {
    id: "business",
    name: "Business Route",
    area: "Coming later",
    icon: "B",
    x: 62,
    y: 16,
  },
  {
    id: "everyday",
    name: "Everyday Life",
    area: "Coming later",
    icon: "⌂",
    x: 82,
    y: 26,
  },
];

const dimensions = [
  ["goal", "Goal", "What you need to accomplish"],
  ["context", "Context", "What’s happening right now"],
  ["constraints", "Constraints", "Time, budget, or resources"],
  ["desiredOutput", "Output", "The shape of the answer"],
] as const;

export default function Home() {
  const [game, setGame] = useState<GameManager | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    players: [],
    activeSave: null,
    state: defaultPlayer,
  });
  const [view, setView] = useState<View>("map");
  const [input, setInput] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      void createBrowserGameManager().then((manager) => {
        if (!active) return;
        const next = manager.getSnapshot();
        setGame(manager);
        setSnapshot(next);
        if (!next.activeSave) setView("players");
        setHydrated(true);
      });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const { activeSave, players: profiles, state: player } = snapshot;

  const completed = player.completedScenarios.includes(fivePoints.id);
  const ponceUnlocked = player.unlockedScenarios.includes("ponce-verification");
  const attempt = player.scenarioAttempts[fivePoints.id] ?? 0;

  async function submit() {
    if (!input.trim() || !game) return;
    const result = await game.submitPlayerResponse(fivePoints.id, input);
    setEvaluation(result.evaluation);
    setSnapshot(result.snapshot);
    if (result.completed) setView("success");
  }

  function startScenario() {
    if (!activeSave) {
      setView("players");
      return;
    }
    if (completed) {
      setView("success");
      return;
    }
    setInput("");
    setEvaluation(null);
    setView("scenario");
  }

  function createPlayer(displayName: string) {
    if (!game) return;
    setSnapshot(game.createPlayer(displayName));
    setEvaluation(null);
    setView("map");
  }

  function switchPlayer(id: PlayerId) {
    if (!game) return;
    setSnapshot(game.switchPlayer(id));
    setInput("");
    setEvaluation(null);
    setView("map");
  }

  function deletePlayer(id: PlayerId) {
    if (!game) return;
    const profile = profiles.find((candidate) => candidate.id === id);
    if (
      !window.confirm(
        `Delete ${profile?.displayName ?? "this traveler"} and all of their progress?`,
      )
    )
      return;
    const next = game.deletePlayer(id);
    setSnapshot(next);
    setInput("");
    setEvaluation(null);
    setView(next.activeSave ? "map" : "players");
  }

  if (!hydrated) return <main className="loading">Loading Atlanta…</main>;

  return (
    <main className="game-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setView("map")}
          aria-label="Go to Atlanta map"
        >
          <span className="brand-mark">A</span>
          <span>
            AROUND
            <br />
            THE A
          </span>
        </button>
        <div className="stats" aria-label="Player stats">
          <button
            className="profile-button"
            onClick={() => setView("players")}
            aria-label="Switch player"
          >
            <span>
              {activeSave?.player.displayName.slice(0, 1).toUpperCase() ?? "+"}
            </span>
            <b>{activeSave?.player.displayName ?? "NEW PLAYER"}</b>
          </button>
          <span>
            <b>XP</b> {player.xp}
          </span>
          <span className="points">
            <b>A</b> {player.aPoints}
          </span>
          <button
            className="passport-button"
            onClick={() => setView("passport")}
            aria-label="Open AI Literacy Passport"
          >
            ▣
          </button>
        </div>
      </header>

      {view === "players" && (
        <PlayerSelector
          players={profiles}
          activePlayerId={activeSave?.player.id ?? null}
          onCreate={createPlayer}
          onSelect={switchPlayer}
          onDelete={deletePlayer}
          onClose={activeSave ? () => setView("map") : undefined}
        />
      )}

      {view === "map" && activeSave && (
        <section className="map-screen">
          <div className="map-copy">
            <p className="eyebrow">ATLANTA AI TRANSIT AUTHORITY</p>
            <h1>
              Where will better
              <br />
              questions take you?
            </h1>
            <p>
              Explore Atlanta. Help your neighbors. Build the five skills to
              move with AI.
            </p>
          </div>
          <div className="pixel-map" aria-label="Atlanta learning route map">
            <div className="skyline" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </div>
            <div className="route route-main"></div>
            <div className="route route-branches"></div>
            {stops.map((stop) => {
              const open =
                stop.id === "five-points" ||
                (stop.id === "ponce" && ponceUnlocked);
              return (
                <button
                  key={stop.id}
                  className={`map-stop ${open ? "open" : "locked"} ${stop.id === "five-points" ? "active" : ""}`}
                  style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                  onClick={
                    stop.id === "five-points" ? startScenario : undefined
                  }
                  aria-label={`${stop.name}, ${open ? "unlocked" : "locked"}`}
                >
                  <span className="stop-pin">{open ? stop.icon : "×"}</span>
                  <span className="stop-label">
                    {stop.name}
                    <small>{open ? stop.area : "LOCKED"}</small>
                  </span>
                </button>
              );
            })}
            <div
              className="player-sprite"
              style={{ left: "29%", top: "72%" }}
              aria-hidden="true"
            >
              <span>●</span>
            </div>
          </div>
          <div className="mission-card">
            <div>
              <span className="mission-number">01</span>
              <p>
                <b>{completed ? "LESSON COMPLETE" : "CURRENT STOP"}</b>
                <br />
                Five Points Station
              </p>
            </div>
            <button onClick={startScenario}>
              {completed ? "VIEW BADGE" : "ENTER STATION"} <span>→</span>
            </button>
          </div>
        </section>
      )}

      {view === "scenario" && (
        <section className="scenario-screen">
          <button className="back" onClick={() => setView("map")}>
            ← MAP
          </button>
          <div className="location-banner">
            <span>STOP 01</span>
            <h1>FIVE POINTS</h1>
            <p>DOWNTOWN ATLANTA • 8:42 AM</p>
          </div>
          <div
            className="station-scene"
            aria-label="Pixel art transit station at Five Points"
          >
            <div className="sign">FIVE POINTS</div>
            <div className="train">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="npc-sprite" aria-hidden="true">
              <i></i>
            </div>
            <div className="you-sprite" aria-hidden="true">
              <i></i>
            </div>
          </div>
          <div className="objective">
            <span>OBJECTIVE</span>
            <p>Reach your Midtown interview by 9:20 AM.</p>
          </div>
          <div className="dialogue">
            <div className="speaker">
              <span className="portrait">T</span>
              <p>
                <b>TREY</b>
                <small>STATION REGULAR</small>
              </p>
            </div>
            <p className="dialogue-text">
              {evaluation
                ? evaluation.passed
                  ? "Okay, now I know what you’re actually dealing with. Here’s the move…"
                  : evaluation.npcResponse
                : attempt
                  ? "Give me the details that matter and I can point you right."
                  : "Gold Line’s acting up again. Where you trying to get to?"}
            </p>
          </div>
          {evaluation && !evaluation.passed && (
            <div className="feedback-card" aria-live="polite">
              <div className="feedback-head">
                <span>QUESTION CHECK</span>
                <b>{evaluation.score}/4 SIGNALS</b>
              </div>
              <div className="dimension-grid">
                {dimensions.map(([key, label, help]) => (
                  <div
                    className={evaluation.dimensions[key] ? "hit" : "miss"}
                    key={key}
                  >
                    <span>{evaluation.dimensions[key] ? "✓" : "+"}</span>
                    <p>
                      <b>{label}</b>
                      <small>{help}</small>
                    </p>
                  </div>
                ))}
              </div>
              <p className="coach-note">{evaluation.feedback}</p>
            </div>
          )}
          <div className="ask-box">
            <label htmlFor="question">ASK TREY A BETTER QUESTION</label>
            <textarea
              id="question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: I’m at Five Points and need to…"
              rows={4}
            />
            <div>
              <small>{input.length}/320</small>
              <button onClick={submit} disabled={!input.trim()}>
                ASK <span>→</span>
              </button>
            </div>
          </div>
          <aside className="skill-strip">
            <b>SKILL IN PLAY</b>
            <span className="mini-badge">A?</span>
            <p>
              <strong>ASK BETTER</strong>
              <br />
              Goal • Context • Constraints • Output
            </p>
          </aside>
        </section>
      )}

      {view === "success" && (
        <section className="success-screen">
          <div className="confetti" aria-hidden="true">
            ✦　·　✦　·　✦
          </div>
          <p className="eyebrow">SKILL UNLOCKED</p>
          <div className="big-badge">
            <span>A?</span>
          </div>
          <h1>ASK BETTER</h1>
          <p className="success-copy">
            Better questions unlock better information. You gave Trey the goal,
            the situation, the limits, and the answer you needed.
          </p>
          <div className="answer-card">
            <span>TREY’S MOVE</span>
            <p>
              “Take the Red Line north to Midtown. It’s the most reliable option
              right now—and you’ll still have a few minutes to spare.”
            </p>
          </div>
          <div className="rewards">
            <div>
              <span>+100</span>
              <small>XP EARNED</small>
            </div>
            <div>
              <span>+100</span>
              <small>A POINTS</small>
            </div>
          </div>
          <div className="reflection">
            <b>POCKET CHECK</b>
            <p>
              Before you ask AI for help, what’s one constraint you usually
              forget to mention?
            </p>
          </div>
          <button className="primary" onClick={() => setView("map")}>
            RETURN TO ATLANTA <span>→</span>
          </button>
          <button className="text-button" onClick={() => setView("passport")}>
            VIEW AI LITERACY PASSPORT
          </button>
        </section>
      )}

      {view === "passport" && (
        <section className="passport-screen">
          <button className="back" onClick={() => setView("map")}>
            ← MAP
          </button>
          <p className="eyebrow">CITY OF ATLANTA • LEARNING DIVISION</p>
          <h1>
            AI LITERACY
            <br />
            PASSPORT
          </h1>
          <div className="passport-id">
            <div className="avatar">A</div>
            <div>
              <small>TRAVELER</small>
              <b>{activeSave?.player.displayName ?? "ATL EXPLORER"}</b>
              <small>PROGRESS</small>
              <div className="xp-track">
                <i style={{ width: `${Math.min(player.xp / 5, 100)}%` }}></i>
              </div>
              <span>{player.xp} / 500 XP</span>
            </div>
          </div>
          <div className="stamp-grid">
            {[
              "ASK BETTER",
              "ASSESS",
              "ADAPT",
              "AVOID OVERSHARING",
              "AUTHORIZE CAREFULLY",
            ].map((skill, i) => (
              <div
                key={skill}
                className={i === 0 && completed ? "earned" : "unearned"}
              >
                <span>{i === 0 && completed ? "A?" : "?"}</span>
                <b>{skill}</b>
                <small>
                  {i === 0 && completed
                    ? "FIVE POINTS • EARNED"
                    : "KEEP EXPLORING"}
                </small>
              </div>
            ))}
          </div>
          <button className="primary" onClick={() => setView("map")}>
            KEEP EXPLORING <span>→</span>
          </button>
        </section>
      )}
      <footer>
        <span>404 → ATL</span>
        <span>LEARN THE SYSTEM. MOVE THE CITY.</span>
      </footer>
    </main>
  );
}
