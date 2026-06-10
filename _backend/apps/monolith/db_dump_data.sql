--
-- PostgreSQL database dump
--

\restrict c55pHOjaeyKT1vfHezBiSbT8eBgvmQHu5mPo3TDsdImuTF5n6uI6auDnOyfS9HJ

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

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

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c64cbf21-2c3e-43fc-86e6-1ebf2f1dba23	f6440497ceb9e07fa78ba697c0133700e58aefa1cfcfca13c69e7833cd6af136	2026-06-09 09:13:36.478571+00	0_init	\N	\N	2026-06-09 09:13:36.145298+00	1
f76b2ad5-5953-4fc3-90cb-49440e7f14c2	bd8898130e5dec62515fcd7034519b53e415a25abd72cb019ed4fd55427cd9fb	2026-06-09 09:13:36.494626+00	20260529185506_add_suspension_flags	\N	\N	2026-06-09 09:13:36.480845+00	1
5e9ac113-e023-48df-a855-f188de5b77cf	9d4d7e8a142c591d55ac5b25fa5d2fe8a5da73d2104ceb64eda3e66fefde3491	2026-06-09 09:13:36.504134+00	20260529190442_add_bike_minutes_at_time	\N	\N	2026-06-09 09:13:36.496751+00	1
0dc9269f-32e5-4953-a8a6-e918dbb61641	384165800b890eaa003f1b82529bad03668be13f9561ff93dc95d963edb7e07e	2026-06-09 09:13:36.522989+00	20260529194432_add_total_time_biketable	\N	\N	2026-06-09 09:13:36.506545+00	1
ff372f00-8bcf-45eb-9973-59cf684960af	e8dd2ed50d755948f01513d4c6bd0d27b177eb11a610ede9bce64a8c2643975d	2026-06-09 09:13:36.540308+00	20260529194539_add_total_time_min_biketable	\N	\N	2026-06-09 09:13:36.527328+00	1
73732264-5ec3-4c6c-85cf-a7655ab5fe46	5d380c450ddb8415da3afddc3010d587916d550ae0fc5983c68928880df880c0	2026-06-09 09:13:36.553278+00	20260529203636_remove_brake_pad_default	\N	\N	2026-06-09 09:13:36.543847+00	1
1695a8b3-7f59-4edb-ab60-4132831ff271	35f9b750e740faa8eff7a2aa14d7c176e0d48b86778bea8f994d073b48f15fc1	2026-06-09 09:13:36.570492+00	20260530121719_add_health_index	\N	\N	2026-06-09 09:13:36.556625+00	1
8b14fb85-bd48-4a18-b123-cbc5f7ecf477	7815e95cfdceb5abe889d758517eb27a3137e44d9c24d2c6243122bd2ce3e85b	2026-06-09 09:13:36.582706+00	20260530123038_add_health_index	\N	\N	2026-06-09 09:13:36.572957+00	1
044848f6-3b9f-42a7-8fdc-b393cd4ef04e	e5deee3a645e0b13e83eecb37234bbd74aee888db29a4c6c8a791c184b82b4c7	2026-06-09 09:13:36.597021+00	20260530124401_add_warning_message_to_events_action	\N	\N	2026-06-09 09:13:36.58598+00	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.users (id, name, email, password_hash, avatar_url, language, is_active, created_at, updated_at, last_login_at, currency, weight_kg, is_deleted, deleted_at, "googleId") FROM stdin;
40	Jaroslav	jardalufi@gmail.com	\N	\N	en	t	2026-03-30 09:40:06.45+00	2026-03-30 09:40:06.45+00	\N	\N	\N	f	\N	116856027026290023551
38	Petr	test@test.com	testing123456		en	t	2026-03-23 14:03:28.862+00	2026-03-23 14:03:28.862+00	\N	\N	\N	f	\N	
41	Josef	j@gj.com	$2b$10$lg/cIqoQnHY.N67fNsSNTe8bBXEtNIAtZNui8ybt94EttQJaNels2	\N	en	t	2026-03-30 11:19:27.84+00	2026-03-30 11:19:27.84+00	\N	\N	\N	f	\N	\N
42	John Doe	jarda@jarda.com	$2b$10$Lr9sqtfOqEtb0MSZCzDPZ.mG.MXGLn376vDQrGvIsLeaxKPE3bEaW	\N	en	t	2026-04-27 12:26:09.104+00	2026-04-27 12:26:09.104+00	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.accounts (id, "userId", provider, "providerID") FROM stdin;
\.


--
-- Data for Name: bike_sizes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_sizes (id, size) FROM stdin;
54	XS
55	S
56	M
57	L
58	XL
\.


--
-- Data for Name: bike_types; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_types (id, type) FROM stdin;
49	Road
50	Enduro
51	Trail
52	DH
53	XC
54	Fat Bike
55	Gravel
56	Dirt
60	Freeride
61	test
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.organizations (id, name, created_at, updated_at, is_deleted, deleted_at) FROM stdin;
2	Orbea Factory	2026-02-02 15:57:25.312358+00	2026-02-02 15:57:25.312358+00	f	\N
\.


--
-- Data for Name: ride_styles; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.ride_styles (id, ride_style) FROM stdin;
41	Cross Country
42	Trail Riding
43	Downhill
44	Enduro
\.


--
-- Data for Name: wheel_sizes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.wheel_sizes (id, size) FROM stdin;
13	26"
14	27.5"
15	29"
16	mullet
\.


--
-- Data for Name: bikes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bikes (id, bike_type_id, year, wheel_size_id, bike_size_id, created_at, updated_at, frame_material, is_deleted, deleted_at, bikename, description, bike_brand, bike_model, user_id, organization_id, image_url, ride_style_id, ebike, has_front_suspension, has_rear_suspension, total_km, total_time_min) FROM stdin;
\.


--
-- Data for Name: component_groups; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.component_groups (id, group_name, side_choice) FROM stdin;
7	Suspension	f
8	Frame	f
9	Cockpit	f
10	Saddle & Seatpost	f
14	E-bike	f
15	Other	f
11	Wheels	t
12	Drivetrain	f
13	Brakes	t
\.


--
-- Data for Name: component_types; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.component_types (id, component_type, ebike, component_group_id, has_position, user_id) FROM stdin;
309	Pedals	f	15	f	\N
302	Shifter	f	12	t	\N
342	Brake pad	f	13	t	\N
282	Fork	f	7	f	\N
283	Shock	f	7	f	\N
281	Frame	f	8	f	\N
343	Inserts	f	11	t	\N
344	Valves	f	11	f	\N
286	Handlebar	f	9	f	\N
285	Stem	f	9	f	\N
304	Grips	f	9	f	\N
330	Axle	f	11	t	\N
287	Saddle	f	10	f	\N
288	Seatpost	f	10	f	\N
345	Dropper Lever	f	9	f	\N
346	Brakes	f	13	f	\N
347	Chainring	f	12	f	\N
348	Bashguard	f	12	f	\N
292	Crank	f	12	f	\N
350	Sealant	f	11	t	\N
294	Cassette	f	12	f	\N
295	Chain	f	12	f	\N
296	Chain Guide	f	12	f	\N
328	Bottom Bracket	f	12	f	\N
349	Hanger	f	8	f	\N
351	E-Bike System	t	14	f	\N
352	Remote Lever	f	9	f	\N
305	Motor	t	14	f	\N
306	Battery	t	14	f	\N
307	Display	t	14	f	\N
308	Charger	f	14	f	\N
284	Headset	f	9	f	\N
289	Rim	f	11	t	\N
290	Tire	f	11	t	\N
291	Derailleur	f	12	t	\N
297	Brake Caliper	f	13	t	\N
298	Hub	f	11	t	\N
300	Brake Rotor	f	13	t	\N
303	Brake Lever	f	13	t	\N
\.


