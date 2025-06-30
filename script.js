const DEBUG_MODE = true; // ← false にするとレーダー風UIになる

const map = L.map('map', {
  zoomControl: true,
  attributionControl: false,
  dragging: DEBUG_MODE,
  scrollWheelZoom: DEBUG_MODE,
  touchZoom: DEBUG_MODE,
  doubleClickZoom: DEBUG_MODE,
  boxZoom: DEBUG_MODE,
  keyboard: DEBUG_MODE
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// 現在地取得 → 中心に表示
map.locate({ setView: true, maxZoom: 18 });

map.on('locationfound', function (e) {
  const currentLatLng = e.latlng;
  map.setView(currentLatLng, map.getZoom());
  L.marker(currentLatLng).addTo(map);
});

map.on('locationerror', () => {
  alert('現在地の取得に失敗しました。');
});

// ズームボタン処理
document.getElementById('zoom-in').addEventListener('click', () => {
  map.zoomIn();
});
document.getElementById('zoom-out').addEventListener('click', () => {
  map.zoomOut();
});

// UI切り替え
if (DEBUG_MODE) {
  document.querySelector('.radar-overlay').style.display = 'none';
  document.getElementById('map').style.borderRadius = '0%';
} else {
  document.querySelector('.radar-overlay').style.display = 'block';
  document.getElementById('map').style.borderRadius = '50%';
}

// 暗渠データ（ankyomap.geojson）読み込み
fetch('data/ankyomap.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#0000ff',
        weight: 2,
        opacity: 0.8
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error('GeoJSONの読み込みに失敗:', error);
  });

// 🔴 ルートデータ（route.geojson）読み込み
fetch('data/route.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: 'red',
        weight: 4
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error('route.geojsonの読み込みに失敗:', error);
  });

// 📍 スポットデータ（spot.geojson）読み込み
fetch('data/spot.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng);
      },
      onEachFeature: function (feature, layer) {
        const name = feature.properties?.name || '名称なし';
        const desc = feature.properties?.description || '';
        layer.bindPopup(`<strong>${name}</strong><br>${desc}`);
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error('spot.geojsonの読み込みに失敗:', error);
  });
