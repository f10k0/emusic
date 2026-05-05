import { useEffect, useRef, useState } from 'react';

function parseLyrics(raw) {
  if (!raw) return [];
  const lines = raw.split('\n');
  return lines.map((line) => {
    const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d+))?\]\s*(.*)/);
    if (match) {
      const mins = parseInt(match[1]);
      const secs = parseInt(match[2]);
      const text = match[4];
      return { time: mins * 60 + secs, text };
    }
    return { time: null, text: line };
  }).filter(l => l.text.trim() !== '');
}

export default function LyricsModal({ track, currentTime, onClose }) {
  const [lines, setLines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeRef = useRef(null);

  useEffect(() => {
    setLines(parseLyrics(track.lyrics));
  }, [track]);

  useEffect(() => {
    if (!lines.length) return;
    const timed = lines.filter(l => l.time !== null);
    if (!timed.length) return;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time !== null && lines[i].time <= currentTime) idx = i;
    }
    setActiveIndex(idx);
  }, [currentTime, lines]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  const handleLineClick = (time) => {
    if (time !== null && window.__playerSeekTo) {
      window.__playerSeekTo(time);
    }
  };

  const hasTiming = lines.some(l => l.time !== null);

  return (
    <div className="lyrics-overlay" onClick={onClose}>
      <div className="lyrics-modal" onClick={e => e.stopPropagation()}>
        <div className="lyrics-header">
          <div>
            <div className="lyrics-title">{track.title}</div>
            <div className="lyrics-artist">{track.artist_name}</div>
          </div>
          <button className="lyrics-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="lyrics-body">
          {lines.length === 0 ? (
            <p className="lyrics-empty">Текст не найден</p>
          ) : (
            lines.map((line, i) => (
              <p
                key={i}
                ref={i === activeIndex ? activeRef : null}
                className={`lyrics-line ${i === activeIndex ? 'lyrics-active' : ''} ${line.time !== null ? 'lyrics-timed' : ''}`}
                onClick={() => handleLineClick(line.time)}
              >
                {line.text || '\u00A0'}
              </p>
            ))
          )}
        </div>
        {hasTiming && (
          <div className="lyrics-hint">Нажмите на строку, чтобы перемотать</div>
        )}
      </div>
    </div>
  );
}
