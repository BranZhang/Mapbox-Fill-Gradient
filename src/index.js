import './base.css';
import shadowLayer from "./shadowLayer";

mapboxgl.accessToken = 'pk.eyJ1IjoiYnJhbnpoYW5nIiwiYSI6ImNqM3FycmVldjAxZTUzM2xqMmllNnBjMHkifQ.Wv3ekbtia0BuUHGWVUGoFg';

const beforeMap = new mapboxgl.Map({
    container: 'before',
    style: 'mapbox://styles/mapbox/streets-v12',
    projection: 'mercator',
    center: [114.31548, 30.565478],
    zoom: 15.3
});

const afterMap = new mapboxgl.Map({
    container: 'after',
    style: 'mapbox://styles/mapbox/streets-v12',
    projection: 'mercator',
    hash: true,
    antialias: true,
    center: [114.31548, 30.565478],
    zoom: 15.3
});

const container = '#comparison-container';

const map = new mapboxgl.Compare(beforeMap, afterMap, container, {});

afterMap.on('load', () => {
    afterMap.setLayoutProperty('water-shadow', 'visibility', 'none');

    const layer = new shadowLayer({
        id: 'new-water-shadow'
    }, 'water-shadow');
    afterMap.addLayer(layer);
})