--
-- Data for Name: components_mounted; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.components_mounted (id, bike_id, component_type_id, mounted_at, removed_at, updated_at, created_at, note, is_active, is_deleted, deleted_at, component_desc, "position", total_km, total_time_min, health_index) FROM stdin;
\.


--
-- Data for Name: events_action; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.events_action (id, action_name, replace_action, user_id, req_front_suspension, req_rear_suspension, warning_message) FROM stdin;
1	Caliper Service	f	\N	f	f	\N
2	Bleed	f	\N	f	f	\N
3	Wear Check	f	\N	f	f	\N
4	Cable & Housing Replacement	f	\N	f	f	\N
5	BB Service	f	\N	f	f	\N
6	Drivetrain Detox	f	\N	f	f	\N
7	Battery Swap	t	\N	f	f	\N
8	Fork Basic Service	f	\N	f	f	\N
9	Fork Full Service	f	\N	f	f	\N
10	Shock Basic Service	f	\N	f	f	\N
11	Shock Full Service	f	\N	f	f	\N
12	Fork adjusment	f	\N	f	f	\N
13	Shock adjusment	f	\N	f	f	\N
14	Remote Lever Service	f	\N	f	f	\N
15	Tire Replacement	t	\N	f	f	\N
16	Sealant Refresh	t	\N	f	f	\N
17	Tubeless Conversion	f	\N	f	f	\N
18	Wheel Truing	f	\N	f	f	\N
19	Hub Service	f	\N	f	f	\N
20	Hub Bearing Replacement	t	\N	f	f	\N
21	Headset Service	f	\N	f	f	\N
22	Headset Bearing Replacement	t	\N	f	f	\N
23	Bolt Torque Check	f	\N	f	f	\N
24	Grip Replecament	t	\N	f	f	\N
25	Dropper Service	f	\N	f	f	\N
26	Remote Cable Replaced	f	\N	f	f	\N
27	Pivot Bearings Replacement	f	\N	f	f	\N
28	Hanger Replacement	f	\N	f	f	\N
29	Hanger Alignment	f	\N	f	f	\N
30	Apply frame shield	f	\N	f	f	\N
31	Firmware Update	f	\N	f	f	\N
32	Battery Check	f	\N	f	f	\N
33	Hardware Maintenance	f	\N	f	f	\N
34	System Diagnostics	f	\N	f	f	\N
35	Pedal Service	f	\N	f	f	\N
36	Pads Replacement	t	\N	f	f	\N
37	Brake Hose Replacement	t	\N	f	f	\N
38	Chain Lube	f	\N	f	f	\N
41	Lever Replacement	t	\N	f	f	\N
40	Chain Replacement	t	\N	f	f	\N
42	Derailleur Service	f	\N	f	f	\N
39	Derailleur Indexing	f	\N	f	f	\N
43	Rotor Service	f	\N	f	f	\N
\.


--
-- Data for Name: events_bikes; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.events_bikes (id, bike_id, note, total_cost, created_at, updated_at, is_deleted, deleted_at) FROM stdin;
\.


--
-- Data for Name: event_actions_done; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.event_actions_done (id, bike_event_id, event_action_id, note, partial_cost, part_replaced, created_at, bike_mileage_at_time, bike_minutes_at_time) FROM stdin;
\.


--
-- Data for Name: action_done_component_map; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.action_done_component_map (event_action_done_id, component_mounted_id) FROM stdin;
\.


--
-- Data for Name: action_service_intervals; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.action_service_intervals (id, service_interval_km, service_interval_h, event_actions_id, health_index_interval) FROM stdin;
\.


