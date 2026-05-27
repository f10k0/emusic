import { useState } from 'react';
import useSettingsStore, {
  EQ_PRESETS, EQ_FREQ_LABELS, NORMALIZATION_LEVELS
} from '../store/settingsStore';

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function EqualizerModal({ onClose }) {
  const {
    settings, customEqGains, playbackRate, monoMode, normalization, normalizationLevel,
    applyEqualizer, setCustomEqBand, setPlaybackRate, setMonoMode,
    setNormalization, setNormalizationLevel,
  } = useSettingsStore();

  const currentPreset = settings.equalizer_preset || 'normal';

  const displayGains = currentPreset === 'custom'
    ? customEqGains
    : (EQ_PRESETS[currentPreset]?.gains || EQ_PRESETS.normal.gains);

  const handlePresetChange = (preset) => {
    applyEqualizer(preset, null);
  };

  const handleBandChange = (i, val) => {
    setCustomEqBand(i, Number(val));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content equalizer-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 620, width: '95vw' }}
      >
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
            <i className="fas fa-sliders-h" style={{ marginRight: 8, color: 'var(--accent)' }}></i>
            Эквалайзер и звук
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── ПРЕСЕТЫ ── */}
          <section>
            <div className="eq-section-title">Пресет эквалайзера</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(EQ_PRESETS).map(([key, { label }]) => (
                <button
                  key={key}
                  className={`eq-preset-btn ${currentPreset === key ? 'active' : ''}`}
                  onClick={() => handlePresetChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* ── ПОЛОСЫ EQ ── */}
          <section>
            <div className="eq-section-title">
              Частотные полосы
              {currentPreset !== 'custom' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 8 }}>
                  (перетащи ползунок — переключится в «Свой»)
                </span>
              )}
            </div>
            <div className="eq-bands">
              {EQ_FREQ_LABELS.map((label, i) => (
                <div key={i} className="eq-band">
                  <span className="eq-band-value">
                    {displayGains[i] > 0 ? '+' : ''}{displayGains[i]}
                  </span>
                  <div className="eq-band-slider-wrap">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={displayGains[i]}
                      className="eq-band-slider"
                      orient="vertical"
                      onChange={e => handleBandChange(i, e.target.value)}
                    />
                  </div>
                  <span className="eq-band-label">{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── СКОРОСТЬ ВОСПРОИЗВЕДЕНИЯ ── */}
          <section>
            <div className="eq-section-title">Скорость воспроизведения</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {PLAYBACK_RATES.map(rate => (
                <button
                  key={rate}
                  className={`eq-preset-btn ${playbackRate === rate ? 'active' : ''}`}
                  onClick={() => setPlaybackRate(rate)}
                  style={{ minWidth: 52 }}
                >
                  {rate === 1 ? '1× (норм)' : `${rate}×`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.05"
              value={playbackRate}
              style={{ width: '100%', marginTop: 10 }}
              onChange={e => setPlaybackRate(Number(e.target.value))}
            />
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--accent)', marginTop: 2 }}>
              {playbackRate}×
            </div>
          </section>

          {/* ── МОНО ── */}
          <section>
            <div className="eq-section-title">Моно-режим</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label className="eq-toggle">
                <input
                  type="checkbox"
                  checked={monoMode}
                  onChange={e => setMonoMode(e.target.checked)}
                />
                <span className="eq-toggle-slider"></span>
              </label>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Воспроизводить одинаково в левом и правом динамике
              </span>
            </div>
          </section>

          {/* ── НОРМАЛИЗАЦИЯ ГРОМКОСТИ ── */}
          <section>
            <div className="eq-section-title">Нормализация громкости</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <label className="eq-toggle">
                <input
                  type="checkbox"
                  checked={normalization}
                  onChange={e => setNormalization(e.target.checked)}
                />
                <span className="eq-toggle-slider"></span>
              </label>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Выравнивать громкость всех треков
              </span>
            </div>
            {normalization && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(NORMALIZATION_LEVELS).map(([key, { label }]) => (
                  <button
                    key={key}
                    className={`eq-preset-btn ${normalizationLevel === key ? 'active' : ''}`}
                    onClick={() => setNormalizationLevel(key)}
                  >
                    {label}
                  </button>
                ))}
                <span style={{
                  fontSize: '0.8rem', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', marginLeft: 4
                }}>
                  — целевой уровень: {NORMALIZATION_LEVELS[normalizationLevel]?.targetDb} dB
                </span>
              </div>
            )}
          </section>

        </div>
      </div>

      <style jsx>{`
        .equalizer-modal { padding: 0; overflow: hidden; }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid var(--border);
        }
        .modal-close {
          background: none; border: none; color: var(--text-secondary);
          cursor: pointer; font-size: 1rem; padding: 4px 8px;
        }
        .modal-close:hover { color: var(--text); }
        .modal-body { padding: 20px; overflow-y: auto; max-height: 70vh; }
        .eq-section-title {
          font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 10px;
        }
        .eq-preset-btn {
          padding: 5px 12px; border-radius: 20px; font-size: 0.82rem;
          border: 1px solid var(--border); background: var(--bg-secondary);
          color: var(--text); cursor: pointer; transition: all 0.15s;
        }
        .eq-preset-btn:hover { border-color: var(--accent); color: var(--accent); }
        .eq-preset-btn.active {
          background: var(--accent); border-color: var(--accent);
          color: #fff; font-weight: 600;
        }
        .eq-bands {
          display: flex; gap: 6px; align-items: flex-end;
          justify-content: space-between;
          padding: 10px 4px; background: var(--bg-secondary);
          border-radius: 10px; border: 1px solid var(--border);
        }
        .eq-band {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; flex: 1;
        }
        .eq-band-value {
          font-size: 0.68rem; color: var(--accent); font-weight: 600;
          min-height: 14px;
        }
        .eq-band-slider-wrap {
          height: 100px; display: flex; align-items: center; justify-content: center;
        }
        .eq-band-slider {
          writing-mode: vertical-lr;
          direction: rtl;
          width: 4px;
          height: 90px;
          cursor: pointer;
          accent-color: var(--accent);
        }
        .eq-band-label {
          font-size: 0.65rem; color: var(--text-secondary);
        }
        .eq-toggle {
          position: relative; display: inline-block; width: 38px; height: 20px; flex-shrink: 0;
        }
        .eq-toggle input { opacity: 0; width: 0; height: 0; }
        .eq-toggle-slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background: var(--border); border-radius: 20px; transition: 0.2s;
        }
        .eq-toggle-slider:before {
          content: ''; position: absolute; width: 14px; height: 14px;
          left: 3px; bottom: 3px; background: white;
          border-radius: 50%; transition: 0.2s;
        }
        .eq-toggle input:checked + .eq-toggle-slider { background: var(--accent); }
        .eq-toggle input:checked + .eq-toggle-slider:before { transform: translateX(18px); }
      `}</style>
    </div>
  );
}
