import { createCanvas, setScene } from './staging'
import { getUserData } from './user-data'
import { BehaviorSubject, Subject, combineLatest } from 'rxjs'
import {
  tap,
  distinctUntilChanged,
  pluck,
  merge,
  scan,
  map,
  withLatestFrom,
  shareReplay
} from 'rxjs/operators'

start().catch((e) => {
  console.log('SOMETHING BAD HAPPENED')
  console.error(e)
})

async function start() {
  // const contextStore = createStateStore(
  //   { scene: 'none', userData: {} },
  //   {
  //     changeScene: (newScene) => (state) => ({ ...state, scene: newScene }),
  //     setUserData: (userData) => (state) => ({ ...state, userData }),
  //     setCanvasSettings: (canvasSettings) => (state) => ({
  //       ...state,
  //       canvasSettings
  //     })
  //   }
  // )
  //Logger('context', contextStore.store$)

  let userData = await getUserData()
  let [renderer, gameState] = await createCanvas({ userData })
  gameState.scene = 'start'
  gameState = await setScene(renderer, gameState)
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

function createStateStore(initial_state, reducers) {
  //From https://observablehq.com/@argyleink/redux-in-a-single-function-with-rxjs
  // pass in state and action functions
  let actionStreams = {}
  let actions = {}

  for (let action in reducers) {
    // pass in reducers keyed by action name
    let subject$ = new Subject() // subject for action/reducer data flow
    actionStreams[`${action}$`] = subject$.pipe(map(reducers[action])) // stash a reducer mapped to a stream
    actions[action] = (args) => subject$.next(args) // forward action params to reducer stream
  }

  let store$ = new BehaviorSubject(initial_state).pipe(
    merge(...Object.values(actionStreams)), // merge all reducers into single stream
    scan((state, reducer) => reducer(state)),
    shareReplay(1)
  ) // pass state to each reducer

  return { store$, actions }
}

function Logger(prefix, observable) {
  return observable
    .pipe(
      scan((prevState, nextState) => {
        console.groupCollapsed(`${prefix}:`)

        console.log(
          `%c prev state:`,
          `color: #999999; font-weight: bold`,
          prevState
        )
        console.log(
          `%c next state:`,
          `color: #4CAF50; font-weight: bold`,
          nextState
        )

        console.groupEnd()
        return nextState
      })
    )
    .subscribe()
}
