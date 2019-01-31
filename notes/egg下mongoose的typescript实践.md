在使用eggjs的时候，egg对于typescript的支持还有一些不完善。比如使用mongoose建立Model后，因为egg的加载机制的问题并没有很完善的智能提示。在经过实践了以后找到了以下暂时解决方法。

### 一、使用typescript完善model1

首先要写一个model的interface
```
import { Document } from 'mongoose'

export interface User {
    name: string;
    age: number;
    email: string;
}

export interface UserModel extends User, Document {

}
```
UserModel继承自我们所需要的结构User和用于mongoose的Document，接下来我们就可以编写model了。

### 二、编写model

这里是以egg框架为基础的，其他框架可以参考
```
import { UserModel } from '../constants/interface/user'
export default (app: Application) => {
    cconst mongoose = app.mongoose;
    const Schema = mongoose.Schema;

    const UserSchema = new Schema<UserModel>({
        name: { type: String },
        age: { type: Number},
        email: { type: String }
    });
    return mongoose.model<UserModel>('user', UserSchema);
}
```
现在我们完成了一个简易的model，但有时候我们会在mongoose写一些方法如：
```
UserSchema.methods.getAll = function() {
    return (this.name+this.age+this.email);
}
```
这是只需在UserModel中添加对应方法即可
```
export interface UserModel extends User, Document {
    getAll: () => string;
}
```
到此我们基本完成了mongoose的typescript实践，如果在其他框架中基本没有问题了，但是有一个问题是egg由于加载机制，并不能分析出我们定义的model，所以还需要最后一步

### 三、类型转换

既然egg不能分析出类型，但我们是明确知道我们所定义的类型的，所以我们在使用的时候还需要在做一步强制类型转换。
```
getUserByName(name: string) {
    const { ctx } = this;
    return (ctx.model.User as Model<UserModel>).findOne({ name });
}
```
虽然相对繁琐，但在egg中使用mongoose拥有了智能提示。