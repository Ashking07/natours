/* eslint-disable */

// export const displayMap = locations => {
//   mapboxgl.accessToken =
//     'pk.eyJ1IjoiYXNod2lua2FwaWxlIiwiYSI6ImNtNjNoc2hqeDFiNmkycXNiaXlyZHlod2MifQ.QgN5JMzaTAfabguGy0Nz5g';

//   var map = new mapboxgl.Map({
//     container: 'map',
//     style: 'mapbox://styles/jonasschmedtmann/cjvi9q8jd04mi1cpgmg7ev3dy',
//     scrollZoom: false
//     // center: [-118.113491, 34.111745],
//     // zoom: 10,
//     // interactive: false
//   });

//   const bounds = new mapboxgl.LngLatBounds();

//   locations.forEach(loc => {
//     // Create marker
//     const el = document.createElement('div');
//     el.className = 'marker';

//     // Add marker
//     new mapboxgl.Marker({
//       element: el,
//       anchor: 'bottom'
//     })
//       .setLngLat(loc.coordinates)
//       .addTo(map);

//     // Add popup
//     new mapboxgl.Popup({
//       offset: 30
//     })
//       .setLngLat(loc.coordinates)
//       .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
//       .addTo(map);

//     // Extend map bounds to include current location
//     bounds.extend(loc.coordinates);
//   });

//   map.fitBounds(bounds, {
//     padding: {
//       top: 200,
//       bottom: 150,
//       left: 100,
//       right: 100
//     }
//   });
// };

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiYXNod2lua2FwaWxlIiwiYSI6ImNtNjJjMmVjajBtc2Eyam9oc2xocnBuenEifQ.ezlbkohSCvrKuXYAF_Ew1A';

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ashwinkapile/cm7h2e8gm001s01r89969hwb5',
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