--
-- Data for Name: bike_brands; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_brands (id, bike_brand) FROM stdin;
8993	Canyon
8994	Scott
8995	Superior
8996	24seven
8997	333Fab
8998	3G
8999	3T
9000	3rd Eye
9001	3rensho
9002	45North
9003	4ZA
9004	4iiii
9005	6KU
9006	9 zero 7
9007	A-Class
9008	A-bike
9009	A2B e-bikes
9010	ABI
9011	ACS
9012	AGang
9013	AIMA E-Bike
9014	ALAN
9015	AMF
9016	AVANTREK
9017	AXA
9018	Aardvark
9019	Abici
9020	Abus
9021	Accelerade
9022	Accell
9023	Access
9024	Acros
9025	Acstar
9026	Actbest
9027	Adams (Trail a bike)
9028	Addmotor
9029	Adolphe Clément
9030	Advantrek
9031	Adventure Medical Kits
9032	Advocate
9033	Aegis
9034	Aerofix Cycles
9035	Affinity Cycles
9036	AheadSet
9037	Airborne
9038	Aladdin
9039	Alchemy
9040	Alcyon
9041	Alex
9042	Alexander Leutner & Co.
9043	Alien Bikes
9044	Alienation
9045	Alite Designs
9046	All City
9047	Alldays & Onions
9048	Alliance
9049	Allied Cycle Works
9050	Alter Lock
9051	Alton
9052	American Bicycle Group
9053	American Classic
9054	American Machine and Foundry
9055	American Star Bicycle
9056	Amoeba
9057	Ancheer
9058	And
9059	Andiamo
9060	Answer BMX
9061	Apache Bicycles
9062	Apollo
9063	Aqua Sphere
9064	Aquamira
9065	Arai
9066	Ares
9067	Argo Cargo Bike
9068	Argon 18
9069	Asama
9070	Assos
9071	Atala
9072	Atomlab
9073	Author
9074	Avalon
9075	Avanti
9076	Aventón
9077	Avenue
9078	Avid
9079	Axiom
9080	Axle Release
9081	Azonic
9082	Azor
9083	Aztec
9084	Azub
9085	Azuki
9086	Azzuri
9087	BBF
9088	BBG Bashguard
9089	BCA
9090	BETD
9091	BH Bikes (Beistegui Hermanos)
9092	BMC (BMC Switzerland)
9093	BOB
9094	BONT
9095	BOX
9096	BSA
9097	BSD
9098	BSP
9099	BULLS Bikes
9100	Bacchetta
9101	Bachetta
9102	Backpacker's Pantry
9103	Backward Circle
9104	Badger Bikes
9105	Bafang
9106	Bahco
9107	Bailey
9108	Bakfiets
9109	Baladeo
9110	Bamboocycles
9111	Banjo Brothers
9112	Banshee Bikes
9113	Bantam (Bantam Bicycle Works)
9114	Bar Mitts
9115	Barracuda
9116	Basso
9117	Batavus
9118	Batch Bicycles
9119	Bazooka
9120	BeOne
9121	Bearclaw Bicycle Co.
9122	Beater Bikes
9123	Belize
9124	Bell
9125	Bellwether
9126	Benelli
9127	Benno
9128	Benotto
9129	Bergamont
9130	Bertin
9131	Bertoni
9132	Bertucci
9133	Bianchi
9134	Bickerton
9135	Bicycle Research
9136	Big Agnes Inc
9137	Big Cat Bikes
9138	Big Shot
9139	Bike Fit Systems
9140	Bike Friday
9141	Bike Guard
9142	Bike Mielec
9143	Bike Ribbon
9144	Bike-Aid
9145	Bike-Eye
9146	Bike-O-Vision
9147	Bike4Life
9148	BikeE recumbents
9149	Bikes Belong
9150	Bikeverywhere
9151	Biktrix
9152	Bilda
9153	Bilenky Cycle Works
9154	Bintelli
9155	Biomega
9156	BionX
9157	Birdy
9158	Biria
9159	Birmingham Small Arms Company
9160	Bishop
9161	Black Diamond
9162	Black Heart Bike Co
9163	Black Market
9164	Black Mountain Cycles
9165	Black Sheep Bikes
9166	Blackburn
9167	Blix
9168	Blue (Blue Competition Cycles)
10046	RST
9169	Blue Sky Cycle Carts
9170	Boardman Bikes
9171	Bobbin
9172	BodyGlide
9173	Boeshield
9174	Bohemian Bicycles
9175	Bombtrack
9176	Bondhus
9177	Bonk Breaker
9178	Bontrager
9179	Boo Bicycles
9180	Boreal
9181	Borealis (Borealis Fat Bikes)
9182	Boreas Gear
9183	Borile
9184	Bosch
9185	Bottecchia
9186	Boulder Bicycles
9187	Brand-X
9188	Brannock Device Co.
9189	Brave Soldier
9190	Breadwinner
9191	Breakbrake17 Bicycle Co.
9192	Breezer
9193	Brennabor
9194	Bridgestone
9195	Brilliant Bicycle
9196	Brinks Locks
9197	British Eagle
9198	Broakland
9199	Brodie
9200	Broke Bikes
9201	Brompton Bicycle
9202	Brooklyn Bicycle Co.
9203	Brooks England LTD.
9204	Brother Cycles
9205	Browning
9206	Brunswick Corporation
9207	Brush Research
9208	Budnitz
9209	Buff
9210	Bunch Bikes
9211	Burley
9212	Burley Design
9213	Busch + Müller (Busch and Muller)
9214	Bushnell
9215	Buzzy's
9216	CCM
9217	CDI Torque Products
9218	CETMA Cargo
9219	CHUMBA USA
9220	CRUD
9221	CST
9222	CVLN (Civilian)
9223	CX Tape
9224	Caffelatex
9225	Calcott Brothers
9226	Calfee Design
9227	California Springs
9228	Caloi
9229	Camelbak
9230	Camillus
9231	Campagnolo
9232	Campion Cycle Company
9233	Cane Creek
9234	Canfield Brothers
9235	Cannondale
9236	Cardiff
9237	Carmichael Training Systems
9238	Carrera bicycles
9239	Carrol Cycles
9240	Carver
9241	CatEye
9242	Catrike
9243	Cayne
9244	Centurion
9245	CeramicSpeed
9246	Cero
9247	Cervélo
9248	Chadwick
9249	Challenge
9250	Charge
9251	Chariot
9252	Chase
9253	Chater-Lea
9254	Checker Pig
9255	Chicago Bicycle Company
9256	Chris King
9257	Christiania Bikes
9258	Chromag
9259	Cicielios
9260	Cicli Barco
9261	Cicli Olympia
9262	Cielo
9263	Cignal
9264	Cilo
9265	Cinelli
9266	Ciocc
9267	Circa Cycles
9268	Citizen Bike
9269	City Bicycles Company
9270	Civia
9271	Clark-Kent
9272	Claud Butler
9273	Clean Bottle
9274	Cleary Bikes
9275	Cloud Nine
9276	Club Roost
9277	Co-Motion
9278	Coboc
9279	Colnago
9280	Colony
9281	Colossi
9282	Columbia
9283	Columbus Tubing
9284	Commencal Bikes
9285	Competition Cycles Services
9286	Concord Recreation
9287	Condor
9288	Conex
9289	Conor
9290	Continental
9291	Contour Sport
9292	Convercycle
9293	Cook Bros. Racing
9294	Cooper Bikes
9295	Corima
9296	Corratec
9297	Cortina Cycles
9298	Cove
9299	Craft
9300	Crank Brothers
9301	Crank2
9302	Crazy Creek
9303	Create
9304	Creme Cycles
9305	Crescent Moon
9306	Crew
9307	Critical Cycles
9308	Crumpton
9309	Crust Bikes
9310	Cruzbike
9311	Cube
9312	CueClip
9313	Cuevas
9314	Cult
9315	Currie Technology (Currietech)
9316	Currys
9317	Curtlo
9318	Custom
9319	Cyclamatic
9320	Cycle Dog
9321	Cycle Force Group
9322	Cycle Kids
9323	Cycle Stuff
9324	CycleAware
9325	CycleOps
9326	CyclePro
9327	Cycles Fanatic
9328	Cycles Follis
9329	Cycles Toussaint
9330	Cycleurope
9331	Cyclo
9332	Cycloc
9333	Cyfac
9334	CygoLite
9335	Cyrusher
9336	Cytosport
9337	DAJO
9338	DEAN
9339	DHS
9340	DIG BMX
9341	DK Bikes
9342	DMR Bikes
9343	DNP
9344	DOST
9345	DT Swiss
9346	DYU
9347	DZ Nuts
9348	Da Bomb Bikes
9349	Daccordi
9350	Dahon
9351	Dartmoor
9352	Davidson
9353	Dawes Cycles
9354	De Rosa
9355	DeBernardi
9356	DeFeet
9357	DeSalvo Cycles
9358	Decathlon
9359	Deco
9360	Deda Elementi
9361	Deity
9362	Del Sol
9363	Della Santa
9364	Delta
9365	Deluxe
9366	Demolition
9367	Den Beste Sykkel
9368	Dengfu
9369	Derby Cycle
9370	Dermatone
9371	Dero
9372	Detroit Bikes
9373	Deuter
9374	Devinci
9375	Devron
9376	Di Blasi Industriale
9377	Dia-Compe
9378	DiaTech
9379	Diadora
9380	Diamant
9381	Diamondback
9382	Dicta
9383	Dillenger
9384	Dimension
9385	DirtySixer
9386	Discwing
9387	Dobermann
9388	Dodici Milano
9389	Dolan
9390	Donnelly
9391	Dorel Industries
9392	Downtube
9393	Drag
9394	Dual Eyewear
9395	Dualco
9396	Dynacraft
9397	Dynamic Bicycles
9398	Dyno
9399	E-Case
9400	E-Lux
9401	E. C. Stearns Bicycle Agency
9402	EAI (Euro Asia Imports)
9403	EBC
9404	EG Bikes (Metronome)
9405	EGO Movement
9406	EK USA
9407	EMC Bikes
9408	ENVE (ENVE Composites)
9409	ESI
9410	EVS Sports
9411	EZ Pedaler (EZ Pedaler electric bikes)
9412	Eagle Bicycle
9413	Eagles Nest Outfitters
9414	Eastern
9415	Easton
9416	Easy Motion
9417	Easy Racers
9418	Ebgo
9419	Ebisu
9420	Eddy Merckx
9421	Edinburgh Bicycle Co-operative
9422	EighthInch
9423	Electra
9424	Electric Bike Technologies
9425	Elevn Technologies
9426	Elite SRL
9427	Elliptigo
9428	Ellis
9429	Ellis Briggs
9430	Ellsworth
9431	Emilio Bozzi
9432	Encore
9433	Enduro
9434	Endurox
9435	Energizer
9436	Engin Cycles
9437	Enigma Titanium
9438	Envo
9439	Epic
9440	Ergon
9441	Erickson Bikes
9442	Esbit
9443	Esge Kickstands
9444	Europa
9445	Evans Cycles
9446	Evelo
9447	Eveready
9448	Evil
9449	Evo
9450	Excess Components
9451	Exustar
9452	Ezee
9453	FBM
9454	FLX
9455	FRAMED
9456	FSA (Full Speed Ahead)
9457	Factor
9458	Faggin
9459	Failure
9460	Fairdale
9461	Fairlight
9462	Falco Bikes
9463	Falcon
9464	Fanatik
9465	Fantic
9466	Faraday
9467	Fast Wax
9468	Fat City Cycles
9469	Fatback
9470	FattE-Bikes
9471	Fausto Coppi
9472	Federal
9473	Felt
9474	Fetish
9475	Fezzari
9476	FiberFix
9477	Fiction
9478	Field
9479	Finish Line
9480	Finite
9481	Firefly Bicycles
9482	Firefox
9483	Firenze
9484	Firmstrong
9485	First Endurance
9486	Fit bike Co.
9487	Fizik
9488	Fleet Velo
9489	Fleetwing
9490	Flybikes
9491	Flying Pigeon
9492	Flying Scot
9493	Flyxii
9494	Focale44
9495	Focus
9496	Foggle
9497	Fokhan
9498	Folmer & Schwing
9499	Fondriest
9500	Forbidden Bikes
9501	Forge Bikes
9502	Formula
9503	Fortified
9504	Foundry Cycles
9505	Fox
9506	Fram
9507	Framebuilder Supply
9508	Frances
9509	Francesco Moser (F. Moser)
9510	Freddie Grubb
9511	Free Agent
9512	Free Spirit
9513	Freedom
9514	Freeload
9515	Frog bikes
9516	Fucare
9517	FuelBelt
9518	Fuji
9519	Fulcrum
9520	Fyxation
9521	G Sport
9522	G-Form
9523	GMC
9524	GOTRAX
9525	GU
9526	Gamut
9527	Gardin
9528	Garmin
9529	Garneau
9530	Gary Fisher
9531	Gates Carbon Drive
9532	Gateway
9533	Gavin
9534	Gazelle
9535	Gear Aid
9536	Gear Clamp
9537	Gear Up
9538	Geax
9539	GenZe
9540	Gendron Bicycles
9541	Genesis
9542	Genuine Innovations
9543	Geotech
9544	Gepida
9545	Gerard
9546	Ghost
9547	Gilmour
9548	Gineyea
9549	Giordano
9550	Gitane
9551	Glacier Glove
9552	Gladiator Cycle Company
9553	Globe
9554	Gnome et Rhône
9555	GoGirl
9556	Gocycle
9557	Golden Cycles
9558	Gomier
9559	Gordon Hill
9560	Gore
9561	Gorilla bikes
9562	Gormully & Jeffery
9563	Grab On
9564	Grabber
9565	Graber
9566	Graflex
9567	Granite Gear
9568	Gravity
9569	Green Light Cycle Ltd.
9570	Greenfield
9571	Greenspeed
9572	Growler Performance Bikes
9573	Guardian
9574	Gudereit
9575	Guerciotti
9576	Guerrilla Gravity
9577	Gunnar
9578	Guru
9579	H Plus Son
9580	HBBC (Huntington Beach Bicycle, Co)
9581	HED
9582	HERCULES
9583	HP Velotechnik
9584	Habanero
9585	Haibike
9586	Hallstrom
9587	Halo
9588	Haluzak
9589	Hammer Nutrition
9590	Hampsten Cycles
9591	Handsome Cycles
9592	Handspun
9593	Hanford
9594	Hardrocx
9595	Haro
9596	Harry Quinn
9597	Harvey Cycle Works
9598	Hasa
9599	Hase bikes
9600	Hayes
9601	Head
9602	Headsweats
9603	Heinkel
9604	Helkama
9605	Hercules Rodeado
9606	Heritage
9607	Herkelmann
9608	Hero Cycles Ltd
9609	Heron
9610	Hetchins
9611	Hexlox
9612	Heybike
9613	Hiboy
9614	High Gear
9615	Highland
9616	Hija de la Coneja
9617	Hilltopper
9618	Himiway
9619	Hinton Cycles
9620	Hiplok
9621	Hirschfeld
9622	Hirzl
9623	Hobson Bicycle Seats
9624	Hoffman
9625	Holdsworth
9626	Hollandia
9627	Honbike (Uni4)
9628	Honda
9629	Honey Stinger
9630	Hope
9631	Hornit
9632	House of Talents
9633	Hozan
9634	HubBub
9635	Hudz
9636	Huffy
9637	Hufnagel
9638	Humangear
9639	Humber
9640	Humble Frameworks
9641	Hunt Bike Wheels
9642	Hunter
9643	Hurricane Components
9644	Hurtu
9645	Hutchinson
9646	Hydrapak
9647	Hyper
9648	IBEX
9649	ICE Trikes (Inspired Cycle Engineering)
9650	ICan Cycling
9651	IRD (Interloc Racing Design)
9652	IRO Cycles
9653	ISM
9654	IZIP
9655	Ibera
9656	Ibis
9657	Ice Trekkers
9658	IceToolz
9659	Ideal Bikes
9660	Identiti
9661	Incredibell
9662	Independent Fabrication
9663	Industrieverband Fahrzeugbau
9664	Industry Nine
9665	Infini
9666	Infinity Cycle Works
9667	Inglis (Retrotec)
9668	Innerlight Cycles
9669	Innova
9670	Inspired
9671	Intekin
9672	Intense
9673	Iride Bicycles
9674	Ironhorse Bicycles (Iron Horse Bikes)
9675	Islabikes
9676	Issimo Designs
9677	Italvega
9678	Itera plastic bicycle
9679	Iver Johnson
9680	Iverson
9681	Izumi
9682	JMC Bicycles
9683	JP Weigle's
9684	Jagwire
9685	Jamis
9686	Jan Janssen
9687	Jandd
9688	GT
9689	Javelin
9690	Jetson
9691	Jettrike
9692	Joey
9693	John Cherry bicycles
9694	John Deere
9695	Johnny Loco
9696	Jorg & Olif
9697	Juiced Bikes
9698	Juliana Bicycles
9699	K-Edge
9700	K2
9701	KBC
9702	KHS Bicycles
9703	KMC
9704	KS
9705	KTM
9706	KW Bicycle
9707	Kakuka
9708	Kalkhoff
9709	Kalloy
9710	Katadyn
9711	Kazam
9712	Kelly
9713	Kenda
9714	Kent
9715	Kestrel
9716	Kettler Alu-Rad
9717	Kettler USA
9718	Kinesis
9719	Kinesis Industry
9720	Kinetic
9721	Kink
9722	Kinn
9723	Kirk
9724	Kish Fabrication
9725	Klein Bikes
9726	Knog
9727	Knolly
9728	Koga-Miyata
9729	Kogel
9730	Kogswell Cycles
9731	Kona
9732	Kool Kovers
9733	Kool-Stop
9734	Kreitler
9735	Kron
9736	Kronan
9737	Kross SA
9738	Kryptonite
9739	Kuat
9740	Kuota
9741	Kustom Kruiser
9742	Kuwahara
9743	LDG (Livery Design Gruppe)
9744	LOW//
9745	Land Shark
9746	Lankeleisi
9747	Lapierre
9748	Larry Vs Harry
9749	Lattis
9750	Lauf
9751	Laurin & Klement
9752	Lazer
9753	LeMond
9754	Leader Bikes
9755	Lectric Cycles
9756	Lectric eBikes
9757	Leg Lube
9758	Legacy Frameworks
9759	Lekker
9760	Leopard
9761	Lesoosebike
9762	Lezyne
9763	Liberty
9764	Light Bicycle
9765	Light My Fire
9766	Light and Motion
9767	Lightning Cycle Dynamics
9768	Lightspeed
9769	Linear
9770	Linka
9771	Linus
9772	Liotto (Cicli Liotto Gino & Figli)
9773	LiteLok
9774	Litespeed
9775	Liteville
9776	Liv
9777	Lizard Skins
9778	Loctite
9779	Loekie
9780	Lonely Planet
9781	Longbikes
9782	Look
9783	Lotus
9784	Louis Garneau
9785	Louison Bobet
9786	Lynskey
9787	M-Wave
9788	M2S Bikes
9789	MBK
9790	MEC (Mountain Equipment Co-op)
9791	MKS
9792	MMR
9793	MRP
9794	MSR
9795	MVMT Bikes
9796	Macfox
9797	Madsen
9798	Madwagon
9799	Magellan
9800	Magna
9801	Magnum Bikes
9802	Magura
9803	Malvern Star
9804	ManKind
9805	Mango
9806	Manhattan
9807	Manitou
9808	Mantis
9809	Map Bicycles
9810	Maraton
9811	Marin Bikes
9812	Marinoni
9813	Mars Cycles
9814	Marson
9815	Maruishi
9816	Marukin
9817	Marzocchi
9818	Masi
9819	Mason Cycles
9820	Master Lock
9821	Matra
9822	Maverick
9823	Mavic
9824	Maxcom
9825	Maxit
9826	Maxxis
9827	Maxyara
9828	Meiser
9829	Melon Bicycles
9830	Mercian Cycles
9831	Mercier
9832	Merit Bikes
9833	Merlin
9834	MetaBikes
9835	Metrofiets
9836	Micajah C. Henley
9837	Micargi
9838	Miche
9839	Michelin
9840	MicroShift
9841	Miele bicycles
9842	Mikkelsen
9843	Milwaukee Bicycle Co.
9844	Minoura
9845	MirraCo
9846	Mirrycle
9847	Mission Bicycles
9848	Miyata
9849	Mizutani
9850	Modolo
9851	Moma (momabikes)
9852	Momentum
9853	Monark
9854	Mondia
9855	Mondraker
9856	Mongoose
9857	Montague
9858	Montra
9859	Moon Cool
9860	Moots Cycles
9861	Mosaic
9862	Moser Cicli
9863	Mosh
9864	Mosso
9865	Kellys
9866	Moth Attack
9867	Motiv
9868	Motobecane
9869	Motrike
9870	Moulden
9871	Moulton Bicycle
9872	Mountain Cycles
9873	Mountainsmith
9874	Moustache bikes
9875	Movin'
9876	Mr. Tuffy
9877	Mucky Nutz
9878	Muddy Fox
9879	Murray
9880	Mutant Bikes
9881	Mutiny
9882	Müsing (Muesing)
9883	NCM eBikes
9884	NEMO
9885	NS Bikes
9886	Nakamura
9887	Naked
9888	Nakto
9889	Nantucket Bike Basket Company
9890	Nashbar
9891	Nathan
9892	National
9893	Native
9894	Nazca
9895	Neil Pryde
9896	Nema
9897	Neobike
9898	New Albion
9899	New Balance
9900	Next
9901	Niner
9902	Nirve
9903	Nishiki
9904	Nite Ize
9905	NiteRider
9906	Nitto
9907	Niu (Jiangsu Niu Electric Technology Co., Ltd.)
9908	Nokian
9909	Nokon
9910	Nomad Cargo
9911	Norco Bikes
9912	Norcross
9913	Nordlicht
9914	Normal Bicycles
9915	Norman Cycles
9916	North Shore Billet
9917	Northrock
9918	Novara
9919	NuVinci
9920	Nukeproof
9921	Nymanbolagen
9922	O'Leary
9923	O-Stand
9924	ODI
9925	OHM
9926	OPEN
9927	Obed
9928	Odyssey
9929	Old Man Mountain
9930	Olmo
9931	Omnium
9932	On-One
9933	OnGuard
9934	One Up
9935	One Way
9936	OneWheel
9937	Onway
9938	Opel
9939	Optic Nerve
9940	Optimus
9941	Opus
9942	Orange Bikes
9943	Orbea
9944	Orbit
9945	Orfos
9946	Orient Bikes
9947	Origin8
9948	Ortlieb
9949	Other
9950	Otis Guy
9951	Otso
9952	Ottolock
9953	Oury
9954	OutGo
9955	Oval Concepts
9956	Owl 360
9957	Oyama
9958	Oyma Power
9959	Ozone
9960	P Tec
9961	PDW
9962	PNW
9963	PUBLIC bikes
9964	Pace Sportswear
9965	Pacific Cycle
9966	Pake
9967	Panaracer
9968	Panasonic
9969	Paper Bicycle
9970	Park Tool
9971	Parkpre
9972	Parlee
9973	Pasculli
9974	Pashley Cycles
9975	Patria
9976	Paul
9977	Pearl Izumi
9978	Pedal Electric
9979	Pedego (Pedego Electric Bikes)
9980	Pedersen bicycle
9981	Pedro's
9982	Pegasus
9983	Pegoretti
9984	Penguin Brands
9985	Penhale Bicycle Co.
9986	Pereira
9987	Performance
9988	Performer
9989	Peugeot
9990	Phat Cycles
9991	Phil Wood
9992	Phillips Cycles
9993	Phoenix
9994	Pilen
9995	Pinarello
9996	Pinhead
9997	Pinnacle
9998	Pipedream Cycles
9999	Pitlock
10000	Pivot
10001	Planet Bike
10002	Planet X
10003	Pletscher
10004	Po Campo
10005	Pogliaghi
10006	Polar
10007	Polygon
10008	Pope Manufacturing Company
10009	Portland Design Works
10010	Power Grips
10011	PowerTap
10012	Praxis
10013	Premium
10014	Prevelo
10015	Price
10016	Primo
10017	Primus Mootry
10018	Princeton Tec
10019	Principia
10020	Priority Bicycles
10021	Private Label
10022	Pro-tec
10023	ProGold
10024	Problem Solvers
10025	Procycle Group
10026	Prodeco Tech
10027	Profile Design
10028	Profile Racing
10029	Prologo
10030	Promax
10031	Propain
10032	Prophete
10033	Puch
10034	Pure Cycles (Pure Fix Cycles)
10035	Python
10036	Python Pro
10037	QBP
10038	QWIC
10039	Quadrant Cycle Company
10040	Quest
10041	Quintana Roo
10042	REI Co-op (Co-op Cycles)
10043	RIH
10044	RIH Sport Amsterdam
10045	RSD
10047	Rabeneick
10048	RaceFace
10049	Racktime
10050	Rad Power Bikes
10051	Radio (Radio Bike Co)
10052	Radio Flyer
10053	Ragley
10054	Raleigh
10055	Ram
10056	Rambler
10057	Rans Designs
10058	Rapide
10059	Rat Rod Bikes
10060	Ratking
10061	RavX
10062	Rawland Cycles
10063	Razor
10064	Redline
10065	Redlof
10066	Redshift
10067	Reid
10068	Renthal
10069	René Herse
10070	Republic
10071	Reserve
10072	Resist
10073	Retrospec
10074	Revel
10075	Revelate Designs
10076	Revi
10077	Ribble
10078	Ride1Up
10079	Ridgeback
10080	Ridley
10081	Riese & Müller (Riese and Muller)
10082	Rift
10083	Ritchey
10084	Ritte
10085	Rivendell Bicycle Works
10086	Roadmaster
10087	Roberts Cycles
10088	Robin Hood
10089	Robinson
10090	Rock Lobster
10091	RockShox
10092	Rocky Mountain
10093	Rocky Mounts
10094	Rodeo Adventure Labs
10095	Rodriguez
10096	Rogue Panda
10097	Rohloff
10098	Rokform
10099	Rola
10100	Roll Bicycle Company
10101	Rosko
10102	Ross
10103	Rossignol
10104	Rossin
10105	Rotor
10106	Rover Company
10107	Rowbike
10108	Royal
10109	Royce Union
10110	Rudge-Whitworth
10111	Ryde
10112	S & M (S and M Bikes)
10113	SC Bicycles
10114	SCOR
10115	SCOTT
10116	SDG
10117	SE Bikes
10118	SKS
10119	SLS3
10120	SON Nabendynamo (Wilfried Schmidt Maschinenbau)
10121	SQlab
10122	SR Suntour
10123	SRAM
10124	START
10125	STRiDA
10126	SUNringlé
10127	Sage Titanium Bicycles
10128	Sakae
10129	Salsa
10130	Salt BMX
10131	Samchuly
10132	Sancineto
10133	Sanderson
10134	Santa Cruz
10135	Santana Cycles
10136	Saracen Cycles
10137	Saris
10138	Satori
10139	Sava
10140	Scania AB
10141	Scapin
10142	Scattante
10143	Schindelhauer
10144	Schlage
10145	Schwalbe
10146	Schwinn
10147	Seal Line
10148	Sears Roebuck
10149	Season
10150	Seattle Sports Company
10151	SeatyLock
10152	Segway Ninebot (Ninebot)
10153	Sekai
10154	Sekine
10155	Selle Anatomica
10156	Selle Italia
10157	Selle Royal
10158	Selle San Marco
10159	Sense
10160	Serfas
10161	Serotta
10162	Sette
10163	Seven Cycles
10164	Shadow Conspiracy
10165	Shelby Cycle Company
10166	Sherpani
10167	Shimano
10168	Shinola
10169	Shogun
10170	Shredder
10171	Sidi
10172	Sigma
10173	Sigtuna
10174	Silca
10175	Silverback
10176	SimWorks
10177	Simcoe
10178	Simplon
10179	Simson
10180	Sinclair Zike
10181	Sinz
10182	Six-Eleven
10183	SixSixOne
10184	Skinz
10185	Skyway
10186	Slime
10187	Sohrab Cycles
10188	Solex
10189	Solé (Sole bicycles)
10190	Soma
10191	Somec
10192	Sondors
10193	Sonoma
10194	Soulcraft
10195	Source
10196	Spalding Bicycles
10197	Sparta
10198	Specialized
10199	Spectrum
10200	Speedco
10201	Speedfil
10202	Speedplay
10203	Speedvagen
10204	Speedwell bicycles
10205	Spicer
10206	SpiderTech
10207	Spooky
10208	Sportneer
10209	Spot
10210	Sprintech
10211	Spurcycle
10212	Squire
10213	St. Tropez
10214	Stages
10215	Staiger
10216	Stan's No Tubes
10217	Standard Byke
10218	Standert
10219	Stanley
10220	Stanridge
10221	State Bicycle Co.
10222	Steadyrack
10223	Stealth Electric Bikes
10224	Steelman Cycles
10225	Stein
10226	Stein Trikes
10227	Stelber Cycle Corp
10228	Stella
10229	Stem Captain
10230	Sterling Bicycle Co.
10231	Steve Potts
10232	Stevens
10233	Stevenson Custom Bicycles
10234	Stinner
10235	Stoemper
10236	Stolen Bicycle Co.
10237	Stoneridge Cycle
10238	Stooge Cycles
10239	Strada Customs
10240	Stradalli Cycles
10241	Straitline
10242	Strawberry Bicycle
10243	Strider (Strider sports)
10244	Stromer
10245	Strong Frames
10246	Sturmey-Archer
10247	Stålhästen
10248	Subrosa
10249	Suelo
10250	Sugino
10251	Sun
10252	SunRace
10253	Sunday
10254	Sunn
10255	Super73
10256	Supercross
10257	Supercycle
10258	Supernova Bikes
10259	Supernova Lights
10260	Superpedestrian
10261	Surface604
10262	Surly
10263	Surrey
10264	Suunto
10265	Swagman
10266	Sweetpea Bicycles
10267	Swingset
10268	Swobo
10269	SyCip
10270	Syncros
10271	Syntace
10272	T-Lab
10273	TET Cycles (Tom Teesdale Bikes)
10274	TH Industries
10275	TI Cycles
10276	TI Cycles of India
10277	TRP
10278	Taarnby
10279	Tacx
10280	Tadpole
10281	Takara
10282	Talisman Bikes
10283	Tamer
10284	Tange-Seiki
10285	Tangent Products
10286	Taotao
10287	Tati Cycles
10288	Taylor Bicycles (Paul Taylor)
10289	Tec Labs
10290	Tektro
10291	Tern
10292	Terra Trike
10293	Terrible One
10294	Terrot
10295	Terry
10296	Tex-Lock
10297	The Hive
10298	Thesis Bike
10299	Thomson
10300	Thorn Cycles
10301	Thrill
10302	Throne Cycles
10303	Thruster
10304	Thule
10305	TiGr
10306	TigoMac
10307	Timbuk2
10308	Time
10309	Tioga
10310	Titan
10311	Titus
10312	Token
10313	Tokyobike
10314	Tomac
10315	Tommasini
10316	Tommaso
10317	Tony Hawk
10318	Topeak
10319	TorHans
10320	Torelli
10321	Torker
10322	Total BMX
10323	Tour de France
10324	Tout Terrain
10325	Toyo
10326	Track and Trail
10327	Traitor
10328	Transit
10329	Transition Bikes
10330	TranzX
10331	Trayl
10332	Tree
10333	Trek
10334	Tribe Bicycle Co
10335	Trident
10336	Trik Topz
10337	TrikExplor
10338	Trinx
10339	Triumph Cycle
10340	TruVativ
10341	Tubasti
10342	Tubus
10343	Tufo
10344	Tunturi
10345	Turboant
10346	Turin
10347	Turner Bicycles
10348	Twin Six
10349	TwoFish
10350	Ubco Adventure
10351	Umberto Dei
10352	Unior
10353	Univega
10354	Unknown
10355	Upland
10356	Upstand
10357	Urago
10358	Urban Arrow
10359	Urban Bike
10360	VAAST
10361	VP Components
10362	VSF Fahrradmanufaktur
10363	Valdora
10364	Vamoose cycles
10365	Van Dessel
10366	Van Herwerden
10367	Van Raam
10368	VanMoof
10369	Vassago
10370	Vee Rubber
10371	Vela Bikes
10372	Velec
10373	Velo
10374	Velo De Ville
10375	Velo Orange
10376	Velo Vie
10377	Veloce
10378	Velocity
10379	Velomont
10380	Velomotors
10381	Velorbis
10382	Veloretti
10383	Velotric
10384	Velox
10385	Ventum
10386	Verde
10387	Versa
10388	Via Velo
10389	Vicini
10390	Vilano
10391	Villy Customs
10392	Vincero Design
10393	Vindec High Riser
10394	Viner
10395	Virtue
10396	Viscount
10397	Vision
10398	Vista
10399	Vittoria Shoes and Helmets
10400	Vittoria Tires
10401	Vitus
10402	Viva
10403	Vivente
10404	Volae
10405	Volagi
10406	Volt Bike (VoltBike)
10407	Volume
10408	Vonax
10409	Voodoo
10410	Vortrieb
10411	Vtuvia
10412	Vuelta
10413	Vvolt
10414	Vélo Bolton
10415	VéloSoleX
10416	WTB (Wilderness Trail Bikes)
10417	Wabi Cycles
10418	Wahoo
10419	Wald
10420	Walking Bird
10421	Waterford
10422	Wdnsdy
10423	WeThePeople
10424	WeeRide
10425	Weehoo
10426	Weinmann
10427	Wellgo
10428	Wheels Manufacturing
10429	Wheelsmith
10430	Whirlwind
10431	Whisky Parts Co
10432	Whispbar
10433	White Bros
10434	White Industries
10435	White Lightning
10436	Wilier (Wilier Triestina)
10437	Willworx
10438	Windsor
10439	Winora
10440	Winter Bicycles
10441	Witcomb Cycles
10442	Wittson
10443	Wolf Tooth Components
10444	Woodman Components
10445	Woom
10446	WordLock
10447	WorkCycles
10448	Worksman Cycles
10449	Wraith Fabrication
10450	Wright Cycle Company
10451	X-Fusion
10452	X-Lab
10453	X-Treme
10454	Xds
10455	Xiaomi
10456	Xootr
10457	Xpedo
10458	Xtracycle
10459	YST
10460	YT
10461	Yakima
10462	Yaktrax
10463	Yamaguchi Bicycles
10464	Yamaha
10465	Yess (Yess BMX)
10466	Yeti
10467	Yuba
10468	Zigo
10469	Zinn Cycles
10470	Zipp
10471	Zizzo (ZiZZO Folding Bikes)
10472	Zoom Balance Bike
10473	Zycle Fix
10474	b'Twin (Btwin)
10475	beixo
10476	da Vinci Designs (daVinci Tandems)
10477	de Fietsfabriek
10478	di Florino
10479	e*thirteen
10480	eFlow
10481	eVox
10482	eZip
10483	iGo Electric Bikes
10484	k.bedford customs
10485	samebike
10486	sixthreezero
10487	Giant
10488	Merida
10489	Rock Machine
10490	CTM
\.


