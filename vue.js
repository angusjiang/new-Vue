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