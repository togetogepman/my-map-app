"use strict";
// --- 1. 初期設定・DOM要素取得 ---
const map = L.map('map', {
    zoomControl: true
}).setView([35.681236, 139.767125], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
setTimeout(() => map.invalidateSize(), 100);
const toggleAnkyomap = document.getElementById('toggle-ankyomap');
const toggleRoute = document.getElementById('toggle-route');
const toggleSpot = document.getElementById('toggle-spot');
// --- 2. データレイヤーの管理 ---
const layerGroups = {
    ankyomap: L.layerGroup(),
    spot: L.layerGroup(),
};
const routeLayers = {};
let activeRouteLayer = null;
let activeRouteKey = null;
// --- 3. データ読み込みとレイヤー作成 ---
// 3.1 暗渠 (GeoJSON)
fetch('./data/ankyomap.geojson')
    .then(res => res.json())
    .then(data => {
    L.geoJSON(data, {
        style: { color: '#0000ff', weight: 3, opacity: 0.7 }
    }).addTo(layerGroups.ankyomap);
});
// 3.2 スポット (GeoJSON)
fetch('./data/spot.json')
    .then(res => res.json())
    .then(data => {
    L.geoJSON(data, {
        onEachFeature: (feature, layer) => {
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
            }
        }
    }).addTo(layerGroups.spot);
});
// 3.3 ルートの動的読み込みとプルダウン生成
fetch('./public/route-list.json')
    .then(res => res.json())
    .then(routeList => {
    const promises = routeList.map((route) => {
        const layer = L.featureGroup();
        routeLayers[route.name] = layer;
        return fetch(route.path)
            .then(res => res.json())
            .then(data => {
            if (data && data.features && data.features.length > 0 && data.features.every((f) => f.geometry.type === 'Point')) {
                const latlngs = data.features.map((f) => {
                    const [lng, lat] = f.geometry.coordinates;
                    return [lat, lng];
                });
                L.polyline(latlngs, { color: 'green', weight: 5, opacity: 0.8 }).addTo(layer);
            }
            else {
                L.geoJSON(data, {
                    style: { color: 'green', weight: 5, opacity: 0.8 }
                }).eachLayer((l) => {
                    layer.addLayer(l);
                });
            }
        });
    });
    Promise.all(promises).then(() => {
        const selector = document.getElementById('route-selector');
        routeList.forEach((route) => {
            const option = document.createElement('option');
            option.value = route.name;
            option.innerText = route.name;
            selector.appendChild(option);
        });
        selector.onchange = (e) => {
            setActiveRoute(e.target.value);
        };
        if (routeList.length > 0) {
            setActiveRoute(routeList[0].name);
        }
    });
});
function setActiveRoute(routeKey) {
    if (activeRouteKey === routeKey)
        return;
    if (activeRouteLayer) {
        map.removeLayer(activeRouteLayer);
    }
    activeRouteKey = routeKey;
    activeRouteLayer = routeLayers[routeKey];
    if (toggleRoute.checked) {
        map.addLayer(activeRouteLayer);
    }
}
// --- 4. レイヤー切り替え機能 ---
function toggleLayer(layer, isVisible) {
    if (!layer)
        return;
    if (isVisible) {
        if (!map.hasLayer(layer))
            map.addLayer(layer);
    }
    else {
        if (map.hasLayer(layer))
            map.removeLayer(layer);
    }
}
toggleLayer(layerGroups.ankyomap, toggleAnkyomap.checked);
toggleLayer(layerGroups.spot, toggleSpot.checked);
toggleAnkyomap.addEventListener('change', (e) => toggleLayer(layerGroups.ankyomap, e.target.checked));
toggleRoute.addEventListener('change', (e) => {
    if (activeRouteLayer) {
        toggleLayer(activeRouteLayer, e.target.checked);
    }
});
toggleSpot.addEventListener('change', (e) => toggleLayer(layerGroups.spot, e.target.checked));
// --- 5. 初期化処理 ---
map.locate({ setView: true, maxZoom: 16 });
map.on('locationfound', (e) => {
    L.marker(e.latlng)
        .addTo(map)
        .bindPopup('現在地')
        .openPopup();
});
map.on('locationerror', () => {
    alert('現在地の取得に失敗しました。');
});
// --- 8. レイヤーの初期表示 ---
layerGroups.ankyomap.addTo(map);
layerGroups.spot.addTo(map);
