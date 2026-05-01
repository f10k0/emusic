--
-- PostgreSQL database dump
--

\restrict 5BmKBUqESwmk4yCcaGSFuHb73tE8MfmNVyZo1cRlNv4QWfuWgXTs2oSwSZbFyLp

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: albums; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.albums (
    id integer NOT NULL,
    title character varying NOT NULL,
    artist_id integer NOT NULL,
    release_date timestamp without time zone,
    cover_image character varying,
    type character varying,
    is_published boolean
);


ALTER TABLE public.albums OWNER TO ruslankorshikov;

--
-- Name: albums_id_seq; Type: SEQUENCE; Schema: public; Owner: ruslankorshikov
--

CREATE SEQUENCE public.albums_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.albums_id_seq OWNER TO ruslankorshikov;

--
-- Name: albums_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ruslankorshikov
--

ALTER SEQUENCE public.albums_id_seq OWNED BY public.albums.id;


--
-- Name: artists; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.artists (
    id integer NOT NULL,
    name character varying NOT NULL,
    bio text,
    avatar character varying,
    user_id integer NOT NULL
);


ALTER TABLE public.artists OWNER TO ruslankorshikov;

--
-- Name: artists_id_seq; Type: SEQUENCE; Schema: public; Owner: ruslankorshikov
--

CREATE SEQUENCE public.artists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.artists_id_seq OWNER TO ruslankorshikov;

--
-- Name: artists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ruslankorshikov
--

ALTER SEQUENCE public.artists_id_seq OWNED BY public.artists.id;


--
-- Name: favorite_albums; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.favorite_albums (
    user_id integer,
    album_id integer
);


ALTER TABLE public.favorite_albums OWNER TO ruslankorshikov;

--
-- Name: favorite_artists; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.favorite_artists (
    user_id integer,
    artist_id integer
);


ALTER TABLE public.favorite_artists OWNER TO ruslankorshikov;

--
-- Name: favorite_tracks; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.favorite_tracks (
    user_id integer,
    track_id integer
);


ALTER TABLE public.favorite_tracks OWNER TO ruslankorshikov;