--
-- Data for Name: bike_event_attachments; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_event_attachments (id, bike_event_id, name, url, content_type, created_at) FROM stdin;
\.


--
-- Data for Name: bike_models; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.bike_models (id, model_name, brand_id) FROM stdin;
1961	Tarmac	10198
1962	Roubaix	10198
1963	Allez	10198
1964	Aethos	10198
1965	Epic	10198
1966	Stumpjumper	10198
1967	Enduro	10198
1968	Chisel	10198
1969	Diverge	10198
1970	Crux	10198
1971	Turbo Levo	10198
1972	Vado	10198
1973	Madone	10333
1974	Émonda	10333
1975	Domane	10333
1976	Fuel EX	10333
1977	Slash	10333
1978	Top Fuel	10333
1979	Marlin	10333
1980	X-Caliber	10333
1981	Roscoe	10333
1982	Checkpoint	10333
1983	Rail	10333
1984	TCR	10487
1985	Defy	10487
1986	Propel	10487
1987	Trance	10487
1988	Anthem	10487
1989	Reign	10487
1990	Talon	10487
1991	XTC	10487
1992	Revolt	10487
1993	TCX	10487
1994	Stance	10487
1995	Fathom	10487
1996	SuperSix EVO	9235
1997	Synapse	9235
1998	CAAD13	9235
1999	Scalpel	9235
2000	Habit	9235
2001	Jekyll	9235
2002	Trail	9235
2003	F-Si	9235
2004	Topstone	9235
2005	Moterra	9235
2006	Addict	8994
2007	Foil	8994
2008	Speedster	8994
2009	Spark	8994
2010	Genius	8994
2011	Ransom	8994
2012	Scale	8994
2013	Aspect	8994
2014	Patron	8994
2015	Strike	8994
2016	Ultimate	8993
2017	Aeroad	8993
2018	Endurace	8993
2019	Spectral	8993
2020	Neuron	8993
2021	Strive	8993
2022	Exceed	8993
2023	Grand Canyon	8993
2024	Grail	8993
2025	Grizl	8993
2026	Litening	9311
2027	Agree	9311
2028	Attain	9311
2029	Stereo	9311
2030	Reaction	9311
2031	Aim	9311
2032	Analog	9311
2033	Nuroad	9311
2034	Kathmandu	9311
2035	Stereo Hybrid	9311
2036	Nomad	10134
2037	Bronson	10134
2038	Hightower	10134
2039	Megatower	10134
2040	Tallboy	10134
2041	Blur	10134
2042	Chameleon	10134
2043	Stigmata	10134
2044	Heckler	10134
2045	Orca	9943
2046	Oiz	9943
2047	Occam	9943
2048	Rallon	9943
2049	Alma	9943
2050	Laufey	9943
2051	Terra	9943
2052	Rise	9943
2053	Wild	9943
2054	Scultura	10488
2055	Reacto	10488
2056	One-Sixty	10488
2057	One-Twenty	10488
2058	Big.Nine	10488
2059	Silex	10488
2060	eOne-Sixty	10488
2061	Oltre	9133
2062	Specialissima	9133
2063	Aria	9133
2064	Infinito	9133
2065	Sprint	9133
2066	Methanol	9133
2067	Impulso	9133
2068	Arcadex	9133
2069	Dogma F	9995
2070	Prince	9995
2071	Paris	9995
2072	Grevil	9995
2073	Crossista	9995
2074	Nytro	9995
2075	R5	9247
2076	S5	9247
2077	Caledonia	9247
2078	Áspero	9247
2079	ZHT-5	9247
2080	P5	9247
2081	Revelator	9705
2082	Scarp	9705
2083	Myroon	9705
2084	Kapoho	9705
2085	Prowler	9705
2086	Macina	9705
2087	Lector	9546
2088	Riot	9546
2089	Kato	9546
2090	Nirvana	9546
2091	Asket	9546
2092	E-Riot	9546
2093	Zaskar	9688
2094	Sensor	9688
2095	Force	9688
2096	Fury	9688
2097	Avalanche	9688
2098	Grade	9688
2099	SB115	10466
2100	SB120	10466
2101	SB130	10466
2102	SB140	10466
2103	SB150	10466
2104	SB160	10466
2105	ARC	10466
2106	Mach 4	10000
2107	Trail 429	10000
2108	Switchblade	10000
2109	Firebird	10000
2110	Vault	10000
2111	Izalco Max	9495
2112	Jam	9495
2113	Thron	9495
2114	O1E	9495
2115	Raven	9495
2116	Atlas	9495
2117	Jam²	9495
2118	Xelius	9747
2119	Aircode	9747
2120	Pulsium	9747
2121	Zesty	9747
2122	Spicy	9747
2123	XR	9747
2124	Prorace	9747
2125	XF	8995
2126	XP	8995
2127	X-Road	8995
2128	Modo	8995
2129	eXF	8995
2130	eXP	8995
2131	Blizzard	10489
2132	Blizz	10489
2133	Torrent	10489
2134	Catherine	10489
2135	Gravelride	10489
2136	Vylet	10489
2137	Charisma	9073
2138	Aura	9073
2139	Magnum	9073
2140	Instinct	9073
2141	Sector	9073
2142	Ronin	9073
2143	stratOS	9073
2144	URC	9865
2145	Swag	9865
2146	Hacker	9865
2147	Gate	9865
2148	Spider	9865
2149	Soot	9865
2150	Theos	9865
2151	Ridge	10490
2152	Scroll	10490
2153	Rascal	10490
2154	Zephyr	10490
2155	Skaut	10490
2156	Koyuk	10490
\.


