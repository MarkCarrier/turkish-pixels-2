import {
  animationFrameScheduler,
  defer,
  fromEvent,
  interval,
  merge,
  of
} from 'rxjs'
import {
  distinctUntilChanged,
  map,
  scan,
  share,
  tap,
  withLatestFrom
} from 'rxjs/operators'

import { keyNames } from './keys.util'
import * as tilemapData from './tilemap-data.json'

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
    const treeTileNames = new Array(8)
      .fill(0)
      .map((_, index) => `medievalTile_${index + 41}.png`)
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
      const makeFrame = createFramemaker(atlasTextures)

      let frames$ = buildAnimationFrameClock().pipe(
        withLatestFrom(keyHolds$, gameState$),
        map(([deltaTime, keysDown, gameState]) =>
          makeFrame(deltaTime, gameState, keysDown)
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
      const numberOfTilesX = parseInt(resX / tileSize) + 6
      const numberOfTilesY = parseInt(resY / tileSize) + 6

      const groundOffsetX = player.x % tileSize
      const groundOffsetY = player.y % tileSize

      tilemap.clear()
      for (let x = -numberOfTilesX; x <= numberOfTilesX; x++) {
        for (let y = -numberOfTilesY; y <= numberOfTilesY; y++) {
          const tilePosX = (player.x - groundOffsetX) / tileSize + x
          const tilePosY = (player.y - groundOffsetY) / tileSize + y

          let tileTexture
          const tileNameOverride =
            tilemapData.groundTileOverrides[`${tilePosX}/${tilePosY}`]

          if (tileNameOverride) {
            tileTexture = atlasTextures[tileNameOverride]
          } else {
            tileTexture = atlasTextures[groundTileName]
          }
          tilemap.addFrame(tileTexture, x * tileSize, y * tileSize)

          const extraObjects = tilemapData.objects[`${tilePosX}/${tilePosY}`]
          if (extraObjects && extraObjects.length) {
            tilemap.addFrame(
              atlasTextures[extraObjects[0]],
              x * tileSize,
              y * tileSize
            )
          }
        }
      }

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
          inputState.length &&
          (player.x % (10 * tileSize) === 0 || player.y % (10 * tileSize) === 0)
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
