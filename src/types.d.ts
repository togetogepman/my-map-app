import 'leaflet';

declare global {
  namespace GeoJSON {
    type FeatureCollection = L.GeoJSONOptions;
  }
}
