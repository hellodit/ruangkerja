// CTM Field focus modality: Tab → keyboard (blue ring), pointer → mouse (gold border).
export default defineNuxtPlugin(() => {
  const root = document.documentElement
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      root.setAttribute('data-focus-mode', 'keyboard')
    }
  }, true)
  window.addEventListener('pointerdown', () => root.removeAttribute('data-focus-mode'), true)
})
