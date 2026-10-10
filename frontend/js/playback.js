const icons={
  playing:'<rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/>',
  paused:'<path d="M7 4.5a.8.8 0 0 1 1.2-.7l12 7.5a.8.8 0 0 1 0 1.4l-12 7.5a.8.8 0 0 1-1.2-.7z"/>'
};
export function paintPlayback(button,playing,labels={playing:'暂停演示',paused:'播放功能演示'}) {
  const state=playing?'playing':'paused';
  button.querySelector('span:first-child').innerHTML=`<svg class="playback-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${icons[state]}</svg>`;
  button.querySelector('span:last-child').textContent=labels[state];
  button.dataset.playing=String(playing);button.setAttribute('aria-pressed',String(playing));
}
