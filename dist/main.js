"use strict";
const map = L.map('map').setView([35.681236, 139.767125], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
let allMarkers = [];
fetch('./data/places.json')
    .then(res => res.json())
    .then((places) => {
    const tagSet = new Set();
    places.forEach(p => p.tags.forEach(tag => tagSet.add(tag)));
    const tags = Array.from(tagSet);
    console.log("読み込んだタグ一覧:", tags);
    // フィルターボタンを生成
    const buttonContainer = document.getElementById("tag-buttons");
    tags.forEach(tag => {
        const button = document.createElement("button");
        button.textContent = tag;
        button.style.margin = "4px";
        button.onclick = () => {
            showMarkers(places.filter(p => p.tags.includes(tag)));
        };
        buttonContainer.appendChild(button);
    });
    // 全表示ボタンも追加
    const allBtn = document.createElement("button");
    allBtn.textContent = "すべて表示";
    allBtn.style.margin = "4px";
    allBtn.onclick = () => showMarkers(places);
    buttonContainer.prepend(allBtn);
    // 初回はすべて表示
    showMarkers(places);
});
function showMarkers(places) {
    // 既存マーカーを削除
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];
    // 新しいマーカーを追加
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
