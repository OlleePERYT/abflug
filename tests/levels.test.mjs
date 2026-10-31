// Prüft, dass jedes Level erzeugt wird, lösbar ist und die Mengen aufgehen.
// Aufruf: node tests/levels.test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(process.env.ABFLUG_HTML || new URL("../index.html", import.meta.url), "utf8");
const src = html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1];
globalThis.window = {};
new Function(src)();
const A = window.Abflug;

let failed = 0;
// Feste Level plus eine Stichprobe der endlosen Level.
const idx = [...A.LEVELS.keys(), 10, 11, 12, 13, 14, 24, 39];
idx.forEach(i => {
  const L = A.levelDef(i);
  try {
    const t0 = performance.now();
    const lv = A.generate(i);
    const ms = Math.round(performance.now() - t0);
    assert.ok(lv, "Level wird erzeugt");
    assert.ok(A.solve(lv), "Lösungsreihenfolge gewinnt");

    const seats = {}, people = {};
    lv.planes.forEach(p => (seats[p.dest] = (seats[p.dest] || 0) + A.SEATS[p.len]));
    [...lv.arms.L, ...lv.arms.R].forEach(g => (people[g.dest] = (people[g.dest] || 0) + g.n));
    assert.deepEqual(people, seats, "Touristen pro Ziel = Plätze pro Ziel");

    const dests = new Set(lv.planes.map(p => p.dest));
    assert.equal(dests.size, L.dests, "alle Ziele kommen vor");
    if (L.hangars) assert.equal(lv.hangars.length, L.hangars, "Hangars gesetzt");
    if (L.tutorial) {
      // Tutorial-Schritte brauchen: 0 frei, 1 blockiert, 2 frei und steht vor 1.
      const st = A.createState(lv);
      assert.equal(A.freeRun(st, st.planes[0]), -1, "Tutorial: Flugzeug 0 frei");
      assert.ok(A.freeRun(st, st.planes[1]) >= 0, "Tutorial: Flugzeug 1 blockiert");
      assert.equal(A.freeRun(st, st.planes[2]), -1, "Tutorial: Flugzeug 2 frei");
      assert.equal(lv.arms.L[0].dest, st.planes[0].dest, "Tutorial: erste Gruppe passt zu Flugzeug 0");
    }

    // Zufälliges Spielen darf nie abstürzen und muss mit win oder lose enden.
    let wins = 0;
    for (let run = 0; run < 30; run++) {
      const st = A.createState(lv);
      for (let step = 0; step < 200000; step++) {
        st.planes.forEach(p => { if (p.where === "full") A.depart(st, p.id); });
        const s = A.status(st);
        if (s === "win") { wins++; break; }
        if (s === "lose") break;
        // Zufallsspieler: schickt ab und zu irgendein freies Flugzeug los.
        if (s === "play" && Math.random() < 0.15) {
          const free = st.planes.filter(p => p.where === "apron" && A.freeRun(st, p) < 0);
          if (!free.length) throw new Error("kein Zug möglich, aber nicht verloren");
          const p = free[(Math.random() * free.length) | 0];
          if (A.tap(st, p.id).ok) A.arrive(st, p.id);
          continue;
        }
        A.tick(st);
        if (step === 199999) throw new Error("Spiel endet nicht");
      }
    }
    console.log(`ok  ${String(i + 1).padStart(2)} ${L.name.padEnd(14)} ${lv.planes.length}/${L.planes} Flugzeuge, ${lv.tourists} Touristen, Zufallsspieler ${wins}/30 gewonnen, ${ms} ms`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${i + 1} ${L.name}: ${e.message}`);
  }
});
// Schlepper: zieht ein zugeparktes Flugzeug trotzdem ans Gate.
try {
  const st = A.createState(A.generate(0));
  assert.equal(A.tap(st, 1).reason, "blocked", "ohne Schlepper blockiert");
  assert.ok(A.tap(st, 1, true).ok, "mit Schlepper frei");
  assert.equal(st.planes[1].where, "taxi");
  console.log("ok  Schlepper");
} catch (e) { failed++; console.log(`FAIL Schlepper: ${e.message}`); }
// Leuchtturm: Mit lookahead sind mindestens so viele unbekannte Ziele sichtbar wie ohne, und mehr.
try {
  let without = 0, withL = 0;
  for (const i of [5, 7, 8, 9]) {
    const lv = A.generate(i);
    const a = A.createState(lv), b = A.createState(lv, { lookahead: true });
    a.planes.forEach((p, k) => assert.ok(!p.revealed || b.planes[k].revealed, "lookahead verdeckt nichts"));
    without += a.planes.filter(p => p.revealed).length; withL += b.planes.filter(p => p.revealed).length;
  }
  assert.ok(withL > without, "Leuchtturm deckt mehr auf");
  const lv9 = A.generate(9), all = A.createState(lv9, { lookahead: 99 }), two = A.createState(lv9, { lookahead: 2 }), one = A.createState(lv9, { lookahead: 1 });
  assert.ok(all.planes.every(p => p.revealed), "Leuchtfeuer zeigt alles");
  assert.ok(two.planes.filter(p => p.revealed).length >= one.planes.filter(p => p.revealed).length, "Stufe 2 mindestens wie Stufe 1");
  console.log(`ok  Leuchtturm (${without} -> ${withL} sichtbar)`);
} catch (e) { failed++; console.log(`FAIL Leuchtturm: ${e.message}`); }
// Herausforderung Nebel: Nur Flugzeuge mit freiem Weg zeigen ihr Ziel, und das Level bleibt lösbar.
try {
  const lv = A.generate(4), st = A.createState(lv, { fog: true });
  st.planes.forEach(p => assert.equal(p.revealed, p.where === "apron" && A.freeRun(st, p) < 0));
  console.log("ok  Nebel");
} catch (e) { failed++; console.log(`FAIL Nebel: ${e.message}`); }
// Sturm-Level: jedes fünfte ab Level 5, als solche markiert.
try {
  assert.deepEqual([0, 1, 2, 3, 4, 9, 14].map(A.isStorm), [false, false, false, false, true, true, true]);
  assert.equal(A.generate(4).storm, true);
  assert.equal(A.generate(3).storm, false);
  console.log("ok  Sturm");
} catch (e) { failed++; console.log(`FAIL Sturm: ${e.message}`); }
process.exit(failed ? 1 : 0);
