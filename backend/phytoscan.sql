--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.10
-- Dumped by pg_dump version 9.6.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: _chat_messages; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._chat_messages (
    id smallint,
    session_id character varying(16) DEFAULT NULL::character varying,
    user_id smallint,
    role character varying(4) DEFAULT NULL::character varying,
    text character varying(528) DEFAULT NULL::character varying,
    lang character varying(2) DEFAULT NULL::character varying,
    created_at character varying(10) DEFAULT NULL::character varying
);


ALTER TABLE public._chat_messages OWNER TO rebasedata;

--
-- Name: _disease_translations; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._disease_translations (
    id smallint,
    disease_id smallint,
    lang character varying(2) DEFAULT NULL::character varying,
    name character varying(37) DEFAULT NULL::character varying,
    pathogen character varying(51) DEFAULT NULL::character varying,
    severity_label character varying(11) DEFAULT NULL::character varying,
    description character varying(167) DEFAULT NULL::character varying,
    symptoms character varying(164) DEFAULT NULL::character varying,
    remedies character varying(325) DEFAULT NULL::character varying,
    healthy_comparison character varying(40) DEFAULT NULL::character varying,
    infected_comparison character varying(64) DEFAULT NULL::character varying
);


ALTER TABLE public._disease_translations OWNER TO rebasedata;

--
-- Name: _diseases; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._diseases (
    id smallint,
    code character varying(14) DEFAULT NULL::character varying,
    is_healthy smallint,
    severity_level character varying(9) DEFAULT NULL::character varying
);


ALTER TABLE public._diseases OWNER TO rebasedata;

--
-- Name: _plant_care; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._plant_care (
    id smallint,
    plant_id character varying(5) DEFAULT NULL::character varying,
    task character varying(49) DEFAULT NULL::character varying,
    frequency character varying(18) DEFAULT NULL::character varying,
    status character varying(17) DEFAULT NULL::character varying
);


ALTER TABLE public._plant_care OWNER TO rebasedata;

--
-- Name: _plant_history; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._plant_history (
    id smallint,
    plant_id character varying(5) DEFAULT NULL::character varying,
    date character varying(1) DEFAULT NULL::character varying,
    type character varying(14) DEFAULT NULL::character varying,
    result character varying(45) DEFAULT NULL::character varying,
    notes character varying(66) DEFAULT NULL::character varying,
    analysis_id character varying(12) DEFAULT NULL::character varying,
    image_path character varying(42) DEFAULT NULL::character varying
);


ALTER TABLE public._plant_history OWNER TO rebasedata;

--
-- Name: _plant_observations; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._plant_observations (
    id smallint,
    plant_id character varying(5) DEFAULT NULL::character varying,
    date character varying(1) DEFAULT NULL::character varying,
    author character varying(19) DEFAULT NULL::character varying,
    text character varying(60) DEFAULT NULL::character varying
);


ALTER TABLE public._plant_observations OWNER TO rebasedata;

--
-- Name: _plants; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._plants (
    id character varying(5) DEFAULT NULL::character varying,
    owner_id character varying(1) DEFAULT NULL::character varying,
    name character varying(9) DEFAULT NULL::character varying,
    species character varying(34) DEFAULT NULL::character varying,
    variety character varying(20) DEFAULT NULL::character varying,
    status character varying(10) DEFAULT NULL::character varying,
    growth_stage character varying(26) DEFAULT NULL::character varying,
    planting_date character varying(1) DEFAULT NULL::character varying,
    last_observation character varying(1) DEFAULT NULL::character varying,
    plot character varying(25) DEFAULT NULL::character varying,
    water_schedule character varying(35) DEFAULT NULL::character varying,
    image character varying(20) DEFAULT NULL::character varying,
    health_score smallint,
    alert character varying(200) DEFAULT NULL::character varying,
    details character varying(229) DEFAULT NULL::character varying
);


ALTER TABLE public._plants OWNER TO rebasedata;

--
-- Name: _scans; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._scans (
    id smallint,
    analysis_id character varying(12) DEFAULT NULL::character varying,
    user_id character varying(1) DEFAULT NULL::character varying,
    plant_id character varying(5) DEFAULT NULL::character varying,
    disease_id smallint,
    image_path character varying(42) DEFAULT NULL::character varying,
    confidence numeric(4,1) DEFAULT NULL::numeric,
    model_name character varying(30) DEFAULT NULL::character varying,
    processing_ms smallint,
    lang character varying(2) DEFAULT NULL::character varying,
    created_at character varying(10) DEFAULT NULL::character varying
);


ALTER TABLE public._scans OWNER TO rebasedata;

--
-- Name: _users; Type: TABLE; Schema: public; Owner: rebasedata
--

CREATE TABLE public._users (
    id smallint,
    email character varying(22) DEFAULT NULL::character varying,
    full_name character varying(5) DEFAULT NULL::character varying,
    farm_name character varying(4) DEFAULT NULL::character varying,
    agricultural_role character varying(31) DEFAULT NULL::character varying,
    hashed_password character varying(60) DEFAULT NULL::character varying,
    preferred_lang character varying(2) DEFAULT NULL::character varying,
    role character varying(6) DEFAULT NULL::character varying,
    is_active smallint,
    created_at character varying(10) DEFAULT NULL::character varying
);


ALTER TABLE public._users OWNER TO rebasedata;

