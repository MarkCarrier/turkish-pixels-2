import {
  animationFrameScheduler,
  BehaviorSubject,
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

export function setScene(renderer, initialGameState) {
  return new Promise((resolve, reject) => {
    if (initialGameState.scene === 'none') {
      console.log('No scene to render')
      return initialGameState
    }
    console.log(`Changing scene to ${initialGameState.scene}`)

    const gameState$ = new BehaviorSubject({})
    gameState$.next({
      ...initialGameState,
      player: {
        x: 0,
        y: 0
      }
    })

    var stats = new Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.dom)

    const atlasName = 'atlas3.json'
    const groundTileNames = [
      'medievalTile_58.png',
      'medievalTile_01.png',
      'medievalTile_13.png',
      'medievalTile_14.png',
      'medievalTile_15.png',
      'medievalTile_16.png'
    ]
    const treeTileNames = new Array(8)
      .fill(0)
      .map((_, index) => `medievalTile_${index + 41}.png`)
    const unitTileName = 'medievalUnit_24.png'
    const tileSize = 128
    const canvasSize = {
      x: initialGameState.canvasSettings.resolutionX,
      y: initialGameState.canvasSettings.resolutionY
    }
    const playerHeight = 33
    const playerWidth = 48
    const playerWalkingSpeed = 0.4
    const playerOffset = {
      x: canvasSize.x / 2 - playerHeight / 2,
      y: canvasSize.y / 2 - playerWidth / 2
    }

    const numberOfOutOfScreenTiles = 6
    const totalNumberOfTilesToPaint = {
      x: parseInt(canvasSize.x / tileSize) + numberOfOutOfScreenTiles,
      y: parseInt(canvasSize.y / tileSize) + numberOfOutOfScreenTiles
    }

    let tilemap = null

    let loader = new PIXI.Loader()
    loader.add(atlasName)

    const keyDowns$ = fromEvent(document, 'keydown').pipe(
      map((e) => ({ code: e.keyCode, direction: 'down' }))
    )

    const keyUps$ = fromEvent(document, 'keyup').pipe(
      map((e) => ({ code: e.keyCode, direction: 'up' }))
    )

    const keyHolds$ = merge(keyDowns$, keyUps$, of({})).pipe(
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

    fromEvent(document, 'click')
      .pipe(
        map((mouseClick) => ({ x: mouseClick.clientX, y: mouseClick.clientY })),
        withLatestFrom(gameState$),
        map(([mouseClick, gameState]) =>
          processTargetClick(mouseClick, gameState)
        )
      )
      .subscribe((gameState) => gameState$.next(gameState))

    loader.load(setup)

    function setup(loader, resources) {
      tilemap = createTileMap(resources)
      const atlasTextures = resources[atlasName].textures
      addPlayer(atlasTextures)
      const makeFrame = createFramemaker(atlasTextures)

      const frames$ = buildAnimationFrameClock().pipe(
        withLatestFrom(keyHolds$, gameState$),
        map(([deltaTime, keyHolds, gameState]) =>
          makeFrame(deltaTime, gameState, keyHolds)
        ),
        tap((gameState) => gameState$.next(gameState))
      )

      frames$.subscribe(
        (gameState) => {
          window.gameState = gameState
        },
        (error) => reject(error),
        () => {
          resolve()
        }
      )
    }

    function createTileMap(atlasTextures) {
      const tilemap = new PIXI.tilemap.CompositeRectTileLayer(
        0,
        atlasTextures[groundTileNames[0]]
      )
      renderer.stage.addChild(tilemap)
      return tilemap
    }

    function processTargetClick(click, gameState) {
      const distanceToTargetX = click.x - playerOffset.x
      const distanceToTargetY = click.y - playerOffset.y
      const target = {
        x: gameState.player.x + distanceToTargetX,
        y: gameState.player.y + distanceToTargetY
      }

      return {
        ...gameState,
        target
      }
    }

    function paintGroundTiles(atlasTextures, gameState) {
      const groundOffset = {
        x: gameState.player.x % tileSize,
        y: gameState.player.y % tileSize
      }

      let repaintCount = 0
      if (gameState.lastRepaintPos)
        repaintCount = gameState.lastRepaintPos.count + 1

      tilemap.clear()
      for (
        let x = -totalNumberOfTilesToPaint.x;
        x <= totalNumberOfTilesToPaint.x;
        x++
      ) {
        for (
          let y = -totalNumberOfTilesToPaint.y;
          y <= totalNumberOfTilesToPaint.y;
          y++
        ) {
          const tilePosX = (gameState.player.x - groundOffset.x) / tileSize + x
          const tilePosY = (gameState.player.y - groundOffset.y) / tileSize + y

          let tileTexture
          const tileNameOverride =
            tilemapData.groundTileOverrides[`${tilePosX}/${tilePosY}`]

          if (tileNameOverride) {
            tileTexture = atlasTextures[tileNameOverride]
          } else {
            tileTexture = atlasTextures[groundTileNames[0]]
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
        playerOffset.x + gameState.player.x - groundOffset.x,
        playerOffset.y + gameState.player.y - groundOffset.y
      )

      return {
        ...gameState,
        lastRepaintPos: {
          ...gameState.player,
          count: repaintCount
        }
      }
    }

    function addPlayer(atlasTextures) {
      const playerTexture = atlasTextures[unitTileName]
      const playerSprite = new PIXI.Sprite(playerTexture)
      playerSprite.x = playerOffset.x
      playerSprite.y = playerOffset.y
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
      const makeFrame = (deltaTime, gameState, keyHolds) => {
        stats.begin()

        let nextState = {
          ...gameState
        }

        const distanceToTravel = deltaTime * playerWalkingSpeed

        if (repaintIsNeeded(gameState)) {
          nextState = paintGroundTiles(atlasTextures, nextState)
        }

        if (keyHolds.length) {
          nextState.target = null
          if (keyHolds.indexOf(keyNames.up_arrow) !== -1)
            nextState.player.y -= distanceToTravel
          else if (keyHolds.indexOf(keyNames.down_arrow) !== -1)
            nextState.player.y += distanceToTravel

          if (keyHolds.indexOf(keyNames.left_arrow) !== -1)
            nextState.player.x -= distanceToTravel
          else if (keyHolds.indexOf(keyNames.right_arrow) !== -1)
            nextState.player.x += distanceToTravel
        } else if (gameState.target) {
        }

        tilemap.pivot.set(nextState.player.x, nextState.player.y)
        stats.end()

        return nextState
      }
      return makeFrame
    }

    function repaintIsNeeded(gameState) {
      if (!gameState.lastRepaintPos) return true

      const paintedAreaLimits = {
        left:
          gameState.lastRepaintPos.x - tileSize * totalNumberOfTilesToPaint.x,
        right:
          gameState.lastRepaintPos.x + tileSize * totalNumberOfTilesToPaint.x,
        top:
          gameState.lastRepaintPos.y - tileSize * totalNumberOfTilesToPaint.y,
        bottom:
          gameState.lastRepaintPos.y + tileSize * totalNumberOfTilesToPaint.y
      }

      const buffer = tileSize

      if (gameState.player.x - playerOffset.x < paintedAreaLimits.left + buffer)
        return true
      if (
        gameState.player.x + playerOffset.x >
        paintedAreaLimits.right - buffer
      )
        return true
      if (gameState.player.y - playerOffset.y < paintedAreaLimits.top + buffer)
        return true
      if (
        gameState.player.y + playerOffset.y >
        paintedAreaLimits.bottom - buffer
      )
        return true

      return false
    }
  })
}
