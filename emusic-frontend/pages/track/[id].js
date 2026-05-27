import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import usePlayerStore from '../../store/playerStore';
import LikeButton from '../../components/LikeButton';
import DownloadButton from '../../components/DownloadButton';
import AddToPlaylistButton from '../../components/AddToPlaylistButton';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDuration(sec) {
  if (!sec) return '—';
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}

function parseLyrics(text) {
  if (!text) return [];
  return text.split('\n').map(line => {
    const m = line.match(/^\[(\d+):(\d+)\]\s*(.*)/);
    if (m) return { time: parseInt(m[1])*60 + parseInt(m[2]), text: m[3] };
    return { time: null, text: line };
  });
}

const MOOD_COLORS = { energetic:'#ff6b35', sad:'#6b8cff', romantic:'#ff6b8c', calm:'#35d4a0', aggressive:'#ff3535', dance:'#d435ff', nostalgic:'#ffa535', inspiring:'#35c4ff' };

export default function TrackPage() {
  const router = useRouter();
  const { id } = router.query;
  const [track, setTrack] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setTrack: playTrack, currentTrack, addToQueue } = usePlayerStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/music/track/${id}`)
      .then(r => {
        setTrack(r.data);
        if (r.data.moods?.length > 0) {
          api.get(`/moods/${r.data.moods[0].slug}/tracks?limit=6`)
            .then(r2 => setRelated((r2.data || []).filter(t => t.id !== r.data.id).slice(0,5)))
            .catch(() => {});
        }
      })
      .catch(() => setTrack(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div style={{textAlign:'center',padding:80,color:'var(--text-muted)'}}><i className="fas fa-spinner fa-spin" style={{fontSize:'2.5rem'}}></i></div></Layout>;
  if (!track) return <Layout><div style={{textAlign:'center',padding:80,color:'var(--text-muted)'}}><h2>Трек не найден</h2></div></Layout>;

  const lyrics = parseLyrics(track.lyrics);
  const isPlaying = currentTrack?.id === track.id;

  return (
    <Layout>
      {/* Центрируем весь контент по вертикали */}
      <div style={{
        minHeight: 'calc(100vh - 150px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px 24px 48px',
      }}>
        <div style={{maxWidth: 1060, margin: '0 auto', width: '100%'}}>

          {/* Шапка трека */}
          <div style={{
            display: 'flex',
            gap: 56,
            alignItems: 'center',
            marginBottom: 44,
            flexWrap: 'wrap',
          }}>
            {/* Обложка */}
            <div style={{
              width: 340,
              height: 340,
              flexShrink: 0,
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              background: 'var(--bg-elevated)',
            }}>
              <img
                src={track.cover ? `${API}/${track.cover}` : '/default-cover.png'}
                style={{width:'100%',height:'100%',objectFit:'cover'}}
                onError={e=>e.target.src='/default-cover.png'}
                alt={track.title}
              />
            </div>

            {/* Инфо */}
            <div style={{flex:1, minWidth: 300}}>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text-muted)',
                marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700,
              }}>Трек</div>

              <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3.4rem)',
                fontWeight: 900,
                marginBottom: 14,
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}>{track.title}</h1>

              <Link href={`/artist/${track.artist_id}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: 'var(--accent)', textDecoration: 'none',
                marginBottom: 22, fontSize: '1.1rem', fontWeight: 700,
              }}>
                <i className="fas fa-microphone-alt"></i>{track.artist_name}
              </Link>

              {/* Мета */}
              <div style={{
                display: 'flex', gap: 18, flexWrap: 'wrap',
                fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20,
              }}>
                <span><i className="fas fa-headphones" style={{marginRight:5}}></i>{(track.play_count||0).toLocaleString()} прослушиваний</span>
                <span><i className="fas fa-clock" style={{marginRight:5}}></i>{formatDuration(track.duration)}</span>
                {track.is_adult && (
                  <span style={{background:'rgba(220,53,69,0.15)',color:'#dc3545',padding:'3px 10px',borderRadius:10,fontWeight:700}}>18+</span>
                )}
              </div>

              {/* Настроения */}
              {track.moods?.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:24}}>
                  {track.moods.map(m => (
                    <span key={m.id} style={{
                      display:'inline-flex',alignItems:'center',gap:5,
                      padding:'6px 14px',borderRadius:24,
                      background:`${MOOD_COLORS[m.slug]||'var(--accent)'}18`,
                      color:MOOD_COLORS[m.slug]||'var(--accent)',
                      fontSize:'0.82rem',fontWeight:700,
                      border:`1px solid ${MOOD_COLORS[m.slug]||'var(--accent)'}35`,
                    }}>
                      {m.emoji && <i className={`fas ${m.emoji}`} style={{fontSize:'0.72rem'}}></i>}
                      {m.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Действия */}
              <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                <button className="btn" onClick={()=>playTrack(track,[track])}
                  style={{display:'inline-flex',alignItems:'center',gap:9,padding:'13px 32px',fontSize:'1rem',fontWeight:700}}>
                  <i className={`fas ${isPlaying?'fa-pause':'fa-play'}`}></i>
                  {isPlaying ? 'Сейчас играет' : 'Слушать'}
                </button>
                <button className="btn-secondary" onClick={()=>addToQueue(track)}
                  style={{padding:'12px 18px'}} title="Добавить в очередь">
                  <i className="fas fa-list-ol"></i>
                </button>
                <LikeButton item={track} type="tracks" initialState={track.liked}/>
                <DownloadButton trackId={track.id} trackTitle={track.title}/>
                <AddToPlaylistButton trackId={track.id} trackTitle={track.title}/>
              </div>
            </div>
          </div>

          {/* Нижний блок: текст + похожие */}
          {(track.lyrics || related.length > 0) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: track.lyrics && related.length > 0 ? '1fr 1fr' : '1fr',
              gap: 24,
            }}>
              {track.lyrics && (
                <div style={{background:'var(--bg-elevated)',borderRadius:18,padding:28,border:'1px solid var(--border)'}}>
                  <h3 style={{marginBottom:16,display:'flex',alignItems:'center',gap:8,fontSize:'1rem',fontWeight:700}}>
                    <i className="fas fa-align-left" style={{color:'var(--accent)'}}></i>Текст трека
                  </h3>
                  <div style={{maxHeight:340,overflowY:'auto',paddingRight:4}}>
                    {lyrics.map((line,i)=>(
                      <div key={i} style={{marginBottom:3,fontSize:'0.9rem',lineHeight:1.8,color:line.text?'var(--text-primary)':'transparent'}}>
                        {line.text||'\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {related.length > 0 && (
                <div style={{background:'var(--bg-elevated)',borderRadius:18,padding:28,border:'1px solid var(--border)'}}>
                  <h3 style={{marginBottom:16,display:'flex',alignItems:'center',gap:8,fontSize:'1rem',fontWeight:700}}>
                    <i className="fas fa-music" style={{color:'var(--accent)'}}></i>Похожие треки
                  </h3>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {related.map(t=>(
                      <div key={t.id}
                        style={{display:'flex',gap:12,alignItems:'center',cursor:'pointer',padding:'8px',borderRadius:10,transition:'background 0.15s'}}
                        onClick={()=>playTrack(t,related)}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--hover)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                      >
                        <img src={t.cover?`${API}/${t.cover}`:'/default-cover.png'}
                          style={{width:46,height:46,borderRadius:10,objectFit:'cover',flexShrink:0}}
                          onError={e=>e.target.src='/default-cover.png'} alt=""/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:'0.88rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:'var(--text-primary)'}}>{t.title}</div>
                          <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>{t.artist_name}</div>
                        </div>
                        <span style={{fontSize:'0.76rem',color:'var(--text-muted)',flexShrink:0}}>{formatDuration(t.duration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