--
-- Data for Name: _chat_messages; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._chat_messages (id, session_id, user_id, role, text, lang, created_at) FROM stdin;
1	6ea91a49ce2a4d59	1	user	Malade	fr	2026-11-11
2	6ea91a49ce2a4d59	1	bot	Plantes demandant de l'attention : Plante 01 (Malade).	fr	2026-11-11
3	73add4535ed240ac	1	user	Quelle est la maladie du plante	fr	2026-11-11
4	73add4535ed240ac	1	bot	J'ai bien analysé votre demande : « Quelle est la maladie du plante ». Je peux vous renseigner sur l'état de vos plantes, les maladies et leurs traitements, ou l'arrosage.	fr	2026-11-11
5	2d96d7ac87574c22	1	user	Nakla	wo	2026-11-11
6	2d96d7ac87574c22	1	bot	Degg naa sa laaj ci « Nakla ».	wo	2026-11-11
7	43ec067860ad43e8	1	user	What is the health status of plant 2?	en	2026-11-11
8	43ec067860ad43e8	1	bot	I can't find plant 2 on your farm.	en	2026-11-11
9	3a686ca2627449b4	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-11
10	3a686ca2627449b4	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-11
11	1abba71a253540d2	1	user	How do I treat Cercospora leaf spot?	en	2026-11-11
12	1abba71a253540d2	1	bot	To treat “Leaf spot (Cercospora)”: Remove and burn heavily infected leaves immediately; Never water the foliage (water at soil level); Spray an organic fungicide (Bordeaux mixture or horsetail decoction) within 24h; Disinfect pruning tools with 70% alcohol.	en	2026-11-11
13	0f960b6714314e1b	1	user	quel	fr	2026-11-13
14	0f960b6714314e1b	1	bot	J'ai bien analysé votre demande : « quel ». Je peux vous renseigner sur l'état de vos plantes, les maladies et leurs traitements, ou l'arrosage.	fr	2026-11-13
15	7cfa3faf10a147f0	1	user	Quelle est la santé de la plante 2 ?	fr	2026-11-13
16	7cfa3faf10a147f0	1	bot	Je ne trouve pas la plante 2 dans votre exploitation.	fr	2026-11-13
17	bf1f29c95e6447d0	1	user	Comment traiter la tache foliaire (Cercospora) ?	fr	2026-11-13
18	bf1f29c95e6447d0	1	bot	Pour traiter « Tache foliaire (Cercospora) » : Supprimer et incinérer sans délai les feuilles fortement atteintes; Éviter absolument d'arroser le feuillage (arroser au sol); Pulvériser un traitement antifongique bio (bouillie bordelaise ou décoction de prêle) sous 24h; Désinfecter les outils de taille à l'alcool 70°.	fr	2026-11-13
19	e95b73a856b24649	1	user	Quelle est la santé de la plante 2 ?	fr	2026-11-13
20	e95b73a856b24649	1	bot	Je ne trouve pas la plante 2 dans votre exploitation.	fr	2026-11-13
21	46aa5bb3da9c4eea	1	user	Quelles plantes sont actuellement malades ?	fr	2026-11-13
22	46aa5bb3da9c4eea	1	bot	Plantes demandant de l'attention : Plante 01 (Malade), Plante20 (À surveiller), Plant 100 (Malade).	fr	2026-11-13
23	41bb7ab84ca040fb	1	user	Conseils d'arrosage pour mes tomates par forte chaleur	fr	2026-11-13
24	41bb7ab84ca040fb	1	bot	Par forte chaleur, arrosez tôt le matin ou après le coucher du soleil directement au pied sans mouiller le feuillage, en maintenant un bon paillage.	fr	2026-11-13
25	ccc4f4290f644587	1	user	Quelle est la santé de la Plante 01	fr	2026-11-13
26	ccc4f4290f644587	1	bot	Je ne trouve pas la plante 1 dans votre exploitation.	fr	2026-11-13
27	40dba65d77e64914	1	user	Quelle est la santé de la Plante 01	fr	2026-11-13
28	40dba65d77e64914	1	bot	Je ne trouve pas la plante 1 dans votre exploitation.	fr	2026-11-13
29	c8b8cfa57cfc4f94	1	user	Bonjour.	fr	2026-11-13
30	c8b8cfa57cfc4f94	1	bot	J'ai bien analysé votre demande : « Bonjour. ». Je peux vous renseigner sur l'état de vos plantes, les maladies et leurs traitements, ou l'arrosage.	fr	2026-11-13
31	31f47e52e04e404b	1	user	Quelle est la santé de la plante 0 un ?	fr	2026-11-13
32	31f47e52e04e404b	1	bot	Je ne trouve pas la plante 0 dans votre exploitation.	fr	2026-11-13
33	62365d531e9c42c0	1	user	Je ne dis pas la plante des Romains, la plante des 0 un.	fr	2026-11-13
34	62365d531e9c42c0	1	bot	J'ai bien analysé votre demande : « Je ne dis pas la plante des Romains, la plante des 0 un. ». Je peux vous renseigner sur l'état de vos plantes, les maladies et leurs traitements, ou l'arrosage.	fr	2026-11-13
35	854d2da6e3d04914	1	user	Quelle est la plante ?	fr	2026-11-13
36	854d2da6e3d04914	1	bot	J'ai bien analysé votre demande : « Quelle est la plante ? ». Je peux vous renseigner sur l'état de vos plantes, les maladies et leurs traitements, ou l'arrosage.	fr	2026-11-13
37	3491dd27cc264995	1	user	Quelle est la santé de la plante 0 un ?	fr	2026-11-13
38	3491dd27cc264995	1	bot	Je ne trouve pas la plante 0 dans votre exploitation.	fr	2026-11-13
39	40ae852ed4d94ef0	1	user	Quelle est la santé de la plante 01	fr	2026-11-13
40	40ae852ed4d94ef0	1	bot	Je ne trouve pas la plante 1 dans votre exploitation.	fr	2026-11-13
41	ea238df68bc74de0	1	user	Quelle est la santé de la plante 2 ?	fr	2026-11-13
42	ea238df68bc74de0	1	bot	Je ne trouve pas la plante 2 dans votre exploitation.	fr	2026-11-13
43	60a70ca78f9e4940	1	user	Quelles plantes sont actuellement malades ?	fr	2026-11-13
44	60a70ca78f9e4940	1	bot	Plantes demandant de l'attention : Plante 01 (Malade), Plante20 (Malade), Plant 100 (Malade).	fr	2026-11-13
45	66fec2a6a1ff4cc8	1	user	Quelles plantes sont actuellement malades ?	fr	2026-11-13
46	66fec2a6a1ff4cc8	1	bot	Plantes demandant de l'attention : Plante20 (Malade), Plant 100 (Malade).	fr	2026-11-13
47	219123bebcda4c5f	1	user	Qu'elle parte seront actuellement malades.	fr	2026-11-13
48	219123bebcda4c5f	1	bot	Plantes demandant de l'attention : Plante20 (Malade), Plant 100 (Malade).	fr	2026-11-13
49	51e13067eae04f7a	1	user	Conseils d'arrosage pour mes tomates par forte chaleur	fr	2026-11-13
50	51e13067eae04f7a	1	bot	Par forte chaleur, arrosez tôt le matin ou après le coucher du soleil directement au pied sans mouiller le feuillage, en maintenant un bon paillage.	fr	2026-11-13
51	694038f748ab4a7c	1	user	Comment traiter la tache foliaire (Cercospora) ?	fr	2026-11-13
52	694038f748ab4a7c	1	bot	Pour traiter « Tache foliaire (Cercospora) » : Supprimer et incinérer sans délai les feuilles fortement atteintes; Éviter absolument d'arroser le feuillage (arroser au sol); Pulvériser un traitement antifongique bio (bouillie bordelaise ou décoction de prêle) sous 24h; Désinfecter les outils de taille à l'alcool 70°.	fr	2026-11-13
53	9a69d1f0b21f408f	1	user	Which crops need urgent attention today?	en	2026-11-13
54	9a69d1f0b21f408f	1	bot	Plants needing attention: Plante20 (Sick), Plant 100 (Sick).	en	2026-11-13
55	21b5d1af7afa4c79	1	user	Watering tips for tomatoes during hot weather	en	2026-11-13
56	21b5d1af7afa4c79	1	bot	During hot spells, irrigate early in the morning or late evening directly at the root zone, keeping organic mulch.	en	2026-11-13
57	0c6a9910a3684918	1	user	Quelle est la plante la plus malade	fr	2026-11-13
58	0c6a9910a3684918	1	bot	La culture la plus préoccupante est Plant 100 (poivron) : état « Malade », santé 30/100. Alerte active : Mildiou tardif : Maladie très destructrice des temps frais et saturés d'humidité. Elle peut détruire une parcelle en quelques jours. Dernier relevé : Mildiou tardif (98.2%) (13/11/2026). Viennent ensuite Plante 01 (65/100) et Plante20 (65/100).	fr	2026-11-13
59	5dbceb012b474a88	1	user	Quelle est la santé de la plante 2 ?	fr	2026-11-13
60	5dbceb012b474a88	1	bot	Je ne trouve pas la plante 2 dans votre exploitation.	fr	2026-11-13
61	5c0dadf8222e4629	1	user	Quelle est la santé de la Plante 01	fr	2026-11-13
62	5c0dadf8222e4629	1	bot	Je ne trouve pas la plante 1 dans votre exploitation.	fr	2026-11-13
63	25a4531ba00b4474	1	user	Plante 01	fr	2026-11-13
64	25a4531ba00b4474	1	bot	Je ne trouve pas la plante 1 dans votre exploitation.	fr	2026-11-13
65	027d402437234f5a	1	user	P-004	fr	2026-11-13
66	027d402437234f5a	1	bot	Plantes suivies : 3 (saines : 0, à surveiller : 3). Alertes actives : 3. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-13
67	c10cc4ea84be4311	1	user	Quelles sont les plantes a surveiller	fr	2026-11-13
68	c10cc4ea84be4311	1	bot	Plantes suivies : 3 (saines : 0, à surveiller : 3). Alertes actives : 3. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-13
69	188ba87d2c5b4ec9	1	user	Plante20	fr	2026-11-13
70	188ba87d2c5b4ec9	1	bot	Je ne trouve pas la plante 20 dans votre exploitation.	fr	2026-11-13
71	f659cb4bc5b44df0	1	user	Plante20	fr	2026-11-13
72	f659cb4bc5b44df0	1	bot	Plante20 (Tomate) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (89.2%) (13/11/2026).	fr	2026-11-13
73	b9409b718e2a4802	1	user	Plante01	fr	2026-11-13
74	b9409b718e2a4802	1	bot	Plante 01 (Aubergine) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026).	fr	2026-11-13
75	519d3ebb596c4cad	1	user	plante100	fr	2026-11-13
76	519d3ebb596c4cad	1	bot	Plant 100 (Poivron) : état « Saine », score de santé 87/100. Dernier relevé : Plante saine (86.7%) (13/11/2026).	fr	2026-11-13
77	c8bfef165d1b4728	1	user	Quelle est la plante la plus malade ??	fr	2026-11-13
78	c8bfef165d1b4728	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-13
79	69cec65c67b44cf5	1	user	Quelles sont mes alertes ? ?	fr	2026-11-13
80	69cec65c67b44cf5	1	bot	Vous avez 2 alertes actives : Plante 01 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides; Plante20 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.	fr	2026-11-13
81	7b99224a66b64d71	1	user	Which plant is the sickest?	en	2026-11-13
82	7b99224a66b64d71	1	bot	The most worrying crop is Plante 01 (Aubergine): status “To monitor”, health 65/100. Active alert: Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Latest record: Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Next in line: Plante20 (65/100).	en	2026-11-13
83	ffb9df7375314ca8	1	user	Quelle est la plante la plus malade ??	fr	2026-11-13
84	ffb9df7375314ca8	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-13
85	7b6c30f5720d4b29	1	user	Quel est le dernier diagnostic?	fr	2026-11-13
86	7b6c30f5720d4b29	1	bot	Le dernier diagnostic date du 13/11/2026 : Plant 100, Plante saine (86.7%). Poursuivre la conduite culturale actuelle. Plant 100 est actuellement « Saine » (87/100).	fr	2026-11-13
87	cf93e9f2c3e248ea	1	user	Quelles plantes sont actuellement malades ?	fr	2026-11-13
88	cf93e9f2c3e248ea	1	bot	2 cultures demandent de l'attention : Plante 01 (À surveiller, 65/100), Plante20 (À surveiller, 65/100).	fr	2026-11-13
89	f429492143ab4233	1	user	Quels soins sont prévus pour mes plantes ?	fr	2026-11-13
90	f429492143ab4233	1	bot	Voici les soins prévus dans votre carnet : Plante 01 : Arrosage matinal (Quotidien), en cours; Plante 01 : Paillage racinaire (Mensuel), à prévoir; Plante20 : Arrosage matinal (Quotidien), en cours; Plante20 : Paillage racinaire (Mensuel), à prévoir; Plant 100 : Arrosage matinal (Quotidien), en cours; Plant 100 : Paillage racinaire (Mensuel), à prévoir.	fr	2026-11-13
91	f6f9e81341394a2e	1	user	Which crops need attention today?	en	2026-11-13
92	f6f9e81341394a2e	1	bot	2 crops need attention: Plante 01 (To monitor, 65/100), Plante20 (To monitor, 65/100).	en	2026-11-13
93	3f3c991266514b8a	1	user	Which diagnoses are recorded?	en	2026-11-13
132	10c509fcc3924710	1	bot	Garab yi ñu war a saytu : Plante 01 (Saytu, 65/100), Plante20 (Saytu, 65/100).	wo	2026-11-13
133	9265db606e9047a2	1	user	lakkala	wo	2026-11-13
134	9265db606e9047a2	1	bot	Degg naa sa laaj ci « lakkala ».	wo	2026-11-13
94	3f3c991266514b8a	1	bot	36 diagnoses are recorded, newest first: Plant 100: Plante saine (86.7%) (13/11/2026); Plante 01: Alternariose (Mildiou précoce) (61.4%) (13/11/2026); Plante 01: Alternariose (Mildiou précoce) (92.6%) (13/11/2026); Plante20: Alternariose (Mildiou précoce) (89.2%) (13/11/2026); Plante 01: Mildiou tardif (100.0%) (13/11/2026); Plante 01: Plante saine (86.7%) (13/11/2026). And 30 more.	en	2026-11-13
95	ac36c9143d314f30	1	user	Brand is this this case?	en	2026-11-13
96	ac36c9143d314f30	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-13
97	95f71f76d7b244ae	1	user	Quelle est la plainte la plus malade ?	fr	2026-11-13
98	95f71f76d7b244ae	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-13
99	8b656a3222ca4e6e	1	user	Quelles sont mes alertes ?	fr	2026-11-13
100	8b656a3222ca4e6e	1	bot	Vous avez 2 alertes actives : Plante 01 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides; Plante20 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.	fr	2026-11-13
101	27e0a1015f8e4881	1	user	Quel diagnostic ?	fr	2026-11-13
102	27e0a1015f8e4881	1	bot	36 diagnostics sont enregistrés, du plus récent au plus ancien : Plant 100 : Plante saine (86.7%) (13/11/2026); Plante 01 : Alternariose (Mildiou précoce) (61.4%) (13/11/2026); Plante 01 : Alternariose (Mildiou précoce) (92.6%) (13/11/2026); Plante20 : Alternariose (Mildiou précoce) (89.2%) (13/11/2026); Plante 01 : Mildiou tardif (100.0%) (13/11/2026); Plante 01 : Plante saine (86.7%) (13/11/2026). Et 30 de plus.	fr	2026-11-13
103	26acbd7e478a4ded	1	user	Skopland existe.	fr	2026-11-13
104	26acbd7e478a4ded	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-13
105	02c72951dfb840d6	1	user	Je veux savoir ce que plante un est existe.	fr	2026-11-13
106	02c72951dfb840d6	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-13
107	c15676c745fe40d3	1	user	Plante 0, un.	fr	2026-11-13
108	c15676c745fe40d3	1	bot	Je ne trouve pas la plante 0 dans votre exploitation.	fr	2026-11-13
109	7b66a8ec01be4e56	1	user	Quelle est la plante la plus malade ??	fr	2026-11-13
110	7b66a8ec01be4e56	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-13
111	1185b293a20a4543	1	user	Pas loin tout fait.	fr	2026-11-13
112	1185b293a20a4543	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-13
113	01f5c46fcba84bfd	1	user	Quelle est la diagnostic du Plant 100	fr	2026-11-13
114	01f5c46fcba84bfd	1	bot	3 diagnostics sont enregistrés, du plus récent au plus ancien : Plant 100 : Plante saine (86.7%) (13/11/2026); Plant 100 : Mildiou tardif (98.2%) (13/11/2026); Plant 100 : Plante saine (86.7%) (12/11/2026).	fr	2026-11-13
115	03821515a88549bb	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-13
116	03821515a88549bb	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-13
117	a69149cf6b1e4733	1	user	Ban garab ñoo feebar leegi ?	wo	2026-11-13
118	a69149cf6b1e4733	1	bot	Garab yi ñu war a saytu : Plante 01 (Saytu, 65/100), Plante20 (Saytu, 65/100).	wo	2026-11-13
119	c889a05ebae24c67	1	user	Quelle est la plante la plus malade ??	fr	2026-11-13
120	c889a05ebae24c67	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-13
121	59686d9e5db94daa	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-13
122	59686d9e5db94daa	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-13
123	0446e427f93645a7	1	user	Quelle est la plante la plus malade ??	fr	2026-11-13
124	0446e427f93645a7	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-13
125	13cfff3b9486412c	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-13
126	13cfff3b9486412c	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-13
127	43b72b0fcaf84150	1	user	Quelle est la plante la plus malade ??	fr	2026-11-13
128	43b72b0fcaf84150	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-13
129	8aa0de22dbb344c5	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-13
130	8aa0de22dbb344c5	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-13
131	10c509fcc3924710	1	user	Ban garab ñoo feebar leegi ?	wo	2026-11-13
135	505dd3581211484d	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-13
136	505dd3581211484d	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-13
137	dd30fe0daf9141c4	1	user	nak kala wala garab dée bi	wo	2026-11-13
138	dd30fe0daf9141c4	1	bot	Degg naa sa laaj ci « nak kala wala garab dée bi ».	wo	2026-11-13
139	dd30fe0daf9141c4	1	user	nakalawala grabbi	wo	2026-11-13
140	dd30fe0daf9141c4	1	bot	Degg naa sa laaj ci « nakalawala grabbi ».	wo	2026-11-13
141	ef1af8ec3271490c	1	user	nakarwan granvidef	wo	2026-11-13
142	ef1af8ec3271490c	1	bot	Degg naa sa laaj ci « nakarwan granvidef ».	wo	2026-11-13
143	0524cca4912848af	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-13
144	0524cca4912848af	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-13
145	f3deba4f38cc4fa7	1	user	Ban garab ñoo feebar leegi ?	wo	2026-11-13
146	f3deba4f38cc4fa7	1	bot	Garab yi ñu war a saytu : Plante 01 (Saytu, 65/100), Plante20 (Saytu, 65/100).	wo	2026-11-13
147	b3cbb3df1ee449b1	1	user	Nan lañuy fajee tàcc yu ñuul ci xobi tomate ?	wo	2026-11-14
148	b3cbb3df1ee449b1	1	bot	Ngir faj « Tàcc yu ñuul ci xob (Cercospora) » : Daggël xob yi feebar te lakk leen; Bu sayteel xob yi ndox ci kow; Defaral ko garabu cuub wala ndoxum soble. Cela concerne actuellement Plante 01 et Plante20.	wo	2026-11-14
149	40266688e4cb4dae	1	user	nan lañi fañe garab di feebara	wo	2026-11-14
150	40266688e4cb4dae	1	bot	Garab yi ñu war a saytu : Plante 01 (Saytu, 65/100), Plante20 (Saytu, 65/100).	wo	2026-11-14
151	0ac133abc0c0490b	1	user	Quelle est la plante la plus malade ??	fr	2026-11-14
152	0ac133abc0c0490b	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-14
153	7f5004845f6a4ec2	1	user	quelle est la plante la plus malade	fr	2026-11-14
154	7f5004845f6a4ec2	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-14
155	8167beb51d514187	1	user	quels sont mes alertes aujourd'hui	fr	2026-11-14
156	8167beb51d514187	1	bot	Vous avez 2 alertes actives : Plante 01 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides; Plante20 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.	fr	2026-11-14
157	c93ab668f6a741b1	1	user	quelle est la dernière	fr	2026-11-14
158	c93ab668f6a741b1	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
159	8877350abff6415e	1	user	Quels soins sont prévus pour mes plantes ?	fr	2026-11-14
160	8877350abff6415e	1	bot	Voici les soins prévus dans votre carnet : Plante 01 : Arrosage matinal (Quotidien), en cours; Plante 01 : Paillage racinaire (Mensuel), à prévoir; Plante20 : Arrosage matinal (Quotidien), en cours; Plante20 : Paillage racinaire (Mensuel), à prévoir; Plant 100 : Arrosage matinal (Quotidien), en cours; Plant 100 : Paillage racinaire (Mensuel), à prévoir.	fr	2026-11-14
161	2e97db94d9ff4b18	1	user	quels sont prévus pour	fr	2026-11-14
162	2e97db94d9ff4b18	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
163	46670565abdb4c53	1	user	non je demande quels sont quels soins sont prévues pour me prendre	fr	2026-11-14
164	46670565abdb4c53	1	bot	Voici les soins prévus dans votre carnet : Plante 01 : Arrosage matinal (Quotidien), en cours; Plante 01 : Paillage racinaire (Mensuel), à prévoir; Plante20 : Arrosage matinal (Quotidien), en cours; Plante20 : Paillage racinaire (Mensuel), à prévoir; Plant 100 : Arrosage matinal (Quotidien), en cours; Plant 100 : Paillage racinaire (Mensuel), à prévoir.	fr	2026-11-14
165	e2ab4a56b1674e27	1	user	wheeze balance the easiest seats skits	en	2026-11-14
166	e2ab4a56b1674e27	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
167	43ff06c2d4ed439f	1	user	Which plant is the sickest?	en	2026-11-14
168	43ff06c2d4ed439f	1	bot	The most worrying crop is Plante 01 (Aubergine): status “To monitor”, health 65/100. Active alert: Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Latest record: Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Next in line: Plante20 (65/100).	en	2026-11-14
169	cc5bc4d105004576	1	user	Siskey	en	2026-11-14
170	cc5bc4d105004576	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
171	bed068c87df5420f	1	user	what is the last gym	en	2026-11-14
172	bed068c87df5420f	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
173	bdb6b886ec084b39	1	user	what is the diagnosis	en	2026-11-14
174	bdb6b886ec084b39	1	bot	36 diagnoses are recorded, newest first: Plant 100: Plante saine (86.7%) (13/11/2026); Plante 01: Alternariose (Mildiou précoce) (61.4%) (13/11/2026); Plante 01: Alternariose (Mildiou précoce) (92.6%) (13/11/2026); Plante20: Alternariose (Mildiou précoce) (89.2%) (13/11/2026); Plante 01: Mildiou tardif (100.0%) (13/11/2026); Plante 01: Plante saine (86.7%) (13/11/2026). And 30 more.	en	2026-11-14
175	56848704eba34ce7	1	user	please call some meat Edition	en	2026-11-14
176	56848704eba34ce7	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
177	5ba930c2607942ef	1	user	Which crops need attention today?	en	2026-11-14
178	5ba930c2607942ef	1	bot	2 crops need attention: Plante 01 (To monitor, 65/100), Plante20 (To monitor, 65/100).	en	2026-11-14
179	714fce9ef3ec48be	1	user	viscose need to attach your attention	en	2026-11-14
180	714fce9ef3ec48be	1	bot	2 crops need attention: Plante 01 (To monitor, 65/100), Plante20 (To monitor, 65/100).	en	2026-11-14
181	69042df3368c485d	1	user	these cars	en	2026-11-14
182	69042df3368c485d	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
183	b6073cd53ab84429	1	user	race car seat	en	2026-11-14
184	b6073cd53ab84429	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
185	9b3c7627e0cb4af5	1	user	please call sanitation today	en	2026-11-14
186	9b3c7627e0cb4af5	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
187	eb3f419f2d554709	1	user	risk of Sanitation today	en	2026-11-14
188	eb3f419f2d554709	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
189	97c44a544c314e31	1	user	Greece corruption needs attention today	en	2026-11-14
190	97c44a544c314e31	1	bot	2 crops need attention: Plante 01 (To monitor, 65/100), Plante20 (To monitor, 65/100).	en	2026-11-14
191	8e9d413f0a784554	1	user	what car is the planet for my plane	en	2026-11-14
192	8e9d413f0a784554	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
193	d89a87dc33e94c45	1	user	what's what that is what God is playing it for my friend	en	2026-11-14
194	d89a87dc33e94c45	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
195	f39875ff29044fee	1	user	What care is planned for my plants?	en	2026-11-14
196	f39875ff29044fee	1	bot	Here is the planned care in your logbook: Plante 01 : Arrosage matinal (Quotidien), en cours; Plante 01 : Paillage racinaire (Mensuel), à prévoir; Plante20 : Arrosage matinal (Quotidien), en cours; Plante20 : Paillage racinaire (Mensuel), à prévoir; Plant 100 : Arrosage matinal (Quotidien), en cours; Plant 100 : Paillage racinaire (Mensuel), à prévoir.	en	2026-11-14
197	196a2b6f6be54c15	1	user	what car is planet for my planet	en	2026-11-14
198	196a2b6f6be54c15	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
199	e5246e2f563849f8	1	user	hey hey what cause is my is burnt my for my friend	en	2026-11-14
200	e5246e2f563849f8	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
201	8891f110bd2147fa	1	user	what car is playing it for my friends	en	2026-11-14
202	8891f110bd2147fa	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
203	37673de42ac74a44	1	user	what car	en	2026-11-14
204	37673de42ac74a44	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
205	94c9a839935a476e	1	user	what color of plane is playing it what car is bringing for my plant	en	2026-11-14
206	94c9a839935a476e	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
207	45728ffd634a495c	1	user	What care is planned for my plants?	en	2026-11-14
208	45728ffd634a495c	1	bot	Here is the planned care in your logbook: Plante 01 : Arrosage matinal (Quotidien), en cours; Plante 01 : Paillage racinaire (Mensuel), à prévoir; Plante20 : Arrosage matinal (Quotidien), en cours; Plante20 : Paillage racinaire (Mensuel), à prévoir; Plant 100 : Arrosage matinal (Quotidien), en cours; Plant 100 : Paillage racinaire (Mensuel), à prévoir.	en	2026-11-14
209	3e82f6748e294e43	1	user	who is Chuck Norris	en	2026-11-14
210	3e82f6748e294e43	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
211	c65a07905dcc4008	1	user	why is Joe Lewis article	en	2026-11-14
212	c65a07905dcc4008	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
213	0ed21e54d2ec4ecb	1	user	what are my alarms	en	2026-11-14
214	0ed21e54d2ec4ecb	1	bot	Plants tracked: 3 (healthy: 1, to watch: 2). Active alerts: 2. You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.	en	2026-11-14
215	1d937e0b0af84ecd	1	user	Which diagnoses are recorded?	en	2026-11-14
216	1d937e0b0af84ecd	1	bot	36 diagnoses are recorded, newest first: Plant 100: Plante saine (86.7%) (13/11/2026); Plante 01: Alternariose (Mildiou précoce) (61.4%) (13/11/2026); Plante 01: Alternariose (Mildiou précoce) (92.6%) (13/11/2026); Plante20: Alternariose (Mildiou précoce) (89.2%) (13/11/2026); Plante 01: Mildiou tardif (100.0%) (13/11/2026); Plante 01: Plante saine (86.7%) (13/11/2026). And 30 more.	en	2026-11-14
217	fe945ddb83f74b55	1	user	What are my alerts?	en	2026-11-14
251	2fbd16037564438d	1	user	quels sont les prévisions prévues pour me prendre	fr	2026-11-14
218	fe945ddb83f74b55	1	bot	You have 2 active alerts: Plante 01 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides; Plante20 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.	en	2026-11-14
219	a8bf31974b8047c9	1	user	quelle est la plante la plus malade	fr	2026-11-14
220	a8bf31974b8047c9	1	bot	La culture la plus préoccupante est Plante 01 (Aubergine) : état « À surveiller », santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Viennent ensuite Plante20 (65/100).	fr	2026-11-14
221	08096e6d62ca43ef	1	user	quelles sont mes alertes	fr	2026-11-14
222	08096e6d62ca43ef	1	bot	Vous avez 2 alertes actives : Plante 01 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides; Plante20 — Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.	fr	2026-11-14
223	1d42ac58d5e14774	1	user	quelle est la dernière diagnostic	fr	2026-11-14
224	1d42ac58d5e14774	1	bot	36 diagnostics sont enregistrés, du plus récent au plus ancien : Plant 100 : Plante saine (86.7%) (13/11/2026); Plante 01 : Alternariose (Mildiou précoce) (61.4%) (13/11/2026); Plante 01 : Alternariose (Mildiou précoce) (92.6%) (13/11/2026); Plante20 : Alternariose (Mildiou précoce) (89.2%) (13/11/2026); Plante 01 : Mildiou tardif (100.0%) (13/11/2026); Plante 01 : Plante saine (86.7%) (13/11/2026). Et 30 de plus.	fr	2026-11-14
225	0d33f690a3c14320	1	user	quels diagnostics sont enregistrés	fr	2026-11-14
226	0d33f690a3c14320	1	bot	36 diagnostics sont enregistrés, du plus récent au plus ancien : Plant 100 : Plante saine (86.7%) (13/11/2026); Plante 01 : Alternariose (Mildiou précoce) (61.4%) (13/11/2026); Plante 01 : Alternariose (Mildiou précoce) (92.6%) (13/11/2026); Plante20 : Alternariose (Mildiou précoce) (89.2%) (13/11/2026); Plante 01 : Mildiou tardif (100.0%) (13/11/2026); Plante 01 : Plante saine (86.7%) (13/11/2026). Et 30 de plus.	fr	2026-11-14
227	e5773164bb024281	1	user	quelles plantes sont actuellement malade	fr	2026-11-14
228	e5773164bb024281	1	bot	2 cultures demandent de l'attention : Plante 01 (À surveiller, 65/100), Plante20 (À surveiller, 65/100).	fr	2026-11-14
229	caf41479a5774bbe	1	user	quels sont à son perroquet pour ma plante	fr	2026-11-14
230	caf41479a5774bbe	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
231	fd5c0bea01484c8a	1	user	quel soir sont perroquet pour me prendre	fr	2026-11-14
232	fd5c0bea01484c8a	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
233	01318f9d00a34c82	1	user	quel soir sont permis	fr	2026-11-14
234	01318f9d00a34c82	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
235	e79c9440d8e142a1	1	user	qu'elle soigne son permis pour mes plantes	fr	2026-11-14
236	e79c9440d8e142a1	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
237	01d62c6847af465b	1	user	qu'elle soigne son pulvérisent pour les plantes	fr	2026-11-14
238	01d62c6847af465b	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
239	fcf4fd3b10fb4982	1	user	quelle soirée sont prévues pour mes plantes	fr	2026-11-14
240	fcf4fd3b10fb4982	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
241	0a14d0d3fc464c39	1	user	Quels soins sont prévus pour mes plantes ?	fr	2026-11-14
242	0a14d0d3fc464c39	1	bot	Voici les soins prévus dans votre carnet : Plante 01 : Arrosage matinal (Quotidien), en cours; Plante 01 : Paillage racinaire (Mensuel), à prévoir; Plante20 : Arrosage matinal (Quotidien), en cours; Plante20 : Paillage racinaire (Mensuel), à prévoir; Plant 100 : Arrosage matinal (Quotidien), en cours; Plant 100 : Paillage racinaire (Mensuel), à prévoir.	fr	2026-11-14
243	df41d121f697488e	1	user	qu'elle soigne son permis pour mes plantes	fr	2026-11-14
244	df41d121f697488e	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
245	fe602e918588498d	1	user	qu'elle soigne son préavis pour mes plantes	fr	2026-11-14
246	fe602e918588498d	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
247	08fe79b029a0434a	1	user	qu'elle soigne son produit pour mes plantes	fr	2026-11-14
248	08fe79b029a0434a	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
249	f05feba1c481410e	1	user	Quels soins sont prévus pour mes plantes ?	fr	2026-11-14
250	f05feba1c481410e	1	bot	Voici les soins prévus dans votre carnet : Plante 01 : Arrosage matinal (Quotidien), en cours; Plante 01 : Paillage racinaire (Mensuel), à prévoir; Plante20 : Arrosage matinal (Quotidien), en cours; Plante20 : Paillage racinaire (Mensuel), à prévoir; Plant 100 : Arrosage matinal (Quotidien), en cours; Plant 100 : Paillage racinaire (Mensuel), à prévoir.	fr	2026-11-14
252	2fbd16037564438d	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
253	00e48f43ac2348b7	1	user	question à prévue pour mes plantes	fr	2026-11-14
254	00e48f43ac2348b7	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
255	9c0f5d0c2c6e4751	1	user	Quelle est le type de plate 20	fr	2026-11-14
256	9c0f5d0c2c6e4751	1	bot	Plantes suivies : 3 (saines : 1, à surveiller : 2). Alertes actives : 2. Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.	fr	2026-11-14
257	603ed13ae274442c	1	user	Quelle est le type de Plante20	fr	2026-11-14
258	603ed13ae274442c	1	bot	Plante20 (Tomate) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (89.2%) (13/11/2026).	fr	2026-11-14
259	3c970af4a3834523	1	user	Plante 1	fr	2026-11-14
260	3c970af4a3834523	1	bot	Plante 01 (Aubergine) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026).	fr	2026-11-14
261	9af9c51ecece461c	1	user	Plante 4	fr	2026-11-14
262	9af9c51ecece461c	1	bot	Plante 01 (Aubergine) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026).	fr	2026-11-14
263	d66873b430ba4b85	1	user	Naka la	wo	2026-11-14
264	d66873b430ba4b85	1	bot	Degg naa sa laaj ci « Naka la ».	wo	2026-11-14
265	40dc3316497c4f8f	1	user	Naka la wàllu garab 2 gi deme ?	wo	2026-11-14
266	40dc3316497c4f8f	1	bot	Gisuma garab 2 ci sa tool.	wo	2026-11-14
267	659523567ade4a62	1	user	Alerte sur Plante 01 (Aubergine (Solanum melongena)) : "Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.". Quels remèdes et protocoles appliquer immédiatement ?	fr	2026-11-14
268	659523567ade4a62	1	bot	Plante 01 (Aubergine) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Pour traiter « Mildiou (Phytophthora infestans) » : Couper immédiatement les parties touchées; Aérer les serres et espacer les plants; Traitement au cuivre avant la pluie.	fr	2026-11-14
269	df8d3bf80ebf49e4	1	user	Alerte sur Plante 01 (Aubergine (Solanum melongena)) : "Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.". Quels remèdes et protocoles appliquer immédiatement ?	fr	2026-11-14
270	df8d3bf80ebf49e4	1	bot	Plante 01 (Aubergine) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Pour traiter « Mildiou (Phytophthora infestans) » : Couper immédiatement les parties touchées; Aérer les serres et espacer les plants; Traitement au cuivre avant la pluie.	fr	2026-11-14
271	e80c4011474c48dd	1	user	Quels sont les soins et recommandations pour ma plante "Plante 01" (Aubergine (Solanum melongena)) en parcelle "Parcelle C6" ?	fr	2026-11-14
272	e80c4011474c48dd	1	bot	Plante 01 (Aubergine) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Soins prévus pour Plante 01 : Arrosage matinal (Quotidien), en cours; Paillage racinaire (Mensuel), à prévoir.	fr	2026-11-14
273	ba5b8ad67bed4ec9	1	user	Quels sont les soins et recommandations pour ma plante "Plante 01" (Aubergine (Solanum melongena)) en parcelle "Parcelle C6" ?	fr	2026-11-14
274	ba5b8ad67bed4ec9	1	bot	Plante 01 (Aubergine) : état « À surveiller », score de santé 65/100. Alerte active : Alternariose (Mildiou précoce) : Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides. Dernier relevé : Alternariose (Mildiou précoce) (61.4%) (13/11/2026). Soins prévus pour Plante 01 : Arrosage matinal (Quotidien), en cours; Paillage racinaire (Mensuel), à prévoir.	fr	2026-11-14
\.


