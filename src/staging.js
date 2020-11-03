export async function setScene(renderer, contextStore) {
  contextStore.store$.subscribe((context) =>
    setSceneWithContext(renderer, context)
  )
}

async function setSceneWithContext(renderer, context) {
  if (context.scene === 'none') {
    console.log('No scene to render')
    return
  }

  const atlasName = 'atlas3.json'
  const groundTileName = 'medievalTile_58.png'
  const unitTileName = 'medievalUnit_24.png'
  const tileSize = 128
  const resX = context.canvasSettings.resolutionX
  const resY = context.canvasSettings.resolutionY
  const playerHeight = 33
  const playerWidth = 48
  const playerOffsetX = resX / 2 - playerHeight / 2
  const playerOffsetY = resY / 2 - playerWidth / 2
  let tilemap = null
  let player = {
    x: 0,
    y: 0
  }

  console.log(`Changing scene to ${context.scene}`)
  let loader = new PIXI.Loader()
  loader.add(atlasName)
  loader.load(setup)

  function setup(loader, resources) {
    tilemap = createTileMap(resources)
    drawGroundTiles()
    addPlayer(resources)

    gameLoop()
  }

  function createTileMap(resources) {
    let tilemap = new PIXI.tilemap.CompositeRectTileLayer(0, [
      resources[atlasName].textures[groundTileName]
    ])
    renderer.stage.addChild(tilemap)
    return tilemap
  }

  function drawGroundTiles() {
    const numberOfTilesX = parseInt(resX / tileSize) + 5
    const numberOfTilesY = parseInt(resY / tileSize) + 5
    for (let x = -numberOfTilesX; x <= numberOfTilesX; x++) {
      for (let y = -numberOfTilesY; y <= numberOfTilesY; y++) {
        tilemap.addFrame(groundTileName, x * tileSize, y * tileSize)
      }
    }
    let groundOffsetX = player.x % tileSize
    let groundOffsetY = player.y % tileSize
    tilemap.position.set(
      playerOffsetX + player.x - groundOffsetX,
      playerOffsetY + player.y - groundOffsetY
    )
  }

  function addPlayer(resources) {
    let playerTexture = resources[atlasName].textures[unitTileName]
    let playerSprite = new PIXI.Sprite(playerTexture)
    playerSprite.x = playerOffsetX
    playerSprite.y = playerOffsetY
    renderer.stage.addChild(playerSprite)
  }

  function gameLoop() {
    if (player.y % (10 * tileSize) === -0) {
      drawGroundTiles()
    }

    player.y -= -4
    tilemap.pivot.set(player.x, player.y)
    requestAnimationFrame(gameLoop)
  }
}

export async function createCanvas(contextStore) {
  const minWidth = 300
  const minHeight = 500
  const resolutionFactor = Math.round(window.devicePixelRatio * 100) / 100

  const resolutionX =
    window.innerWidth > minWidth ? window.innerWidth : minWidth
  const resolutionY =
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
  app.renderer.resize(resolutionX, resolutionY)

  contextStore.actions.setCanvasSettings({
    resolutionFactor,
    resolutionX,
    resolutionY
  })

  document.body.appendChild(app.view)
  return app
}
