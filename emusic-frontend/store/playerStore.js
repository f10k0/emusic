import { create } from 'zustand';

const usePlayerStore = create((set, get) => ({
  queue: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',

  setTrack: (track, queue = []) => {
    const { currentTrack, isPlaying } = get();
    
    if (currentTrack && currentTrack.id === track.id) {
      set({ isPlaying: !isPlaying });
      return;
    }

    const newQueue = queue.length ? queue : [track];
    set({
      currentTrack: track,
      queue: newQueue,
      isPlaying: true,
    });
  },

  updateQueue: (newQueue) => {
    const { currentTrack } = get();
    
    if (!newQueue.length) {
      set({ queue: [] });
      return;
    }

    if (!currentTrack) {
      set({ queue: newQueue });
      return;
    }

    const updatedTrack = newQueue.find(t => t.id === currentTrack.id);
    if (updatedTrack) {
      // Обновляем объект текущего трека, чтобы данные были актуальны
      set({ 
        queue: newQueue,
        currentTrack: updatedTrack,
      });
    }
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  playNext: () => {
    const { queue, currentTrack, shuffle } = get();
    if (!queue.length || !currentTrack) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    let nextIndex;
    if (shuffle) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentIndex && queue.length > 1);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    set({
      currentTrack: queue[nextIndex],
      isPlaying: true,
    });
  },

  playPrev: () => {
    const { queue, currentTrack, shuffle } = get();
    if (!queue.length || !currentTrack) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    let prevIndex;
    if (shuffle) {
      do {
        prevIndex = Math.floor(Math.random() * queue.length);
      } while (prevIndex === currentIndex && queue.length > 1);
    } else {
      prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    }

    set({
      currentTrack: queue[prevIndex],
      isPlaying: true,
    });
  },

  setVolume: (vol) => {
    set({ volume: vol });
    localStorage.setItem('player_volume', vol.toString());
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (dur) => set({ duration: dur }),

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  toggleRepeat: () => {
    const modes = ['off', 'one', 'all'];
    const { repeat } = get();
    const currentIndex = modes.indexOf(repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    set({ repeat: modes[nextIndex] });
  },

  initVolume: () => {
    const savedVolume = localStorage.getItem('player_volume');
    if (savedVolume !== null) {
      set({ volume: parseFloat(savedVolume) });
    }
  },
}));

if (typeof window !== 'undefined') {
  usePlayerStore.getState().initVolume();
}

export default usePlayerStore;