--
-- Data for Name: _disease_translations; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._disease_translations (id, disease_id, lang, name, pathogen, severity_label, description, symptoms, remedies, healthy_comparison, infected_comparison) FROM stdin;
1	1	fr	Plante saine	Aucun	Nulle	La plante présente une vigueur optimale, une photosynthèse efficace et aucun signe d'attaque parasitaire ou cryptogamique.	["Couleur vert profond homog\\u00e8ne", "Nervures et limbe bien form\\u00e9s", "Absence de taches, parasites ou d\\u00e9formations"]	["Poursuivre la conduite culturale actuelle", "Poursuivre le programme de fertilisation et d'arrosage actuel", "Contr\\u00f4le pr\\u00e9ventif recommand\\u00e9 dans 7 jours", "Maintenir une veille sanitaire r\\u00e9guli\\u00e8re via PhytoScan AI"]	Feuille témoin indemne de toute nécrose.	
2	1	en	Healthy plant	None	None	The plant shows optimal vigour, efficient photosynthesis and no sign of pest or fungal attack.	["Uniform deep green colour", "Well-formed veins and leaf blade", "No spots, pests or deformations"]	["Continue the current cultivation practices", "Keep the current fertilisation and watering programme", "Preventive check recommended in 7 days", "Keep up regular health monitoring with PhytoScan AI"]	Reference leaf free of any necrosis.	
3	2	fr	Tache foliaire (Cercospora)	Cercospora capsici / solani	Élevée	Présence de lésions circulaires brunes bordées d'un halo chlorotique caractéristique de l'infection fongique Cercospora.	["Taches n\\u00e9crotiques circulaires sur les feuilles", "Halo jaune vif entourant les l\\u00e9sions", "Dess\\u00e8chement et chute pr\\u00e9coce des feuilles basses"]	["Supprimer et incin\\u00e9rer sans d\\u00e9lai les feuilles fortement atteintes", "\\u00c9viter absolument d'arroser le feuillage (arroser au sol)", "Pulv\\u00e9riser un traitement antifongique bio (bouillie bordelaise ou d\\u00e9coction de pr\\u00eale) sous 24h", "D\\u00e9sinfecter les outils de taille \\u00e0 l'alcool 70\\u00b0"]	Plante saine : cuticule verte homogène.	Plante malade : taches nécrotiques concentriques.
4	2	en	Leaf spot (Cercospora)	Cercospora capsici / solani	High	Circular brown lesions surrounded by a chlorotic halo, typical of Cercospora fungal infection.	["Circular necrotic spots on leaves", "Bright yellow halo around the lesions", "Drying and early drop of lower leaves"]	["Remove and burn heavily infected leaves immediately", "Never water the foliage (water at soil level)", "Spray an organic fungicide (Bordeaux mixture or horsetail decoction) within 24h", "Disinfect pruning tools with 70% alcohol"]	Healthy plant: uniform green cuticle.	Diseased plant: concentric necrotic spots.
5	2	wo	Tàcc yu ñuul ci xob (Cercospora)	Cercospora capsici / solani	Ndaw ju mag	Tàcc yu ñuul ci xob yi, ak melo wu mboq : kon feebar bu sòrli ci Cercospora la.	[]	["Dagg\\u00ebl xob yi feebar te lakk leen", "Bu sayteel xob yi ndox ci kow", "Defaral ko garabu cuub wala ndoxum soble"]		
6	3	fr	Mildiou (Phytophthora infestans)	Oomycète fongique	Très élevée	Maladie fulgurante créant des taches huileuses brun-vert devenant brunes et desséchées avec feutrage blanc au revers.	["Taches huileuses sur la face sup\\u00e9rieure", "Duvet blanc/gris\\u00e2tre au dos de la feuille", "N\\u00e9crose rapide des tiges et fruits"]	["Couper imm\\u00e9diatement les parties touch\\u00e9es", "A\\u00e9rer les serres et espacer les plants", "Traitement au cuivre avant la pluie"]		
7	3	en	Late blight (Phytophthora infestans)	Fungal-like oomycete	Very high	Fast-spreading disease causing oily green-brown spots that turn brown and dry, with white fuzz underneath.	["Oily spots on the upper side", "White/greyish down on the underside of the leaf", "Rapid necrosis of stems and fruits"]	["Cut off affected parts immediately", "Ventilate greenhouses and space the plants", "Apply copper treatment before rain"]		
8	4	fr	Oïdium	Erysiphales (champignon)	Moyenne	Voile blanchâtre poudreux sur les feuilles, favorisé par une humidité élevée, pouvant s'étendre rapidement.	["Voile blanc poudreux sur les feuilles", "Jaunissement l\\u00e9ger des feuilles inf\\u00e9rieures", "D\\u00e9formation et dess\\u00e8chement des feuilles atteintes"]	["Traiter au bicarbonate ou au soufre sous 24h", "A\\u00e9rer les rangs et r\\u00e9duire l'humidit\\u00e9", "Retirer les feuilles les plus atteintes"]		
9	4	en	Powdery mildew	Erysiphales (fungus)	Medium	Powdery whitish film on leaves, favoured by high humidity and able to spread quickly.	["Powdery white film on leaves", "Slight yellowing of lower leaves", "Deformation and drying of affected leaves"]	["Treat with baking soda or sulphur within 24h", "Ventilate rows and reduce humidity", "Remove the most affected leaves"]		
10	5	fr	Alternariose (Mildiou précoce)	Alternaria solani	Moyenne	Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.	["Taches brunes en cibles (anneaux concentriques)", "Jaunissement autour des taches", "Chute des feuilles basses"]	["Retirer et d\\u00e9truire les feuilles atteintes", "\\u00c9viter d'arroser le feuillage, arroser au pied", "Pratiquer la rotation des cultures", "Appliquer un fongicide homologu\\u00e9 si l'attaque progresse"]	Feuille verte uniforme, sans tache.	Taches brunes à anneaux concentriques entourées d'un halo jaune.
11	5	en	Early blight	Alternaria solani	Medium	Fungal disease causing brown concentric-ring spots on older leaves, favoured by warmth and alternating dry and wet spells.	["Brown target-like spots", "Yellowing around the spots", "Lower leaves dropping"]	["Remove and destroy affected leaves", "Water at the base, not on the foliage", "Rotate crops", "Apply an approved fungicide if the attack spreads"]	Uniform green leaf, no spots.	Brown ring-patterned spots surrounded by a yellow halo.
12	6	fr	Mildiou tardif	Phytophthora infestans	Très élevée	Maladie très destructrice des temps frais et saturés d'humidité. Elle peut détruire une parcelle en quelques jours.	["Taches vert sombre d'aspect huileux", "Duvet blanch\\u00e2tre sous la feuille", "Brunissement rapide des tiges et des fruits"]	["Arracher et d\\u00e9truire rapidement les plants atteints", "Traiter sans attendre avec un fongicide homologu\\u00e9", "A\\u00e9rer la culture et \\u00e9viter l'humidit\\u00e9 sur le feuillage", "Ne pas composter les r\\u00e9sidus infect\\u00e9s"]	Feuille verte, ferme, sans duvet.	Larges taches brun-noir avec duvet blanc sous la feuille.
13	6	en	Late blight	Phytophthora infestans	Very high	Highly destructive disease of cool, humidity-saturated weather. It can wipe out a plot within days.	["Dark green, water-soaked spots", "White fuzz under the leaf", "Rapid browning of stems and fruit"]	["Quickly uproot and destroy affected plants", "Treat immediately with an approved fungicide", "Improve airflow and keep foliage dry", "Do not compost infected residues"]	Firm green leaf, no fuzz.	Large brown-black blotches with white fuzz underneath.
14	7	fr	Gale bactérienne	Xanthomonas spp.	Élevée	Maladie bactérienne favorisée par la chaleur humide et les pluies battantes ; elle abîme feuilles et fruits.	["Petites taches sombres, grasses puis n\\u00e9cros\\u00e9es", "Feuilles trou\\u00e9es", "Cro\\u00fbtes li\\u00e9geuses sur les fruits"]	["Utiliser des semences saines", "\\u00c9viter l'irrigation par aspersion", "\\u00c9liminer les d\\u00e9bris de culture", "Appliquer un produit cuprique selon la r\\u00e9glementation"]	Feuille lisse, sans perforation.	Petites taches sombres, feuilles criblées de trous.
15	7	en	Bacterial spot	Xanthomonas spp.	High	Bacterial disease favoured by hot, humid weather and driving rain; it damages leaves and fruit.	["Small dark, greasy then necrotic spots", "Leaves with shot-holes", "Scabby lesions on fruit"]	["Use healthy seed", "Avoid overhead irrigation", "Remove crop debris", "Apply a copper product where permitted"]	Smooth leaf, no holes.	Small dark spots and leaves riddled with holes.
16	8	fr	Cladosporiose (Moisissure)	Passalora fulva	Moyenne	Moisissure des cultures confinées (serre) avec manque de ventilation et forte humidité.	["Taches jaunes sur le dessus de la feuille", "Moisissure olive \\u00e0 brune au revers", "Feuilles qui se dess\\u00e8chent"]	["A\\u00e9rer et ventiler la serre", "R\\u00e9duire l'humidit\\u00e9 de l'air", "Retirer les feuilles atteintes", "Espacer les plants"]	Dessous de feuille propre et vert clair.	Taches jaunes dessus, moisissure olive dessous.
17	8	en	Leaf mold	Passalora fulva	Medium	Mold of enclosed crops (greenhouses) with poor ventilation and high humidity.	["Yellow spots on the upper leaf surface", "Olive-brown mold underneath", "Leaves drying out"]	["Ventilate the greenhouse", "Lower air humidity", "Remove affected leaves", "Space the plants"]	Clean, pale green underside.	Yellow spots above, olive mold below.
18	9	fr	Septoriose	Septoria lycopersici	Moyenne	Champignon favorisé par une humidité prolongée sur le feuillage ; il défolie progressivement la plante.	["Nombreuses petites taches rondes \\u00e0 centre clair", "Bordure sombre", "Jaunissement puis chute des feuilles"]	["Retirer les feuilles basses atteintes", "Arroser au pied", "Rotation des cultures", "Fongicide homologu\\u00e9 si n\\u00e9cessaire"]	Feuille uniformément verte.	Petites taches rondes à centre gris et bordure sombre.
19	9	en	Septoria leaf spot	Septoria lycopersici	Medium	Fungus favoured by prolonged leaf wetness; it gradually defoliates the plant.	["Many small round spots with pale centres", "Dark margin", "Leaves yellowing and dropping"]	["Remove affected lower leaves", "Water at the base", "Rotate crops", "Approved fungicide if needed"]	Uniformly green leaf.	Small round spots with grey centres and dark margins.
20	10	fr	Araignées rouges (acariens)	Tetranychus urticae	Moyenne	Ravageur minuscule qui prolifère par temps très chaud et sec et pique les cellules des feuilles.	["Fines ponctuations jaunes", "Fine toile au revers des feuilles", "Feuilles bronz\\u00e9es et s\\u00e8ches"]	["Pulv\\u00e9riser de l'eau sous les feuilles pour r\\u00e9duire la population", "Utiliser du savon insecticide ou un acaricide adapt\\u00e9", "Surveiller r\\u00e9guli\\u00e8rement en saison chaude et s\\u00e8che"]	Feuille verte, brillante, sans toile.	Feuille ponctuée de jaune avec fine toile au revers.
21	10	en	Spider mites	Tetranychus urticae	Medium	Tiny pest that thrives in very hot, dry weather and pierces leaf cells.	["Fine yellow stippling", "Fine webbing under leaves", "Bronzed, dry leaves"]	["Spray water under the leaves to reduce numbers", "Use insecticidal soap or a suitable miticide", "Scout regularly in hot, dry spells"]	Glossy green leaf, no webbing.	Yellow-stippled leaf with fine webbing underneath.
22	11	fr	Corynesporiose (Target spot)	Corynespora cassiicola	Moyenne	Champignon des climats chauds et humides persistants, qui touche feuilles, tiges et fruits.	["Taches brunes \\u00e0 anneaux concentriques", "Centre qui se troue en vieillissant", "Chute des feuilles"]	["Retirer les feuilles atteintes", "Am\\u00e9liorer l'a\\u00e9ration", "\\u00c9viter le mouillage du feuillage", "Fongicide homologu\\u00e9 si n\\u00e9cessaire"]	Feuille verte, sans anneaux.	Taches brunes à anneaux, centre parfois troué.
23	11	en	Target spot	Corynespora cassiicola	Medium	Fungus of persistent warm, humid climates affecting leaves, stems and fruit.	["Brown spots with concentric rings", "Centres that fall out with age", "Leaf drop"]	["Remove affected leaves", "Improve airflow", "Avoid wetting the foliage", "Approved fungicide if needed"]	Green leaf, no rings.	Ringed brown spots, centres sometimes holed.
24	12	fr	Virus de l'enroulement jaune (TYLCV)	Begomovirus (TYLCV), transmis par la mouche blanche	Très élevée	Virus transmis par les mouches blanches, favorisé par la chaleur sèche. Il n'existe pas de traitement curatif.	["Feuilles enroul\\u00e9es vers le haut et jaunies", "Plant rabougri", "Fleurs qui tombent, peu de fruits"]	["Arracher et d\\u00e9truire les plants atteints", "Lutter contre les mouches blanches (filets, pi\\u00e8ges jaunes)", "Utiliser des vari\\u00e9t\\u00e9s tol\\u00e9rantes", "\\u00c9liminer les adventices h\\u00f4tes"]	Feuille plane et verte.	Feuille enroulée, jaunie, plante rabougrie.
25	12	en	Tomato yellow leaf curl virus (TYLCV)	Begomovirus (TYLCV), spread by whiteflies	Very high	Whitefly-transmitted virus favoured by hot, dry weather. There is no cure.	["Leaves curled upward and yellowed", "Stunted plant", "Flower drop and poor fruit set"]	["Uproot and destroy affected plants", "Control whiteflies (nets, yellow traps)", "Use tolerant varieties", "Remove host weeds"]	Flat green leaf.	Curled, yellowed leaf; stunted plant.
26	13	fr	Virus de la mosaïque	Tomato mosaic virus (ToMV)	Élevée	Virus transmis surtout mécaniquement (outils, mains, semences), peu lié à la météo. Pas de traitement curatif.	["Marbrures vert clair / vert fonc\\u00e9", "Feuilles d\\u00e9form\\u00e9es ou filiformes", "Croissance r\\u00e9duite"]	["Arracher les plants atteints", "D\\u00e9sinfecter outils et mains", "Utiliser des semences saines", "Ne pas fumer ni manipuler le tabac avant de toucher les plants"]	Feuille verte homogène.	Feuille marbrée, déformée.
27	13	en	Tomato mosaic virus	Tomato mosaic virus (ToMV)	High	Virus spread mostly mechanically (tools, hands, seed), little linked to weather. No cure.	["Light/dark green mottling", "Distorted or fern-like leaves", "Reduced growth"]	["Uproot affected plants", "Disinfect tools and hands", "Use healthy seed", "Avoid tobacco handling before touching plants"]	Uniform green leaf.	Mottled, distorted leaf.
\.


