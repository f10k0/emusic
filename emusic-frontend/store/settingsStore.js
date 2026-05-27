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

// Эквалайзер — частоты и значения (Web Audio API BiquadFilter)
const EQ_PRESETS = {
  normal:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass:      [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  treble:    [0, 0, 0, 0, 0, 2, 3, 4, 5, 6],
  classical: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4],
  rock:      [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
  pop:       [-1, 0, 2, 4, 4, 3, 2, 0, -1, -1],
};

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

const useSettingsStore = create((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  audioContext: null,
  gainNode: null,
  eqNodes: [],
  sourceNode: null,

  // Загружает настройки и применяет их
  loadSettings: (serverSettings) => {
    const merged = { ...DEFAULT_SETTINGS, ...serverSettings };
    set({ settings: merged });
    get().applyTheme(merged.theme);
    // Очередь из localStorage если включено сохранение
    if (merged.save_queue && typeof window !== 'undefined') {
      const saved = localStorage.getItem('player_queue');
      if (saved) {
        try {
          const { queue, dynamicQueue } = JSON.parse(saved);
          const playerStore = require('./playerStore').default;
          if (queue?.length) playerStore.getState().updateQueue(queue);
        } catch {}
      }
    }
  },

  updateSetting: (key, value) => {
    const settings = { ...get().settings, [key]: value };
    set({ settings });
    // Применяем немедленно
    if (key === 'theme') get().applyTheme(value);
    if (key === 'volume_db') get().applyVolumeDb(value);
    if (key === 'equalizer_preset') get().applyEqualizer(value);
    if (key === 'save_queue' && !value && typeof window !== 'undefined') {
      localStorage.removeItem('player_queue');
    }
  },

  // Тема
  applyTheme: (theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const effective = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    if (effective === 'light') {
      root.style.setProperty('--bg-primary',    '#f5f5f7');
      root.style.setProperty('--bg-secondary',  '#ffffff');
      root.style.setProperty('--bg-elevated',   '#ebebed');
      root.style.setProperty('--text-primary',  '#1a1a2e');
      root.style.setProperty('--text-secondary','#4a4a5a');
      root.style.setProperty('--text-muted',    '#8a8a9a');
      root.style.setProperty('--border',        '#d0d0da');
      root.style.setProperty('--hover',         '#e0e0e8');
      root.style.setProperty('--player-bg',     'rgba(255,255,255,0.95)');
    } else {
      root.style.setProperty('--bg-primary',    '#0a0a0f');
      root.style.setProperty('--bg-secondary',  '#12121a');
      root.style.setProperty('--bg-elevated',   '#1c1c28');
      root.style.setProperty('--text-primary',  '#ffffff');
      root.style.setProperty('--text-secondary','#b0b0c0');
      root.style.setProperty('--text-muted',    '#70707e');
      root.style.setProperty('--border',        '#2a2a3a');
      root.style.setProperty('--hover',         '#252533');
      root.style.setProperty('--player-bg',     'rgba(18,18,26,0.95)');
    }
  },

  // dB → linear gain: gain = 10^(dB/20)
  applyVolumeDb: (db) => {
    const { gainNode } = get();
    if (gainNode) {
      gainNode.gain.value = Math.pow(10, db / 20);
    }
    // Сохраняем для применения при следующем подключении аудио
    if (typeof window !== 'undefined') {
      window.__volumeDbGain = Math.pow(10, db / 20);
    }
  },

  // Эквалайзер через BiquadFilter nodes
  applyEqualizer: (preset) => {
    const { eqNodes } = get();
    const gains = EQ_PRESETS[preset] || EQ_PRESETS.normal;
    eqNodes.forEach((node, i) => {
      if (node && gains[i] !== undefined) {
        node.gain.value = gains[i];
      }
    });
    if (typeof window !== 'undefined') {
      window.__eqPreset = preset;
    }
  },

  // Подключить audio element к Web Audio API
  connectAudio: (audioElement) => {
    if (typeof window === 'undefined' || !audioElement) return;
    const existing = get().audioContext;
    if (existing && existing.state !== 'closed') return; // уже подключено

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioElement);
      const gain = ctx.createGain();

      // Применяем текущий dB gain
      const { settings } = get();
      gain.gain.value = Math.pow(10, (settings.volume_db || 0) / 20);

      // Создаём EQ nodes
      const eqNodes = EQ_FREQUENCIES.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Применяем текущий пресет
      const gains = EQ_PRESETS[settings.equalizer_preset] || EQ_PRESETS.normal;
      eqNodes.forEach((node, i) => { node.gain.value = gains[i] || 0; });

      // Соединяем цепочку: source → eq1 → eq2 → ... → gain → destination
      let prev = source;
      eqNodes.forEach(node => { prev.connect(node); prev = node; });
      prev.connect(gain);
      gain.connect(ctx.destination);

      set({ audioContext: ctx, gainNode: gain, eqNodes, sourceNode: source });
      window.__volumeDbGain = gain.gain.value;
    } catch (e) {
      // Тихо игнорируем — браузер может не поддерживать
    }
  },

  getSetting: (key) => get().settings[key] ?? DEFAULT_SETTINGS[key],
}));

export default useSettingsStore;
