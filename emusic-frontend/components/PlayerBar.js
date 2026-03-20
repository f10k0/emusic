import { useEffect, useRef, useState, useCallback } from 'react';
import usePlayerStore from '../store/playerStore';
import { formatTime } from '../lib/utils';
import Link from 'next/link';

export default function PlayerBar() {
  const audioRef = useRef(null);
  const prevTrackIdRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const progressBarRef = useRef(null);
  const volumeBarRef = useRef(null);
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    shuffle,
    repeat,
    setCurrentTime,
    setDuration,
    togglePlay,
    playNext,
    playPrev,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const trackId = currentTrack.id;

    if (prevTrackIdRef.current === trackId) {
      if (isPlaying) {
        if (audio.paused) {
          audio.play().catch(err => console.error('Playback error:', err));
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
      return;
    }

    prevTrackIdRef.current = trackId;
    const src = `${process.env.NEXT_PUBLIC_API_URL}/music/listen/${trackId}`;
    audio.src = src;
    audio.load();

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error('Playback error:', err);
          const onCanPlay = () => {
            audio.play().catch(console.error);
            audio.removeEventListener('canplay', onCanPlay);
          };
          audio.addEventListener('canplay', onCanPlay);
        });
      }
    }
  }, [currentTrack, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = Math.max(0, Math.min(duration, pos * duration));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Перетаскивание прогресса
  const handleProgressMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const progressBar = e.currentTarget;
    progressBarRef.current = progressBar;

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      if (!audioRef.current || !duration) return;
      const rect = progressBar.getBoundingClientRect();
      const pos = (moveEvent.clientX - rect.left) / rect.width;
      const clampedPos = Math.max(0, Math.min(1, pos));
      const newTime = clampedPos * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [duration, setCurrentTime]);

  // Перетаскивание громкости
  const handleVolumeMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    const volumeBar = e.currentTarget;
    volumeBarRef.current = volumeBar;

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const rect = volumeBar.getBoundingClientRect();
      const pos = (moveEvent.clientX - rect.left) / rect.width;
      const newVol = Math.max(0, Math.min(1, pos));
      setVolume(newVol);
    };

    const handleMouseUp = () => {
      setIsDraggingVolume(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [setVolume]);

  const handleVolumeClick = (e) => {
    // Обрабатываем клик отдельно от перетаскивания
    if (!isDraggingVolume) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newVol = Math.max(0, Math.min(1, pos));
      setVolume(newVol);
    }
  };

  const handleEnded = () => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    } else {
      playNext();
    }
  };

  const handleError = (e) => {
    console.error('Audio error:', e);
    playNext();
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="player-bar">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
        crossOrigin="anonymous"
      />
      <div className="player-left">
        <img
          src={currentTrack.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${currentTrack.cover}` : '/default-cover.png'}
          alt={currentTrack.title}
          className="now-playing-img"
          onError={(e) => { e.target.src = '/default-cover.png'; }}
        />
        <div className="now-playing-info">
          <div className="song-title">{currentTrack.title}</div>
          <div className="song-artist">
            {currentTrack.artist_name && currentTrack.artist_id ? (
              <Link href={`/artist/${currentTrack.artist_id}`}>
                {currentTrack.artist_name}
              </Link>
            ) : 'Неизвестный артист'}
          </div>
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button 
            className={`control-btn ${shuffle ? 'active' : ''}`} 
            onClick={toggleShuffle} 
            title="Случайный порядок"
          >
            <i className="fas fa-random"></i>
          </button>
          <i className="fas fa-step-backward" onClick={playPrev}></i>
          <i
            className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'} play-btn`}
            onClick={togglePlay}
          ></i>
          <i className="fas fa-step-forward" onClick={playNext}></i>
          <button 
            className={`control-btn ${repeat !== 'off' ? 'active' : ''} ${repeat === 'all' ? 'repeat-all' : ''}`} 
            onClick={toggleRepeat} 
            title="Повтор"
          >
            <i className="fas fa-repeat"></i>
            {repeat === 'one' && <span className="repeat-one">1</span>}
          </button>
        </div>
        <div className="progress-area">
          <span className="current-time">{formatTime(currentTime)}</span>
          <div
            className="progress-bar"
            ref={progressBarRef}
            style={{ '--progress': `${(currentTime / duration) * 100 || 0}%` }}
            onMouseDown={handleProgressMouseDown}
            onClick={handleSeek}
          >
            <div className="progress"></div>
          </div>
          <span className="total-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <i className="fas fa-volume-up"></i>
        <div className="volume-control">
          <div
            className="volume-bar"
            ref={volumeBarRef}
            style={{ '--volume': `${volume * 100}%` }}
            onMouseDown={handleVolumeMouseDown}
            onClick={handleVolumeClick}
          >
            <div className="volume-level"></div>
          </div>
        </div>
      </div>
    </div>
  );
}