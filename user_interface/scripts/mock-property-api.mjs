import http from 'node:http';

const port = Number.parseInt(process.env.MOCK_API_PORT ?? '8080', 10);

const hotels = [
  {
    id: 'hotel-1',
    name: 'Andes Palace Hotel',
    city: 'Bogota',
    country: 'Colombia',
    pricePerNight: 420,
    currency: '$',
    rating: 4.8,
    photos: ['https://example.com/hotel-1.jpg'],
  },
  {
    id: 'hotel-2',
    name: 'Caribe Sunset Resort',
    city: 'Bogota',
    country: 'Colombia',
    pricePerNight: 280,
    currency: '$',
    rating: 4.4,
    photos: ['https://example.com/hotel-2.jpg'],
  },
  {
    id: 'hotel-3',
    name: 'Cordillera Suites',
    city: 'Medellin',
    country: 'Colombia',
    pricePerNight: 310,
    currency: '$',
    rating: 4.6,
    photos: ['https://example.com/hotel-3.jpg'],
  },
];

const propertyDetails = {
  'hotel-1': {
    id: 'hotel-1',
    name: 'Andes Palace Hotel',
    maxCapacity: 4,
    description: 'Modern stay in the heart of Bogota.',
    photos: ['https://example.com/hotel-1.jpg'],
    checkInTime: '15:00:00',
    checkOutTime: '11:00:00',
    adminGroupId: 'hotel-admins',
    amenities: [{ id: 'amen-1', description: 'Free WiFi' }],
    reviews: [{ id: 'rev-1', description: 'Great stay!', rating: 5, name: 'Ana' }],
  },
  'hotel-2': {
    id: 'hotel-2',
    name: 'Caribe Sunset Resort',
    maxCapacity: 3,
    description: 'Beachfront comfort with sunset views.',
    photos: ['https://example.com/hotel-2.jpg'],
    checkInTime: '15:00:00',
    checkOutTime: '11:00:00',
    adminGroupId: 'hotel-admins',
    amenities: [{ id: 'amen-2', description: 'Pool' }],
    reviews: [{ id: 'rev-2', description: 'Very good service.', rating: 4, name: 'Luis' }],
  },
};

const reservations = [
  {
    id: 'res-001',
    property_id: 'hotel-1',
    user_id: 'user-123',
    guests: 2,
    period_start: '2026-08-10',
    period_end: '2026-08-14',
    price: 620,
    status: 'PENDING',
    admin_group_id: 'hotel-admins',
    payment_reference: null,
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'res-002',
    property_id: 'hotel-2',
    user_id: 'user-123',
    guests: 1,
    period_start: '2026-09-03',
    period_end: '2026-09-05',
    price: 280,
    status: 'CONFIRMED',
    admin_group_id: 'hotel-admins',
    payment_reference: 'pay-001',
    created_at: '2026-07-02T14:30:00Z',
  },
];

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Email',
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...getCorsHeaders(),
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendJson(res, 400, { message: 'Bad request' });
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders());
    res.end();
    return;
  }

  if (pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (pathname === '/poc-properties/api/property') {
    const city = (url.searchParams.get('city') ?? '').trim().toLowerCase();
    const page = Number.parseInt(url.searchParams.get('page') ?? '0', 10);
    const size = Number.parseInt(url.searchParams.get('size') ?? '10', 10);

    const filtered = city
      ? hotels.filter((hotel) => (hotel.city ?? '').toLowerCase().includes(city))
      : hotels;

    const pageIndex = Number.isFinite(page) && page >= 0 ? page : 0;
    const pageSize = Number.isFinite(size) && size > 0 ? size : 10;
    const start = pageIndex * pageSize;
    const end = start + pageSize;

    sendJson(res, 200, filtered.slice(start, end));
    return;
  }

  const propertyMatch = pathname.match(/^\/poc-properties\/api\/property\/([^/]+)$/);
  if (propertyMatch) {
    const propertyId = decodeURIComponent(propertyMatch[1]);
    const detail = propertyDetails[propertyId];

    if (!detail) {
      sendJson(res, 404, { message: 'Property not found' });
      return;
    }

    sendJson(res, 200, detail);
    return;
  }

  if (pathname === '/booking/api/booking' || pathname === '/booking/api/booking/') {
    sendJson(res, 200, reservations);
    return;
  }

  sendJson(res, 404, { message: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Mock property API running on port ${port}`);
});
