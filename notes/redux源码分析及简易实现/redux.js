const compose = (...args) => {
  if (!args) {
    return arg => arg;
  }

  if (args.length === 1) {
    return args[0];
  }

  return args.reduce((a, b) => (...args2) => a(b(...args2)));
}

const bindActionCreator = (acitonCreators, dispatch) => {
  const keys = Object.keys(acitonCreators);
  const actions = {};
  for(let key of keys) {
    const actionCreator = acitonCreators[key];
    actions[key] = dispatch(actionCreator.apply(this, ...args));
  }
  return actions;
}

const createStore = (reducer, initState, enhancer) => {
  if (!enhancer && typeof initState === 'function') {
    enhancer = initState;
    initState = null;
  }
  if (enhancer && typeof enhancer === 'function') {
    return enhancer(createStore)(reducer, initState);
  }

  let store = initState;
  let listeners = [];
  let isDispatch = false;

  const getState = () => store;

  const dispatch = (action) => {
    if (isDispatch) return action;
    isDispatch = true;
    store = reducer(store, actions);
    listeners.forEach(listener => listener());
    isDispatch = false;
  }

  const subscribe = listener => {
    if (typeof listener === 'function') {
      listeners.push(listener);
    }
    return () => unSubscribe(listener);
  }

  const unSubscribe = listener => {
    const index = listeners.indexOf(listener);
    listeners.splice(index, 1);
  }

  return {
    getState,
    dispatch,
    subscribe
  }
}

const applyMiddleware = (...middlewares) => {
  return createStore => (reducer, initState, enhancer) => {
    const store = createStore(reducer, initState, enhancer);

    let chain = middlewares.map(middleware => middleware(store));
    store.dispatch = compose(...chain)(store.dispatch);
    return {
      ...store
    }
  }
}

const combineReducers = reducers => {
  const finalReducers = {};
  const nativeKeys = Object.keys(reducers);
  nativeKeys.forEach(reducerKey => {
    if (typeof reducers[reducerKey] === 'function') {
      finalReducers[reducerKey] = reducers[reducerKey];
    }
  });
  return (state, action) => {
    const store = {};
    const keys = Object.keys(finalReducers);
    keys.forEach(key => {
      const nextState = finalReducers[key](state[key], action);
      store[key] = nextState;
    })
    return store;
  }
}