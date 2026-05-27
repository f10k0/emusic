import { create } from 'zustand';

const DEFAULT_SETTINGS = {
  hide_adult: false,
  autoplay: true,
  audio_quality: 'medium',
  theme: 'dark',
  volume_db: 0,
  notifications_new_tracks: true,
  notifications_events: true,
  profile_public: true,
  stats_public: false,
  save_queue: false,
  auto_clear_history: false,
  equalizer_preset: 'normal',
};

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_FREQ_LABELS = ['60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K'];

export const EQ_PRESETS = {
  normal:     { label: 'Стандарт',    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bass:       { label: 'Бас',         gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  treble:     { label: 'Высокие',     gains: [0, 0, 0, 0, 0, 2, 4, 6, 7, 8] },
  rock:       { label: 'Рок',         gains: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5] },
  metal:      { label: 'Метал',       gains: [7, 5, 3, 0, -2, -2, 0, 3, 5, 6] },
  pop:        { label: 'Поп',         gains: [-1, 0, 2, 4, 4, 3, 2, 0, -1, -1] },
  classical:  { label: 'Классика',    gains: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4] },
  jazz:       { label: 'Джаз',        gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3] },
  hiphop:     { label: 'Хип-хоп',     gains: [7, 5, 2, 1, -1, -1, 1, 2, 3, 4] },
  electronic: { label: 'Электронная', gains: [5, 4, 0, -2, -2, 0, 3, 5, 6, 6] },
  rnb:        { label: 'R&B',         gains: [6, 5, 2, 0, -1, 2, 3, 4, 4, 5] },
  acoustic:   { label: 'Акустика',    gains: [3, 2, 1, 0, -1, 0, 1, 2, 3, 4] },
  latin:      { label: 'Латиница',    gains: [4, 2, 0, 0, -2, -1, 1, 3, 4, 5] },
  country:    { label: 'Кантри',      gains: [3, 2, 1, 0, -1, 0, 2, 3, 4, 4] },
  custom:     { label: 'Свой',        gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
};

export const NORMALIZATION_LEVELS = {
  low:    { label: 'Тихий',   targetDb: -18 },
  medium: { label: 'Средний', targetDb: -12 },
  high:   { label: 'Громкий', targetDb: -6  },
};

