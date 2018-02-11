# vue 双向数据绑定的基本实现
1. 实现new Vue 实例
2. 初始化data，实现一个Observer,用来劫持监听所有的属性，变化时通知订阅者
3. 监听data属性的时候getter时，实现一个订阅者Suber，接收属性的变化通知执行相应的render更新试图
4. 更新视图时需要一个解析器compile，扫描每一个结点相关指令，更具模板数据和初始化相应的订阅器

![image](http://img1.vued.vanthink.cn/vuedf655153e9fc8665b995f470a216e9784.png)