--
-- Data for Name: _diseases; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._diseases (id, code, is_healthy, severity_level) FROM stdin;
1	healthy	1	none
2	cercospora	0	high
3	mildew	0	very_high
4	powdery_mildew	0	medium
5	early_blight	0	medium
6	late_blight	0	very_high
7	bacterial_spot	0	high
8	leaf_mold	0	medium
9	septoria	0	medium
10	spider_mites	0	medium
11	target_spot	0	medium
12	tylcv	0	very_high
13	tomato_mosaic	0	high
\.


--
-- Data for Name: _plant_care; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._plant_care (id, plant_id, task, frequency, status) FROM stdin;
1	P-001	Arrosage matinal	Quotidien	Effectué
2	P-001	Apport purin d'ortie	Tous les 14 jours	Prévu le 25 avril
3	P-001	Paillage au pied	Une fois par mois	En place
4	P-002	Traitement bicarbonate ou soufre	Immédiat	Urgent (24h)
5	P-002	Aération du rang	Une fois	À faire
6	P-003	Suppression des feuilles atteintes	Immédiat	Urgent
7	P-003	Application fongicide cuivre / décoction de prêle	Sous 24h	Recommandé
8	P-003	Désinfection du sécateur	Après chaque coupe	Impératif
9	P-004	Arrosage matinal	Quotidien	En cours
10	P-004	Paillage racinaire	Mensuel	À prévoir
11	P-005	Arrosage matinal	Quotidien	En cours
12	P-005	Paillage racinaire	Mensuel	À prévoir
13	P-006	Arrosage matinal	Quotidien	En cours
14	P-006	Paillage racinaire	Mensuel	À prévoir
15	P-007	Arrosage matinal	Quotidien	En cours
16	P-007	Paillage racinaire	Mensuel	À prévoir
\.


