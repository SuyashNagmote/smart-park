<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { ParkingLot } from '$lib/server/lots';
	import gsap from 'gsap';
	import Celebration3D from '$lib/components/Celebration3D.svelte';
	import { initRealtime, refreshAll, state as appState, bus, book as bookAction } from '$lib/client/state';
	import { onDestroy } from 'svelte';
	import BookingConfirmedOverlay from '$lib/components/BookingConfirmedOverlay.svelte';
	import ParkingRush from '$lib/components/ParkingRush.svelte';

	let mapContainer: HTMLDivElement = $state() as any;
	let selectedLotId = $state<string | null>(null);
	let search = $state('');
	let status = $state<'connecting' | 'connected' | 'offline'>('connecting');
	let lastUpdatedAt = $state<string>('');
	let tab = $state<'home' | 'map' | 'bookings' | 'profile'>('map');

	let filterMode = $state<'all' | 'available' | 'ev'>('all');
	let userPos = $state<{ lat: number; lon: number } | null>(null);
	let targetPos = $state<{ lat: number; lon: number } | null>(null);

	let bookingOpen = $state(false);
	let bookingDuration = $state(2);
	let bookingVehicle = $state<'car' | 'ev'>('car');
	let bookingNeedsCharging = $state(false);
	let bookingBusy = $state(false);
	let toast = $state<{ title: string; message?: string } | null>(null);
	let celebration = $state<{ receiptCode: string; xp: number } | null>(null);
	let burstKey = $state(0);
	let bookingSlot = $state<number | null>(null);

	// State variables using Svelte 5 runes
	let parkingLots = $state<ParkingLot[]>([]);
	let liveEvents = $state<{ type: string; lot: ParkingLot; timestamp: string }[]>([]);
	let errorMessage = $state<string | null>(null);
	let reservations = $state<any[]>([]);
	let stats = $state<{ xp: number; level: number; streakDays: number; badges: string[] } | null>(null);
	let lastXpAwarded = $state<number | null>(null);
	let quests = $state<any | null>(null);
	let undo = $state<{ id: string; title: string; message?: string; undo: () => void | Promise<void> } | null>(
		null,
	);

	let rescheduleOpen = $state(false);
	let rescheduleBusy = $state(false);
	let rescheduleTarget = $state<any | null>(null);
	let rescheduleStart = $state<string>(''); // local datetime input
	let rescheduleDuration = $state(2);
	let rescheduleSlot = $state<number | null>(null);
	let reschedulePriceId = $state<'standard' | 'flex' | 'green'>('standard');

	let activeNowMs = $state<number>(Date.now());
	let cockpitBusy = $state(false);
	let parkingRushOpen = $state(false);

	function fmtHMS(ms: number) {
		const s = Math.max(0, Math.floor(ms / 1000));
		const hh = Math.floor(s / 3600);
		const mm = Math.floor((s % 3600) / 60);
		const ss = s % 60;
		if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
		return `${mm}:${String(ss).padStart(2, '0')}`;
	}

	function getActiveSession() {
		const r = reservations.find((x: any) => x?.sessionStatus === 'active');
		if (!r) return null;
		const startedAt = r.sessionStartedAt ? Number(r.sessionStartedAt) : null;
		const elapsedMs = startedAt ? Math.max(0, activeNowMs - startedAt) : 0;
		const elapsedHr = elapsedMs / (60 * 60 * 1000);
		const liveCost = Math.max(0, Math.round(Number(r.pricePerHour) * elapsedHr));
		const endsAt = Number(r.startTime) + Number(r.durationHours) * 60 * 60 * 1000;
		const remainingMs = Math.max(0, endsAt - activeNowMs);
		return { r, elapsedMs, liveCost, remainingMs };
	}

	let map: any; // Leaflet map instance
	let markers: Record<string, any> = {};
	let targetMarker: any | null = null;
	let clusterLayer: any | null = null;
	let heatLayer: any | null = null;
	let drawLayer: any | null = null;
	let showHeat = $state(false);
	let boundsDirty = $state(false);
	let areaBounds = $state<any | null>(null);
	let pinMode = $state<'none' | 'home' | 'work'>('none');
	let homePin = $state<{ lat: number; lon: number } | null>(null);
	let workPin = $state<{ lat: number; lon: number } | null>(null);
	let homeMarker: any | null = null;
	let workMarker: any | null = null;

	let mapReady = $state(false);
	let mapInitError = $state<string | null>(null);
	let mapUiCompact = $state(false);
	let mapBottomCollapsed = $state(true);

	onMount(() => {
		const updateCompact = () => {
			mapUiCompact = window.innerWidth < 640;
		};
		updateCompact();
		window.addEventListener('resize', updateCompact);

		const unsub = appState.subscribe((s) => {
			// use store for user-centric data (lots are still driven by this page for map markers)
			reservations = s.reservations;
			stats = s.stats;
			quests = s.quests;
		});
		const off = bus.on((ev) => {
			if (ev.type === 'toast') showToast(ev.title, ev.message);
			if (ev.type === 'celebrate') {
				celebration = { receiptCode: ev.receiptCode, xp: ev.xp };
				burstKey++;
				setTimeout(() => (celebration = null), 3000);
			}
			if (ev.type === 'undoable') {
				undo = { id: ev.id, title: ev.title, message: ev.message, undo: ev.undo };
				setTimeout(() => {
					if (undo?.id === ev.id) undo = null;
				}, 8000);
			}
		});
		onDestroy(() => {
			unsub();
			off();
		});

		initRealtime();
		void refreshAll();

		let mapObj: any;
		let evtSourceObj: EventSource;

		(async () => {
			// #region agent log
			fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H4',location:'src/routes/dashboard/+page.svelte:onMount',message:'dashboard mount start',data:{},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
			try {
				// Import leaflet dynamically to avoid SSR issues
				const L = (await import('leaflet')).default;

				// Best-effort plugin loads; do not break the map
				await import('leaflet.markercluster').catch(() => null);
				await import('leaflet.heat').catch(() => null);
				await import('leaflet-draw').catch(() => null);

				// Map Initialization
				mapObj = L.map(mapContainer, {
					zoomControl: true,
					attributionControl: true,
				}).setView([18.5204, 73.8567], 13); // Pune center
				map = mapObj;

				mapObj.whenReady(() => {
					mapReady = true;
					mapInitError = null;
					requestAnimationFrame(() => map?.invalidateSize?.());
				});
			// #region agent log
			fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H4',location:'src/routes/dashboard/+page.svelte:map',message:'leaflet map initialized',data:{hasMap:Boolean(map)},timestamp:Date.now()})}).catch(()=>{});
			// #endregion

			// Map tiles (OpenStreetMap). Attribution is required.
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 20,
			}).addTo(mapObj);

			clusterLayer = (L as any).markerClusterGroup?.({
				showCoverageOnHover: false,
				spiderfyOnMaxZoom: true,
				maxClusterRadius: 40,
			});
			if (clusterLayer) mapObj.addLayer(clusterLayer);

			drawLayer = new L.FeatureGroup();
			mapObj.addLayer(drawLayer);
			try {
				const drawControl = new (L as any).Control.Draw({
					draw: {
						polygon: true,
						rectangle: true,
						circle: true,
						polyline: false,
						marker: false,
						circlemarker: false,
					},
					edit: { featureGroup: drawLayer },
				});
				mapObj.addControl(drawControl);

				mapObj.on((L as any).Draw.Event.CREATED, (e: any) => {
					drawLayer?.clearLayers?.();
					drawLayer?.addLayer?.(e.layer);
				});
			} catch {
				// optional
			}

			mapObj.on('moveend', () => {
				boundsDirty = true;
			});

			mapObj.on('click', (ev: any) => {
				// Let user pick a target location (where they want to park)
				const lat = ev?.latlng?.lat;
				const lon = ev?.latlng?.lng;
				if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
				if (pinMode !== 'none') {
					if (pinMode === 'home') {
						homePin = { lat, lon };
						if (!homeMarker) homeMarker = setNamedPinMarker(L, lat, lon, 'Home');
						else homeMarker.setLatLng([lat, lon]);
						pinMode = 'none';
						return;
					}
					if (pinMode === 'work') {
						workPin = { lat, lon };
						if (!workMarker) workMarker = setNamedPinMarker(L, lat, lon, 'Work');
						else workMarker.setLatLng([lat, lon]);
						pinMode = 'none';
						return;
					}
				}

				targetPos = { lat, lon };
				setTargetMarker(L, lat, lon);
			});

			// Fetch initial lots logic
			try {
				const res = await fetch('/api/lots');
				const data = await res.json();
				if (data.lots) {
					parkingLots = data.lots;
					renderMarkers(L);
					lastUpdatedAt = new Date().toLocaleTimeString();
					// #region agent log
					fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H4',location:'src/routes/dashboard/+page.svelte:lots',message:'lots loaded',data:{count:Array.isArray(data.lots)?data.lots.length:null},timestamp:Date.now()})}).catch(()=>{});
					// #endregion
				}
			} catch (e) {
				errorMessage = 'Could not load parking lots. Please try again.';
				console.error('Failed to load initial lots', e);
			}

			// Connect to SSE stream
			status = 'connecting';
			const evtSource = new EventSource('/api/stream');
			evtSourceObj = evtSource;

			evtSource.addEventListener('connected', () => {
				status = 'connected';
			});
			evtSource.onerror = () => {
				status = 'offline';
			};

			evtSource.addEventListener('parking_update', (e: any) => {
				const data = JSON.parse(e.data);
				const lot = data.lot as ParkingLot;

				// Add to event stream UI
				liveEvents = [data, ...liveEvents].slice(0, 30);
				lastUpdatedAt = new Date().toLocaleTimeString();

				// Update marker natively
				if (markers[lot.id]) {
					const availRate = (lot.available ?? 0) / lot.capacity;
					const level = availRate <= 0.1 ? 'low' : availRate <= 0.4 ? 'mid' : 'high';

					const html = markerHtml(lot.available ?? 0, level, false);

					markers[lot.id].setIcon(L.divIcon({ html, className: 'bg-transparent' }));
				}
			});
			} catch (e: any) {
				mapReady = false;
				mapInitError = String(e?.message ?? e ?? 'Map failed to initialize');
				showToast('Map error', mapInitError);
			}
		})();

		const onResize = () => {
			try {
				map?.invalidateSize?.();
			} catch {
				// ignore
			}
		};
		window.addEventListener('resize', onResize);
		window.addEventListener('orientationchange', onResize);

		// Geolocation (optional, used for distance sorting)
		try {
			navigator.geolocation?.getCurrentPosition(
				(pos) => {
					userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
				},
				() => {},
				{ enableHighAccuracy: true, timeout: 3500 },
			);
		} catch {
			// ignore
		}

		// store refresh handles reservations/stats/quests too, but keep this for now
		void refreshReservationsAndStats();
		setInterval(() => (activeNowMs = Date.now()), 1000);

		return () => {
			window.removeEventListener('resize', updateCompact);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('orientationchange', onResize);
			if (evtSourceObj) evtSourceObj.close();
			if (mapObj) mapObj.remove();
		};
	});

	$effect(() => {
		if (tab !== 'map') return;
		if (!map) return;
		requestAnimationFrame(() => map?.invalidateSize?.());
	});

	function markerHtml(available: number, level: 'low' | 'mid' | 'high', ping: boolean) {
		const color =
			level === 'low'
				? 'bg-rose-600 border-rose-700'
				: level === 'mid'
					? 'bg-amber-500 border-amber-600'
					: 'bg-emerald-600 border-emerald-700';
		return `<div class="h-7 w-7 rounded-full border ${color} text-white flex items-center justify-center text-[11px] font-semibold shadow-sm ${ping ? 'sp-ping' : ''}">
			${available}
		</div>`;
	}

	function renderMarkers(L: any) {
		if (clusterLayer?.clearLayers) clusterLayer.clearLayers();
		parkingLots.forEach((lot) => {
			const availRate = (lot.available || 0) / lot.capacity;
			const level = availRate <= 0.1 ? 'low' : availRate <= 0.4 ? 'mid' : 'high';

			const html = markerHtml(lot.available || 0, level, false);

			const icon = L.divIcon({
				html,
				className: 'bg-transparent',
				iconSize: [24, 24],
				iconAnchor: [12, 12],
			});

			const marker = L.marker([lot.lat, lot.lon], { icon });
			if (clusterLayer?.addLayer) clusterLayer.addLayer(marker);
			else marker.addTo(map);

			marker.on('click', () => {
				selectedLotId = lot.id;
				map?.setView([lot.lat, lot.lon], Math.max(map?.getZoom?.() ?? 13, 15), { animate: true });
				tab = 'map';
				// #region agent log
				fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H4',location:'src/routes/dashboard/+page.svelte:marker',message:'marker selected',data:{lotId:lot.id},timestamp:Date.now()})}).catch(()=>{});
				// #endregion
			});

			markers[lot.id] = marker;
		});

		if (!heatLayer && (L as any).heatLayer) {
			heatLayer = (L as any).heatLayer([], { radius: 25, blur: 18, maxZoom: 17 });
		}
		updateHeat(L);
	}

	function updateHeat(L: any) {
		if (!heatLayer || !(L as any).heatLayer) return;
		const pts = parkingLots.map((l) => {
			const busy = 1 - (l.available ?? 0) / Math.max(1, l.capacity);
			return [l.lat, l.lon, Math.min(1, Math.max(0.1, busy))];
		});
		heatLayer.setLatLngs(pts);
		if (showHeat) {
			if (!map?.hasLayer?.(heatLayer)) heatLayer.addTo(map);
		} else {
			try {
				map?.removeLayer?.(heatLayer);
			} catch {}
		}
	}

	function setTargetMarker(L: any, lat: number, lon: number) {
		if (!map) return;
		if (targetMarker) {
			targetMarker.setLatLng([lat, lon]);
			return;
		}

		const html = `<div class="h-9 w-9 rounded-2xl border border-white/30 bg-emerald-500/85 text-white grid place-items-center shadow-sm" style="backdrop-filter: blur(8px);">
			<span class="i-fa6-solid-location-dot" style="font-size:14px;"></span>
		</div>`;
		targetMarker = L.marker([lat, lon], {
			icon: L.divIcon({ html, className: 'bg-transparent', iconSize: [36, 36], iconAnchor: [18, 28] }),
		}).addTo(map);
	}

	function setNamedPinMarker(L: any, lat: number, lon: number, label: 'Home' | 'Work') {
		const color = label === 'Home' ? 'bg-sky-500/85 border-white/30' : 'bg-violet-500/85 border-white/30';
		const html = `<div class="h-9 w-9 rounded-2xl border ${color} text-white grid place-items-center shadow-sm" style="backdrop-filter: blur(8px);">
			<span style="font-size:12px; font-weight:800;">${label[0]}</span>
		</div>`;
		return L.marker([lat, lon], {
			icon: L.divIcon({ html, className: 'bg-transparent', iconSize: [36, 36], iconAnchor: [18, 28] }),
		}).addTo(map);
	}

	function showToast(title: string, message?: string) {
		toast = { title, message };
		setTimeout(() => {
			toast = null;
		}, 3200);
	}

	async function refreshReservationsAndStats() {
		try {
			const [r1, r2, q] = await Promise.all([
				fetch('/api/reservations').then((r) => r.json()),
				fetch('/api/reservations?type=stats').then((r) => r.json()),
				fetch('/api/quests').then((r) => r.json()).catch(() => null),
			]);
			reservations = r1?.reservations ?? [];
			stats = r2?.stats ?? null;
			quests = q;
		} catch {
			// ignore
		}
	}

	function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
		const R = 6371;
		const dLat = ((b.lat - a.lat) * Math.PI) / 180;
		const dLon = ((b.lon - a.lon) * Math.PI) / 180;
		const lat1 = (a.lat * Math.PI) / 180;
		const lat2 = (b.lat * Math.PI) / 180;
		const s =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
		return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
	}

	$effect(() => {
		if (!selectedLotId) return;
		const lot = parkingLots.find((x) => x.id === selectedLotId);
		if (!lot) return;
	});

	const filteredLots = () => {
		const q = search.trim().toLowerCase();
		let lots = parkingLots;

		if (areaBounds) {
			lots = lots.filter((l) => areaBounds.contains?.([l.lat, l.lon]));
		}

		if (filterMode === 'available') lots = lots.filter((l) => (l.available ?? 0) > 0);
		if (filterMode === 'ev') lots = lots.filter((l) => l.ev);

		if (q) lots = lots.filter((l) => (l.name + ' ' + l.area).toLowerCase().includes(q));

		// If user picked a target location, rank by distance
		if (targetPos) {
			const t = targetPos;
			lots = [...lots].sort((a, b) => {
				const da = haversineKm({ lat: a.lat, lon: a.lon }, t);
				const db = haversineKm({ lat: b.lat, lon: b.lon }, t);
				return da - db;
			});
		} else if (userPos) {
			const u = userPos;
			lots = [...lots].sort((a, b) => {
				const da = haversineKm({ lat: a.lat, lon: a.lon }, u);
				const db = haversineKm({ lat: b.lat, lon: b.lon }, u);
				return da - db;
			});
		}

		return lots;
	};

	const selectedLot = () => (selectedLotId ? parkingLots.find((x) => x.id === selectedLotId) ?? null : null);
	let selectedLotData = $derived(selectedLotId ? parkingLots.find((x) => x.id === selectedLotId) ?? null : null);
	let suggestion = $derived(suggestedLot());

	function suggestedLot() {
		const lots = filteredLots();
		if (lots.length === 0) return null;

		// Smart suggestion: low price + good availability + EV if requested
		const wantsEv = bookingVehicle === 'ev' || bookingNeedsCharging || filterMode === 'ev';
		const scored = lots
			.filter((l) => (!wantsEv ? true : l.ev))
			.map((l) => {
				const price = l.hourlyRate ?? 50;
				const avail = l.available ?? 0;
				const cap = Math.max(1, l.capacity);
				const availScore = Math.min(1, avail / cap);
				const priceScore = 1 / Math.max(1, price / 50);
				const dist = targetPos
					? haversineKm({ lat: l.lat, lon: l.lon }, targetPos)
					: userPos
						? haversineKm({ lat: l.lat, lon: l.lon }, userPos)
						: 3;
				const distScore = 1 / Math.max(1, dist);
				const score = priceScore * 0.45 + availScore * 0.35 + distScore * 0.2 + (l.ev ? 0.05 : 0);
				return { l, score };
			})
			.sort((a, b) => b.score - a.score);

		return scored[0]?.l ?? lots[0];
	}

	async function bookSelectedLot() {
		const lot = selectedLot();
		if (!lot) return;
		bookingOpen = true;
		bookingVehicle = lot.ev ? bookingVehicle : 'car';
		if (!lot.ev) bookingNeedsCharging = false;
		bookingSlot = null;
	}

	function optionPrices(lot: ParkingLot) {
		const base = lot.hourlyRate ?? 50;
		const surge = Math.max(0, Math.round(base * 0.18));
		const greenDiscount = lot.ev ? Math.round(base * 0.08) : 0;
		return [
			{ id: 'standard', label: 'Standard', perHour: base },
			{ id: 'flex', label: 'Flex', perHour: base + surge },
			{ id: 'green', label: 'Green Saver', perHour: Math.max(10, base - greenDiscount) },
		];
	}

	let selectedPriceId = $state<'standard' | 'flex' | 'green'>('standard');

	async function confirmBooking() {
		const lot = selectedLot();
		if (!lot) return;
		// #region agent log
		fetch('http://127.0.0.1:7919/ingest/1af756fc-e0ee-4494-aae6-fe6bb0d39dfb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d93485'},body:JSON.stringify({sessionId:'d93485',runId:'pre-fix',hypothesisId:'H5',location:'src/routes/dashboard/+page.svelte:confirmBooking',message:'confirm booking invoked',data:{lotId:lot.id,slot:bookingSlot,vehicle:bookingVehicle,duration:bookingDuration},timestamp:Date.now()})}).catch(()=>{});
		fetch('/api/debuglog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H5',location:'dashboard:+page.svelte',message:'confirmBooking invoked',data:{action:'confirmBooking',lotId:lot.id,slot:bookingSlot,tab}})}).catch(()=>{});
		// #endregion
		if ((lot.available ?? 0) <= 0) {
			showToast('No slots', 'Try another lot (or refresh).');
			return;
		}
		if ((bookingVehicle === 'ev' || bookingNeedsCharging) && !lot.ev) {
			showToast('EV charging not available', 'Pick an EV-enabled lot.');
			return;
		}

		const priceOpt = optionPrices(lot).find((o) => o.id === selectedPriceId) ?? optionPrices(lot)[0];
		const pricePerHour = priceOpt.perHour;

		bookingBusy = true;
		const result = await bookAction({
			lot,
			vehicleType: bookingVehicle,
			needsCharging: bookingNeedsCharging,
			slotNumber: bookingSlot,
			durationHours: bookingDuration,
			pricePerHour,
		});
		bookingBusy = false;
		if (result.ok) bookingOpen = false;
	}

	async function cancelBooking(id: string) {
		try {
			await fetch('/api/reservations', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'cancel', reservationId: id }),
			});
			await refreshReservationsAndStats();
			showToast('Cancelled', 'Reservation cancelled.');
		} catch {
			showToast('Could not cancel', 'Please try again.');
		}
	}

	function openReschedule(r: any) {
		rescheduleTarget = r;
		rescheduleDuration = Number(r.durationHours ?? 2);
		rescheduleSlot = r.slotNumber ?? null;
		reschedulePriceId = 'standard';
		const start = new Date(Number(r.startTime ?? Date.now()));
		const yyyy = start.getFullYear();
		const mm = String(start.getMonth() + 1).padStart(2, '0');
		const dd = String(start.getDate()).padStart(2, '0');
		const hh = String(start.getHours()).padStart(2, '0');
		const mi = String(start.getMinutes()).padStart(2, '0');
		rescheduleStart = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
		rescheduleOpen = true;
	}

	async function submitReschedule() {
		const r = rescheduleTarget;
		if (!r) return;
		const startTime = new Date(rescheduleStart).getTime();
		if (!Number.isFinite(startTime)) {
			showToast('Invalid time', 'Pick a start time.');
			return;
		}
		const lot = parkingLots.find((p) => p.id === r.lotId);
		const fakeLot: ParkingLot = lot ?? {
			id: r.lotId,
			name: r.lotName,
			area: r.lotArea,
			lat: r.lat,
			lon: r.lon,
			capacity: 50,
			ev: r.vehicleType === 'ev',
			hourlyRate: r.pricePerHour,
			available: 1,
		};
		const opt = optionPrices(fakeLot).find((o) => o.id === reschedulePriceId) ?? optionPrices(fakeLot)[0];
		const pricePerHour = opt.perHour;

		rescheduleBusy = true;
		try {
			const res = await fetch('/api/reservations', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'reschedule',
					reservationId: r.id,
					startTime,
					durationHours: rescheduleDuration,
					pricePerHour,
					slotNumber: rescheduleSlot,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Reschedule failed');
			rescheduleOpen = false;
			await refreshReservationsAndStats();
			showToast('Rescheduled', 'Updated time and price.');
		} catch (e: any) {
			showToast('Could not reschedule', String(e?.message ?? 'Try again.'));
		} finally {
			rescheduleBusy = false;
		}
	}

	async function startSession(r: any) {
		try {
			await fetch('/api/reservations', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'start_session', reservationId: r.id }),
			});
			await refreshReservationsAndStats();
			showToast('Session started', 'Live meter is running.');

			// notify near end (5 minutes before)
			const endAt = Number(r.startTime) + Number(r.durationHours) * 60 * 60 * 1000;
			const ms = Math.max(0, endAt - Date.now() - 5 * 60 * 1000);
			if ('Notification' in window) {
				try {
					if (Notification.permission === 'default') await Notification.requestPermission();
					if (Notification.permission === 'granted') {
						setTimeout(() => {
							new Notification('Parking almost done', { body: '5 minutes remaining. Extend or wrap up.' });
						}, ms);
					}
				} catch {
					// ignore
				}
			}
		} catch {
			showToast('Could not start', 'Try again.');
		}
	}

	async function stopSession(r: any) {
		try {
			const res = await fetch('/api/reservations', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'stop_session', reservationId: r.id }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Could not stop');
			await refreshReservationsAndStats();
			showToast('Session ended', data?.actualTotalPrice ? `Final: ₹${data.actualTotalPrice}` : 'Stopped.');
		} catch (e: any) {
			showToast('Could not stop', String(e?.message ?? 'Try again.'));
		}
	}
