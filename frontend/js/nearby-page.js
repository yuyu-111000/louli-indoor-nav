import {renderNearby} from './nearby.js';
renderNearby(document.querySelector('#nearbyList'),new URLSearchParams(location.search).get('venue')||'yintai-demo');