--
-- Data for Name: event_action_tags; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.event_action_tags (id, event_action_id, event_action_tag) FROM stdin;
\.


--
-- Data for Name: event_action_targets; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.event_action_targets (id, event_action_id, component_type_id) FROM stdin;
\.


--
-- Data for Name: organization_roles; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.organization_roles (id, code, name, sort_order, description) FROM stdin;
1	admin	Admin	\N	\N
2	rider	Rider	\N	\N
3	maintainer	Maintainer	\N	\N
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.organization_members (id, user_id, role_id, organization_id) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.refresh_tokens (id, user_id, refresh_token, expires_at, created_at, revoked, revoked_at, user_agent, ip_address) FROM stdin;
\.


--
-- Data for Name: rides; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.rides (id, bike_id, user_id, started_at, duration_sec, distance_m, elevation_down_m, elevation_up_m, speed_down, speed_avg, braking_load_score, max_speed_kmh, is_deleted, deleted_at) FROM stdin;
\.


--
-- Data for Name: suspension_setup; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.suspension_setup (id, mounted_component_id, setup_date, pressure_psi, pressure_bar, sag_percentage, amount_tokens_spacers, rebound_ls, rebound_hs, compression_ls, compression_hs, notes) FROM stdin;
\.


--
-- Data for Name: tire_setup; Type: TABLE DATA; Schema: public; Owner: jaroslav_user
--

