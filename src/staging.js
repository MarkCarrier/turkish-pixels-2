import { defer, interval, fromEvent, merge, of } from 'rxjs'
import {
  share,
  tap,
  map,
  withLatestFrom,
  filter,
  buffer,
  mergeAll,
  groupBy,
  distinctUntilChanged,
  mergeMap,
  reduce,
  scan,
  bufferTime,
  distinct
} from 'rxjs/operators'
import { animationFrameScheduler } from 'rxjs'
import { keyNames } from './keys.util'

export function setScene(renderer, gameState) {
  return new Promise((resolve, reject) => {
    if (gameState.scene === 'none') {
      console.log('No scene to render')
      return gameState
    }

    const gameState$ = of(gameState)

    var stats = new Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.dom)

    const atlasName = 'atlas3.json'
    const groundTileName = 'medievalTile_58.png'
    const unitTileName = 'medievalUnit_24.png'
    const tileSize = 128
    const resX = gameState.canvasSettings.resolutionX
    const resY = gameState.canvasSettings.resolutionY
    const playerHeight = 33
    const playerWidth = 48
    const playerOffsetX = resX / 2 - playerHeight / 2
    const playerOffsetY = resY / 2 - playerWidth / 2
    let tilemap = null
    let player = {
      x: 0,
      y: 0
    }

    console.log(`Changing scene to ${gameState.scene}`)
    let loader = new PIXI.Loader()
    loader.add(atlasName)

    const keyDowns$ = fromEvent(document, 'keydown').pipe(
      map((e) => ({ code: e.keyCode, direction: 'down' }))
    )

    const keyUps$ = fromEvent(document, 'keyup').pipe(
      map((e) => ({ code: e.keyCode, direction: 'up' }))
    )

    const keyHolds$ = merge(keyDowns$, keyUps$).pipe(
      scan((acc, next) => {
        let newAcc = acc.filter((v) => v !== next.code)
        if (next.direction == 'down') return newAcc.concat(next.code)
        else return newAcc
      }, []),
      distinctUntilChanged(
        (left, right) =>
          left.length === right.length &&
          left.reduce((acc, next, index) => acc && next === right[index])
      )
    )

    loader.load(setup)

    function setup(loader, resources) {
      tilemap = createTileMap(resources)
      const atlasTextures = resources[atlasName].textures
      drawGroundTiles(atlasTextures)
      addPlayer(atlasTextures)
      const prepareNextFrame = createFramemaker(atlasTextures)

      let frames$ = buildAnimationFrameClock().pipe(
        withLatestFrom(keyHolds$, gameState$),
        map(([deltaTime, keysDown, gameState]) =>
          prepareNextFrame(deltaTime, gameState, keysDown)
        )
      )

      frames$.subscribe(
        () => {},
        (error) => reject(error),
        () => {
          resolve()
        }
      )
    }

    function createTileMap(atlasTextures) {
      let tilemap = new PIXI.tilemap.CompositeRectTileLayer(
        0,
        atlasTextures[groundTileName]
      )
      renderer.stage.addChild(tilemap)
      return tilemap
    }

    function drawGroundTiles(atlasTextures) {
      const numberOfTilesX = parseInt(resX / tileSize) + 10
      const numberOfTilesY = parseInt(resY / tileSize) + 10
      tilemap.clear()
      for (let x = -numberOfTilesX; x <= numberOfTilesX; x++) {
        for (let y = -numberOfTilesY; y <= numberOfTilesY; y++) {
          tilemap.addFrame(
            atlasTextures[groundTileName],
            x * tileSize,
            y * tileSize
          )
        }
      }
      let groundOffsetX = player.x % tileSize
      let groundOffsetY = player.y % tileSize
      tilemap.position.set(
        playerOffsetX + player.x - groundOffsetX,
        playerOffsetY + player.y - groundOffsetY
      )
    }

    function addPlayer(atlasTextures) {
      let playerTexture = atlasTextures[unitTileName]
      let playerSprite = new PIXI.Sprite(playerTexture)
      playerSprite.x = playerOffsetX
      playerSprite.y = playerOffsetY
      renderer.stage.addChild(playerSprite)
    }

    function buildAnimationFrameClock() {
      return defer(() => {
        let startOfPreviousFrame = animationFrameScheduler.now()
        let startOfThisFrame
        return interval(0, animationFrameScheduler).pipe(
          tap(() => (startOfThisFrame = animationFrameScheduler.now())),
          map(() => startOfThisFrame - startOfPreviousFrame),
          tap(() => (startOfPreviousFrame = startOfThisFrame)),
          share()
        )
      })
    }

    function createFramemaker(atlasTextures) {
      const makeFrame = (deltaTime, state, inputState) => {
        stats.begin()
        if (
          player.x % (10 * tileSize) === 0 ||
          player.y % (10 * tileSize) === 0
        ) {
          drawGroundTiles(atlasTextures)
        }

        if (inputState.indexOf(keyNames.up_arrow) !== -1) player.y -= 4
        else if (inputState.indexOf(keyNames.down_arrow) !== -1) player.y += 4

        if (inputState.indexOf(keyNames.left_arrow) !== -1) player.x -= 4
        else if (inputState.indexOf(keyNames.right_arrow) !== -1) player.x += 4

        tilemap.pivot.set(player.x, player.y)
        //requestAnimationFrame(gameLoop)
        stats.end()

        return state
      }
      return makeFrame
    }
  })
}

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
    height: minHeight
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
