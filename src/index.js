import './base.css';
import shadowLayer from "./shadowLayer";

mapboxgl.accessToken = 'pk.eyJ1IjoiYnJhbnpoYW5nIiwiYSI6ImNqM3FycmVldjAxZTUzM2xqMmllNnBjMHkifQ.Wv3ekbtia0BuUHGWVUGoFg';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    projection: 'mercator',
    hash: true,
    antialias: true,
    center: [-122.3914, 37.7599],
    zoom: 11
});
window.map = map;
window.shadowLayer = shadowLayer;

map.on('load', () => {
    map.setLayoutProperty('water-shadow', 'visibility', 'none');

    const layer = new shadowLayer({
        id: 'new-water-shadow'
    });
    map.addLayer(layer);
})
