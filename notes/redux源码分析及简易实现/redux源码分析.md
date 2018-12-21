## redux源码分析
之前一直在使用redux，但一直是当一个黑盒在用，总是知其然不知其所以然，于是就有了这篇文章，以供记录和整理。

### createStore
创建一个Store从createStore开始，我们首先看下createStore返回了什么。
```
return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
```
从返回的参数来看，主要返回了我们常用的几个函数。接下来，我们从头开始梳理，一步步看这几个常用函数怎么实现的。

在去除一些注释和打印错误后我们先看开头
```
export default function createStore(reducer, preloadedState, enhancer) {
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
      enhancer = preloadedState
      preloadedState = undefined
    }

    if (typeof enhancer !== 'undefined') {
      if (typeof enhancer !== 'function') {
        throw new Error('Expected the enhancer to be a function.')
      }

      return enhancer(createStore)(reducer, preloadedState)
    }

    if (typeof reducer !== 'function') {
      throw new Error('Expected the reducer to be a function.')
    }

    let currentReducer = reducer
    let currentState = preloadedState
    let currentListeners = []
    let nextListeners = currentListeners
    let isDispatching = false
}
```
首先判断有没有初始化的值和enhancer（一般是applyMiddleware），做一些容错处理，如果enhancer存在则返回enhancer(createStore)(reducer, preloadedState)。一般情况下是进行中间件加载，而reducer一般情况下是combineReducer合并reducer后的返回值，最后再初始化一些变量。

接下来我们先看一下combineReducer和applyMiddleware.

### combineReducer
去除掉注释和错误打印后的combineReducer核心代码是这样
```
export default function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers)
  const finalReducers = {}
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  const finalReducerKeys = Object.keys(finalReducers)

  return function combination(state = {}, action) {

    let hasChanged = false
    const nextState = {}
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    return hasChanged ? nextState : state
  }
}
```
首先，我们传入的参数reducers通常是一个对象，接着我们先获取对象的key保存在reducerKeys中，然后通过遍历的方式先判断reducers所对应的reducer是不是函数，是的话将key所对应的reducer保存在finalReducers这个对象中，再保存finalReducers的key即真正是reducer的Key。

最后，combineReduer返回的是一个拥有State和action两个参数函数。首先还是遍历整个reducers，并执行一遍所有reducer。然后通过对比返回的state和之前的state的引用，如果没有改变返回之前的state的值，发生改变则返回执行reducer返回的state。这里就解释了为什么要返回一个新的对象，若两个state的引用相同，则始终返回的是前一个state。

### applyMiddleware
redux中的middleware类似于koa或express的middleware即中间件，用于扩展redux功能。applyMiddleware的代码很短。
```
export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    const store = createStore(...args)

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
```
其实applyMiddleware也是创建了一个store，暴露出dispathch和getState的api用于中间件获取和State和dispatch。接着使用了compose这个函数增强了dispatch功能。

我们再看下compose这个函数
```
export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
```
这里如果再将dispatch作为参数放进去，最后得到的就是一个经过中间件包裹的dispatch，可以理解为一个强化过的dispatch。

### dispatch
```
function dispatch(action) {
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }
```
dispatch其实主要做了两件事，一是根据传入的action执行了reducer，二是执行了在subscribe中注册的listener。这里需要注意的是有一个isDispatching,根据这个来保证不会出现多个dispatch同时执行，避免store的值受到干扰，因为我们需要把当前的state传入reducer中即currentState = currentReducer(currentState, action)。最后再执行listener。

### subscribe
subscribe是订阅redux中状态变化的函数，在上面我们也可以看出，在dispatch最后会调用listener。
```
function subscribe(listener) {

    let isSubscribed = true

    nextListeners.push(listener)

    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }
```
需要注意的是subscribe会返回一个取消订阅的函数。

最后[redux简易实现](https://github.com/AdwardZheng/Blog/blob/master/notes/redux%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90%E5%8F%8A%E7%AE%80%E6%98%93%E5%AE%9E%E7%8E%B0/redux.js)
