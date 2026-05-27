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
      <div style={{maxWidth:900, margin:'0 auto', padding:'24px 0'}}>
        {/* Шапка */}
        <div style={{display:'flex', gap:32, alignItems:'flex-start', marginBottom:40, flexWrap:'wrap'}}>
          <div style={{width:220, height:220, flexShrink:0, borderRadius:16, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', background:'var(--bg-elevated)'}}>
            <img src={track.cover ? `${API}/${track.cover}` : '/default-cover.png'} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.src='/default-cover.png'} alt={track.title}/>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.08em'}}>Трек</div>
            <h1 style={{fontSize:'2rem',fontWeight:900,marginBottom:10,lineHeight:1.2}}>{track.title}</h1>
            <Link href={`/artist/${track.artist_id}`} style={{display:'inline-flex',alignItems:'center',gap:8,color:'var(--text-secondary)',textDecoration:'none',marginBottom:16,fontSize:'0.95rem'}}>
              <i className="fas fa-microphone-alt" style={{color:'var(--accent)'}}></i>{track.artist_name}
            </Link>
            <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:'0.82rem',color:'var(--text-muted)',marginBottom:18}}>
              <span><i className="fas fa-headphones" style={{marginRight:4}}></i>{(track.play_count||0).toLocaleString()}</span>
              <span><i className="fas fa-clock" style={{marginRight:4}}></i>{formatDuration(track.duration)}</span>
              {track.is_adult && <span style={{background:'rgba(220,53,69,0.15)',color:'#dc3545',padding:'2px 8px',borderRadius:8,fontWeight:600}}>18+</span>}
            </div>
            {/* Настроения */}
            {track.moods?.length > 0 && (
              <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:18}}>
                {track.moods.map(m => (
                  <span key={m.id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 12px',borderRadius:20,background:`${MOOD_COLORS[m.slug]||'var(--accent)'}20`,color:MOOD_COLORS[m.slug]||'var(--accent)',fontSize:'0.8rem',fontWeight:600,border:`1px solid ${MOOD_COLORS[m.slug]||'var(--accent)'}40`}}>
                    {m.emoji && <i className={`fas ${m.emoji}`} style={{fontSize:'0.7rem'}}></i>}{m.name}
                  </span>
                ))}
              </div>
            )}
            {/* Действия */}
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <button className="btn" onClick={()=>playTrack(track,[track])} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 24px'}}>
                <i className={`fas ${isPlaying?'fa-pause':'fa-play'}`}></i>{isPlaying?'Играет':'Слушать'}
              </button>
              <button className="btn-secondary" onClick={()=>addToQueue(track)} style={{padding:'10px 16px'}} title="В очередь"><i className="fas fa-list-ol"></i></button>
              <LikeButton item={track} type="tracks" initialState={track.liked}/>
              <DownloadButton trackId={track.id} trackTitle={track.title}/>
              <AddToPlaylistButton trackId={track.id} trackTitle={track.title}/>
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:track.lyrics && related.length>0?'1fr 1fr':related.length>0||track.lyrics?'1fr':'',gap:28}}>
          {/* Текст */}
          {track.lyrics && (
            <div style={{background:'var(--bg-elevated)',borderRadius:16,padding:24,border:'1px solid var(--border)'}}>
              <h3 style={{marginBottom:14,display:'flex',alignItems:'center',gap:8}}><i className="fas fa-align-left" style={{color:'var(--accent)'}}></i>Текст трека</h3>
              <div style={{maxHeight:400,overflowY:'auto'}}>
                {lyrics.map((line,i)=>(
                  <div key={i} style={{marginBottom:3,fontSize:'0.9rem',lineHeight:1.7,color:line.text?'var(--text-primary)':'transparent'}}>{line.text||'\u00A0'}</div>
                ))}
              </div>
            </div>
          )}
          {/* Похожие */}
          {related.length>0 && (
            <div style={{background:'var(--bg-elevated)',borderRadius:16,padding:24,border:'1px solid var(--border)'}}>
              <h3 style={{marginBottom:14,display:'flex',alignItems:'center',gap:8}}><i className="fas fa-music" style={{color:'var(--accent)'}}></i>Похожие треки</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {related.map(t=>(
                  <div key={t.id} style={{display:'flex',gap:10,alignItems:'center',cursor:'pointer',padding:'5px 0'}} onClick={()=>playTrack(t,related)}>
                    <img src={t.cover?`${API}/${t.cover}`:'/default-cover.png'} style={{width:42,height:42,borderRadius:8,objectFit:'cover',flexShrink:0}} onError={e=>e.target.src='/default-cover.png'} alt=""/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:'0.87rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                      <div style={{fontSize:'0.77rem',color:'var(--text-muted)'}}>{t.artist_name}</div>
                    </div>
                    <span style={{fontSize:'0.75rem',color:'var(--text-muted)',flexShrink:0}}>{formatDuration(t.duration)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
