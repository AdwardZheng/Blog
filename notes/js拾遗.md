### 关于new和prototype

#### 使用new调用函数
1. 创建（或者构造）一个全新的对象
2. 对这个新对象执行原型链接
3. 绑定函数调用的this
4. 如果函数没有返回其他对象，那么new 表达式中的函数调用会自动返回这个新对象

#### 关于prototype
js中每个对象都有一个特殊的[[Prototype]]内置属性，其实就是对于其他对象的引用。  
如果查找某个属性时，对象本身上不存在，就继续访问[[Prototype]]链，即原型链。  
以下面代码为例：
```
  funtion Foo() {};

  Foo.prototype.a = 2;

  let s = new Foo();

  s.a; // 2

```
简单来说，Foo.prototype也是一个对象，但与普通对象不同的是，
当使用new实例化时，Foo.prototype会被关联到实例的原型链上。如果不使用new实例化，则不会关联上。
```
funtion Foo() {};

Foo.prototype.a = 2;

let s = Foo();

s.a // TypeError: Cannot read property 'a' of undefined
```

prototype.constructor指向函数本身
```
funtion Foo() {};

Foo.prototype.constructor === Foo; // true

```
一个函数本身不是构造函数，但若使用了new调用，则这个函数可以被称为构造函数,.constructor是函数声明时的默认属性。且通过new实例化的对象的constructor实际上是.prototype.constructor,其本身并不存在constructor。

使用Object.create创建新对象时，会把新对象内部的[[prototype]]关联到指定对象
```
  let foo = {
    a: 1
  };

  let b = Object.create(foo);

  //注对象不存在prototype，但在浏览器环境可通过.__protp__查看，如b.__proto__
  b.prototype === foo // true
```

