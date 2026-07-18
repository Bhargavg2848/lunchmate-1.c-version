async function geocodeNominatim(destination: string): Promise<{ lon: number; lat: number }> {
  const userAgent = 'LunchmateDeliveryApp/1.0';
  // Add more context to the search string to help Nominatim find it
  const q = encodeURIComponent(destination + ', Kakinada, Andhra Pradesh, India');
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&addressdetails=0&featuretype=house&accept-language=en`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': userAgent, 'Accept': 'application/json' },
  });

  const data = await res.json();
  
  // If the specific address fails, try searching for just the Locality/Area
  if (!data || data.length === 0) {
     const broadSearch = encodeURIComponent(destination.split(',').pop()?.trim() + ', Kakinada');
     const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${broadSearch}&limit=1`);
     const fallbackData = await fallbackRes.json();
     
     if (!fallbackData || fallbackData.length === 0) {
       throw new Error('Nominatim could not find the location even with broad search');
     }
     return { lon: Number(fallbackData[0].lon), lat: Number(fallbackData[0].lat) };
  }

  return { lon: Number(data[0].lon), lat: Number(data[0].lat) };
}