COPY public.tire_setup (id, component_mounted_id, tire_pressure_bar, tire_pressure_psi) FROM stdin;
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.accounts_id_seq', 1, false);


--
-- Name: action_service_intervals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.action_service_intervals_id_seq', 1, false);


--
-- Name: action_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.action_types_id_seq', 50, true);


--
-- Name: bike_brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_brands_id_seq', 11990, true);


--
-- Name: bike_components_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_components_id_seq', 191, true);


--
-- Name: bike_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_details_id_seq', 1, false);


--
-- Name: bike_event_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_event_attachments_id_seq', 1, true);


--
-- Name: bike_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_events_id_seq', 13, true);


--
-- Name: bike_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_models_id_seq', 2156, true);


--
-- Name: bike_sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_sizes_id_seq', 58, true);


--
-- Name: bike_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bike_types_id_seq', 61, true);


--
-- Name: bikes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.bikes_id_seq', 141, true);


--
-- Name: component_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.component_groups_id_seq', 15, true);


--
-- Name: component_service_intervals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.component_service_intervals_id_seq', 1, false);


--
-- Name: component_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.component_types_id_seq', 352, true);


--
-- Name: components_mounted_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.components_mounted_id_seq', 1, false);


--
-- Name: event_action_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.event_action_tags_id_seq', 88, true);


--
-- Name: event_action_targets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.event_action_targets_id_seq', 51, true);


--
-- Name: event_actions_done_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.event_actions_done_id_seq', 6, true);


--
-- Name: events_action_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.events_action_id_seq', 1, false);


--
-- Name: events_bikes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.events_bikes_id_seq', 1, false);


--
-- Name: organization_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.organization_members_id_seq', 4, true);


--
-- Name: organization_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.organization_roles_id_seq', 3, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.organizations_id_seq', 2, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 140, true);


--
-- Name: ride_styles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.ride_styles_id_seq', 50, true);


--
-- Name: rides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.rides_id_seq', 1, false);


--
-- Name: suspension_setup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.suspension_setup_id_seq', 1, false);


--
-- Name: tire_setup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.tire_setup_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.users_id_seq', 42, true);


--
-- Name: wheel_sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jaroslav_user
--

SELECT pg_catalog.setval('public.wheel_sizes_id_seq', 16, true);


--
-- PostgreSQL database dump complete
--

\unrestrict c55pHOjaeyKT1vfHezBiSbT8eBgvmQHu5mPo3TDsdImuTF5n6uI6auDnOyfS9HJ