--
-- Data for Name: _plant_history; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._plant_history (id, plant_id, date, type, result, notes, analysis_id, image_path) FROM stdin;
1	P-001		Scan IA	Feuillage sain (99.2%)	Aucun agent pathogène détecté.		
2	P-001		Taille	Égourmandage	Retrait des gourmands bas.		
3	P-001		Plantation	Repiquage réussi	Terreau enrichi en compost bio.		
4	P-002		Scan IA	Suspicion Oïdium (78%)	Intervention préventive conseillée.		
5	P-002		Fertilisation	Engrais organique potassium	Bonne reprise.		
6	P-003		Scan IA	Tache foliaire (Cercospora) confirmée (96.4%)	Isoler la plante et traiter.		
7	P-003		Scan IA	Anomalie foliaire détectée (62%)	Surveillance accrue recommandée.		
8	P-004		Enregistrement	Culture initialisée	Semis et repiquage validés.		
9	P-004		Scan IA	Tache foliaire (Cercospora) (97.0%)	Supprimer et incinérer sans délai les feuilles fortement atteintes		
10	P-004		Scan IA	Mildiou tardif (91.7%)	Arracher et détruire rapidement les plants atteints		
11	P-004		Scan IA	Gale bactérienne (38.6%)	Utiliser des semences saines		
12	P-004		Scan IA	Plante saine (95.4%)	Poursuivre la conduite culturale actuelle		
13	P-005		Enregistrement	Culture initialisée	Semis et repiquage validés.		
14	P-004		Scan IA	Mildiou tardif (89.5%)	Arracher et détruire rapidement les plants atteints		
15	P-005		Scan IA	Gale bactérienne (80.0%)	Utiliser des semences saines		
16	P-004		Scan IA	Mildiou tardif (98.2%)	Arracher et détruire rapidement les plants atteints		
17	P-006		Enregistrement	Culture initialisée	Semis et repiquage validés.		
18	P-006		Scan IA	Plante saine (86.7%)	Poursuivre la conduite culturale actuelle		
19	P-004		Scan IA	Plante saine (86.7%)	Poursuivre la conduite culturale actuelle		
20	P-004		Scan IA	Plante saine (96.7%)	Poursuivre la conduite culturale actuelle		
21	P-004		Scan IA	Plante saine (96.7%)	Poursuivre la conduite culturale actuelle		
22	P-004		Scan IA	Alternariose (Mildiou précoce) (86.9%)	Retirer et détruire les feuilles atteintes		
23	P-005		Scan IA	Alternariose (Mildiou précoce) (89.2%)	Retirer et détruire les feuilles atteintes		
24	P-005		Scan IA	Mildiou tardif (72.4%)	Arracher et détruire rapidement les plants atteints		
25	P-004		Scan IA	Alternariose (Mildiou précoce) (67.6%)	Retirer et détruire les feuilles atteintes		
26	P-004		Scan IA	Plante saine (97.5%)	Poursuivre la conduite culturale actuelle		
27	P-004		Scan IA	Plante saine (96.7%)	Poursuivre la conduite culturale actuelle		
28	P-004		Scan IA	Plante saine (96.7%)	Poursuivre la conduite culturale actuelle		
29	P-004		Scan IA	Mildiou tardif (85.1%)	Arracher et détruire rapidement les plants atteints	OCT-D9F6BFBA	scans/cf15554497124a73b193599b9bf51ff6.jpg
30	P-004		Scan IA	Plante saine (91.7%)	Poursuivre la conduite culturale actuelle		
31	P-005		Scan IA	Plante saine (71.8%)	Poursuivre la conduite culturale actuelle		
32	P-005		Scan IA	Plante saine (71.8%)	Poursuivre la conduite culturale actuelle	OCT-BEDF6EB9	scans/8deb3cd1722d46288684cfe2366034a4.jpg
33	P-004		Scan IA	Plante saine (95.7%)	Poursuivre la conduite culturale actuelle	OCT-3099AD49	scans/bf8c57026b4e4cd99cf4ca9d3bce80a5.jpg
34	P-004		Scan IA	Gale bactérienne (80.5%)	Utiliser des semences saines	OCT-A7CDEFDE	scans/ab10a6d4937b4e93ae1328d856d42163.jpg
35	P-004		Scan IA	Mildiou tardif (81.9%)	Arracher et détruire rapidement les plants atteints	OCT-377859EE	scans/6edde2b032794746bf764c5d45521de2.jpg
36	P-005		Scan IA	Septoriose (76.2%)	Retirer les feuilles basses atteintes	OCT-3E36060E	scans/deb3b1a0f5ed47b8a44068685afa7528.jpg
37	P-004		Scan IA	Gale bactérienne (95.9%)	Utiliser des semences saines	OCT-5F8CB0CB	scans/9905d4efa35645f4af142d8925103d40.jpg
38	P-006		Scan IA	Mildiou tardif (98.2%)	Arracher et détruire rapidement les plants atteints	OCT-441CDE23	scans/c63d20b75cd04c17816601a555ad285e.jpg
39	P-004		Scan IA	Mildiou tardif (98.2%)	Arracher et détruire rapidement les plants atteints	OCT-BD84A020	scans/a0a8b9f293e94dd9bdcfb0562b616e6f.jpg
40	P-005		Scan IA	Mildiou tardif (98.2%)	Arracher et détruire rapidement les plants atteints	OCT-AB30D8D8	scans/a75f39c4937749a2b9750fb74d4d28d6.jpg
41	P-004		Scan IA	Plante saine (86.7%)	Poursuivre la conduite culturale actuelle	OCT-3B821C48	scans/5c9b592278084f848407d7a96c4d40ef.jpg
42	P-004		Scan IA	Mildiou tardif (100.0%)	Arracher et détruire rapidement les plants atteints	OCT-F7DA457E	scans/ad30256a7ab546ff9a8284a45cf6602e.jpg
43	P-005		Scan IA	Alternariose (Mildiou précoce) (89.2%)	Retirer et détruire les feuilles atteintes	OCT-ABA3FD69	scans/77b7d2fc49fe41e68d405fbf3062f4d3.jpg
44	P-004		Scan IA	Alternariose (Mildiou précoce) (92.6%)	Retirer et détruire les feuilles atteintes	OCT-F90EDBB5	scans/18828096812c45e493c409c33694e08c.jpg
45	P-004		Scan IA	Alternariose (Mildiou précoce) (61.4%)	Retirer et détruire les feuilles atteintes	OCT-471E6716	scans/6c6d03d1a6c04e53a0df13a58afe585a.jpg
46	P-006		Scan IA	Plante saine (86.7%)	Poursuivre la conduite culturale actuelle	OCT-C9A92B7A	scans/e01c47bb5a664d669c64f0fef22961fd.jpg
47	P-005		Scan IA	Plante saine (96.7%)	Poursuivre la conduite culturale actuelle	OCT-D39F1FF9	scans/21730b604a1c44bd902b274394310a80.jpg
48	P-007		Enregistrement	Culture initialisée	Semis et repiquage validés.		
49	P-007		Scan IA	Mildiou tardif (75.7%)	Arracher et détruire rapidement les plants atteints	OCT-86A6159F	scans/cfcfd5ff5afc4155bd45fe82aae38d6d.jpg
\.


