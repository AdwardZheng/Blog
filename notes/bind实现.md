### bind函数实现

bind()方法创建一个新的函数，并绑定this的值，具体用法如下

```
function foo() {
  console.log(this.a);
}

let bar = {
  a: 1
};

let fooBind = foo.bind(bar);

fooBind(); // 1;
```
接下来，我们一步步实现bind的功能。

#### 第一步绑定this并返回函数

既然要实现bind的功能，我们首先想到的是call和apply。不过bind和他们的区别是call和apply会直接执行函数，而bind会返回一个新的函数。于是我们可以这样。

```
if (!Function.prototype.bind2) {
  Function.prototype.bind2 = function(ctx) {
    let self = this;
    return function() {
      return self.apply(ctx);
    }
  }
}

function foo() {
  console.log(this.a);
}

let bar = {
  a: 1
};

let fooBind = foo.bind2(bar);
fooBind();  // 1
```
用self保存绑定的函数，然后再返回一个新函数，其返回值是self.apply(ctx),这样我们就简单实现了bind返回一个新函数的功能。但是我们并没有处理参数的问题，如果再调用bind返回的新函数时传入了参数怎么办呢？接下来，我们看第二步。

#### 第二步参数

首先我们要了解arguments这个对象，它是一个传递给函数的参数的类数组对象。之所以是类数组，是因为我们可以用slice方法将它转化为数组。
```
function foo() {
  let args = Array.prototype.slice.call(arguments);
  console.log(args);
}

foo('a', 'b', 'c');  //  ['a', 'b', 'c'];

```
当然也可以直接理解为es6的剩余参数语法（...rest）,rest的值和args相同。但如果不支持es6语法，我们还是尽量使用arguments。大概了解了arguments后，我们正式开始解决bind参数的问题。

```
if (!Function.prototype.bind2) {
  Function.prototype.bind2 = function(ctx) {
    let self = this;
    // 首先获取调用bind时的参数，因为我们第一个参数是上下文，即我们需要绑定的this，所以我们需要从第二个参数开始获取
    let args = Array.prototype.slice.call(arguments, 1);
    return function() {
      // 在调用返回的新函数时，我们可能还是会继续传递参数，所以必须再获取一次，并用concat将两次获取的参数合并
      let args2 = Array.prototype.slice.call(arguments);
      return self.apply(ctx, args.concat(args2));
    }
  }
}

function foo(one, two) {
  console.log(this.a + one + two, one, two);
}

let bar = {
  a: 1
};

let fooBind = foo.bind2(bar, 2);
fooBind(3);   // 6, 2, 3
```
就这样，我们用arguments这个对象，并合并两次参数的方式，解决了传入参数的问题。

#### 第三部new及原型

现在我们已经实现了大部分功能，但是bind还有一个特性。就是使用bind绑定的函数也能使用new创建对象，这个时候之前我们绑定的对象，将被忽略，this重新绑定为new出来的这个对象，举个例子：
```
function foo(name) {
  this.name = name;
  console.log(this.name);
  console.log(this.age);
}

let bar = {
  age: 10
}

let fooBind = foo.bind(bar);

let obj = new foo('tom');
fooBind('jack');

// tom
// undefined
// jack
// 10
```
我们可以很明显的看到使用new的时候this用重新绑定到了new出来的这个对象上。所以我们就要判断一下这个对象是不是new出来的。而判断是不是new出来的，自然就想到了instanceof，而且bind返回的是一个函数，new出来的这个对象自然继承自bind的返回函数，所以我们可以这么修改一下。
```
if (!Function.prototype.bind2) {
  Function.prototype.bind2 = function(ctx) {
    let self = this;
    let args = Array.prototype.slice.call(arguments, 1);
    let fnBind = function() {
      let args2 = Array.prototype.slice.call(arguments);
      // 判断新的对象是否继承自返回的这个函数，是的话就绑定当前对象，不是的话还是绑定之前的对象
      return self.apply(this instanceof fnBind ? this : ctx, args.concat(args2));
    }
    return fnBind;
  }
}
```
但是这样还是有一个问题，我们只改变了this的指向，但是new最重要的一个特点就是会关联原型链，而现在关联的原型链是我们调用bind时生成的函数。所以我们还需要关联一下原型链。
```
if (!Function.prototype.bind2) {
  Function.prototype.bind2 = function(ctx) {
    let self = this;
    let args = Array.prototype.slice.call(arguments, 1);
    let fnBind = function() {
      let args2 = Array.prototype.slice.call(arguments);
      return self.apply(this instanceof fnBind ? this : ctx, args.concat(args2));
    }
    // 关联原型链
    fnBind.prototype = this.prototype;

    return fnBind;
  }
}
```
这样直接修改prototype的方式的确可以达到关联原型链的目的，但是因为我们直接赋值的引用，就会出现修改新对象的同时会把原型链也修改的情况；
```
if (!Function.prototype.bind2) {
  Function.prototype.bind2 = function(ctx) {
    let self = this;
    let args = Array.prototype.slice.call(arguments, 1);
    let fnBind = function() {
      let args2 = Array.prototype.slice.call(arguments);
      return self.apply(this instanceof fnBind ? this : ctx, args.concat(args2))
    }
    fnBind.prototype = this.prototype;
    return fnBind;
  }
}

function foo(name) {
  this.name = name;
}

foo.prototype.friend = 'bob';

let bar = {
  age: 10
}

let fooBind = foo.bind(bar);
let obj = new fooBind('tom');
//修改原型
obj.__proto__.friend = 'jack';
console.log(foo.prototype.friend);  // jack
```
可以看到修改obj的原型时，foo的原型也被修改了，所以我们需要一个新的对象作为obj的原型。解决方案如下。

```
if (!Function.prototype.bind2) {
  Function.prototype.bind2 = function(ctx) {
    let self = this;
    let args = Array.prototype.slice.call(arguments, 1);
    let fnBind = function() {
      let args2 = Array.prototype.slice.call(arguments);
      return self.apply(this instanceof fnBind ? this : ctx, args.concat(args2))
    }
    // 创建一个空对象
    let fn = function() {};
    // 将绑定函数的原型指向空对象
    fn.prototype = this.prototype;
    // 将空对象的实例赋值给fnBind.prototyp（new的时候会创建一个空对象）
    fnBind.prototype = new fn();
    return fnBind;
  }
}
```
实际上我们也可以直接使用Object.create()方法直接生成一个新对象
```
fn.prototype = Object.create(this.prototype);
```
当直接修改实例的原型时，我们实际上修改的是那个空对象。这样就解决了上面这个问题。

最后加上错误提示，完成bind的实现。

```
if (!Function.prototype.bind2) {
  Function.prototype.bind2 = function(ctx) {
    if (typeof this !== "function") {
      throw new Error("Function.prototype.bind - what is trying to be bound is not callable");
    }

    let self = this;

    let args = Array.prototype.slice.call(arguments, 1);

    let fnBind = function() {
      let args2 = Array.prototype.slice.call(arguments);
      return self.apply(this instanceof fnBind ? this : ctx, args.concat(args2))
    }

    let fn = function() {};
    fn.prototype = this.prototype;
    
    fnBind.prototype = new fn();
    return fnBind;
  }
}
```
