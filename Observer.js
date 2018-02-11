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
                console.log(that.vm.subQueue.target)
                if (that.vm.subQueue.target) { // 初始化时,把订阅者添加进队列
                    if (that.vm.subQueue.subs.some( sub => sub === that.vm.subQueue.target)) return val
                    that.vm.subQueue.addSub(that.vm.subQueue.target)
                }
                return val
            },
            set(newVal) {
                if (val === newVal) return
                val = newVal
                that.vm.subQueue.notifyAllSubs()
            }
        })
    }
}