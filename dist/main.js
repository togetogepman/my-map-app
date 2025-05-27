"use strict";
const map = L.map('map').setView([35.681236, 139.767125], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
let allMarkers = [];
// ✅ マーカー表示関数（places: Place[] を受け取って表示）
function showMarkers(places) {
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];
    places.forEach(place => {
        const tagText = place.tags.map(tag => `<span style="background:#eee;padding:2px 4px;margin:2px;border-radius:4px;">${tag}</span>`).join(' ');
        const marker = L.marker([place.lat, place.lng])
            .addTo(map)
            .bindPopup(`
        <strong>${place.name}</strong><br>
        <a href="${place.url}" target="_blank">詳細を見る</a><br>
        ${tagText}
      `);
        allMarkers.push(marker);
    });
}
// ✅ 現在地取得後、600m以内のスポットを表示
map.locate({ setView: true, maxZoom: 16 });
map.on('locationfound', (e) => {
    const currentLatLng = e.latlng;
    // 現在地マーカー
    L.marker(currentLatLng)
        .addTo(map)
        .bindPopup('現在地')
        .openPopup();
    // 中心円（半径600m）
    L.circle(currentLatLng, {
        radius: 600,
        color: 'green',
        fillColor: '#0f0',
        fillOpacity: 0.05,
        weight: 2
    }).addTo(map);
    // ガイド円（100mごと）
    [100, 200, 300, 400, 500, 600].forEach(r => {
        L.circle(currentLatLng, {
            radius: r,
            color: 'rgba(0,255,0,0.2)',
            weight: 1,
            fillOpacity: 0
        }).addTo(map);
    });
    // JSON取得後、距離判定 → フィルタ表示
    fetch('./data/places.json')
        .then(res => res.json())
        .then((places) => {
        const nearby = places.filter(place => {
            const placeLatLng = L.latLng(place.lat, place.lng);
            const distance = map.distance(currentLatLng, placeLatLng);
            return distance <= 600;
        });
        showMarkers(nearby);
    });
});
map.on('locationerror', () => {
    alert('現在地の取得に失敗しました。ブラウザの位置情報設定をご確認ください。');
});