--
-- Data for Name: _plant_observations; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._plant_observations (id, plant_id, date, author, text) FROM stdin;
1	P-001		Agriculteur	Fleurs abondantes, pollinisation en bonne voie.
2	P-001		Conseiller agricole	Très bon développement végétatif.
3	P-002		Système PhytoScan	Dégradation légère détectée par rapport au scan précédent.
4	P-003		Agent Octopus IA	Propagation fongique rapide favorisée par la rosée matinale.
5	P-004		Agriculteur	Plantation réalisée en conditions optimales.
6	P-005		Agriculteur	Plantation réalisée en conditions optimales.
7	P-006		Agriculteur	Plantation réalisée en conditions optimales.
8	P-007		Agriculteur	Plantation réalisée en conditions optimales.
\.


--
-- Data for Name: _plants; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._plants (id, owner_id, name, species, variety, status, growth_stage, planting_date, last_observation, plot, water_schedule, image, health_score, alert, details) FROM stdin;
P-001		Plante 1	Tomate (Solanum lycopersicum)	Roma VF	saine	Floraison & Fructification			Parcelle A3 - Serre 1	Goutte-à-goutte (2x / jour)	/assets/plante_1.jpg	98		{"yieldEstimate": "4.5 kg / pied", "soilMoisture": "65%", "temperature": "24\\u00b0C", "notes": "Croissance vigoureuse, feuillage bien vert sans aucune l\\u00e9sion apparente."}
P-002		Plante 2	Pomme de terre 	Black Beauty	surveiller	Végétatif avancé			Parcelle B1 - Plein champ	Arrosage au pied (tous les 2 jours)	/assets/plante_2.jpg	74	Premiers signes d'oïdium et jaunissement léger sur feuilles inférieures.	{"yieldEstimate": "3.2 kg / pied", "soilMoisture": "52%", "temperature": "27\\u00b0C", "notes": "Apparition de l\\u00e9gers voiles blanch\\u00e2tres sur les feuilles basses. Risque de propagation si humidit\\u00e9 \\u00e9lev\\u00e9e."}
P-003		Plante 3	Poivron 	Antillais / Habanero	malade	Début floraison			Parcelle C2 - Planche 4	Manuel le soir	/assets/plante_3.jpg	41	Attaque sévère de Cercosporiose (Taches foliaires nécrotiques). Traitement d'urgence requis.	{"yieldEstimate": "1.8 kg / pied", "soilMoisture": "48%", "temperature": "29\\u00b0C", "notes": "Multiples taches brunes circulaires avec halo jaun\\u00e2tre. Chute pr\\u00e9matur\\u00e9e des feuilles touch\\u00e9es."}



