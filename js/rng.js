// Seeded random numbers. Same seed string -> same ship, every time.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  DP.makeRng = function (seedStr) {
    const gen = mulberry32(xmur3(String(seedStr))());
    const r = {
      next: () => gen(),
      // integer in [a, b] inclusive
      int: (a, b) => a + Math.floor(gen() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(gen() * arr.length)],
      chance: (p) => gen() < p,
      shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(gen() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
      // weighted pick from [[item, weight], ...]
      weighted: (pairs) => {
        let total = 0; for (const p of pairs) total += p[1];
        let x = gen() * total;
        for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; }
        return pairs[pairs.length - 1][0];
      },
      // a child generator with its own stream, so adding a feature does not reshuffle everything after it
      fork: (label) => DP.makeRng(seedStr + '/' + label),
    };
    return r;
  };

  DP.newSeed = function (n = 6) {
    let s = '';
    const bytes = (globalThis.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(n)) : Array.from({ length: n }, () => Math.floor(Math.random() * 256));
    for (let i = 0; i < n; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
    return s;
  };
  DP.SEED_ALPHABET = ALPHABET;
})();
