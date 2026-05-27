import { create } from 'zustand';

const usePlayerStore = create((set, get) => ({
  // Основная очередь (плейлист/альбом)
  queue: [],
  // Динамическая очередь (ручная)
  dynamicQueue: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  showQueue: false,

  setTrack: (track, queue = []) => {
    const { currentTrack, isPlaying } = get();
    if (currentTrack && currentTrack.id === track.id) {
      set({ isPlaying: !isPlaying });
      return;
    }
    const newQueue = queue.length ? queue : [track];
    set({ currentTrack: track, queue: newQueue, isPlaying: true, dynamicQueue: [] });
  },

  updateQueue: (newQueue) => {
    const { currentTrack } = get();
    if (!newQueue.length) { set({ queue: [] }); return; }
    if (!currentTrack) { set({ queue: newQueue }); return; }
    const updatedTrack = newQueue.find(t => t.id === currentTrack.id);
    if (updatedTrack) { set({ queue: newQueue, currentTrack: updatedTrack }); }
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // ── Очередь воспроизведения ──────────────────────────────────────────────
  addToQueue: (track) => {
    set((state) => ({ dynamicQueue: [...state.dynamicQueue, track] }));
  },

  addNext: (track) => {
    set((state) => {
      const { dynamicQueue, queue, currentTrack } = state;
      if (dynamicQueue.length > 0) {
        return { dynamicQueue: [track, ...dynamicQueue] };
      }
      // Вставляем после текущего в обычной очереди
      const idx = queue.findIndex(t => t.id === (currentTrack && currentTrack.id));
      if (idx === -1) return { dynamicQueue: [track] };
      const newQ = [...queue];
      newQ.splice(idx + 1, 0, track);
      return { queue: newQ };
    });
  },

  removeFromQueue: (index) => {
    set((state) => {
      const dq = [...state.dynamicQueue];
      dq.splice(index, 1);
      return { dynamicQueue: dq };
    });
  },

  reorderQueue: (fromIndex, toIndex) => {
    set((state) => {
      const dq = [...state.dynamicQueue];
      const [item] = dq.splice(fromIndex, 1);
      dq.splice(toIndex, 0, item);
      return { dynamicQueue: dq };
    });
  },

  clearDynamicQueue: () => set({ dynamicQueue: [] }),

  toggleShowQueue: () => set((state) => ({ showQueue: !state.showQueue })),

  // ── Навигация ────────────────────────────────────────────────────────────
  playNext: () => {
    const { queue, dynamicQueue, currentTrack, shuffle, repeat } = get();
    // Сначала из динамической очереди
    if (dynamicQueue.length > 0) {
      const next = dynamicQueue[0];
      set({ currentTrack: next, isPlaying: true, dynamicQueue: dynamicQueue.slice(1) });
      return;
    }
    if (!queue.length || !currentTrack) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    let nextIndex;
    if (shuffle) {
      do { nextIndex = Math.floor(Math.random() * queue.length); }
      while (nextIndex === currentIndex && queue.length > 1);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }
    set({ currentTrack: queue[nextIndex], isPlaying: true });
  },

  playPrev: () => {
    const { queue, currentTrack, shuffle } = get();
    if (!queue.length || !currentTrack) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    let prevIndex;
    if (shuffle) {
      do { prevIndex = Math.floor(Math.random() * queue.length); }
      while (prevIndex === currentIndex && queue.length > 1);
    } else {
      prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    }
    set({ currentTrack: queue[prevIndex], isPlaying: true });
  },

  setVolume: (vol) => {
    set({ volume: vol });
    localStorage.setItem('player_volume', vol.toString());
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  seekTo: null,
  setSeekTo: (time) => set({ seekTo: time }),
  clearSeekTo: () => set({ seekTo: null }),
  setDuration: (dur) => set({ duration: dur }),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  toggleRepeat: () => {
    const modes = ['off', 'one', 'all'];
    const { repeat } = get();
    const currentIndex = modes.indexOf(repeat);
    set({ repeat: modes[(currentIndex + 1) % modes.length] });
  },

  initVolume: () => {
    const savedVolume = localStorage.getItem('player_volume');
    if (savedVolume !== null) { set({ volume: parseFloat(savedVolume) }); }
  },
}));

if (typeof window !== 'undefined') {
  usePlayerStore.getState().initVolume();
}

export default usePlayerStore;
