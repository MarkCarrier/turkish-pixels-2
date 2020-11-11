import {
  distinctUntilChanged,
  pluck
} from 'rxjs/operators'
import { createCanvas } from './utils/canvas'
import { renderForestLand } from './forest-land/animation-setup'
import { getUserData } from './user'

start().catch((e) => {
  console.log('SOMETHING BAD HAPPENED')
  console.error(e)
})

async function start() {

  let userData = await getUserData()
  const [renderer, gameState] = await createCanvas({ userData })
  const gameState2 = await renderForestLand(renderer, gameState)
}

async function setupSceneUpdating(renderer, contextStore) {
  const sceneChange$ = contextStore.store$.pipe(
    pluck('scene'),
    distinctUntilChanged()
  )

  sceneChange$.subscribe((_) => {
    setScene(renderer, contextStore)
  })
}