</script>

<svelte:head>
	<title>Dashboard | Smart Park</title>
</svelte:head>

<div class="min-h-screen">
	<header class="sticky top-0 z-40 sp-stickyHeader">
		<div class="sp-shell pt-4 sm:pt-6 pb-3">
		<div class="sp-topbar sp-pop">
			<div class="flex items-center gap-3 min-w-0">
				<div
					class="h-10 w-10 rounded-2xl grid place-items-center font-extrabold"
					style="background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand)); color: #062112;"
				>
					SP
				</div>
				<div class="min-w-0">
					<div class="font-extrabold tracking-tight text-[15px] leading-tight font-display">Smart Park</div>
					<div class="text-[12px] leading-tight" style="color: var(--sp-muted);">
						Pune parking map and instant booking
					</div>
				</div>
			</div>

			<div class="hidden sm:flex items-center">
				<div class="sp-seg">
				<button class={'sp-seg-btn ' + (tab === 'home' ? 'is-active' : '')} type="button" onclick={() => (tab = 'home')}>
					Home
				</button>
				<button class={'sp-seg-btn ' + (tab === 'map' ? 'is-active' : '')} type="button" onclick={() => (tab = 'map')}>
					Map
				</button>
				<button class={'sp-seg-btn ' + (tab === 'bookings' ? 'is-active' : '')} type="button" onclick={() => (tab = 'bookings')}>
					Bookings
				</button>
				<button class={'sp-seg-btn ' + (tab === 'profile' ? 'is-active' : '')} type="button" onclick={() => (tab = 'profile')}>
					Profile
				</button>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<div
					data-xp-badge
					class="sp-glass rounded-2xl px-3 py-2 text-xs font-extrabold hidden sm:flex items-center gap-2"
				>
					<span class="i-fa6-solid-fire-flame-curved"></span>
					<span>{stats?.streakDays ?? 0}d</span>
					<span class="opacity-40">•</span>
					<span class="i-fa6-solid-star"></span>
					<span>Lv {stats?.level ?? 1}</span>
					<span class="opacity-40">•</span>
					<span>{stats?.xp ?? 0} XP</span>
				</div>
				<div class="text-xs hidden md:block" style="color: var(--sp-muted);">
					{page.data.user?.email}
				</div>
				<form method="POST" action="/logout">
					<button class="sp-pill" type="submit">Log out</button>
				</form>
			</div>
		</div>
		</div>
	</header>

	<div class="sp-shell py-6 pb-24 sm:pb-6">
		{#if getActiveSession() !== null}
			{@const s = getActiveSession()!}
			<div class="sp-cockpit sp-pop">
				<div class="sp-cockpit__wrap">
					<div class="min-w-0">
						<div class="sp-cockpit__title truncate">
							<span class="i-fa6-solid-stopwatch mr-2"></span>Session running
						</div>
						<div class="sp-cockpit__sub">
							<span class="truncate">{s.r.lotName}</span>
							<span class="opacity-40">•</span>
							<span>elapsed {fmtHMS(s.elapsedMs)}</span>
							<span class="opacity-40">•</span>
							<span>remaining {fmtHMS(s.remainingMs)}</span>
						</div>
					</div>

					<div class="flex items-center gap-3 shrink-0">
						<div class="sp-cockpit__kpi">
							<div class="sp-cockpit__kpiLabel">Live cost</div>
							<div class="sp-cockpit__kpiValue">₹{s.liveCost}</div>
						</div>
						<button
							class="sp-btn sp-btn-primary px-4 py-2.5 text-sm font-extrabold"
							type="button"
							disabled={cockpitBusy}
							onclick={async () => {
								cockpitBusy = true;
								try {
									await stopSession(s.r);
								} finally {
									cockpitBusy = false;
								}
							}}
						>
							{cockpitBusy ? 'Stopping…' : 'Stop'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if tab === 'home'}
			<section class="sp-section sp-pop">
				<div class="flex flex-wrap items-center gap-3 justify-between">
					<div>
						<div class="sp-chip">
							<span class="i-fa6-solid-bolt"></span>
							Now serving
						</div>
						<div class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
							Your parking streak starts today.
						</div>
						<div class="mt-1 text-sm" style="color: var(--sp-muted);">
							Earn XP for choosing cheaper, closer, and greener (EV) options.
						</div>
					</div>
					<div class="flex items-center gap-2">
						<button class="sp-btn sp-btn-primary px-4 py-2.5 text-sm" type="button" onclick={() => (tab = 'map')}>
							Find lots
						</button>
						<button class="sp-btn px-4 py-2.5 text-sm font-bold" type="button" onclick={() => (tab = 'bookings')}>
							My bookings
						</button>
						<button class="sp-btn px-4 py-2.5 text-sm font-extrabold" type="button" onclick={() => (parkingRushOpen = true)}>
							Play Parking Rush
						</button>
					</div>
				</div>

				<div class="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
					<div class="sp-kpi">
						<div class="flex items-center justify-between gap-3">
							<div class="text-xs font-bold" style="color: var(--sp-muted);">Level</div>
							<div class="sp-glass rounded-xl px-2 py-1 text-xs font-extrabold">
								<span class="i-fa6-solid-star mr-1"></span>Lv {stats?.level ?? 1}
							</div>
						</div>
						<div class="mt-2 text-2xl font-extrabold tracking-tight font-display">
							{stats?.xp ?? 0} XP
						</div>
						<div class="mt-2 h-2 rounded-full" style="background: color-mix(in srgb, var(--sp-border) 55%, transparent);">
							<div
								class="h-2 rounded-full"
								style="width: {Math.min(100, ((stats?.xp ?? 0) % 250) / 2.5)}%; background: linear-gradient(90deg, var(--sp-accent), var(--sp-brand));"
							></div>
						</div>
						<div class="mt-2 text-xs" style="color: var(--sp-muted);">
							{stats?.xp ?? 0} XP • next level in {250 - ((stats?.xp ?? 0) % 250)} XP
						</div>
					</div>
					<div class="sp-kpi">
						<div class="flex items-center justify-between gap-3">
							<div class="text-xs font-bold" style="color: var(--sp-muted);">Streak</div>
							<div class="sp-glass rounded-xl px-2 py-1 text-xs font-extrabold">
								<span class="i-fa6-solid-fire-flame-curved mr-1"></span>{stats?.streakDays ?? 0}d
							</div>
						</div>
						<div class="mt-2 text-2xl font-extrabold tracking-tight font-display">
							{stats?.streakDays ?? 0} days
						</div>
						<div class="mt-2 text-xs" style="color: var(--sp-muted);">
							Book once per day to keep the flame alive.
						</div>
					</div>
					<div class="sp-kpi">
						<div class="text-xs font-bold" style="color: var(--sp-muted);">Badges</div>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each (stats?.badges ?? []).slice(0, 6) as b (b)}
								<span class="sp-chip">{b}</span>
							{/each}
							{#if (stats?.badges ?? []).length === 0}
								<span class="text-sm" style="color: var(--sp-muted);">Book to unlock badges.</span>
							{/if}
						</div>
					</div>
				</div>

				{#if suggestion}
					{@const s = suggestion}
					<div class="mt-6 sp-glass rounded-2xl p-4 sm:p-5">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<div class="sp-chip">
								<span class="i-fa6-solid-robot"></span>
								Smart suggestion
							</div>
							<div class="mt-2 text-lg font-extrabold truncate font-display">{s.name}</div>
							<div class="text-sm truncate" style="color: var(--sp-muted);">
								{s.area} • ₹{s.hourlyRate ?? 50}/hr • {s.available ?? 0}/{s.capacity} slots
								{#if s.ev} • EV charging{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button
								class="sp-btn px-4 py-2.5 text-sm font-bold"
								type="button"
								onclick={() => {
									selectedLotId = s.id;
									tab = 'map';
									map?.setView([s.lat, s.lon], Math.max(map?.getZoom?.() ?? 13, 15), { animate: true });
								}}
							>
								View
							</button>
							<button
								class="sp-btn sp-btn-primary px-4 py-2.5 text-sm"
								type="button"
								onclick={() => {
									selectedLotId = s.id;
									tab = 'map';
									void bookSelectedLot();
								}}
							>
								Book
							</button>
						</div>
					</div>
					</div>
				{:else}
					<div class="mt-6 sp-glass rounded-2xl p-4 sm:p-5 text-sm" style="color: var(--sp-muted);">
						Loading lots…
					</div>
				{/if}
			</section>
		{/if}

		{#if tab === 'map'}
			<div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
				<aside class="sp-section sp-pop overflow-hidden">
					<div class="sp-sectionHead">
						<div>
							<div class="text-sm font-extrabold">
								<span class="i-fa6-solid-location-dot mr-2"></span>Choose and book
							</div>
							<div class="text-xs mt-1" style="color: var(--sp-muted);">
								Click a marker to select a lot. Click the map to set your target location.
							</div>
						</div>
						<div class="text-xs font-extrabold">
							<span
								class={'inline-flex items-center gap-2 ' +
									(status === 'connected'
										? 'text-emerald-500'
										: status === 'connecting'
											? 'text-amber-500'
											: 'text-rose-400')}
							>
								<span
									class={'h-2 w-2 rounded-full ' +
										(status === 'connected'
											? 'bg-emerald-500'
											: status === 'connecting'
												? 'bg-amber-500'
												: 'bg-rose-400')}
								></span>
								{status}
							</span>
						</div>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<button
							type="button"
							class={'sp-pill ' + (filterMode === 'all' ? 'sp-btn-primary' : '')}
							onclick={() => (filterMode = 'all')}
						>
							All
						</button>
						<button
							type="button"
							class={'sp-pill ' + (filterMode === 'available' ? 'sp-btn-primary' : '')}
							onclick={() => (filterMode = 'available')}
						>
							Available
						</button>
						<button
							type="button"
							class={'sp-pill ' + (filterMode === 'ev' ? 'sp-btn-primary' : '')}
							onclick={() => (filterMode = 'ev')}
						>
							EV priority
						</button>
						<button
							type="button"
							class="sp-pill"
							onclick={() => {
								targetPos = null;
								if (targetMarker) {
									try {
										map?.removeLayer?.(targetMarker);
									} catch {}
									targetMarker = null;
								}
							}}
						>
							Clear target
						</button>
					</div>

					<div class="mt-3 sp-inputRow">
						<span class="i-fa6-solid-magnifying-glass sp-inputIcon"></span>
						<input placeholder="Find by area, landmark or name…" bind:value={search} />
						{#if search}
							<button class="sp-chip" type="button" onclick={() => (search = '')}>Clear</button>
						{/if}
					</div>

					{#if errorMessage}
						<div class="mt-3 rounded-xl sp-glass px-4 py-3 text-sm" style="color: var(--sp-danger);">
							{errorMessage}
						</div>
					{/if}
					{#if lastUpdatedAt}
						<div class="mt-3 text-xs" style="color: var(--sp-muted);">Last update: {lastUpdatedAt}</div>
					{/if}

					<div class="mt-4 max-h-[calc(100vh-320px)] overflow-auto pr-1">
						{#each filteredLots().slice(0, 60) as lot (lot.id)}
							{@const dist = targetPos
								? haversineKm({ lat: lot.lat, lon: lot.lon }, targetPos)
								: userPos
									? haversineKm({ lat: lot.lat, lon: lot.lon }, userPos)
									: null}
							<button
								type="button"
								onclick={() => {
									selectedLotId = lot.id;
									map?.setView([lot.lat, lot.lon], Math.max(map?.getZoom?.() ?? 13, 15), { animate: true });
								}}
								class={'w-full text-left sp-glass rounded-2xl px-4 py-3 mb-3 hover:translate-y-[-1px] transition ' +
									(selectedLotId === lot.id ? 'ring-2 ring-emerald-400/50' : '')}
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<div class="text-sm font-extrabold truncate">{lot.name}</div>
										<div class="text-xs truncate mt-0.5" style="color: var(--sp-muted);">
											{lot.area}
											{#if dist !== null} • {dist.toFixed(1)} km{/if}
											{#if lot.ev} • EV charging{/if}
										</div>
									</div>
									<div class="shrink-0 text-right">
										<div class="text-sm font-extrabold">₹{lot.hourlyRate ?? 50}/hr</div>
										<div class="text-xs mt-1" style="color: var(--sp-muted);">
											{lot.available ?? 0}/{lot.capacity} slots
										</div>
									</div>
								</div>
							</button>
						{/each}
						{#if filteredLots().length === 0}
							<div class="p-4 text-sm" style="color: var(--sp-muted);">No matching lots.</div>
						{/if}
					</div>
				</aside>

				<section class="sp-section sp-pop overflow-hidden">
					<!-- Keep map unobstructed: controls + booking bar outside canvas -->
					<div class="sp-glass rounded-2xl px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2">
						<div class="text-xs font-extrabold">
							<span class="i-fa6-solid-map"></span>
							<span class="ml-2 hidden sm:inline">Leaflet + OpenStreetMap</span>
						</div>
						<div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full">
							<button
								type="button"
								class={'sp-pill pointer-events-auto whitespace-nowrap ' + (showHeat ? 'sp-btn-primary' : '')}
								onclick={async () => {
									showHeat = !showHeat;
									const L = (await import('leaflet')).default;
									updateHeat(L);
								}}
							>
								Heat
							</button>
							<button
								type="button"
								class={'sp-pill pointer-events-auto whitespace-nowrap ' + (pinMode === 'home' ? 'sp-btn-primary' : '')}
								onclick={() => (pinMode = pinMode === 'home' ? 'none' : 'home')}
							>
								Home
							</button>
							<button
								type="button"
								class={'sp-pill pointer-events-auto whitespace-nowrap ' + (pinMode === 'work' ? 'sp-btn-primary' : '')}
								onclick={() => (pinMode = pinMode === 'work' ? 'none' : 'work')}
							>
								Work
							</button>
							{#if boundsDirty}
								<button
									type="button"
									class="sp-btn sp-btn-primary px-3 py-2 text-xs pointer-events-auto whitespace-nowrap"
									onclick={() => {
										areaBounds = map?.getBounds?.() ?? null;
										boundsDirty = false;
									}}
								>
									Search this area
								</button>
							{/if}
							<button
								type="button"
								class="sp-pill pointer-events-auto whitespace-nowrap"
								onclick={() => (areaBounds = null)}
							>
								Clear area
							</button>
						</div>
					</div>

					<div class="mt-3 sp-map-shell relative rounded-2xl overflow-hidden">
						<div bind:this={mapContainer} class="absolute inset-0 z-0"></div>
						{#if !mapReady}
							<div class="absolute inset-0 z-30 grid place-items-center">
								<div class="sp-glass rounded-3xl px-6 py-5 sp-pop text-center max-w-[360px]">
									<div class="text-sm font-extrabold">Loading map…</div>
									<div class="text-xs mt-1" style="color: var(--sp-muted);">
										{mapInitError ? mapInitError : 'Preparing tiles and layers.'}
									</div>
									<button
										type="button"
										class="sp-btn sp-btn-primary px-4 py-2 text-xs mt-4"
										onclick={() => location.reload()}
									>
										Reload
									</button>
								</div>
							</div>
						{/if}
					</div>

					<div class="mt-3 sp-glass rounded-2xl px-3 py-2 sm:px-4 sm:py-3">
						{#if selectedLotData}
							{@const lot = selectedLotData}
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<div class="text-sm font-extrabold truncate">{lot.name}</div>
									{#if !mapBottomCollapsed}
										<div class="text-xs truncate mt-0.5" style="color: var(--sp-muted);">
											{lot.area} • {lot.available ?? 0}/{lot.capacity} slots
											{#if lot.ev} • EV charging{/if}
										</div>
									{:else}
										<div class="text-xs truncate mt-0.5" style="color: var(--sp-muted);">
											₹{lot.hourlyRate ?? 50}/hr • {lot.available ?? 0} slots
											{#if lot.ev} • EV{/if}
										</div>
									{/if}
								</div>
								<div class="shrink-0 text-right">
									<div class="flex items-center gap-2">
										<button
											class="sp-pill"
											type="button"
											onclick={() => (mapBottomCollapsed = !mapBottomCollapsed)}
											title="Toggle details"
										>
											{mapBottomCollapsed ? 'Details' : 'Less'}
										</button>
										<button
											class="sp-btn sp-btn-primary px-4 py-2 text-sm"
											type="button"
											onclick={bookSelectedLot}
										>
											Book
										</button>
									</div>
								</div>
							</div>
						{:else}
							<div class="text-sm" style="color: var(--sp-muted);">Select a lot to book.</div>
						{/if}
					</div>

					<div class="mt-4 sp-glass rounded-2xl p-4">
						<div class="text-sm font-extrabold">Realtime updates</div>
						<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
							{#each liveEvents.slice(0, 6) as ev (ev.timestamp + ev.lot.id)}
								<div class="sp-btn px-3 py-2 text-sm">
									<div class="font-extrabold truncate">{ev.lot.name}</div>
									<div class="text-xs mt-0.5" style="color: var(--sp-muted);">
										{ev.type === 'exit_detected' ? 'Availability updated' : 'Pricing updated'} • {new Date(
											ev.timestamp,
										).toLocaleTimeString()}
									</div>
								</div>
							{/each}
							{#if liveEvents.length === 0}
								<div class="text-sm" style="color: var(--sp-muted);">No updates yet.</div>
							{/if}
						</div>
					</div>
				</section>
			</div>
		{/if}

		{#if tab === 'bookings'}
			<section class="sp-section sp-pop">
				<div class="sp-sectionHead">
					<div>
						<div class="text-2xl font-extrabold tracking-tight font-display sp-sectionTitle">Your bookings</div>
						<div class="text-sm mt-1" style="color: var(--sp-muted);">
							Receipts, status, and quick actions.
						</div>
					</div>
					<div class="flex items-center gap-2">
						{#if quests?.quests}
							<button class="sp-btn px-4 py-2.5 text-sm font-bold" type="button" onclick={() => (tab = 'home')}>
								Quests
							</button>
						{/if}
						<button class="sp-btn px-4 py-2.5 text-sm font-bold" type="button" onclick={refreshReservationsAndStats}>
							Refresh
						</button>
					</div>
				</div>

				<div class="mt-5 grid gap-3">
					{#each reservations as r (r.id)}
						{@const isActive = r.sessionStatus === 'active'}
						{@const startedAt = r.sessionStartedAt ? Number(r.sessionStartedAt) : null}
						{@const elapsedMs = isActive && startedAt ? Math.max(0, activeNowMs - startedAt) : 0}
						{@const elapsedHr = elapsedMs / (60 * 60 * 1000)}
						{@const liveCost = isActive ? Math.max(0, Math.round(Number(r.pricePerHour) * elapsedHr)) : null}
						<div class="sp-glass rounded-2xl p-4">
							<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<div class="text-sm font-extrabold truncate">{r.lotName}</div>
										{#if isActive}
											<span class="sp-statusPill" data-tone="ok"><span class="sp-statusDot"></span>active</span>
										{:else if r.sessionStatus === 'completed'}
											<span class="sp-statusPill" data-tone="warn"><span class="sp-statusDot"></span>completed</span>
										{:else}
											<span class="sp-statusPill" data-tone="ok"><span class="sp-statusDot"></span>{r.status}</span>
										{/if}
									</div>
									<div class="text-xs mt-0.5 truncate" style="color: var(--sp-muted);">
										{r.lotArea} • {new Date(r.createdAt).toLocaleString()}
									</div>
									<div class="text-xs mt-2" style="color: var(--sp-muted);">
										{r.vehicleType === 'ev' ? 'EV' : 'Car'}
										{#if r.needsCharging} • Charging{/if}
										{#if r.slotNumber} • Slot #{r.slotNumber}{/if}
										• {new Date(r.startTime).toLocaleString()} • {r.durationHours}h
										• ₹{r.totalPrice}
									</div>
									{#if isActive}
										<div class="mt-2 text-xs font-extrabold" style="color: var(--sp-brand-2);">
											Session active • live cost ₹{liveCost}
										</div>
									{:else if r.sessionStatus === 'completed'}
										<div class="mt-2 text-xs font-extrabold" style="color: var(--sp-accent);">
											Session completed • final ₹{r.actualTotalPrice ?? r.totalPrice}
										</div>
									{/if}
								</div>
								<div class="shrink-0 sm:text-right">
									<div class="text-xs mt-1" style="color: var(--sp-muted);">Receipt</div>
									<div class="text-xs font-extrabold">{r.receiptCode}</div>
									<div class="mt-3 flex gap-2 justify-start sm:justify-end flex-wrap">
										<button
											class="sp-btn px-3 py-2 text-xs font-extrabold"
											type="button"
											onclick={() => {
												selectedLotId = r.lotId;
												tab = 'map';
												map?.setView([r.lat, r.lon], Math.max(map?.getZoom?.() ?? 13, 15), { animate: true });
											}}
										>
											View
										</button>
										<a
											class="sp-btn px-3 py-2 text-xs font-extrabold"
											href={`/api/reservations/${r.id}/receipt`}
											target="_blank"
											rel="noreferrer"
										>
											PDF
										</a>
										{#if r.status === 'confirmed'}
											<button
												class="sp-btn px-3 py-2 text-xs font-extrabold"
												type="button"
												disabled={r.sessionStatus === 'active'}
												onclick={() => openReschedule(r)}
											>
												Reschedule
											</button>
											{#if r.sessionStatus === 'not_started'}
												<button
													class="sp-btn sp-btn-primary px-3 py-2 text-xs font-extrabold"
													type="button"
													onclick={() => startSession(r)}
												>
													Start
												</button>
											{:else if r.sessionStatus === 'active'}
												<button
													class="sp-btn sp-btn-primary px-3 py-2 text-xs font-extrabold"
													type="button"
													onclick={() => stopSession(r)}
												>
													Stop
												</button>
											{/if}
											<button
												class="sp-btn px-3 py-2 text-xs font-extrabold"
												type="button"
												onclick={() => cancelBooking(r.id)}
											>
												Cancel
											</button>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
					{#if reservations.length === 0}
						<div class="sp-glass rounded-2xl p-5 text-sm" style="color: var(--sp-muted);">
							No bookings yet. Go to the Map tab and book your first lot to start earning XP.
						</div>
					{/if}
				</div>
			</section>
		{/if}

		{#if rescheduleOpen}
			<div class="fixed inset-0 z-50 grid place-items-center p-5">
				<button
					class="absolute inset-0"
					style="background: rgba(0,0,0,0.35);"
					type="button"
					onclick={() => !rescheduleBusy && (rescheduleOpen = false)}
					aria-label="Close reschedule dialog"
				></button>
				<div class="relative w-full max-w-lg sp-card p-5 sm:p-6 sp-pop">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="text-lg font-extrabold truncate">Reschedule booking</div>
							{#if rescheduleTarget}
								<div class="text-sm mt-1 truncate" style="color: var(--sp-muted);">
									{rescheduleTarget.lotName} • {rescheduleTarget.lotArea}
								</div>
							{/if}
						</div>
						<button class="sp-btn px-3 py-2 text-sm font-extrabold" type="button" onclick={() => (rescheduleOpen = false)}>
							Close
						</button>
					</div>

					{#if rescheduleTarget}
						{@const lot = parkingLots.find((p) => p.id === rescheduleTarget.lotId) ?? selectedLotData}
						<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div class="sp-glass rounded-2xl p-4">
								<div class="text-xs font-bold" style="color: var(--sp-muted);">Start time</div>
								<input class="mt-2 w-full sp-btn px-4 py-3 text-sm" type="datetime-local" bind:value={rescheduleStart} />
							</div>
							<div class="sp-glass rounded-2xl p-4">
								<div class="text-xs font-bold" style="color: var(--sp-muted);">Duration</div>
								<div class="mt-2 flex gap-2 flex-wrap">
									{#each [1, 2, 3, 4] as h (h)}
										<button type="button" class={'sp-pill ' + (rescheduleDuration === h ? 'sp-btn-primary' : '')} onclick={() => (rescheduleDuration = h)}>
											{h}h
										</button>
									{/each}
								</div>
							</div>
						</div>

						<div class="mt-3 sp-glass rounded-2xl p-4">
							<div class="text-xs font-bold" style="color: var(--sp-muted);">Slot</div>
							<div class="mt-3 flex items-center gap-2 flex-wrap">
								{#each [1, 2, 3, 4, 5, 6, 7, 8] as s (s)}
									<button type="button" class={'sp-pill ' + (rescheduleSlot === s ? 'sp-btn-primary' : '')} onclick={() => (rescheduleSlot = s)}>
										{s}
									</button>
								{/each}
								<button type="button" class="sp-pill" onclick={() => (rescheduleSlot = null)}>Auto</button>
							</div>
						</div>

						<div class="mt-3 sp-glass rounded-2xl p-4">
							<div class="text-xs font-bold" style="color: var(--sp-muted);">Price option</div>
							<div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
								{#if lot}
									{#each optionPrices(lot) as opt (opt.id)}
										<button type="button" class={'sp-btn px-3 py-3 text-left ' + (reschedulePriceId === opt.id ? 'sp-btn-primary' : '')} onclick={() => (reschedulePriceId = opt.id as typeof reschedulePriceId)}>
											<div class="text-xs font-extrabold">{opt.label}</div>
											<div class="mt-1 text-sm font-extrabold">₹{opt.perHour}/hr</div>
										</button>
									{/each}
								{:else}
									<div class="text-sm" style="color: var(--sp-muted);">Loading…</div>
								{/if}
							</div>
						</div>

						<div class="mt-4 flex items-center justify-end gap-3">
							<button class="sp-btn px-4 py-2.5 text-sm font-bold" type="button" onclick={() => (rescheduleOpen = false)} disabled={rescheduleBusy}>
								Cancel
							</button>
							<button class="sp-btn sp-btn-primary px-5 py-2.5 text-sm" type="button" onclick={submitReschedule} disabled={rescheduleBusy}>
								{rescheduleBusy ? 'Updating…' : 'Confirm changes'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if celebration}
		{#key burstKey}
			<BookingConfirmedOverlay receipt={celebration.receiptCode} />
		{/key}
		{/if}

		<ParkingRush
			open={parkingRushOpen}
			onClose={() => (parkingRushOpen = false)}
			onWin={({ score, timeMs }) => {
				showToast('Nice!', `Parking Rush complete • score ${score} • ${Math.round(timeMs / 100) / 10}s`);
			}}
		/>

		{#if tab === 'profile'}
			<section class="sp-section sp-pop">
				<div class="text-2xl font-extrabold tracking-tight">Account, preferences and security</div>
				<div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
					<div class="sp-glass rounded-2xl p-4">
						<div class="text-xs font-bold" style="color: var(--sp-muted);">Account</div>
						<div class="mt-1 text-sm font-extrabold">{page.data.user?.email}</div>
					</div>
					<div class="sp-glass rounded-2xl p-4">
						<div class="text-xs font-bold" style="color: var(--sp-muted);">Membership</div>
						<div class="mt-1 text-sm font-extrabold">Gold</div>
						<div class="mt-2 text-xs" style="color: var(--sp-muted);">
							Priority booking in high demand areas and faster support.
						</div>
					</div>
					<div class="sp-glass rounded-2xl p-4">
						<div class="text-xs font-bold" style="color: var(--sp-muted);">Vehicles</div>
						<div class="mt-2 flex gap-2 flex-wrap">
							<button
								type="button"
								class={'sp-pill ' + (bookingVehicle === 'car' ? 'sp-btn-primary' : '')}
								onclick={() => (bookingVehicle = 'car')}
							>
								Car
							</button>
							<button
								type="button"
								class={'sp-pill ' + (bookingVehicle === 'ev' ? 'sp-btn-primary' : '')}
								onclick={() => (bookingVehicle = 'ev')}
							>
								EV
							</button>
							<button
								type="button"
								class={'sp-pill ' + (bookingNeedsCharging ? 'sp-btn-primary' : '')}
								onclick={() => (bookingNeedsCharging = !bookingNeedsCharging)}
							>
								Needs charging
							</button>
						</div>
						<div class="mt-2 text-xs" style="color: var(--sp-muted);">
							EV + charging will prioritize EV-enabled lots.
						</div>
					</div>
					<div class="sp-glass rounded-2xl p-4">
						<div class="text-xs font-bold" style="color: var(--sp-muted);">Notifications</div>
						<div class="mt-1 text-sm font-extrabold">Realtime capacity alerts</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Mobile bottom nav (keeps dashboard feeling like an app) -->
		<nav class="sm:hidden fixed left-0 right-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3">
			<div class="sp-glass rounded-3xl px-2 py-2 flex items-center justify-between gap-2">
				<button
					type="button"
					class={'sp-pill flex-1 flex items-center justify-center gap-2 ' + (tab === 'home' ? 'sp-btn-primary' : '')}
					onclick={() => (tab = 'home')}
				>
					<span class="i-fa6-solid-house"></span><span class="text-sm font-extrabold">Home</span>
				</button>
				<button
					type="button"
					class={'sp-pill flex-1 flex items-center justify-center gap-2 ' + (tab === 'map' ? 'sp-btn-primary' : '')}
					onclick={() => (tab = 'map')}
				>
					<span class="i-fa6-solid-map-location-dot"></span><span class="text-sm font-extrabold">Map</span>
				</button>
				<button
					type="button"
					class={'sp-pill flex-1 flex items-center justify-center gap-2 ' + (tab === 'bookings' ? 'sp-btn-primary' : '')}
					onclick={() => (tab = 'bookings')}
				>
					<span class="i-fa6-solid-ticket"></span><span class="text-sm font-extrabold">Bookings</span>
				</button>
				<button
					type="button"
					class={'sp-pill flex-1 flex items-center justify-center gap-2 ' + (tab === 'profile' ? 'sp-btn-primary' : '')}
					onclick={() => (tab = 'profile')}
				>
					<span class="i-fa6-solid-user"></span><span class="text-sm font-extrabold">Profile</span>
				</button>
			</div>
		</nav>
	</div>

	{#if toast}
		<div class="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 sp-glass rounded-2xl px-4 py-3 sp-pop">
			<div class="text-sm font-extrabold">{toast.title}</div>
			{#if toast.message}
				<div class="text-xs mt-1" style="color: var(--sp-muted);">{toast.message}</div>
			{/if}
		</div>
	{/if}

	{#if undo}
		<div class="fixed left-1/2 -translate-x-1/2 bottom-20 z-50 sp-glass rounded-2xl px-4 py-3 sp-pop flex items-center gap-3">
			<div class="min-w-0">
				<div class="text-sm font-extrabold">{undo.title}</div>
				{#if undo.message}
					<div class="text-xs mt-0.5" style="color: var(--sp-muted);">{undo.message}</div>
				{/if}
			</div>
			<button
				type="button"
				class="sp-btn sp-btn-primary px-4 py-2 text-xs"
				onclick={async () => {
					const u = undo;
					undo = null;
					await u?.undo?.();
				}}
			>
				Undo
			</button>
		</div>
	{/if}

	{#if bookingOpen}
		<div class="fixed inset-0 z-50 grid place-items-center p-5">
			<button
				class="absolute inset-0"
				style="background: rgba(0,0,0,0.35);"
				type="button"
				onclick={() => !bookingBusy && (bookingOpen = false)}
				aria-label="Close booking dialog"
			></button>
			<div class="relative w-full max-w-lg sp-card p-5 sm:p-6 sp-pop">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="text-lg font-extrabold truncate">Reserve parking</div>
						{#if selectedLotData}
							{@const lot = selectedLotData}
							<div class="text-sm mt-1 truncate" style="color: var(--sp-muted);">
								{lot.name} • {lot.area} {#if lot.ev}• EV charging{/if}
							</div>
						{/if}
					</div>
					<button class="sp-btn px-3 py-2 text-sm font-extrabold" type="button" onclick={() => (bookingOpen = false)}>
						Close
					</button>
				</div>

				{#if selectedLotData}
					{@const lot = selectedLotData}
					{@const perHr = (optionPrices(lot).find((o) => o.id === selectedPriceId) ?? optionPrices(lot)[0]).perHour}
					<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div class="sp-glass rounded-2xl p-4">
							<div class="text-xs font-bold" style="color: var(--sp-muted);">Duration</div>
							<div class="mt-2 flex gap-2 flex-wrap">
								{#each [1, 2, 3, 4] as h (h)}
									<button
										type="button"
										class={'sp-pill ' + (bookingDuration === h ? 'sp-btn-primary' : '')}
										onclick={() => (bookingDuration = h)}
									>
										{h}h
									</button>
								{/each}
							</div>
						</div>
						<div class="sp-glass rounded-2xl p-4">
							<div class="text-xs font-bold" style="color: var(--sp-muted);">Vehicle</div>
							<div class="mt-2 flex gap-2 flex-wrap">
								<button
									type="button"
									class={'sp-pill ' + (bookingVehicle === 'car' ? 'sp-btn-primary' : '')}
									onclick={() => (bookingVehicle = 'car')}
								>
									Car
								</button>
								<button
									type="button"
									class={'sp-pill ' + (bookingVehicle === 'ev' ? 'sp-btn-primary' : '')}
									onclick={() => (bookingVehicle = 'ev')}
									disabled={!lot.ev}
								>
									EV
								</button>
								<button
									type="button"
									class={'sp-pill ' + (bookingNeedsCharging ? 'sp-btn-primary' : '')}
									onclick={() => (bookingNeedsCharging = !bookingNeedsCharging)}
									disabled={!lot.ev}
								>
									Charging
								</button>
							</div>
							{#if !lot.ev}
								<div class="text-xs mt-2" style="color: var(--sp-muted);">This lot does not support EV charging.</div>
							{/if}
						</div>
					</div>

					<div class="mt-3 sp-glass rounded-2xl p-4">
						<div class="text-xs font-bold" style="color: var(--sp-muted);">Pick a slot</div>
						<div class="mt-2 text-xs" style="color: var(--sp-muted);">
							Optional, but recommended to “lock” a specific slot.
						</div>
						<div class="mt-3 flex items-center gap-2 flex-wrap">
							{#each [1, 2, 3, 4, 5, 6, 7, 8] as s (s)}
								<button
									type="button"
									class={'sp-pill ' + (bookingSlot === s ? 'sp-btn-primary' : '')}
									onclick={() => (bookingSlot = s)}
								>
									{s}
								</button>
							{/each}
							<button
								type="button"
								class="sp-pill"
								onclick={() => (bookingSlot = null)}
							>
								Auto
							</button>
						</div>
					</div>

					<div class="mt-3 sp-glass rounded-2xl p-4">
						<div class="text-xs font-bold" style="color: var(--sp-muted);">Choose your price</div>
						<div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
							{#each optionPrices(lot) as opt (opt.id)}
								<button
									type="button"
									class={'sp-btn px-3 py-3 text-left ' + (selectedPriceId === opt.id ? 'sp-btn-primary' : '')}
									onclick={() => (selectedPriceId = opt.id as typeof selectedPriceId)}
								>
									<div class="text-xs font-extrabold">{opt.label}</div>
									<div class="mt-1 text-sm font-extrabold">₹{opt.perHour}/hr</div>
								</button>
							{/each}
						</div>
						<div class="mt-3 text-sm font-extrabold">
							Total: ₹{Math.round(perHr * bookingDuration)}
							<span class="text-xs ml-2" style="color: var(--sp-muted);">
								({bookingDuration}h × ₹{perHr}/hr)
							</span>
						</div>
					</div>

					<div class="mt-4 flex items-center justify-between gap-3">
						<div class="text-xs" style="color: var(--sp-muted);">
							Slots left: <span class="font-extrabold">{lot.available ?? 0}</span>
							{#if lastXpAwarded}
								<span class="ml-2">Last reward: <span class="font-extrabold">+{lastXpAwarded} XP</span></span>
							{/if}
						</div>
						<button
							class="sp-btn sp-btn-primary px-5 py-3 text-sm"
							type="button"
							onclick={confirmBooking}
							disabled={bookingBusy}
						>
							{bookingBusy ? 'Booking…' : 'Confirm booking'}
						</button>
					</div>
				{:else}
					<div class="mt-4 text-sm" style="color: var(--sp-muted);">No lot selected.</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