--
-- Name: genres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.genres (
    id integer NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    description text,
    cover_image character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.genres OWNER TO postgres;

--
-- Name: genres_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.genres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.genres_id_seq OWNER TO postgres;

--
-- Name: genres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.genres_id_seq OWNED BY public.genres.id;


--
-- Name: news; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.news (
    id integer NOT NULL,
    title character varying NOT NULL,
    content text NOT NULL,
    image character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    is_published boolean DEFAULT true
);


ALTER TABLE public.news OWNER TO postgres;

--
-- Name: news_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.news_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.news_id_seq OWNER TO postgres;

--
-- Name: news_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.news_id_seq OWNED BY public.news.id;


--
-- Name: playlist_tracks; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.playlist_tracks (
    playlist_id integer NOT NULL,
    track_id integer NOT NULL
);


ALTER TABLE public.playlist_tracks OWNER TO ruslankorshikov;

--
-- Name: playlists; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.playlists (
    id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    cover_image character varying,
    user_id integer NOT NULL,
    is_public boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.playlists OWNER TO ruslankorshikov;

--
-- Name: playlists_id_seq; Type: SEQUENCE; Schema: public; Owner: ruslankorshikov
--

CREATE SEQUENCE public.playlists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.playlists_id_seq OWNER TO ruslankorshikov;

--
-- Name: playlists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ruslankorshikov
--

ALTER SEQUENCE public.playlists_id_seq OWNED BY public.playlists.id;


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.submissions (
    id integer NOT NULL,
    artist_id integer NOT NULL,
    track_id integer NOT NULL,
    status character varying,
    submitted_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone
);


ALTER TABLE public.submissions OWNER TO ruslankorshikov;

--
-- Name: submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: ruslankorshikov
--

CREATE SEQUENCE public.submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.submissions_id_seq OWNER TO ruslankorshikov;

--
-- Name: submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ruslankorshikov
--

ALTER SEQUENCE public.submissions_id_seq OWNED BY public.submissions.id;


--
-- Name: track_genres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.track_genres (
    track_id integer NOT NULL,
    genre_id integer NOT NULL
);


ALTER TABLE public.track_genres OWNER TO postgres;

--
-- Name: tracks; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.tracks (
    id integer NOT NULL,
    title character varying NOT NULL,
    duration integer,
    album_id integer,
    artist_id integer NOT NULL,
    file_path character varying NOT NULL,
    play_count bigint,
    is_published boolean,
    cover character varying
);


ALTER TABLE public.tracks OWNER TO ruslankorshikov;

--
-- Name: tracks_id_seq; Type: SEQUENCE; Schema: public; Owner: ruslankorshikov
--

CREATE SEQUENCE public.tracks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tracks_id_seq OWNER TO ruslankorshikov;

--
-- Name: tracks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ruslankorshikov
--

ALTER SEQUENCE public.tracks_id_seq OWNED BY public.tracks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: ruslankorshikov
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying NOT NULL,
    email character varying NOT NULL,
    hashed_password character varying NOT NULL,
    role character varying,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    avatar character varying
);


ALTER TABLE public.users OWNER TO ruslankorshikov;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: ruslankorshikov
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO ruslankorshikov;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ruslankorshikov
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: albums id; Type: DEFAULT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.albums ALTER COLUMN id SET DEFAULT nextval('public.albums_id_seq'::regclass);


--
-- Name: artists id; Type: DEFAULT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.artists ALTER COLUMN id SET DEFAULT nextval('public.artists_id_seq'::regclass);


--
-- Name: genres id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genres ALTER COLUMN id SET DEFAULT nextval('public.genres_id_seq'::regclass);


--
-- Name: news id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news ALTER COLUMN id SET DEFAULT nextval('public.news_id_seq'::regclass);


--
-- Name: playlists id; Type: DEFAULT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.playlists ALTER COLUMN id SET DEFAULT nextval('public.playlists_id_seq'::regclass);


--
-- Name: submissions id; Type: DEFAULT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.submissions ALTER COLUMN id SET DEFAULT nextval('public.submissions_id_seq'::regclass);


--
-- Name: tracks id; Type: DEFAULT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.tracks ALTER COLUMN id SET DEFAULT nextval('public.tracks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: albums; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.albums (id, title, artist_id, release_date, cover_image, type, is_published) FROM stdin;
4	falling leaves	1	2026-02-26 00:00:00	uploads/album_covers\\album_4_1772468173.jpg	album	t
\.


--
-- Data for Name: artists; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.artists (id, name, bio, avatar, user_id) FROM stdin;
1	Ruslan Harassment	Рэп и хип-хоп исполнитель	uploads/artist_avatars/artist_1_1772216859.jpg	1
\.


--
-- Data for Name: favorite_albums; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.favorite_albums (user_id, album_id) FROM stdin;
1	4
2	4
\.


--
-- Data for Name: favorite_artists; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.favorite_artists (user_id, artist_id) FROM stdin;
2	1
1	1
\.


--
-- Data for Name: favorite_tracks; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.favorite_tracks (user_id, track_id) FROM stdin;
1	1
2	1
1	3
1	4
2	4
2	3
1	5
2	5
\.


--
-- Data for Name: genres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.genres (id, name, slug, description, cover_image, created_at) FROM stdin;
1	Рэп	рэп	Популярные треки в жанре Рэп	\N	2026-03-31 20:35:25.852765
2	R&B	rb	Популярные треки в жанре R&B	\N	2026-03-31 20:35:25.852765
3	Рок	рок	Популярные треки в жанре Рок	\N	2026-03-31 20:35:25.852765
4	Поп	поп	Популярные треки в жанре Поп	\N	2026-03-31 20:35:25.852765
5	Электронная музыка	электронная-музыка	Популярные треки в жанре Электронная музыка	\N	2026-03-31 20:35:25.852765
6	Хип-хоп	хип-хоп	Популярные треки в жанре Хип-хоп	\N	2026-03-31 20:35:25.852765
7	Джаз	джаз	Популярные треки в жанре Джаз	\N	2026-03-31 20:35:25.852765
8	Блюз	блюз	Популярные треки в жанре Блюз	\N	2026-03-31 20:35:25.852765
9	Кантри	кантри	Популярные треки в жанре Кантри	\N	2026-03-31 20:35:25.852765
10	Регги	регги	Популярные треки в жанре Регги	\N	2026-03-31 20:35:25.852765
11	Метал	метал	Популярные треки в жанре Метал	\N	2026-03-31 20:35:25.852765
12	Панк	панк	Популярные треки в жанре Панк	\N	2026-03-31 20:35:25.852765
13	Инди	инди	Популярные треки в жанре Инди	\N	2026-03-31 20:35:25.852765
14	Альтернатива	альтернатива	Популярные треки в жанре Альтернатива	\N	2026-03-31 20:35:25.852765
15	Фолк	фолк	Популярные треки в жанре Фолк	\N	2026-03-31 20:35:25.852765
16	Классическая	классическая	Популярные треки в жанре Классическая	\N	2026-03-31 20:35:25.852765
17	Эмбиент	эмбиент	Популярные треки в жанре Эмбиент	\N	2026-03-31 20:35:25.852765
18	Лоу-фай	лоу-фай	Популярные треки в жанре Лоу-фай	\N	2026-03-31 20:35:25.852765
19	Техно	техно	Популярные треки в жанре Техно	\N	2026-03-31 20:35:25.852765
20	Хаус	хаус	Популярные треки в жанре Хаус	\N	2026-03-31 20:35:25.852765
\.


--
-- Data for Name: news; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.news (id, title, content, image, created_at, updated_at, is_published) FROM stdin;
1	Обновление сайта!	Добавлены чарты и жанры, также вкладка новостей, поздравляю вас с прочтением первой новости на emusic!	uploads/news/news_1_1774979819.PNG	2026-03-31 23:55:41.364229	2026-03-31 23:56:59.575947	t
\.


--
-- Data for Name: playlist_tracks; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.playlist_tracks (playlist_id, track_id) FROM stdin;
2	1
2	3
2	4
3	4
3	5
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.playlists (id, name, description, cover_image, user_id, is_public, created_at, updated_at) FROM stdin;
2	Крутой плейлист	Любимое	uploads/playlist_covers\\playlist_2_1772224774.jpg	2	t	2026-02-28 02:39:34.637661	2026-02-28 19:53:34.706264
3	Крутой плейлист 2	Любимое 2	uploads/playlist_covers\\playlist_2_1772225731.jpg	2	t	2026-02-28 02:55:31.008209	2026-02-28 22:22:10.580554
4	Крутой плейлист 3	Любимое 3	uploads/playlist_covers\\playlist_2_1772225933.jpg	2	t	2026-02-28 02:58:53.810122	2026-02-28 22:22:11.328858
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.submissions (id, artist_id, track_id, status, submitted_at, reviewed_at) FROM stdin;
1	1	1	approved	2026-02-27 21:08:48.658571+03	2026-02-27 18:21:08.440815+03
3	1	3	approved	2026-03-02 22:23:29.178079+03	2026-03-02 19:24:11.113654+03
4	1	4	approved	2026-03-09 18:09:28.233111+03	2026-03-09 15:09:45.188261+03
5	1	5	approved	2026-03-31 19:40:24.743769+03	2026-03-31 16:40:48.530795+03
9	1	9	pending	2026-04-01 01:58:42.125384+03	\N
\.


--
-- Data for Name: track_genres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.track_genres (track_id, genre_id) FROM stdin;
5	15
5	4
1	5
1	17
4	5
4	3
3	3
3	4
3	19
9	5
\.


--
-- Data for Name: tracks; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.tracks (id, title, duration, album_id, artist_id, file_path, play_count, is_published, cover) FROM stdin;
5	Vdoh	0	\N	1	uploads/1774964424.731894.mp3	28	t	uploads/track_covers/track_5_1774964665.jpg
9	9999	0	\N	1	uploads/1774987122.114628.mp3	4	f	\N
1	Just stay	127	4	1	uploads/1772204928.651633.mp3	71	t	uploads/track_covers/track_1_1772216295.jpg
4	situation is terrifying	0	\N	1	uploads/1773058168.220879.mp3	16	t	uploads/track_covers/track_4_1773058209.jpg
3	in my life	156	4	1	uploads/1772468609.167639.mp3	5	t	uploads/track_covers/track_3_1772468693.jpg
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ruslankorshikov
--

COPY public.users (id, username, email, hashed_password, role, is_active, created_at, avatar) FROM stdin;
2	adminrule01	admin@emusic.com	$2b$12$x6/FIFG.1vmxqkgS0a3.nu/p7BTaUtICTMY4vOF5s6Sskicxy8tl6	admin	t	2026-02-27 21:13:37.962415+03	\N
1	Ruslan Harassment	RUSTER.KoRsHiK@yandex.ru	$2b$12$HRbO.EogBOwezz59MhC7Uu0O1SZWUURbqafeW10qAeNDCZDmEDRRW	artist	t	2026-02-27 18:41:46.302753+03	uploads/avatars/user_1_1772210100.jpg
3	Floka	rusterbest@gmail.com	$2b$12$gzcH2y0nC4sbD/wsfdpHMeY2cXsI0guA3kkaGVqw4mjORrmYeJ3Yy	user	t	2026-03-02 22:01:48.988206+03	\N
\.


--
-- Name: albums_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ruslankorshikov
--

SELECT pg_catalog.setval('public.albums_id_seq', 5, true);


--
-- Name: artists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ruslankorshikov
--

SELECT pg_catalog.setval('public.artists_id_seq', 1, true);


--
-- Name: genres_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.genres_id_seq', 20, true);


--
-- Name: news_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.news_id_seq', 1, true);


--
-- Name: playlists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ruslankorshikov
--

SELECT pg_catalog.setval('public.playlists_id_seq', 4, true);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ruslankorshikov
--

SELECT pg_catalog.setval('public.submissions_id_seq', 9, true);


--
-- Name: tracks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ruslankorshikov
--

SELECT pg_catalog.setval('public.tracks_id_seq', 9, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ruslankorshikov
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: albums albums_pkey; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_pkey PRIMARY KEY (id);


--
-- Name: artists artists_pkey; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_pkey PRIMARY KEY (id);


--
-- Name: artists artists_user_id_key; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_user_id_key UNIQUE (user_id);


--
-- Name: genres genres_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_name_key UNIQUE (name);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: genres genres_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_slug_key UNIQUE (slug);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: playlist_tracks playlist_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (playlist_id, track_id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: track_genres track_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_genres
    ADD CONSTRAINT track_genres_pkey PRIMARY KEY (track_id, genre_id);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: ix_albums_id; Type: INDEX; Schema: public; Owner: ruslankorshikov
--

CREATE INDEX ix_albums_id ON public.albums USING btree (id);


--
-- Name: ix_artists_id; Type: INDEX; Schema: public; Owner: ruslankorshikov
--

CREATE INDEX ix_artists_id ON public.artists USING btree (id);


--
-- Name: ix_submissions_id; Type: INDEX; Schema: public; Owner: ruslankorshikov
--

CREATE INDEX ix_submissions_id ON public.submissions USING btree (id);


--
-- Name: ix_tracks_id; Type: INDEX; Schema: public; Owner: ruslankorshikov
--

CREATE INDEX ix_tracks_id ON public.tracks USING btree (id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: ruslankorshikov
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: albums albums_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: artists artists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: favorite_albums favorite_albums_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.favorite_albums
    ADD CONSTRAINT favorite_albums_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id);


--
-- Name: favorite_albums favorite_albums_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.favorite_albums
    ADD CONSTRAINT favorite_albums_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: favorite_artists favorite_artists_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.favorite_artists
    ADD CONSTRAINT favorite_artists_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: favorite_artists favorite_artists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.favorite_artists
    ADD CONSTRAINT favorite_artists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: favorite_tracks favorite_tracks_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.favorite_tracks
    ADD CONSTRAINT favorite_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id);


--
-- Name: favorite_tracks favorite_tracks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.favorite_tracks
    ADD CONSTRAINT favorite_tracks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: playlist_tracks playlist_tracks_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: playlist_tracks playlist_tracks_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: playlists playlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: submissions submissions_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: submissions submissions_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id);


--
-- Name: track_genres track_genres_genre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_genres
    ADD CONSTRAINT track_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE CASCADE;


--
-- Name: track_genres track_genres_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.track_genres
    ADD CONSTRAINT track_genres_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: tracks tracks_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id);


--
-- Name: tracks tracks_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ruslankorshikov
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO ruslankorshikov;


--
-- Name: TABLE genres; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.genres TO ruslankorshikov;


--
-- Name: SEQUENCE genres_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.genres_id_seq TO ruslankorshikov;


--
-- Name: TABLE news; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.news TO ruslankorshikov;


--
-- Name: SEQUENCE news_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.news_id_seq TO ruslankorshikov;


--
-- Name: TABLE track_genres; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.track_genres TO ruslankorshikov;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO ruslankorshikov;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO ruslankorshikov;


--
-- PostgreSQL database dump complete
--

\unrestrict 5BmKBUqESwmk4yCcaGSFuHb73tE8MfmNVyZo1cRlNv4QWfuWgXTs2oSwSZbFyLp

