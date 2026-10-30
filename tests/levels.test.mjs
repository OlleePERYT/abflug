// Prüft, dass jedes Level erzeugt wird, lösbar ist und die Mengen aufgehen.
// Aufruf: node tests/levels.test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1];
globalThis.window = {};
new Function(src)();
const A = window.Abflug;

let failed = 0;
A.LEVELS.forEach((L, i) => {
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

    // Zufälliges Spielen darf nie abstürzen und muss mit win oder lose enden.
    let wins = 0;
    for (let run = 0; run < 30; run++) {
      const st = A.createState(lv);
      for (let step = 0; step < 20000; step++) {
        st.planes.forEach(p => { if (p.where === "full") A.depart(st, p.id); });
        const s = A.status(st);
        if (s === "win") { wins++; break; }
        if (s === "lose") break;
        if (A.boardOne(st)) continue;
        const free = st.planes.filter(p => p.where === "apron" && A.freeRun(st, p) < 0);
        if (!free.length) throw new Error("kein Zug möglich, aber nicht verloren");
        const p = free[(Math.random() * free.length) | 0];
        const r = A.tap(st, p.id);
        if (r.ok) A.arrive(st, p.id);
      }
    }
    console.log(`ok  ${String(i + 1).padStart(2)} ${L.name.padEnd(14)} ${lv.planes.length}/${L.planes} Flugzeuge, ${lv.tourists} Touristen, Zufallsspieler ${wins}/30 gewonnen, ${ms} ms`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${i + 1} ${L.name}: ${e.message}`);
  }
});
process.exit(failed ? 1 : 0);
