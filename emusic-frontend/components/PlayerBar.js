import { useEffect, useRef, useState, useCallback } from 'react';
import useSettingsStore from '../store/settingsStore';
import usePlayerStore from '../store/playerStore';
import { formatTime } from '../lib/utils';
import Link from 'next/link';
import LyricsModal from './LyricsModal';
import QueuePanel from './QueuePanel';

export default function PlayerBar() {
  const audioRef = useRef(null);
  const { connectAudio, settings } = useSettingsStore();
  const prevTrackIdRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const progressBarRef = useRef(null);
  const volumeBarRef = useRef(null);
  const queuePanelRef = useRef(null);
  const queueBtnRef = useRef(null);
  const [showLyrics, setShowLyrics] = useState(false);

  const {
    currentTrack, isPlaying, volume, currentTime, duration, seekTo, clearSeekTo,
    shuffle, repeat, setCurrentTime, setDuration, togglePlay,
    playNext, playPrev, setVolume, toggleShuffle, toggleRepeat,
    showQueue, toggleShowQueue, addToQueue, addNext,
  } = usePlayerStore();

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Подключаем Web Audio API для EQ и dB-громкости
  useEffect(() => {
    if (audioRef.current) {
      connectAudio(audioRef.current);
    }
  }, [audioRef.current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const trackId = currentTrack.id;
    if (prevTrackIdRef.current === trackId) {
      if (isPlaying) { if (audio.paused) audio.play().catch(console.error); }
      else { if (!audio.paused) audio.pause(); }
      return;
    }
    prevTrackIdRef.current = trackId;
    audio.src = `${process.env.NEXT_PUBLIC_API_URL}/music/listen/${trackId}`;
    audio.load();
    if (isPlaying) {
      const p = audio.play();
      if (p !== undefined) p.catch(err => {
        audio.addEventListener('canplay', () => audio.play().catch(console.error), { once: true });
      });
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

  const handleProgressMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const progressBar = e.currentTarget;
    const handleMouseMove = (me) => {
      me.preventDefault();
      if (!audioRef.current || !duration) return;
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
      audioRef.current.currentTime = pos * duration;
      setCurrentTime(pos * duration);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [duration, setCurrentTime]);

  const handleVolumeMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    const volumeBar = e.currentTarget;
    const handleMouseMove = (me) => {
      me.preventDefault();
      const rect = volumeBar.getBoundingClientRect();
      setVolume(Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width)));
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
    if (!isDraggingVolume) {
      const rect = e.currentTarget.getBoundingClientRect();
      setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    }
  };

  const handleEnded = () => {
    if (repeat === 'one') {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(console.error); }
    } else {
      playNext();
    }
  };

  const handleError = () => playNext();
  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  // Закрывать очередь при клике вне панели
  useEffect(() => {
    if (!showQueue) return;
    const handleClickOutside = (e) => {
      if (
        queuePanelRef.current && !queuePanelRef.current.contains(e.target) &&
        queueBtnRef.current && !queueBtnRef.current.contains(e.target)
      ) {
        toggleShowQueue();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQueue]);

  // Expose seekTo for lyrics
  useEffect(() => {
    window.__playerSeekTo = (time) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    };
  }, [setCurrentTime]);

  if (!currentTrack) return null;

  const hasLyrics = currentTrack.lyrics && currentTrack.lyrics.trim().length > 0;

  return (
    <>
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
                <Link href={`/artist/${currentTrack.artist_id}`}>{currentTrack.artist_name}</Link>
              ) : 'Неизвестный артист'}
            </div>
          </div>
          {hasLyrics && (
            <button
              className={`player-extra-btn ${showLyrics ? 'active' : ''}`}
              onClick={() => setShowLyrics(true)}
              title="Текст трека"
            >
              <i className="fas fa-align-left"></i>
            </button>
          )}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className={`control-btn ${shuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Случайный порядок">
              <i className="fas fa-random"></i>
            </button>
            <i className="fas fa-step-backward" onClick={playPrev}></i>
            <i className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'} play-btn`} onClick={togglePlay}></i>
            <i className="fas fa-step-forward" onClick={playNext}></i>
            <button
              className={`control-btn ${repeat !== 'off' ? 'active' : ''}`}
              onClick={toggleRepeat}
              title={repeat === 'off' ? 'Повтор выкл' : repeat === 'all' ? 'Повтор плейлиста' : 'Повтор трека'}
              style={{
                position: 'relative',
                borderRadius: '50%',
                border: repeat === 'all' ? '2px solid var(--accent)' : '2px solid transparent',
                padding: repeat === 'all' ? '4px' : '6px',
                boxShadow: repeat === 'all' ? '0 0 8px rgba(136,51,255,0.4)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s, padding 0.2s',
              }}
            >
              <i className="fas fa-repeat"></i>
              {repeat === 'one' && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  background: 'var(--accent)', color: 'white',
                  borderRadius: '50%', width: 15, height: 15,
                  fontSize: '0.58rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, boxShadow: '0 0 6px rgba(136,51,255,0.5)',
                }}>1</span>
              )}
            </button>
          </div>
          <div className="progress-area">
            <span className="current-time">{formatTime(currentTime)}</span>
            <div
              className="progress-bar"
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
              style={{ '--volume': `${volume * 100}%` }}
              onMouseDown={handleVolumeMouseDown}
              onClick={handleVolumeClick}
            >
              <div className="volume-level"></div>
            </div>
          </div>
          <button
            ref={queueBtnRef}
            className={`control-btn queue-btn ${showQueue ? 'active' : ''}`}
            onClick={toggleShowQueue}
            title="Очередь"
          >
            <i className="fas fa-list-ol"></i>
          </button>
        </div>
      </div>

      {showLyrics && (
        <LyricsModal
          track={currentTrack}
          currentTime={currentTime}
          onClose={() => setShowLyrics(false)}
        />
      )}

      {showQueue && <QueuePanel ref={queuePanelRef} />}
    </>
  );
}