const useSettingsStore = create((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  audioContext: null,
  gainNode: null,
  eqNodes: [],
  sourceNode: null,
  splitterNode: null,
  mergerNode: null,

  customEqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  playbackRate: 1.0,
  monoMode: false,
  normalization: false,
  normalizationLevel: 'medium',

  loadSettings: (serverSettings) => {
    const merged = { ...DEFAULT_SETTINGS, ...serverSettings };
    set({ settings: merged });
    get().applyTheme(merged.theme);
    if (merged.save_queue && typeof window !== 'undefined') {
      const saved = localStorage.getItem('player_queue');
      if (saved) {
        try {
          const { queue } = JSON.parse(saved);
          const playerStore = require('./playerStore').default;
          if (queue?.length) playerStore.getState().updateQueue(queue);
        } catch {}
      }
    }
  },

  updateSetting: (key, value) => {
    const settings = { ...get().settings, [key]: value };
    set({ settings });
    if (key === 'theme') get().applyTheme(value);
    if (key === 'volume_db') get().applyVolumeDb(value);
    if (key === 'equalizer_preset') get().applyEqualizer(value, null);
    if (key === 'save_queue' && !value && typeof window !== 'undefined') {
      localStorage.removeItem('player_queue');
    }
  },

  applyTheme: (theme) => {
    if (typeof document === 'undefined') return;
    const effective = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', effective);
  },

  applyVolumeDb: (db) => {
    const { gainNode, normalization } = get();
    if (gainNode && !normalization) gainNode.gain.value = Math.pow(10, db / 20);
    if (typeof window !== 'undefined') window.__volumeDbGain = Math.pow(10, db / 20);
  },

  applyEqualizer: (preset, customGains) => {
    const { eqNodes } = get();
    let gains;
    if (preset === 'custom' && customGains) {
      gains = customGains;
      set({ customEqGains: customGains });
    } else if (preset === 'custom') {
      gains = get().customEqGains;
    } else {
      gains = EQ_PRESETS[preset]?.gains || EQ_PRESETS.normal.gains;
    }
    eqNodes.forEach((node, i) => {
      if (node && gains[i] !== undefined) node.gain.value = gains[i];
    });
    const settings = { ...get().settings, equalizer_preset: preset };
    set({ settings });
  },

  setCustomEqBand: (bandIndex, value) => {
    const gains = [...get().customEqGains];
    gains[bandIndex] = value;
    set({ customEqGains: gains });
    const { eqNodes } = get();
    if (eqNodes[bandIndex]) eqNodes[bandIndex].gain.value = value;
    const settings = { ...get().settings, equalizer_preset: 'custom' };
    set({ settings });
  },

  setPlaybackRate: (rate) => {
    set({ playbackRate: rate });
    if (typeof window !== 'undefined' && window.__audioElement) {
      window.__audioElement.playbackRate = rate;
    }
  },

  setMonoMode: (enabled) => {
    set({ monoMode: enabled });
    get()._rebuildAudioGraph();
  },

  setNormalization: (enabled) => {
    set({ normalization: enabled });
    get()._applyNormalizationGain();
  },

  setNormalizationLevel: (level) => {
    set({ normalizationLevel: level });
    if (get().normalization) get()._applyNormalizationGain();
  },

  _applyNormalizationGain: () => {
    const { gainNode, normalization, normalizationLevel, settings } = get();
    if (!gainNode) return;
    if (normalization) {
      const target = NORMALIZATION_LEVELS[normalizationLevel]?.targetDb ?? -12;
      gainNode.gain.value = Math.pow(10, target / 20);
    } else {
      gainNode.gain.value = Math.pow(10, (settings.volume_db || 0) / 20);
    }
  },

  _rebuildAudioGraph: () => {
    const { audioContext, sourceNode, eqNodes, gainNode, monoMode } = get();
    if (!audioContext || !sourceNode) return;
    try {
      try { sourceNode.disconnect(); } catch {}
      eqNodes.forEach(n => { try { n.disconnect(); } catch {} });
      try { gainNode.disconnect(); } catch {}

      if (monoMode) {
        const splitter = audioContext.createChannelSplitter(2);
        const merger = audioContext.createChannelMerger(2);
        sourceNode.connect(splitter);
        splitter.connect(merger, 0, 0);
        splitter.connect(merger, 1, 0);
        splitter.connect(merger, 0, 1);
        splitter.connect(merger, 1, 1);
        let prev = merger;
        eqNodes.forEach(node => { prev.connect(node); prev = node; });
        prev.connect(gainNode);
        gainNode.connect(audioContext.destination);
        set({ splitterNode: splitter, mergerNode: merger });
      } else {
        let prev = sourceNode;
        eqNodes.forEach(node => { prev.connect(node); prev = node; });
        prev.connect(gainNode);
        gainNode.connect(audioContext.destination);
        set({ splitterNode: null, mergerNode: null });
      }
    } catch (e) {}
  },

  connectAudio: (audioElement) => {
    if (typeof window === 'undefined' || !audioElement) return;
    const existing = get().audioContext;
    if (existing && existing.state !== 'closed') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioElement);
      const gain = ctx.createGain();
      const { settings } = get();
      gain.gain.value = Math.pow(10, (settings.volume_db || 0) / 20);

      const eqNodes = EQ_FREQUENCIES.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      const preset = settings.equalizer_preset || 'normal';
      const gains = preset === 'custom'
        ? get().customEqGains
        : (EQ_PRESETS[preset]?.gains || EQ_PRESETS.normal.gains);
      eqNodes.forEach((node, i) => { node.gain.value = gains[i] || 0; });

      let prev = source;
      eqNodes.forEach(node => { prev.connect(node); prev = node; });
      prev.connect(gain);
      gain.connect(ctx.destination);

      audioElement.playbackRate = get().playbackRate;

      set({ audioContext: ctx, gainNode: gain, eqNodes, sourceNode: source });
      window.__volumeDbGain = gain.gain.value;
      window.__audioElement = audioElement;
    } catch (e) {}
  },

  getSetting: (key) => get().settings[key] ?? DEFAULT_SETTINGS[key],
}));

export default useSettingsStore;
