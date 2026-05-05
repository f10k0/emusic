import usePlayerStore from '../store/playerStore';

export default function QueuePanel() {
  const { dynamicQueue, queue, currentTrack, removeFromQueue, reorderQueue, clearDynamicQueue, setTrack } = usePlayerStore();

  const handleDragStart = (e, idx) => e.dataTransfer.setData('text/plain', idx);
  const handleDrop = (e, toIdx) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
    reorderQueue(fromIdx, toIdx);
  };
  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="queue-panel">
      <div className="queue-panel-header">
        <span>Очередь воспроизведения</span>
        {dynamicQueue.length > 0 && (
          <button className="queue-clear-btn" onClick={clearDynamicQueue}>
            Очистить
          </button>
        )}
      </div>

      {currentTrack && (
        <div className="queue-section">
          <div className="queue-section-title">Сейчас играет</div>
          <div className="queue-item queue-item-current">
            <img
              src={currentTrack.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${currentTrack.cover}` : '/default-cover.png'}
              className="queue-item-img"
              onError={e => { e.target.src = '/default-cover.png'; }}
              alt=""
            />
            <div className="queue-item-info">
              <div className="queue-item-title">{currentTrack.title}</div>
              <div className="queue-item-artist">{currentTrack.artist_name}</div>
            </div>
            <i className="fas fa-volume-up queue-now-icon"></i>
          </div>
        </div>
      )}

      {dynamicQueue.length > 0 && (
        <div className="queue-section">
          <div className="queue-section-title">Следующее в очереди ({dynamicQueue.length})</div>
          {dynamicQueue.map((track, idx) => (
            <div
              key={`dq-${idx}`}
              className="queue-item"
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragOver={handleDragOver}
            >
              <img
                src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'}
                className="queue-item-img"
                onError={e => { e.target.src = '/default-cover.png'; }}
                alt=""
              />
              <div className="queue-item-info">
                <div className="queue-item-title">{track.title}</div>
                <div className="queue-item-artist">{track.artist_name}</div>
              </div>
              <button className="queue-remove-btn" onClick={() => removeFromQueue(idx)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <div className="queue-section">
          <div className="queue-section-title">Основная очередь</div>
          {queue.map((track, idx) => {
            const isCurrent = currentTrack && track.id === currentTrack.id;
            return (
              <div
                key={`q-${idx}`}
                className={`queue-item ${isCurrent ? 'queue-item-current' : ''}`}
                onClick={() => !isCurrent && setTrack(track, queue)}
                style={{ cursor: isCurrent ? 'default' : 'pointer' }}
              >
                <img
                  src={track.cover ? `${process.env.NEXT_PUBLIC_API_URL}/${track.cover}` : '/default-cover.png'}
                  className="queue-item-img"
                  onError={e => { e.target.src = '/default-cover.png'; }}
                  alt=""
                />
                <div className="queue-item-info">
                  <div className="queue-item-title">{track.title}</div>
                  <div className="queue-item-artist">{track.artist_name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dynamicQueue.length === 0 && queue.length === 0 && !currentTrack && (
        <div className="queue-empty">Очередь пуста</div>
      )}
    </div>
  );
}
