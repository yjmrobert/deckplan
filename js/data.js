// Static tables: ship classes, zones, room types, print sizes, colour themes.
(function () {
  const DP = (globalThis.DP = globalThis.DP || {});

  // Ship classes: the whole vessel is a grid of sectors, frames long (prow first) by laterals wide, decks deep.
  DP.CLASSES = {
    W: { name: 'Battlecruiser',  frames: 10, laterals: 3, decks: 7, zoneW: { command: 1.2, habitation: 1, enginarium: 1.4, cargo: 0.8, armoury: 2.2, medicae: 0.7, sanctum: 0.8, science: 0.3, maintenance: 1.2, brig: 0.5, hangar: 1 } },
    T: { name: 'Bulk freighter', frames: 8,  laterals: 3, decks: 4, zoneW: { command: 0.6, habitation: 0.8, enginarium: 1.2, cargo: 3, armoury: 0.2, medicae: 0.4, sanctum: 0.3, science: 0.2, maintenance: 1.2, brig: 0.2, hangar: 0.8 } },
    L: { name: 'Pilgrim liner',  frames: 8,  laterals: 3, decks: 6, zoneW: { command: 0.7, habitation: 3, enginarium: 1, cargo: 0.9, armoury: 0.2, medicae: 1, sanctum: 1.8, science: 0.2, maintenance: 1, brig: 0.3, hangar: 0.4 } },
    R: { name: 'Survey vessel',  frames: 6,  laterals: 3, decks: 4, zoneW: { command: 1, habitation: 1, enginarium: 1.2, cargo: 1, armoury: 0.4, medicae: 1, sanctum: 0.3, science: 2.5, maintenance: 1.2, brig: 0.2, hangar: 0.8 } },
    P: { name: 'Prison barge',   frames: 6,  laterals: 3, decks: 5, zoneW: { command: 0.8, habitation: 1, enginarium: 1, cargo: 0.8, armoury: 1.2, medicae: 0.8, sanctum: 0.5, science: 0.2, maintenance: 1.2, brig: 3, hangar: 0.3 } },
    K: { name: 'Space hulk',     frames: 9,  laterals: 3, decks: 6, forceCondition: 'derelict', zoneW: { command: 0.8, habitation: 1, enginarium: 1, cargo: 1.2, armoury: 0.8, medicae: 0.6, sanctum: 0.8, science: 0.6, maintenance: 1.2, brig: 0.4, hangar: 0.6, void: 1.5 } },
    // a playtest ship: one column of three sectors, two decks, so a whole ship prints in a sitting
    C: { name: 'Cutter (small)', frames: 3,  laterals: 1, decks: 2, zoneW: { command: 1, habitation: 1, enginarium: 1.6, cargo: 1.3, armoury: 0.5, medicae: 0.5, sanctum: 0.2, science: 0.5, maintenance: 1.3, brig: 0.2, hangar: 0.6 } },
  };
  DP.CLASS_ORDER = ['W', 'T', 'L', 'R', 'P', 'K', 'C'];

  // Sector sizes are whole letter pages at 1 inch: 7 x 10 squares per page.
  DP.SECTOR_SIZES = { xs: { name: 'Tiny (2×2 pages, 14×20)', w: 14, h: 20 }, s: { name: 'Small (3×3 pages, 21×30)', w: 21, h: 30 }, m: { name: 'Medium (4×4 pages, 28×40)', w: 28, h: 40 }, l: { name: 'Large (5×5 pages, 35×50)', w: 35, h: 50 } };

  DP.CONDITIONS = { intact: 'Intact', rundown: 'Rundown', derelict: 'Derelict' };
  DP.BUILDS = { organic: 'Organic (every room unique)', kit: 'Kit (standard parts)' };

  // The kit: rooms come only in these footprints (short side first; a part may be laid either way round), corridors
  // are straights of these lengths, and each footprint has a couple of fixed furnishing variants that never change
  // between ships. Print a part once, use it on every ship.
  DP.KIT = {
    footprints: [[3, 3], [3, 5], [4, 4], [4, 6], [5, 5], [5, 7], [7, 7], [7, 10], [7, 14], [10, 14]],
    corridorLengths: [5, 3, 2, 1],
    variants: ['A', 'B'],
    bigZones: ['cargo', 'hangar', 'enginarium', 'maintenance', 'armoury'],
  };

  // Zones: a sector is three to six of these. Pools are [type, weight, size] with size small|mid|hall|any.
  DP.ZONES = {
    command:     { name: 'Command deck',       tint: 'command',     pool: [['bridge', 3, 'hall'], ['firecon', 2, 'mid'], ['comms', 2, 'mid'], ['maproom', 2, 'mid'], ['office', 3, 'small'], ['ready', 2, 'mid'], ['archive', 2, 'mid'], ['wash', 2, 'small'], ['storage', 2, 'small'], ['cabin', 2, 'small'], ['lounge', 1, 'mid'], ['security', 1, 'mid']] },
    habitation:  { name: 'Habitation block',   tint: 'living',      pool: [['cabins', 4, 'mid'], ['barracks', 2, 'hall'], ['cabin', 3, 'small'], ['galley', 2, 'mid'], ['mess', 3, 'hall'], ['wash', 3, 'small'], ['lounge', 2, 'mid'], ['commons', 2, 'hall'], ['laundry', 1, 'small'], ['stateroom', 2, 'mid'], ['gym', 1, 'mid'], ['storage', 1, 'small'], ['shrine', 1, 'small'], ['infirmary', 1, 'mid']] },
    enginarium:  { name: 'Enginarium',         tint: 'engineering', pool: [['engines', 3, 'hall'], ['reactor', 3, 'hall'], ['machinehall', 2, 'hall'], ['fuelbay', 2, 'hall'], ['workshop', 3, 'mid'], ['life', 2, 'mid'], ['pump', 2, 'mid'], ['coolant', 2, 'mid'], ['generator', 3, 'mid'], ['conduit', 2, 'mid'], ['capacitor', 2, 'mid'], ['storage', 3, 'small'], ['tools', 2, 'small'], ['wash', 1, 'small'], ['control', 2, 'mid'], ['furnace', 1, 'hall']] },
    cargo:       { name: 'Cargo decks',        tint: 'cargo',       pool: [['hold', 5, 'hall'], ['bulkstore', 3, 'hall'], ['storage', 4, 'mid'], ['cold', 2, 'mid'], ['customs', 1, 'mid'], ['loading', 2, 'hall'], ['tanks', 2, 'mid'], ['fuelbay', 1, 'hall'], ['office', 1, 'small'], ['locker', 1, 'small'], ['crane', 1, 'hall'], ['wash', 1, 'small']] },
    medicae:     { name: 'Medicae ward',       tint: 'medical',     pool: [['ward', 3, 'hall'], ['medbay', 3, 'mid'], ['surgery', 2, 'mid'], ['morgue', 2, 'mid'], ['pharmacy', 2, 'small'], ['lab', 2, 'mid'], ['wash', 2, 'small'], ['office', 1, 'small'], ['quarantine', 1, 'mid'], ['storage', 1, 'small']] },
    armoury:     { name: 'Armoury',            tint: 'military',    pool: [['armory', 3, 'mid'], ['magazine', 3, 'mid'], ['range', 2, 'hall'], ['barracks', 2, 'hall'], ['weapons', 3, 'hall'], ['brig', 1, 'mid'], ['guard', 2, 'small'], ['wash', 1, 'small'], ['storage', 1, 'small'], ['firecon', 1, 'mid'], ['drill', 1, 'hall']] },
    sanctum:     { name: 'Sanctum',            tint: 'sacred',      pool: [['nave', 3, 'hall'], ['shrine', 3, 'small'], ['reliquary', 2, 'mid'], ['scriptorium', 2, 'mid'], ['cell', 3, 'small'], ['archive', 2, 'mid'], ['confessional', 1, 'small'], ['refectory', 2, 'hall'], ['crypt', 1, 'hall'], ['wash', 1, 'small']] },
    science:     { name: 'Laboratorium',       tint: 'science',     pool: [['lab', 4, 'mid'], ['contain', 2, 'mid'], ['specimen', 2, 'mid'], ['hydro', 2, 'hall'], ['sensor', 2, 'mid'], ['cold', 1, 'small'], ['archive', 1, 'mid'], ['clean', 1, 'mid'], ['wash', 1, 'small'], ['office', 1, 'small'], ['menagerie', 1, 'hall']] },
    maintenance: { name: 'Maintenance decks',  tint: 'utility',     pool: [['workshop', 3, 'mid'], ['pump', 2, 'mid'], ['vents', 2, 'mid'], ['storage', 4, 'small'], ['generator', 2, 'mid'], ['machinehall', 1, 'hall'], ['sump', 2, 'hall'], ['tools', 2, 'small'], ['tanks', 2, 'mid'], ['conduit', 1, 'mid'], ['locker', 1, 'small'], ['crew', 1, 'mid'], ['scrap', 1, 'hall']] },
    brig:        { name: 'Detention block',    tint: 'military',    pool: [['cells', 4, 'hall'], ['cell', 3, 'small'], ['guard', 3, 'small'], ['interview', 2, 'mid'], ['armory', 1, 'mid'], ['wash', 2, 'small'], ['morgue', 1, 'mid'], ['office', 1, 'small'], ['yard', 1, 'hall'], ['security', 2, 'mid']] },
    hangar:      { name: 'Hangar bay',         tint: 'cargo',       pool: [['hangar', 4, 'hall'], ['shipbay', 3, 'hall'], ['fuelbay', 1, 'hall'], ['workshop', 2, 'mid'], ['fuel', 2, 'mid'], ['ready', 2, 'mid'], ['storage', 2, 'small'], ['locker', 2, 'small'], ['control', 1, 'mid'], ['magazine', 1, 'mid'], ['wash', 1, 'small']] },
    void:        { name: 'Breached section',   tint: 'void',        pool: [['void', 4, 'any'], ['nest', 2, 'mid'], ['scrap', 2, 'hall'], ['storage', 1, 'small'], ['hold', 1, 'hall'], ['cabins', 1, 'mid']] },
  };

  // Room types: display name and floor tint. Furnishing recipes live in furnish.js and fall back by tint.
  DP.ROOMS = {
    corridor: { name: 'Corridor', tint: 'corridor' }, passage: { name: 'Boarding passage', tint: 'corridor' }, lift: { name: 'Lift', tint: 'corridor' },
    bridge: { name: 'Bridge', tint: 'command' }, firecon: { name: 'Fire Control', tint: 'command' }, comms: { name: 'Vox Room', tint: 'command' }, maproom: { name: 'Chart Room', tint: 'command' },
    office: { name: 'Office', tint: 'command' }, ready: { name: 'Ready Room', tint: 'command' }, archive: { name: 'Archive', tint: 'command' }, security: { name: 'Security Post', tint: 'military' }, control: { name: 'Control Room', tint: 'command' },
    cabins: { name: 'Berths', tint: 'living' }, barracks: { name: 'Barracks', tint: 'living' }, cabin: { name: 'Cabin', tint: 'living' }, stateroom: { name: 'Stateroom', tint: 'living' }, crew: { name: 'Crew Den', tint: 'living' },
    galley: { name: 'Galley', tint: 'mess' }, mess: { name: 'Mess Hall', tint: 'mess' }, lounge: { name: 'Lounge', tint: 'mess' }, commons: { name: 'Commons', tint: 'mess' }, refectory: { name: 'Refectory', tint: 'mess' },
    wash: { name: 'Head', tint: 'utility' }, laundry: { name: 'Laundry', tint: 'utility' }, gym: { name: 'Gymnasium', tint: 'living' }, infirmary: { name: 'Infirmary', tint: 'medical' },
    engines: { name: 'Engine Hall', tint: 'engineering' }, reactor: { name: 'Reactor Hall', tint: 'engineering' }, workshop: { name: 'Workshop', tint: 'utility' }, life: { name: 'Life Support', tint: 'utility' },
    pump: { name: 'Pump Room', tint: 'utility' }, coolant: { name: 'Coolant Plant', tint: 'engineering' }, generator: { name: 'Generatorium', tint: 'engineering' }, tools: { name: 'Tool Crib', tint: 'utility' }, furnace: { name: 'Furnace Hall', tint: 'engineering' },
    vents: { name: 'Vent Plant', tint: 'utility' }, sump: { name: 'Sump', tint: 'utility' }, tanks: { name: 'Tank Room', tint: 'utility' }, scrap: { name: 'Scrap Heap', tint: 'void' },
    hold: { name: 'Cargo Hold', tint: 'cargo' }, storage: { name: 'Storage', tint: 'cargo' }, cold: { name: 'Cold Store', tint: 'cargo' }, customs: { name: 'Customs Office', tint: 'command' }, loading: { name: 'Loading Bay', tint: 'cargo' }, locker: { name: 'Locker Room', tint: 'cargo' }, crane: { name: 'Crane Bay', tint: 'cargo' },
    hangar: { name: 'Hangar', tint: 'cargo' }, fuel: { name: 'Fuel Store', tint: 'engineering' }, shipbay: { name: 'Ship Bay', tint: 'cargo' },
    fuelbay: { name: 'Fuel Bay', tint: 'engineering' }, bulkstore: { name: 'Bulk Store', tint: 'cargo' }, machinehall: { name: 'Machine Hall', tint: 'engineering' }, conduit: { name: 'Plasma Conduit', tint: 'engineering' }, capacitor: { name: 'Capacitor Bank', tint: 'engineering' },
    ward: { name: 'Ward', tint: 'medical' }, medbay: { name: 'Medbay', tint: 'medical' }, surgery: { name: 'Surgery', tint: 'medical' }, morgue: { name: 'Morgue', tint: 'medical' }, pharmacy: { name: 'Pharmacy', tint: 'medical' }, quarantine: { name: 'Quarantine', tint: 'medical' },
    lab: { name: 'Laboratory', tint: 'science' }, contain: { name: 'Containment', tint: 'science' }, specimen: { name: 'Specimen Store', tint: 'science' }, hydro: { name: 'Hydroponics', tint: 'science' }, sensor: { name: 'Auspex Bay', tint: 'science' }, clean: { name: 'Clean Room', tint: 'science' }, menagerie: { name: 'Menagerie', tint: 'science' },
    armory: { name: 'Armoury', tint: 'military' }, magazine: { name: 'Magazine', tint: 'military' }, range: { name: 'Firing Range', tint: 'military' }, weapons: { name: 'Gun Deck', tint: 'military' }, brig: { name: 'Brig', tint: 'military' }, guard: { name: 'Guard Post', tint: 'military' }, drill: { name: 'Drill Hall', tint: 'military' },
    cells: { name: 'Cell Block', tint: 'military' }, cell: { name: 'Cell', tint: 'military' }, interview: { name: 'Interrogation', tint: 'military' }, yard: { name: 'Exercise Yard', tint: 'military' },
    nave: { name: 'Nave', tint: 'sacred' }, shrine: { name: 'Shrine', tint: 'sacred' }, reliquary: { name: 'Reliquary', tint: 'sacred' }, scriptorium: { name: 'Scriptorium', tint: 'sacred' }, confessional: { name: 'Confessional', tint: 'sacred' }, crypt: { name: 'Crypt', tint: 'sacred' },
    airlock: { name: 'Airlock', tint: 'airlock' }, nest: { name: 'Nest', tint: 'alien' }, void: { name: 'Collapsed Section', tint: 'void' },
    structure: { name: 'Structure', tint: 'corridor' },
  };

  // Floor tints for the colour renderer, by theme.
  DP.THEMES = {
    fleet: {
      name: 'Fleet grey', space: '#0b0f17', star: '#dfe7f0',
      hull: '#c9d1d9', wall: '#d4dbe2', wallEdge: '#1b2129', grid: 'rgba(0,0,0,0.22)',
      door: '#e6ebf0', doorEdge: '#1b2129', accent: '#57d7ff', accent2: '#ffb347', hazard: '#f2c230', glow: '#4fd3ff',
      text: '#0e1216', textOnDark: '#eef2f5', prop: '#9aa5b1', propEdge: '#1b2129', propFill: '#b9c2cb',
      tints: { corridor: '#4b5461', command: '#4a5a73', engineering: '#4d535b', utility: '#5a5f66', cargo: '#5c6168', living: '#6a5e73', mess: '#857a62', medical: '#c8d0d6', science: '#62767f', airlock: '#5b5f63', military: '#5e665a', sacred: '#6e5a4a', alien: '#55405a', void: '#1a1d22' },
    },
    rust: {
      name: 'Derelict rust', space: '#090a0e', star: '#cfc5b5',
      hull: '#8a7462', wall: '#9a846e', wallEdge: '#14110e', grid: 'rgba(0,0,0,0.3)',
      door: '#b3a18c', doorEdge: '#14110e', accent: '#7fd1b9', accent2: '#e0893a', hazard: '#c9a227', glow: '#ff7a2f',
      text: '#120f0c', textOnDark: '#efe6d8', prop: '#7d6b5c', propEdge: '#14110e', propFill: '#a08a74',
      tints: { corridor: '#4a4038', command: '#4c4a52', engineering: '#4a3f36', utility: '#514840', cargo: '#55493d', living: '#5a4a4a', mess: '#6b5a44', medical: '#8e9088', science: '#4e5a58', airlock: '#4f4740', military: '#4c4f41', sacred: '#5c4634', alien: '#4d2f45', void: '#15130f' },
    },
    gothic: {
      name: 'Gothic dark', space: '#07070a', star: '#d8d2c4',
      hull: '#6f6a66', wall: '#8a8480', wallEdge: '#0e0d0c', grid: 'rgba(0,0,0,0.32)',
      door: '#a39a90', doorEdge: '#0e0d0c', accent: '#d7b35a', accent2: '#c0392b', hazard: '#c9a227', glow: '#ff8c3a',
      text: '#0e0d0c', textOnDark: '#efe7d6', prop: '#6b655f', propEdge: '#0e0d0c', propFill: '#8f8780',
      tints: { corridor: '#36343a', command: '#3a3f4e', engineering: '#3d3734', utility: '#3b3b3b', cargo: '#403d38', living: '#443a40', mess: '#4f4638', medical: '#7f8582', science: '#3b4a4a', airlock: '#3d3d3d', military: '#3f4438', sacred: '#4b3a2c', alien: '#3e2838', void: '#111113' },
    },
    military: {
      name: 'Navy olive', space: '#0a0d0b', star: '#e4e8d8',
      hull: '#aeb49a', wall: '#bcc1a8', wallEdge: '#171a14', grid: 'rgba(0,0,0,0.24)',
      door: '#d2d6c2', doorEdge: '#171a14', accent: '#ff5e4d', accent2: '#ffd166', hazard: '#f0c419', glow: '#ff6b3d',
      text: '#121410', textOnDark: '#f0f2e8', prop: '#8f957c', propEdge: '#171a14', propFill: '#adb398',
      tints: { corridor: '#4e5446', command: '#4c5a5c', engineering: '#4c4f45', utility: '#565a4d', cargo: '#585c4e', living: '#5f5c52', mess: '#6e6a52', medical: '#bfc6bc', science: '#56655f', airlock: '#54584c', military: '#5a6350', sacred: '#6a5a44', alien: '#4e3d4a', void: '#15170f' },
    },
    corporate: {
      name: 'Corporate white', space: '#0e1220', star: '#ffffff',
      hull: '#eef1f4', wall: '#f4f6f8', wallEdge: '#2a3340', grid: 'rgba(0,0,0,0.14)',
      door: '#ffffff', doorEdge: '#2a3340', accent: '#19b8a6', accent2: '#ff8c42', hazard: '#f4c20d', glow: '#2fd0ff',
      text: '#1a212b', textOnDark: '#ffffff', prop: '#aab4bf', propEdge: '#2a3340', propFill: '#d5dbe1',
      tints: { corridor: '#b9c0c8', command: '#b4c4d6', engineering: '#aeb4bb', utility: '#c2c6cb', cargo: '#c4c7cb', living: '#cfc5d8', mess: '#dccfb4', medical: '#ffffff', science: '#bdd0d6', airlock: '#c6c9cc', military: '#c4cbbd', sacred: '#d9c7b0', alien: '#b48cb9', void: '#3a404a' },
    },
  };
  DP.THEME_ORDER = ['fleet', 'gothic', 'rust', 'military', 'corporate'];

  // Letter paper with 0.25in margins: 8 x 10.5in printable. Tiles sit on whole squares.
  DP.PAPER = { w: 8.0, h: 10.5, tileW: 7, tileH: 10, bleed: 0.25 };
  DP.SCALES = { 1: '1 inch (standard minis)', 0.75: '3/4 inch', 0.5: '1/2 inch' };
})();
