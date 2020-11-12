import { keyNames } from '../utils/keys'
import * as tilemapData from './tilemap-data.json'
import * as seedrandom from 'seedrandom'
import { buildLanguageDatabase } from './../language/language-database'
/* 
  This modules creates a "makeFrame" function that can be called at varying 
  framerates to create individual forest map frames 
*/

export function createFramemaker(renderer, tilemap, atlasTextures, mapConfig) {
  const wordDb = buildLanguageDatabase()

  const paintGroundTiles = (atlasTextures, gameState) => {
    const tileCenterOffset = {
      x: gameState.player.x % mapConfig.tileSize,
      y: gameState.player.y % mapConfig.tileSize
    }

    let repaintCount = 0
    if (gameState.lastRepaintPos)
      repaintCount = gameState.lastRepaintPos.count + 1

    tilemap.clear()
    for (
      let x = -mapConfig.totalNumberOfTilesToPaint.x;
      x <= mapConfig.totalNumberOfTilesToPaint.x;
      x++
    ) {
      for (
        let y = -mapConfig.totalNumberOfTilesToPaint.y;
        y <= mapConfig.totalNumberOfTilesToPaint.y;
        y++
      ) {
        const tilePos = {
          x: (gameState.player.x - tileCenterOffset.x) / mapConfig.tileSize + x,
          y: (gameState.player.y - tileCenterOffset.y) / mapConfig.tileSize + y
        }

        let tileTexture
        const tileNameOverride =
          tilemapData.groundTileOverrides[`${tilePos.x}/${tilePos.y}`]

        if (tileNameOverride) {
          tileTexture = atlasTextures[tileNameOverride]
        } else {
          tileTexture = atlasTextures[mapConfig.groundTileNames[0]]
        }
        tilemap.addFrame(
          tileTexture,
          x * mapConfig.tileSize,
          y * mapConfig.tileSize
        )

        const extraObjects = tilemapData.objects[`${tilePos.x}/${tilePos.y}`]
        if (extraObjects && extraObjects.length) {
          tilemap.addFrame(
            atlasTextures[extraObjects[0]],
            x * mapConfig.tileSize,
            y * mapConfig.tileSize
          )
        }

        if (tilePos.y < -5 || tilePos.y > 5) {
          const myrng = new seedrandom(`trees-${tilePos.x}/${tilePos.y}`)
          const p = myrng()
          if (p < 0.7) {
            const p2 = Math.floor(myrng() * mapConfig.treeTileNames.length)
            tilemap.addFrame(
              atlasTextures[mapConfig.treeTileNames[p2]],
              x * mapConfig.tileSize,
              y * mapConfig.tileSize
            )
          }

          const word = getWordForTile(tilePos)
          if (word) {
            let text = new PIXI.Text(word.turkish, {
              fontFamily: 'Arial',
              fontSize: 24,
              fontWeight: 'bold',
              fill: 0xffffff,
              align: 'center',
              dropShadow: true,
              dropShadowColor: 0x5d5d5d,
              dropShadowDistance: 9
            })
            text.resolution = 2
            text.updateText()
            tilemap.addFrame(
              text.texture,
              x * mapConfig.tileSize,
              y * mapConfig.tileSize
            )
          }
        }
      }
    }

    tilemap.position.set(
      mapConfig.playerOffset.x + gameState.player.x - tileCenterOffset.x,
      mapConfig.playerOffset.y + gameState.player.y - tileCenterOffset.y
    )

    return {
      ...gameState,
      lastRepaintPos: {
        ...gameState.player,
        count: repaintCount
      }
    }
  }

  const addPlayer = (atlasTextures) => {
    const playerTexture = atlasTextures[mapConfig.unitTileName]
    const playerSprite = new PIXI.Sprite(playerTexture)
    playerSprite.x = mapConfig.playerOffset.x
    playerSprite.y = mapConfig.playerOffset.y
    renderer.stage.addChild(playerSprite)
  }

  const calculateNextPositionFromKeys = (
    keyHolds,
    distanceToTravel,
    gameState
  ) => {
    let x = gameState.player.x
    let y = gameState.player.y
    if (keyHolds.indexOf(keyNames.up_arrow) !== -1)
      y = gameState.player.y - distanceToTravel
    else if (keyHolds.indexOf(keyNames.down_arrow) !== -1)
      y = gameState.player.y + distanceToTravel

    if (keyHolds.indexOf(keyNames.left_arrow) !== -1)
      x = gameState.player.x - distanceToTravel
    else if (keyHolds.indexOf(keyNames.right_arrow) !== -1)
      x = gameState.player.x + distanceToTravel

    return [x, y]
  }

  const calculateNextPositionFromMouseClickTarget = (
    distanceToTravel,
    gameState
  ) => {
    const distanceToTarget = {
      x: gameState.mouseClickTarget.x - gameState.player.x,
      y: gameState.mouseClickTarget.y - gameState.player.y
    }

    const totalDistanceToTarget = Math.sqrt(
      Math.pow(distanceToTarget.x, 2) + Math.pow(distanceToTarget.y, 2)
    )

    if (totalDistanceToTarget < distanceToTravel) {
      return null //close enough
    }

    const directionAngle = Math.atan(distanceToTarget.x / distanceToTarget.y)

    const displacement = {
      x: Math.sin(directionAngle) * distanceToTravel,
      y: Math.cos(directionAngle) * distanceToTravel
    }

    if (gameState.mouseClickTarget.y < gameState.player.y) {
      return [
        gameState.player.x - displacement.x,
        gameState.player.y - displacement.y
      ]
    } else {
      return [
        gameState.player.x + displacement.x,
        gameState.player.y + displacement.y
      ]
    }
  }

  const repaintIsNeeded = (gameState) => {
    if (!gameState.lastRepaintPos) return true

    const paintedAreaLimits = {
      left:
        gameState.lastRepaintPos.x -
        mapConfig.tileSize * mapConfig.totalNumberOfTilesToPaint.x,
      right:
        gameState.lastRepaintPos.x +
        mapConfig.tileSize * mapConfig.totalNumberOfTilesToPaint.x,
      top:
        gameState.lastRepaintPos.y -
        mapConfig.tileSize * mapConfig.totalNumberOfTilesToPaint.y,
      bottom:
        gameState.lastRepaintPos.y +
        mapConfig.tileSize * mapConfig.totalNumberOfTilesToPaint.y
    }

    const buffer = mapConfig.tileSize

    if (
      gameState.player.x - mapConfig.playerOffset.x <
      paintedAreaLimits.left + buffer
    )
      return true
    if (
      gameState.player.x + mapConfig.playerOffset.x >
      paintedAreaLimits.right - buffer
    )
      return true
    if (
      gameState.player.y - mapConfig.playerOffset.y <
      paintedAreaLimits.top + buffer
    )
      return true
    if (
      gameState.player.y + mapConfig.playerOffset.y >
      paintedAreaLimits.bottom - buffer
    )
      return true

    return false
  }

  const getWordForTile = (tilePos) => {
    if (tilePos.y >= -5 && tilePos.y <= 5) return null

    if (tilePos.x % 2 !== 0 || tilePos.y % 2 !== 0) return null

    const myrng = new seedrandom(`wordtiles-${tilePos.x}/${tilePos.y}`)
    const p = myrng()
    if (p > 0.2) {
      return null
    } else {
      const p2 = Math.floor(myrng() * wordDb.words.all.length)
      return wordDb.words.all[p2]
    }
  }

  const buildWordBox = (labelText,boxWidth,boxHeight) => {
    let wordBox = new PIXI.Container()
    let graphics = new PIXI.Graphics()
    graphics.beginFill(0x2c3e50, 0.2)
    graphics.drawRoundedRect(0, 0, boxWidth, boxHeight, 10)
    graphics.endFill()
    wordBox.addChild(graphics)
    let text = new PIXI.Text(labelText, {
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0xffffff,
      align: 'center'
    })
    text.resolution = 2
    text.x = boxWidth / 2 - text.width / 2
    text.y = boxHeight / 2 - text.height / 2
    wordBox.addChild(text)    

    return wordBox
  }

  const displayWordTranslations = (word, gameState) => {
    const boxWidth = 100
    const boxHeight = 50
    let wordBox1 = buildWordBox(word.english,boxWidth,boxHeight)
    wordBox1.x = mapConfig.playerOffset.x - boxWidth - 50
    wordBox1.y = mapConfig.playerOffset.y + boxHeight / 2

    let wordBox2 = buildWordBox(wordDb.words.all[9].english,boxWidth,boxHeight)
    wordBox2.x = mapConfig.playerOffset.x + 50
    wordBox2.y = mapConfig.playerOffset.y + boxHeight / 2

    let wordBox3 = buildWordBox(wordDb.words.all[23].english,boxWidth,boxHeight)
    wordBox3.x = mapConfig.playerOffset.x - boxWidth / 2
    wordBox3.y = mapConfig.playerOffset.y - 50

    let wordBox4= buildWordBox(wordDb.words.all[33].english,boxWidth,boxHeight)
    wordBox4.x = mapConfig.playerOffset.x - boxWidth / 2
    wordBox4.y = mapConfig.playerOffset.y + 50 + boxHeight

    renderer.stage.addChild(wordBox1)
    renderer.stage.addChild(wordBox2)
    renderer.stage.addChild(wordBox3)
    renderer.stage.addChild(wordBox4)
  }

  const makeFrame = (deltaTime, gameState, keyHolds, tileArrivals) => {
    stats.begin()

    let nextState = {
      ...gameState
    }

    const distanceToTravel = deltaTime * mapConfig.playerWalkingSpeed

    if (repaintIsNeeded(gameState)) {
      nextState = paintGroundTiles(atlasTextures, nextState)
    }

    let tileWordToActivate = null
    if (tileArrivals.length) {
      tileWordToActivate = getWordForTile(tileArrivals[0])
    }

    if (tileWordToActivate) {
      displayWordTranslations(tileWordToActivate, gameState)
      nextState.wordChallengeActive = true
    } else if(!gameState.wordChallengeActive) {
      let nextPosition
      if (keyHolds.length) {
        nextState.mouseClickTarget = null
        nextPosition = calculateNextPositionFromKeys(
          keyHolds,
          distanceToTravel,
          gameState
        )
      } else if (gameState.mouseClickTarget) {
        nextPosition = calculateNextPositionFromMouseClickTarget(
          distanceToTravel,
          gameState
        )
        if (!nextPosition) nextState.mouseClickTarget = null
      }

      if (nextPosition) {
        tilemap.pivot.set(nextPosition[0], nextPosition[1])
        nextState.player.x = nextPosition[0]
        nextState.player.y = nextPosition[1]
      }
    }
    stats.end()

    return nextState
  }

  var stats = new Stats()
  stats.showPanel(0)
  document.body.appendChild(stats.dom)
  addPlayer(atlasTextures)

  return makeFrame
}
