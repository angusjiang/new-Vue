# vue 双向数据绑定的基本实现
1. 实现new Vue 实例1
2. 初始化data，实现一个Observer,用来劫持监听所有的属性，变化时通知订阅者
3. 监听data属性的时候getter时，实现一个订阅者Suber，接收属性的变化通知执行相应的render更新试图
4. 更新视图时需要一个解析器compile，扫描每一个结点相关指令，更具模板数据和初始化相应的订阅器

![image](http://img1.vued.vanthink.cn/vuedf655153e9fc8665b995f470a216e9784.png)


- [x] Observer 主要是通过Object.definedProperty(obj, key ,decription) 来对实例中的对象进行监听。


```
class Observer {
    constructor (data, vm) {
        Object.assign(this, {data, vm})
        this.init()
    }
    init() {
        this.initData(this.data)
    }
    initData(data) {
        if (!data || typeof data !== 'object') {
            return;
        }
        Object.keys(data).forEach(key => {
            this.defineProperty(data, key, data[key]) // 初始化对数据劫持
        })
    }
    defineProperty(object, key, val) {
        this.initData(val) // 递归劫持数据监听
        let that = this
        Object.defineProperty(object, key, {
            enumberable: true,
            configurable: true,
            get() {
               //依赖收集，当读取属性的时候为每一个属性添加一个订阅者
            },
            set(newVal) {
                //当数据修改发生了变化通知订阅者，让订阅者更新试图
            }
        })
    }
}
```
- [x] Suber 当监听属性的时候getter时，进行初始化，将当前属性添加到队列SubQueue中


```
/*
    订阅者: 收到属性的变化通知并执行相应的函数，从而更新视图
*/
class Suber {
    constructor( vm, attr, cb) {
        Object.assign(this, {vm, attr, cb})
        this.value = this.get()
    }

    get () {
        this.vm.subQueue.target = this // 添加当前订阅者
        let value = this.getAttrVal(this.attr) // 通过获取该属性值来把当前订阅者放入队列
        this.vm.subQueue.target = null // 清除缓存
        return value
    }

    update () {

        let value = this.getAttrVal(this.attr)
        if (value !== this.value) {
            this.cb && this.cb(value)
            this.value = value
        }
    }

    // 属性值
    getAttrVal (attr) {
        let vm = this.vm
        if (attr.indexOf('.') >= 0) {
            let arr = attr.split('.')
            return arr.reduce( (obj, attr) => {
                if (typeof obj !== 'object') {
                    return this.vm[obj][attr]
                }
                return obj[attr]
            })
        } else {
            return this.vm[this.attr]
        }
    }
}


/*
    订阅器队列: 我们需要一个队列来统一管理订阅者(data 每个属性都有一个订阅者)
*/
class SubQueue {
    constructor () {
        this.subs = []
        this.target = null
    }
    addSub (sub) { //添加订阅者
        this.subs.push(sub)
    }
    notifyAllSubs () { // 通知所有订阅者
        this.subs.forEach( sub => {
            sub.update()
        })
    }
}

```


- [x] compile 解析模板指定初始化视图


```
/*
    compile: 解析器
*/
class Compile {
    constructor (vm) {
        this.vm = vm
        this.el = document.querySelector(vm.el)
        this.fragment = null //代码块
        this.init()
    }

    // 节点初始化
    init () { 
        this.fragment = this.getFragment()
        this.formatFragment(this.fragment)
        this.el.appendChild(this.fragment)
    }

    // 把指定el 里面的所有节点移入 代码块中
    getFragment () {
        let fragment = document.createDocumentFragment()
        // 通过appendChild 把元素全部移入 fragment中
        let child = this.el.firstChild
        while (child) {
            fragment.appendChild(child)
            child = this.el.firstChild
        }
        return fragment
    }

    // 格式化文档片段
    formatFragment (el) {
        [].slice.call(el.childNodes).forEach( node => {
            let reg = /((?:\{\{)[^\{\}]*(?:\}\}))/g,
                text = node.textContent
            if (node.nodeType === 3 && text.match(reg) && text.match(reg).length) { // 该节点时文本节点 且 具有 {{}} 指令
                this.formatText(node, text.match(reg))
            } else if  (node.nodeType === 1 && node.attributes.length > 0) { // 该节点为元素节点时
                this.getDirective(node)
            }
            if (node.childNodes && node.childNodes.length) {
                this.formatFragment(node)
            }
        })
    }

    // 格式化文本节点的内容
    formatText (node, attrs) {
        let initText = node.textContent // 获取文本
        attrs.forEach( attr => {
            let val = this.getAttrVal(attr.slice(2, -2))
            node.textContent = node.textContent.replace(attr, val) // 初始化属性值


            let text = initText
            new Suber(this.vm, attr.slice(2, -2), val => {
                console.log(val)
                node.textContent = attrs.forEach( key => { // 获取到值后 重新遍历该文本节点中的 {{}} 指令
                    let keyVal = this.getAttrVal(key.slice(2, -2))
                    text = text.replace(key, keyVal)
                })
                node.textContent = text
                text = initText // 设置完毕, 重新初始化值便于下次修改赋值
            })
        })
    }

    // 属性值
    getAttrVal (attr) {
        if (attr.indexOf('.') >= 0) {
            let attrArr = attr.split('.')
            return attrArr.reduce( (obj, attr) => {
                if (typeof obj !== 'object') {
                    return this.vm[obj][attr]
                }
                return obj[attr]
            })
        }else{
            return this.vm[attr]
        }
    }

    // 执行指令
    getDirective (node) {
        let attrs = node.attributes;
        [].slice.call(attrs).forEach( attr => {
            if (attr.name.indexOf('v-') >= 0) {
                let val = attr.value
                if (attr.name.indexOf('v-on:') >= 0) { // v-on: 事件指令
                    this.compileEvent(node, attr)
                } else if (attr.name.indexOf('v-model') >= 0) { //v-model指令
                    this.compileModel(node, val)
                } else if (attr.name.indexOf('v-bind') >= 0) { //v-bind指令
                    this.compileBind(node, attr)
                }else { // 其余指令
                    console.log('其余指令')
                }
            } else if (attr.name.indexOf(':') === 0) { // v-bind: 指令简写
                this.compileBind(node, attr)
            } else if (attr.name.indexOf('@') === 0) { // v-on: 指令简写
                this.compileEvent(node, attr)
            }
        })
    }

    // v-model指令
    compileModel (input, attr) {
        let reg = /((?:\{\{)[^\{\}]*(?:\}\}))/g,
            getNodeText = el => {
                [].slice.call(el.childNodes).forEach( node => {
                    let text = node.textContent
                    if (node.nodeType === 3 && node.textContent.indexOf(`{{${attr}}}`) >= 0) {
                        this.formatText(node, text.match(reg))
                    }
                    if (node.childNodes && node.childNodes.length > 0) {
                        getNodeText.call(this, node)
                    }
                })
            }
        getNodeText.call(this,this.fragment)
        input.value = this.getAttrVal(attr)
        input.addEventListener('input', e => {
            if (attr.indexOf('.') < 0) return this.vm[attr] = e.target.value

            attr.split('.').reduce( (obj, attr, index, arr) => {
                if (index >= arr.length - 1) {
                    if (typeof obj !== 'object') {
                       return this.vm[obj][attr] = e.target.value
                    }
                    return obj[attr] = e.target.value
                }
                if (typeof obj !== 'object') {
                    return this.vm[obj][attr]
                }
                return obj[attr]
            })
        })
    }

    // v-on指令
    compileEvent (node, attr) {
        let ev = attr.name.indexOf(':') >= 0 && attr.name.split(':')[1] || attr.name.indexOf('@') >= 0 && attr.name.split('@')[1],
            fn = attr.value

        if (typeof this.vm.methods[fn] !== 'function') return console.warn('methods 里面只能放函数')
        node.addEventListener(ev, this.vm.methods[fn].bind(this.vm))
    }

    // v-bind指令
    compileBind (node, attr) {
        let name = attr.name.split(':')[1],
            value = attr.value

        new Suber(this.vm, value, val => {
            console.log(val)
            node[name] = this.getAttrValue(value)
        })
        node[name] = this.getAttrValue(value)

    }

    // 获取属性值
    getAttrValue (attr) {
        if (attr.indexOf('.') < 0) return this.vm[attr]

        return attr.split('.').reduce( (obj, attr, index, arr) => {
            if (index >= arr.length - 1) {
                if (typeof obj !== 'object') {
                   return this.vm[obj][attr]
                }
                return obj[attr]
            }
            if (typeof obj !== 'object') {
                return this.vm[obj][attr]
            }
            return obj[attr]
        })
    }

}

```
- [x] Vue 实例


```
class Vue {
    // 按照生命周期的顺序 beforeCreate => obserserver data and init mothods => created 
    constructor (opts) {
        if(!opts.el) return console.warn('el参数不能为空')
        opts.beforeCreate && opts.beforeCreate.call(this)
        this.el = opts.el
        this.data = opts.data || {}
        this.methods = opts.methods
        this.subQueue = new SubQueue() //订阅器队列
        opts.created && opts.created.call(this)
        this.init()
        opts.mounted && opts.mounted.bind(this)
    }
    init() {
        Object.keys(this.data).forEach(key => {
            this.proxyKeys(key)
        })
        new Observer(this.data, this)
        this.created && this.created()
        new Compile(this)
    }
    // 在实例中为data 加上一个代理，目的为了将data上的属性代理到vm实例上
    proxyKeys(key) {
        Object.defineProperty(this, key, {
            enumerable: true,
            configurable: true,
            get() {
                return this.data[key]
            },
            set(val) {
                if(this.data[key] === val) return;
                this.data[key] = val;
            }
        })
    }
}
```



