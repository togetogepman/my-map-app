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

// レイヤー用変数
let ankyomapLayer = null;
let routeLayer = null;
let spotLayer = null;

// 暗渠データ読み込み
fetch('data/ankyomap.geojson')
  .then(response => response.json())
  .then(data => {
    ankyomapLayer = L.geoJSON(data, {
      style: {
        color: '#0000ff',
        weight: 2,
        opacity: 0.8
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error('暗渠データの読み込みに失敗:', error);
  });

// ルートデータ読み込み
fetch('data/route.json')
  .then(response => response.json())
  .then(data => {
    routeLayer = L.geoJSON(data, {
      style: {
        color: '#ff0000',
        weight: 3,
        opacity: 0.9
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error('ルートデータの読み込みに失敗:', error);
  });

// スポットデータ読み込み
fetch('data/spot.json')
  .then(response => response.json())
  .then(data => {
    spotLayer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng);
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name || "スポット";
        const desc = feature.properties.description || "";
        layer.bindPopup(`<strong>${name}</strong><br>${desc}`);
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error('スポットデータの読み込みに失敗:', error);
  });

// トグル切り替え処理
document.getElementById('toggle-ankyomap').addEventListener('change', function () {
  if (this.checked) {
    if (ankyomapLayer) ankyomapLayer.addTo(map);
  } else {
    if (ankyomapLayer) map.removeLayer(ankyomapLayer);
  }
});

document.getElementById('toggle-route').addEventListener('change', function () {
  if (this.checked) {
    if (routeLayer) routeLayer.addTo(map);
  } else {
    if (routeLayer) map.removeLayer(routeLayer);
  }
});

document.getElementById('toggle-spot').addEventListener('change', function () {
  if (this.checked) {
    if (spotLayer) spotLayer.addTo(map);
  } else {
    if (spotLayer) map.removeLayer(spotLayer);
  }
});
