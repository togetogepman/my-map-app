declare const L: any;

// --- 1. 初期設定・DOM要素取得 ---
const map = L.map('map', {
  zoomControl: true
}).setView([35.681236, 139.767125], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 地図のサイズを再計算して表示崩れを防ぐ
setTimeout(() => {
  map.invalidateSize();
}, 100);


// ログ記録ボタン
const startButton = document.getElementById('start-recording') as HTMLButtonElement;
const stopButton = document.getElementById('stop-recording') as HTMLButtonElement;
const saveButton = document.getElementById('save-log') as HTMLButtonElement;
const loadButton = document.getElementById('load-log') as HTMLButtonElement;
const fileInput = document.getElementById('log-file-input') as HTMLInputElement;
const saveRouteButton = document.getElementById('save-route') as HTMLButtonElement;

// レイヤー切り替えチェックボックス
const toggleAnkyomap = document.getElementById('toggle-ankyomap') as HTMLInputElement;
const toggleRoute = document.getElementById('toggle-route') as HTMLInputElement;
const toggleSpot = document.getElementById('toggle-spot') as HTMLInputElement;
const toggleRouteFix = document.getElementById('toggle-route-fix') as HTMLInputElement;

// --- 2. データレイヤーの管理 ---
const layerGroups = {
  ankyomap: L.layerGroup(),
  route: L.featureGroup(), // FeatureGroup for draw controls
  spot: L.layerGroup(),
  log: L.layerGroup(), // 読み込んだログを表示するレイヤー
  route_fix: L.layerGroup()
};


// --- 3. データ読み込みとレイヤー作成 ---

// 3.1 暗渠 (GeoJSON)
fetch('./data/ankyomap.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: { color: '#0000ff', weight: 3, opacity: 0.7 }
    }).addTo(layerGroups.ankyomap);
  });

// 3.2 ルート (GeoJSON) - 編集可能レイヤーとして読み込み
fetch('./data/route.json')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: { color: 'green', weight: 5, opacity: 0.8 }
    }).eachLayer((layer: any) => {
        layerGroups.route.addLayer(layer);
    });
  });

// 3.3 スポット (GeoJSON)
fetch('./data/spot.json')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties && feature.properties.name) {
          layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
        }
      }
    }).addTo(layerGroups.spot);
  });

// 3.4 修正済みルート (GeoJSON)
fetch('./data/route_fix.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: { color: 'red', weight: 5, opacity: 0.8 }
    }).addTo(layerGroups.route_fix);
  });

// --- 4. レイヤー切り替え機能 ---
function toggleLayer(layer: any, isVisible: boolean) {
  if (isVisible) {
    map.addLayer(layer);
  } else {
    map.removeLayer(layer);
  }
}

// 初期状態でレイヤーを表示
toggleLayer(layerGroups.ankyomap, toggleAnkyomap.checked);
toggleLayer(layerGroups.route, toggleRoute.checked);
toggleLayer(layerGroups.spot, toggleSpot.checked);
toggleLayer(layerGroups.route_fix, toggleRouteFix.checked);

// チェックボックスのイベントリスナー
toggleAnkyomap.addEventListener('change', (e) => toggleLayer(layerGroups.ankyomap, (e.target as HTMLInputElement).checked));
toggleRoute.addEventListener('change', (e) => toggleLayer(layerGroups.route, (e.target as HTMLInputElement).checked));
toggleSpot.addEventListener('change', (e) => toggleLayer(layerGroups.spot, (e.target as HTMLInputElement).checked));
toggleRouteFix.addEventListener('change', (e) => toggleLayer(layerGroups.route_fix, (e.target as HTMLInputElement).checked));


// --- 5. GPSログ記録機能 ---
let isRecording = false;
let watchId: number | null = null;
let recordedPath: any[] = [];
let logPolyline: any | null = null;
let currentPositionMarker: any | null = null;

startButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
saveButton.addEventListener('click', saveLog);

function startRecording() {
  if (isRecording) return;
  isRecording = true;
  startButton.disabled = true;
  stopButton.disabled = false;
  saveButton.disabled = true;
  recordedPath = [];
  if (logPolyline) map.removeLayer(logPolyline);
  logPolyline = null;

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const newPosition = L.latLng(latitude, longitude);
      recordedPath.push(newPosition);
      map.setView(newPosition, 16);

      if (logPolyline) {
        logPolyline.setLatLngs(recordedPath);
      } else {
        logPolyline = L.polyline(recordedPath, { color: 'red', weight: 4 }).addTo(map);
      }

      if (currentPositionMarker) {
        currentPositionMarker.setLatLng(newPosition);
      } else {
        currentPositionMarker = L.marker(newPosition, {
          icon: L.divIcon({
            className: 'current-position-marker',
            html: '<div style="background-color: blue; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px #333;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(map).bindPopup('記録中...').openPopup();
      }
    },
    (error) => {
      console.error('Geolocation Error:', error);
      alert('位置情報の取��に失敗しました。');
      stopRecording();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  saveButton.disabled = recordedPath.length > 0;

  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;

  if (currentPositionMarker) {
    map.removeLayer(currentPositionMarker);
    currentPositionMarker = null;
  }
}

function saveLog() {
  if (recordedPath.length < 2) {
    alert('ログが短すぎます。');
    return;
  }
  const geojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { name: 'Walk Log', time: new Date().toISOString() },
      geometry: {
        type: 'LineString',
        coordinates: recordedPath.map((latlng: any) => [latlng.lng, latlng.lat])
      }
    }]
  };
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date();
  const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  a.href = url;
  a.download = `${formattedDate}-log.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  saveButton.disabled = true;
}

// --- 6. 初期化処理 ---
map.locate({ setView: true, maxZoom: 16 });
map.on('locationfound', (e: any) => {
  if (!isRecording) {
    L.marker(e.latlng)
      .addTo(map)
      .bindPopup('現在地')
      .openPopup();
  }
});
map.on('locationerror', () => {
  alert('現在地の取得に失敗しました。');
});

// --- 7. ログ読み込み機能 ---
loadButton.addEventListener('click', () => {
  fileInput.click(); // ボタンクリックで非表示のinputをトリガー
});

fileInput.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const content = e.target?.result;
      if (typeof content !== 'string') return;
      
      const geojson = JSON.parse(content);

      // 読み込んだログを青い線で表示
      L.geoJSON(geojson, {
        style: { color: '#00aaff', weight: 4, opacity: 0.75 }
      }).addTo(layerGroups.log);

      // ログレイヤーを地図に追加
      layerGroups.log.addTo(map);

    } catch (error) {
      console.error('ファイルの読み込みまたはパースに失敗しました。', error);
      alert('GeoJSONファイルの形式が正しくありません。');
    }
  };

  reader.readAsText(file);

  // 同じファイルを再度選択できるように、inputの値をクリアする
  input.value = '';
});


// --- 8. レイヤーの初期表示 ---
layerGroups.ankyomap.addTo(map);
layerGroups.route.addTo(map);
layerGroups.spot.addTo(map);
layerGroups.route_fix.addTo(map);

// --- 9. Leaflet.Draw ---
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: layerGroups.route,
        poly: {
            allowIntersection: false
        }
    },
    draw: {
        polygon: false,
        marker: false,
        circle: false,
        rectangle: false,
        circlemarker: false,
        polyline: {
            shapeOptions: {
                color: 'green',
                weight: 5,
                opacity: 0.8
            }
        }
    }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, (e: any) => {
    const layer = e.layer;
    layerGroups.route.addLayer(layer);
});

saveRouteButton.addEventListener('click', () => {
    const data = layerGroups.route.toGeoJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert('ルートがroute.jsonとして保存されました。');
});
