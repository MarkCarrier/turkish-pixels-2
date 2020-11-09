export async function createCanvas(gameState) {
  const minWidth = 300
  const minHeight = 500
  const resolutionFactor = null // Math.round(window.devicePixelRatio * 100) / 100

  const resolutionX =
    window.innerWidth > minWidth ? window.innerWidth : minWidth
  const resolutionY =
    window.innerHeight > minHeight ? window.innerHeight : minHeight

  let app = new PIXI.Application({
    width: minWidth,
    height: minHeight,
    antialias: true
  })

  app.renderer.view.style.position = 'absolute'
  app.renderer.view.style.display = 'block'
  app.renderer.autoDensity = true
  app.renderer.resize(resolutionX, resolutionY)

  document.body.appendChild(app.view)
  return [
    app,
    {
      ...gameState,
      canvasSettings: {
        resolutionFactor,
        resolutionX,
        resolutionY
      }
    }
  ]
}
