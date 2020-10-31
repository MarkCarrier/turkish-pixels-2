export async function setScene(renderer, context, contextStore) {
  if (context.scene === 'none') {
    return
  }

  console.log(`Changing scene to ${context.scene}`)
  let loader = new PIXI.Loader()
  loader.add('atlas3.json')
  loader.load(function (loader, resources) {
    let tilemap = new PIXI.tilemap.CompositeRectTileLayer(0, [
      resources['atlas3.json'].textures['medievalTile_58.png']
    ])
    renderer.stage.addChild(tilemap)
    let size = 128
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 7; j++) {
        tilemap.addFrame(
          resources['atlas3.json'].textures['medievalTile_58.png'],
          i * size,
          j * size
        )
        if (i % 2 == 1 && j % 2 == 1)
          tilemap.addFrame(
            resources['atlas3.json'].textures['medievalTile_44.png'],
            i * size,
            j * size
          )
      }

    // if you are lawful citizen, please use textures from the loader
    //let textures = resources.atlas.textures
    //tilemap.addFrame(textures['brick.png'], 2 * size, 2 * size)
    //tilemap.addFrame(textures['brick_wall.png'], 2 * size, 3 * size)

    //renderer.render(tilemap)
  })
}

export async function createCanvas(contextStore) {
  const minWidth = 300
  const minHeight = 500
  const resolutionFactor = Math.round(window.devicePixelRatio * 100) / 100

  const adaptedWidth =
    window.innerWidth > minWidth ? window.innerWidth : minWidth
  const adaptedHeigh =
    window.innerHeight > minHeight ? window.innerHeight : minHeight

  let app = new PIXI.Application({
    width: minWidth,
    height: minHeight,
    antialias: true,
    resolution: resolutionFactor
  })

  app.renderer.view.style.position = 'absolute'
  app.renderer.view.style.display = 'block'
  app.renderer.autoDensity = true
  app.renderer.resize(adaptedWidth, adaptedHeigh)

  contextStore.actions.setCanvasSettings({
    resolutionFactor,
    adaptedWidth,
    adaptedHeigh
  })

  document.body.appendChild(app.view)
  return app
}
