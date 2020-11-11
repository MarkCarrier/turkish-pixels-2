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

import { createFramemaker } from './frame-generation'

/* This modules sets up the animation process and kicks off frame generation  */

export function renderForestLand(renderer, initialGameState) {
  return new Promise((resolve, reject) => {
    const gameState$ = new BehaviorSubject({})
    gameState$.next({
      ...initialGameState,
      player: {
        x: 0,
        y: 0
      }
    })

    const canvasSize = {
      x: initialGameState.canvasSettings.resolutionX,
      y: initialGameState.canvasSettings.resolutionY
    }
    const playerHeight = 33
    const playerWidth = 48
    const tileSize = 128
    const numberOfOutOfScreenTiles = 6

    const mapConfig = {
      atlasName: 'atlas3.json',
      groundTileNames: [
        'medievalTile_58.png',
        'medievalTile_01.png',
        'medievalTile_13.png',
        'medievalTile_14.png',
        'medievalTile_15.png',
        'medievalTile_16.png'
      ],
      treeTileNames: new Array(8)
        .fill(0)
        .map((_, index) => `medievalTile_${index + 41}.png`),
      unitTileName: 'medievalUnit_24.png',
      tileSize,
      canvasSize,
      playerWalkingSpeed: 0.4,
      playerOffset: {
        x: canvasSize.x / 2 - playerHeight / 2,
        y: canvasSize.y / 2 - playerWidth / 2
      },
      numberOfOutOfScreenTiles,
      totalNumberOfTilesToPaint: {
        x: parseInt(canvasSize.x / tileSize) + numberOfOutOfScreenTiles,
        y: parseInt(canvasSize.y / tileSize) + numberOfOutOfScreenTiles
      }
    }

    let loader = new PIXI.Loader()
    loader.add(mapConfig.atlasName)

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

    const mouseUps$ = fromEvent(document, 'mouseup').pipe(
      map((mouseEvent) => ({ x: mouseEvent.clientX, y: mouseEvent.clientY }))
    )
    const touchEnds$ = fromEvent(document, 'touchend').pipe(
      map((touchEvent) => ({
        x: touchEvent.changedTouches[0].pageX,
        y: touchEvent.changedTouches[0].pageY
      }))
    )

    merge(mouseUps$, touchEnds$)
      .pipe(
        withLatestFrom(gameState$),
        map(([locationClick, gameState]) =>
          processTargetClick(locationClick, gameState)
        )
      )
      .subscribe((gameState) => gameState$.next(gameState))

    loader.load(setup)

    function setup(loader, resources) {
      const tilemap = createTileMap(resources)
      const atlasTextures = resources[mapConfig.atlasName].textures
      const makeFrame = createFramemaker(
        renderer,
        tilemap,
        atlasTextures,
        mapConfig
      )

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
        atlasTextures[mapConfig.groundTileNames[0]]
      )
      renderer.stage.addChild(tilemap)
      return tilemap
    }

    function processTargetClick(click, gameState) {
      const distanceToTargetX = click.x - mapConfig.playerOffset.x
      const distanceToTargetY = click.y - mapConfig.playerOffset.y
      const mouseClickTarget = {
        x: gameState.player.x + distanceToTargetX,
        y: gameState.player.y + distanceToTargetY
      }

      return {
        ...gameState,
        mouseClickTarget
      }
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
  })
}
