// ============================================================
// Shared Document Bundle Builders
// ============================================================
// Extracted from export-documents.ts so the per-document JSON export and
// the static-web-export flow share the exact same gathering logic.
// The returned shapes are byte-for-byte identical to the previous inline
// implementation (same `_meta`, same fields, same field order).
// ============================================================

export type DocType = 'trip' | 'destination' | 'listing';

// ============================================================
// Firestore Helpers
// ============================================================

export async function getCollectionDocs(collectionPath: string): Promise<Record<string, any>> {
	try {
		const snap = await firebase.firestore().collection(collectionPath).get();
		const result: Record<string, any> = {};
		snap.forEach((doc) => {
			result[doc.id] = doc.data();
		});
		return result;
	} catch {
		return {};
	}
}

export async function getDocument(docPath: string): Promise<Record<string, any> | null> {
	try {
		const snap = await firebase.firestore().doc(docPath).get();
		if (snap.exists) return snap.data();
		return null;
	} catch {
		return null;
	}
}

// ============================================================
// Document Builders
// ============================================================

/**
 * Build a single export document.
 *
 * Trip format:
 *   { _meta: { type, exportedAt, version, sourceId }, trip, accommodations?, transportation?, itinerary?, expenses?, destinations?, protected? }
 *
 * Destination format:
 *   { _meta: { type, exportedAt, version, sourceId }, destination }
 *
 * Listing format:
 *   { _meta: { type, exportedAt, version, sourceId }, listing, destinations? }
 */
export async function buildExportDocument(
	docId: string,
	docType: DocType,
	pin: string = '',
): Promise<Record<string, any> | null> {
	switch (docType) {
		case 'trip':
			return buildTripExport(docId, pin);
		case 'destination':
			return buildDestinationExport(docId);
		case 'listing':
			return buildListingExport(docId);
		default:
			return null;
	}
}

export async function buildTripExport(
	tripId: string,
	pin: string = '',
): Promise<Record<string, any> | null> {
	const tripData = await getDocument(`trips/${tripId}`);
	if (!tripData) {
		console.warn(`[document-bundle] Trip not found: ${tripId}`);
		return null;
	}

	const [accommodations, transportation, itinerary, expensesData] = await Promise.all([
		getCollectionDocs(`trips/${tripId}/accommodations`),
		getCollectionDocs(`trips/${tripId}/transportation`),
		getCollectionDocs(`trips/${tripId}/itinerary`),
		getDocument(`expenses/${tripId}`),
	]);

	const destinations = await fetchReferencedDestinations(tripData);

	const doc: Record<string, any> = {
		_meta: {
			type: 'trip',
			exportedAt: new Date().toISOString(),
			version: '1.0',
			sourceId: tripId,
		},
		trip: tripData,
	};

	if (Object.keys(accommodations).length > 0) doc.accommodations = accommodations;
	if (Object.keys(transportation).length > 0) doc.transportation = transportation;
	if (Object.keys(itinerary).length > 0) doc.itinerary = itinerary;
	if (expensesData) doc.expenses = expensesData;
	if (Object.keys(destinations).length > 0) doc.destinations = destinations;

	// Fetch protected data. The owner is authenticated and can read the
	// `protected/{tripId}` lookup doc, so the PIN is auto-resolved when it
	// isn't passed in — no user prompt is needed for owner-driven exports.
	const resolvedPin = pin || (isProtectedTrip(tripData) ? await resolveTripPin(tripId) : '');
	if (resolvedPin) {
		const protectedData = await fetchProtectedData(tripId, resolvedPin, tripData);
		if (protectedData) doc.protected = protectedData;
	}

	return doc;
}

export async function buildDestinationExport(
	destId: string,
): Promise<Record<string, any> | null> {
	const destData = await getDocument(`destinations/${destId}`);
	if (!destData) {
		console.warn(`[document-bundle] Destination not found: ${destId}`);
		return null;
	}

	return {
		_meta: {
			type: 'destination',
			exportedAt: new Date().toISOString(),
			version: '1.0',
			sourceId: destId,
		},
		destination: destData,
	};
}

export async function buildListingExport(
	listingId: string,
): Promise<Record<string, any> | null> {
	const listingData = await getDocument(`listings/${listingId}`);
	if (!listingData) {
		console.warn(`[document-bundle] Listing not found: ${listingId}`);
		return null;
	}

	const destinations = await fetchReferencedDestinations(listingData);

	const doc: Record<string, any> = {
		_meta: {
			type: 'listing',
			exportedAt: new Date().toISOString(),
			version: '1.0',
			sourceId: listingId,
		},
		listing: listingData,
	};

	if (Object.keys(destinations).length > 0) doc.destinations = destinations;

	return doc;
}

// ============================================================
// Protected Data
// ============================================================

/**
 * Whether a trip document uses PIN-protected storage.
 */
function isProtectedTrip(tripData: Record<string, any>): boolean {
	return !!tripData?.pin && tripData.pin !== 'no-pin';
}

/**
 * Resolve the actual PIN for a protected trip from the owner-readable
 * `protected/{tripId}` lookup document. Returns '' for no-pin trips or when
 * the lookup document is missing/unreadable.
 *
 * The owner already has read access to this lookup document
 * (`isOwnerDBProtected()` in firestore.rules), which is exactly what lets
 * the backup / JSON-export / static-export flows fetch protected data
 * without asking the user to type the PIN.
 */
export async function resolveTripPin(tripId: string): Promise<string> {
	const lookup = await getDocument(`protected/${tripId}`);
	return typeof lookup?.pin === 'string' ? lookup.pin : '';
}

/**
 * Fetch protected data for a trip using its PIN.
 * Reads:
 *   - trips/protected/{pin}/{tripId}  → reservation codes for accommodations & transportation
 *   - expenses/protected/{pin}/{tripId} → protected expenses (if expenses module is enabled)
 */
export async function fetchProtectedData(
	tripId: string,
	pin: string,
	tripData: Record<string, any>,
): Promise<Record<string, any> | null> {
	const protectedTripPath = `trips/protected/${pin}/${tripId}`;
	const protectedExpensesPath = `expenses/protected/${pin}/${tripId}`;

	const fetches: Promise<any>[] = [getDocument(protectedTripPath)];

	if (tripData?.modules?.expenses === true) {
		fetches.push(getDocument(protectedExpensesPath));
	}

	const [protectedTrip, protectedExpenses] = await Promise.all(fetches);

	if (!protectedTrip && !protectedExpenses) return null;

	const result: Record<string, any> = { pin };

	if (protectedTrip) result.trip = protectedTrip;
	if (protectedExpenses) result.expenses = protectedExpenses;

	return result;
}

// ============================================================
// Referenced Destinations
// ============================================================

export async function fetchReferencedDestinations(
	parentDoc: Record<string, any>,
): Promise<Record<string, any>> {
	const refs = parentDoc.destinationRefs || parentDoc.destinations;
	if (!refs || !Array.isArray(refs) || refs.length === 0) return {};

	const result: Record<string, any> = {};
	const fetches = refs.map(async (ref: any) => {
		const destId = ref.id || ref.destinationId;
		if (!destId) return;
		const data = await getDocument(`destinations/${destId}`);
		if (data) result[destId] = data;
	});

	await Promise.allSettled(fetches);
	return result;
}