--
-- Data for Name: _scans; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._scans (id, analysis_id, user_id, plant_id, disease_id, image_path, confidence, model_name, processing_ms, lang, created_at) FROM stdin;
1	OCT-6D76F088	1		2	scans/9507de25cc444fcea53f881e6824515a.jpg	97.0	octopus-vision-mock	5	fr	2026-11-11
2	OCT-B397E331	1		2	scans/319cfc8c2a954f0c82af750df94c9745.jpg	97.0	octopus-vision-mock	3	fr	2026-11-11
3	OCT-42408517	1		2	scans/f715a7f4c6f040ca82597be8eef3180d.jpg	97.0	octopus-vision-mock	4	fr	2026-11-11
4	OCT-82AC8D30	1		7	scans/0a3f1b817c314a91a1826ad77fae5943.jpg	47.1	phytoscan-ai-v3-efficientnetb0	227	fr	2026-11-12
5	OCT-CF09D45F	1		6	scans/7757e807879c4c15a604d7ed48b2d486.jpg	99.2	phytoscan-ai-v3-efficientnetb0	174	fr	2026-11-12
6	OCT-BC3A9F52	1		6	scans/1f89df2d46bc48a9a69dc8232c149155.jpg	98.3	phytoscan-ai-v3-efficientnetb0	176	fr	2026-11-12
7	OCT-5E2A675D	1		6	scans/5c6b966fe4424585a99e612f042adfd1.jpg	97.7	phytoscan-ai-v3-efficientnetb0	161	fr	2026-11-12
8	OCT-1488DB7F	1		6	scans/27679446ef444a0f84a8398244a5afc0.jpg	96.8	phytoscan-ai-v3-efficientnetb0	143	fr	2026-11-12
9	OCT-B2BBE194	1		6	scans/14cda9f00bf34566beb4c9efcf50a269.jpg	91.7	phytoscan-ai-v3-efficientnetb0	173	fr	2026-11-12
10	OCT-105C1398	1		7	scans/3665af5315b4461da897eee8099b2fd8.jpg	47.1	phytoscan-ai-v3-efficientnetb0	195	fr	2026-11-12
11	OCT-FBD8449E	1		6	scans/5ff6d23194ff483a9e40170f768c3ef9.jpg	89.5	phytoscan-ai-v3-efficientnetb0	184	fr	2026-11-12
12	OCT-CD5109F0	1		7	scans/8720b51f008e46f481e1a38515610353.jpg	47.1	phytoscan-ai-v3-efficientnetb0	173	fr	2026-11-12
13	OCT-9622FABD	1		6	scans/3126c00a332840459947fd2ae10daaa9.jpg	91.7	phytoscan-ai-v3-efficientnetb0	158	fr	2026-11-12
14	OCT-4715CC60	1		1	scans/b654664ef6554f43bc5d209c5ff57e11.jpg	60.2	phytoscan-ai-v3-efficientnetb0	146	fr	2026-11-12
15	OCT-8A17200B	1		1	scans/fae0b7af654842c6bba2a00ed6b6befd.jpg	50.5	phytoscan-ai-v3-efficientnetb0	168	fr	2026-11-12
16	OCT-F111ACFA	1		6	scans/579f0e720fbd412fa2904ccfcbec0798.jpg	92.6	phytoscan-ai-v3-efficientnetb0	147	fr	2026-11-12
17	OCT-67EC1D4E	1		1	scans/e8572ab4a6024fb4833ba93004b5a9dd.jpg	63.5	phytoscan-ai-v3-efficientnetb0	170	fr	2026-11-12
18	OCT-19511AD3	1		6	scans/ed94c2dca7ad4f76a9e809e9726a8578.jpg	93.6	phytoscan-ai-v3-efficientnetb0	172	fr	2026-11-12
19	OCT-33DDEF35	1		1	scans/147977b5c5244ed2b8fc1649e72d7f16.jpg	65.3	phytoscan-ai-v3-efficientnetb0	162	fr	2026-11-12
20	OCT-D37508C0	1		7	scans/cec40f254ed24e1ba3b3d671072aa512.jpg	80.0	phytoscan-ai-v3-efficientnetb0	159	fr	2026-11-12
21	OCT-10F56169	1		7	scans/016a1852ca7d4628ab4ba40f17fbe040.jpg	93.0	phytoscan-ai-v3-efficientnetb0	177	fr	2026-11-12
22	OCT-40491B85	1		7	scans/feabb60dc24c4207bbca5c37a614732b.jpg	38.6	phytoscan-ai-v3-efficientnetb0	156	fr	2026-11-12
23	OCT-3E7DC0D0	1		1	scans/7c38b5c9f2234a33991c69844c2c5c66.jpg	95.4	phytoscan-ai-v3-efficientnetb0	152	fr	2026-11-12
24	OCT-4547771D	1		1	scans/06ae3d95244e41958660bbf020920859.jpg	51.5	phytoscan-ai-v3-efficientnetb0	146	fr	2026-11-12
25	OCT-9770EA58	1		6	scans/49182118f0594c3fb86eec51f2490939.jpg	91.7	phytoscan-ai-v3-efficientnetb0	137	fr	2026-11-12
26	OCT-1F23B0D6	1		7	scans/4bd9557b27eb4a9b992f5ed4c367abf8.jpg	47.1	phytoscan-ai-v3-efficientnetb0	231	fr	2026-11-12
27	OCT-440A65B7	1		6	scans/dd85e02be9f545ffbbeffe50034fc37e.jpg	89.5	phytoscan-ai-v3-efficientnetb0	304	fr	2026-11-12
28	OCT-FF9FEF9A	1		7	scans/5fa20cd7fa46499994c7100a182e9475.jpg	80.0	phytoscan-ai-v3-efficientnetb0	1295	fr	2026-11-12
29	OCT-D70572FC	1		12	scans/8ab86068e5b843f4a6ba35b179d9500c.jpg	46.3	phytoscan-ai-v3-efficientnetb0	153	fr	2026-11-12
30	OCT-52720FD7	1		6	scans/02f70d46ebbf44f197b98a122c8fa437.jpg	98.2	phytoscan-ai-v3-efficientnetb0	161	fr	2026-11-12
31	OCT-CF233FB9	1		6	scans/ece6b42fe01f4468b58591d31d4494c0.jpg	96.9	phytoscan-ai-v3-efficientnetb0	206	fr	2026-11-12
32	OCT-D5D271F5	1		6	scans/97bd38c51b6f440a9e4ebd4f40acfdd3.jpg	98.7	phytoscan-ai-v3-efficientnetb0	164	fr	2026-11-12
33	OCT-32B0F5C3	1		6	scans/2d473be7b27b45ada17ede4e362f2195.jpg	98.7	phytoscan-ai-v3-efficientnetb0	147	fr	2026-11-12
34	OCT-2CC906EC	1		9	scans/4e3365d501974bdc894b5fe2a8f22b19.jpg	67.2	phytoscan-ai-v3-efficientnetb0	151	fr	2026-11-12
35	OCT-10D9C2B6	1		9	scans/d154478ed9674f7aae09e64c56a87eb8.jpg	67.2	phytoscan-ai-v3-efficientnetb0	143	fr	2026-11-12
36	OCT-F6271856	1		6	scans/07cb95fe9d9d498bb6751ccf751a8b31.jpg	98.7	phytoscan-ai-v3-efficientnetb0	168	fr	2026-11-12
37	OCT-AA1E126A	1		6	scans/e4d57ab4f2694a09877855f40352e2e5.jpg	98.7	phytoscan-ai-v3-efficientnetb0	154	fr	2026-11-12
38	OCT-5446678F	1		6	scans/b0e12b2fa2aa4743a1a7e87c8f1e5ad3.jpg	98.2	phytoscan-ai-v3-efficientnetb0	175	fr	2026-11-12
39	OCT-7B8CD8AF	1		1	scans/e014c0475aed4bb1a3085d0b0a3412b7.jpg	86.7	phytoscan-ai-v3-efficientnetb0	178	fr	2026-11-12
40	OCT-F630725B	1		1	scans/79280705d9ee4f218cc23bbb23889cdd.jpg	86.7	phytoscan-ai-v3-efficientnetb0	246	fr	2026-11-12
41	OCT-A222649F	1		1	scans/9e678e4ea25c482abc7d18263984e5cd.jpg	96.7	phytoscan-ai-v3-efficientnetb0	198	fr	2026-11-12
42	OCT-3218EBB9	1		1	scans/e036c210ebe7401382738bb8fc88d72c.jpg	96.7	phytoscan-ai-v3-efficientnetb0	228	fr	2026-11-12
43	OCT-DBDA26FF	1		5	scans/66f24775870348049676901df7df66c8.jpg	86.9	phytoscan-ai-v3-efficientnetb0	195	fr	2026-11-12
44	OCT-DD41FFBF	1		5	scans/6ffcf46cc8584fb99f768acf701ffb2c.jpg	89.2	phytoscan-ai-v3-efficientnetb0	158	fr	2026-11-12
45	OCT-2DB68341	1		5	scans/ea058d60e9bb44b3b0181867cdab2827.jpg	69.4	phytoscan-ai-v3-efficientnetb0	212	fr	2026-11-12
46	OCT-490E67EC	1		6	scans/1da84e6769ac4962beb40f33c38e4010.jpg	72.4	phytoscan-ai-v3-efficientnetb0	157	fr	2026-11-12
47	OCT-547AB2B0	1		5	scans/1d653ccba1d448b9b565871b0d4c04a9.jpg	67.6	phytoscan-ai-v3-efficientnetb0	544	fr	2026-11-12
48	OCT-2620DE42	1		5	scans/185d0d05439342c7a2f50a17e251be53.jpg	42.8	phytoscan-ai-v3-efficientnetb0	301	fr	2026-11-12
49	OCT-D9BBDF18	1		1	scans/844d3924f3b647a19f3aa2c7282c637e.jpg	97.5	phytoscan-ai-v3-efficientnetb0	252	fr	2026-11-12
50	OCT-B0BEBC71	1		1	scans/a3630df08a6349bca3dfe9c9547f2514.jpg	96.7	phytoscan-ai-v3-efficientnetb0	156	fr	2026-11-13
51	OCT-D1C06F92	1		6	scans/d5a26db92d594211ad9acd7c2fa05f4e.jpg	94.1	phytoscan-ai-v3-efficientnetb0	176	fr	2026-11-13
52	OCT-6904F129	1		1	scans/8c87563210014177bd5014317f1c31ea.jpg	96.7	phytoscan-ai-v3-efficientnetb0	174	fr	2026-11-13
53	OCT-D9F6BFBA	1	P-004	6	scans/cf15554497124a73b193599b9bf51ff6.jpg	85.1	phytoscan-ai-v3-efficientnetb0	215	fr	2026-11-13
54	OCT-5C8B6223	1		1	scans/5ed5a248c82149d282437b022ac5eb90.jpg	91.7	phytoscan-ai-v3-efficientnetb0	274	fr	2026-11-13
55	OCT-57EF4CBA	1		1	scans/f19e3cb7b28f49b7ba93fc4946cc23b7.jpg	71.8	phytoscan-ai-v3-efficientnetb0	137	fr	2026-11-13
56	OCT-BEDF6EB9	1	P-005	1	scans/8deb3cd1722d46288684cfe2366034a4.jpg	71.8	phytoscan-ai-v3-efficientnetb0	192	fr	2026-11-13
57	OCT-3099AD49	1	P-004	1	scans/bf8c57026b4e4cd99cf4ca9d3bce80a5.jpg	95.7	phytoscan-ai-v3-efficientnetb0	324	fr	2026-11-13
58	OCT-A7CDEFDE	1	P-004	7	scans/ab10a6d4937b4e93ae1328d856d42163.jpg	80.5	phytoscan-ai-v3-efficientnetb0	139	fr	2026-11-13
59	OCT-377859EE	1	P-004	6	scans/6edde2b032794746bf764c5d45521de2.jpg	81.9	phytoscan-ai-v3-efficientnetb0	169	fr	2026-11-13
60	OCT-3E36060E	1	P-005	9	scans/deb3b1a0f5ed47b8a44068685afa7528.jpg	76.2	phytoscan-ai-v3-efficientnetb0	161	fr	2026-11-13
61	OCT-5F8CB0CB	1	P-004	7	scans/9905d4efa35645f4af142d8925103d40.jpg	95.9	phytoscan-ai-v3-efficientnetb0	149	fr	2026-11-13
62	OCT-441CDE23	1	P-006	6	scans/c63d20b75cd04c17816601a555ad285e.jpg	98.2	phytoscan-ai-v3-efficientnetb0	147	fr	2026-11-13
63	OCT-FB1F261F	1		6	scans/88912e2bf3724cf5aac15d52decc4129.jpg	98.7	phytoscan-ai-v3-efficientnetb0	196	fr	2026-11-13
64	OCT-BD84A020	1	P-004	6	scans/a0a8b9f293e94dd9bdcfb0562b616e6f.jpg	98.2	phytoscan-ai-v3-efficientnetb0	176	fr	2026-11-13
65	OCT-AB30D8D8	1	P-005	6	scans/a75f39c4937749a2b9750fb74d4d28d6.jpg	98.2	phytoscan-ai-v3-efficientnetb0	208	fr	2026-11-13
66	OCT-3B821C48	1	P-004	1	scans/5c9b592278084f848407d7a96c4d40ef.jpg	86.7	phytoscan-ai-v3-efficientnetb0	403	fr	2026-11-13
67	OCT-F7DA457E	1	P-004	6	scans/ad30256a7ab546ff9a8284a45cf6602e.jpg	100.0	phytoscan-ai-v3-efficientnetb0	199	fr	2026-11-13
68	OCT-ABA3FD69	1	P-005	5	scans/77b7d2fc49fe41e68d405fbf3062f4d3.jpg	89.2	phytoscan-ai-v3-efficientnetb0	185	fr	2026-11-13
69	OCT-0454B78A	1		6	scans/59b6411d4efd4e97889f7873ae174cc5.jpg	99.6	phytoscan-ai-v3-efficientnetb0	134	fr	2026-11-13
70	OCT-9B9C437A	1		9	scans/cd6da97fffb543f2ad27ae89d3c4c8d0.jpg	91.1	phytoscan-ai-v3-efficientnetb0	147	fr	2026-11-13
71	OCT-3CDBE373	1		6	scans/7306a31ee880487abd5205b84755a9ab.jpg	99.6	phytoscan-ai-v3-efficientnetb0	178	fr	2026-11-13
72	OCT-2B7AC1C6	1		9	scans/481378071ca247b1b76ce14bb522d300.jpg	91.1	phytoscan-ai-v3-efficientnetb0	175	fr	2026-11-13
73	OCT-54B1B8E2	1		6	scans/0a1362a3369045bc8d627ae2ca9415b5.jpg	99.6	phytoscan-ai-v3-efficientnetb0	201	fr	2026-11-13
74	OCT-140C3ED4	1		9	scans/a595b3454be54467a5323bf6e51b35a5.jpg	91.1	phytoscan-ai-v3-efficientnetb0	143	fr	2026-11-13
75	OCT-F90EDBB5	1	P-004	5	scans/18828096812c45e493c409c33694e08c.jpg	92.6	phytoscan-ai-v3-efficientnetb0	485	fr	2026-11-13
76	OCT-471E6716	1	P-004	5	scans/6c6d03d1a6c04e53a0df13a58afe585a.jpg	61.4	phytoscan-ai-v3-efficientnetb0	245	fr	2026-11-13
77	OCT-C9A92B7A	1	P-006	1	scans/e01c47bb5a664d669c64f0fef22961fd.jpg	86.7	phytoscan-ai-v3-efficientnetb0	287	fr	2026-11-13
78	OCT-B1F4AADB	1		9	scans/26c140ae1bc947479aedd36979068f75.jpg	91.1	phytoscan-ai-v3-efficientnetb0	205	fr	2026-11-14
79	OCT-A11F2AC3	1		9	scans/5dfd08dbd6e64318bc7889a1ef499f67.jpg	91.1	phytoscan-ai-v3-efficientnetb0	208	fr	2026-11-14
80	OCT-DA20C724	1		1	scans/66bc2eb86fa945d9a59ecdc8fe12f154.jpg	96.7	phytoscan-ai-v3-efficientnetb0	194	fr	2026-11-14
81	OCT-15C79161	1		1	scans/0d4e1a08afed4e1d8a8fda801c3a67a2.jpg	96.7	phytoscan-ai-v3-efficientnetb0	177	fr	2026-11-14
82	OCT-4CDE42F6	1		6	scans/19cac867cabe4f3ca28622e929624beb.jpg	94.1	phytoscan-ai-v3-efficientnetb0	170	fr	2026-11-14
83	OCT-035EBF7E	1		6	scans/ea97437160e94a87b0e93f0ddcb28798.jpg	94.1	phytoscan-ai-v3-efficientnetb0	212	fr	2026-11-14
84	OCT-DB90F797	1		6	scans/771dcadc4b844c5f86d1e2ff45f47a00.jpg	100.0	phytoscan-ai-v3-efficientnetb0	187	fr	2026-11-14
85	OCT-0EC1A9EA	1		6	scans/51955d6d304d4500a83848b3eb349184.jpg	100.0	phytoscan-ai-v3-efficientnetb0	197	fr	2026-11-14
86	OCT-3C18ED66	1		6	scans/af4ed4356d4c43b1ac7946bc9b3def5d.jpg	100.0	phytoscan-ai-v3-efficientnetb0	178	fr	2026-11-14
87	OCT-93EE239B	1		6	scans/140f5bbe99a8450b9f4195e060d38217.jpg	100.0	phytoscan-ai-v3-efficientnetb0	167	fr	2026-11-14
88	OCT-F8A68C45	1		6	scans/0f61ce4e6f8a4438a1bbd902b48909e6.jpg	100.0	phytoscan-ai-v3-efficientnetb0	176	fr	2026-11-14
89	OCT-301AE981	1		6	scans/7a0fa2884d0848bca858cda96219ad5a.jpg	100.0	phytoscan-ai-v3-efficientnetb0	152	fr	2026-11-14
90	OCT-DE113896	1		6	scans/c51de2b088504a4da28a5e6662acb8de.jpg	100.0	phytoscan-ai-v3-efficientnetb0	136	fr	2026-11-14
91	OCT-3F823260	1		6	scans/29cd4cc7420d4a50a58fc50376d138ce.jpg	100.0	phytoscan-ai-v3-efficientnetb0	180	fr	2026-11-14
92	OCT-0C1C2998	1		5	scans/601e511b1cfe4d3eb4c275f693666184.jpg	89.2	phytoscan-ai-v3-efficientnetb0	188	fr	2026-11-14
93	OCT-09E7A708	1		5	scans/1356da74fd4045909713376f2a05e255.jpg	89.2	phytoscan-ai-v3-efficientnetb0	217	fr	2026-11-14
94	OCT-CE119E33	1		5	scans/974830a4eada47dd9efa5aa6ccbc711a.jpg	89.2	phytoscan-ai-v3-efficientnetb0	209	fr	2026-11-14
95	OCT-23F664B0			5	scans/e76372ee60b6426185f792df43383f13.jpg	86.9	phytoscan-ai-v3-efficientnetb0	320	fr	2026-11-14
96	OCT-28C0E2F6			5	scans/5287d57ce47c483eb0f18e7c5635d89c.jpg	42.8	phytoscan-ai-v3-efficientnetb0	213	fr	2026-11-14
97	OCT-E856D141			5	scans/2dad03d2ace249fab0bd6d42437bb470.jpg	42.8	phytoscan-ai-v3-efficientnetb0	213	fr	2026-11-14
98	OCT-56222ACD			1	scans/ecc07a7a4b1a4045aec009610aa6248a.jpg	96.7	phytoscan-ai-v3-efficientnetb0	277	fr	2026-11-14
99	OCT-A7010FA8			6	scans/52b6128509474855a76758cde716e69c.jpg	85.1	phytoscan-ai-v3-efficientnetb0	191	fr	2026-11-14
100	OCT-678D2A4C			6	scans/26947bc7ef664a39a789bc7da70c2533.jpg	97.7	phytoscan-ai-v3-efficientnetb0	199	fr	2026-11-14
101	OCT-D39F1FF9	1	P-005	1	scans/21730b604a1c44bd902b274394310a80.jpg	96.7	phytoscan-ai-v3-efficientnetb0	186	fr	2026-11-14
102	OCT-86A6159F	1	P-007	6	scans/cfcfd5ff5afc4155bd45fe82aae38d6d.jpg	75.7	phytoscan-ai-v3-efficientnetb0	209	fr	2026-11-14
103	OCT-B24B30D8			1	scans/5f383ebe6e8e41ecb0b398023a8e57e8.jpg	96.7	phytoscan-ai-v3-efficientnetb0	529	fr	2026-11-14
104	OCT-82E1F441			1	scans/6065b53e78e54f588922f9d95a066afc.jpg	96.7	phytoscan-ai-v3-efficientnetb0	1038	fr	2026-11-14
105	OCT-8C1187A7	1		9	scans/63a9cf99c3c4492c84e0f34be12088e8.jpg	91.1	phytoscan-ai-v3-efficientnetb0	379	fr	2026-11-14
106	OCT-8E05E964	1		9	scans/d7f72ad999614baaaca714ed6d7100cc.jpg	91.1	phytoscan-ai-v3-efficientnetb0	102	fr	2026-11-14
107	OCT-82288C7A	1		9	scans/ec829512df2842eab09d92afce4d18c7.jpg	91.1	phytoscan-ai-v3-efficientnetb0	116	fr	2026-11-14
\.


--
-- Data for Name: _users; Type: TABLE DATA; Schema: public; Owner: rebasedata
--

COPY public._users (id, email, full_name, farm_name, agricultural_role, hashed_password, preferred_lang, role, is_active, created_at) FROM stdin;
1	abdondiaye44@gmail.com	Abdou	Fama	Maraîcher / Exploitant Agricole	$2b$12$M06gjQT9lJPGmdIecB3MA.aqRlehl4YD0cfHNww29UdPzvsgcnaOm	fr	farmer	1	2026-11-11
\.


--
-- PostgreSQL database dump complete
--

