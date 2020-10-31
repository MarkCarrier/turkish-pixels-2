import { createCanvas, setScene } from './staging'
import { getUserData } from './user-data'
import { BehaviorSubject, Subject, combineLatest } from 'rxjs'
import { tap, distinct, pluck, merge, scan, map } from 'rxjs/operators'

start().catch((e) => {
  console.log('SOMETHING BAD HAPPENED')
  console.error(e)
})

async function start() {
  const contextStore = RxReduxStore(
    { scene: 'none', userData: {} },
    {
      changeScene: (newScene) => (state) => ({ ...state, scene: newScene }),
      setUserData: (userData) => (state) => ({ ...state, userData }),
      setRenderer: (renderer) => (state) => ({ ...state, renderer }),
      setCanvasSettings: (canvasSettings) => (state) => ({
        ...state,
        canvasSettings
      })
    }
  )
  Logger('context', contextStore.store$)
  const userData = await getUserData()
  contextStore.actions.setUserData(userData)
  const renderer = await createCanvas(contextStore)
  await setupSceneUpdating(renderer, contextStore)
  contextStore.actions.changeScene('start')
}

async function setupSceneUpdating(renderer, contextStore) {
  const sceneChange$ = contextStore.store$.pipe(pluck('scene'), distinct())

  combineLatest([sceneChange$, contextStore.store$]).subscribe(
    ([newScene, context]) => {
      setScene(renderer, context, contextStore)
    }
  )
}

function RxReduxStore(initial_state, reducers) {
  // pass in state and action functions
  let streams = {},
    actions = {},
    store$

  for (let action in reducers) {
    // pass in reducers keyed by action name
    let subject$ = new Subject() // subject for action/reducer data flow
    streams[`${action}$`] = subject$.pipe(map(reducers[action])) // stash a reducer mapped to a stream
    actions[action] = (args) => subject$.next(args) // forward action params to reducer stream
  }

  store$ = new BehaviorSubject(initial_state).pipe(
    // main store stream seeded with state
    merge(...Object.values(streams)), // merge all reducers into single stream
    scan((state, reducer) => reducer(state))
  ) // pass state to each reducer

  return { store$, actions } // return store observable and action streams
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
