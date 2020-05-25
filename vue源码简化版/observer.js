function Observer(data) {
    this.data = data;
    // 开始对 vue 中 data 的监视
    this.walk(data);
}

Observer.prototype = {
    constructor: Observer,
    walk: function(data) {
        var me = this;
        Object.keys(data).forEach(function(key) {
            // me.convert(key, data[key]);

            // 对属性实现响应式的数据绑定
            me.defineReactive(me.data, key, data[key]);
        });
    },
    // convert: function(key, val) {
    //     this.defineReactive(this.data, key, val);
    // },

    defineReactive: function(data, key, val) {
        // 创建属性对应的 dep 对象 （dependency）
        var dep = new Dep();

        // 通过递归 实现对 data 中所有属性的劫持
        var childObj = observe(val);

        // 给 data 中的每个属性添加新的描述
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define

            // 建立 dep 和 watcher 之间的关系
            get: function() {
                if (Dep.target) {
                    dep.depend();
                }
                return val;
            },

            // 监听 key 属性的变化，触发对应的 watcher 更新页面
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知相关订阅者
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    // 被观察的必须是一个对象
    if (!value || typeof value !== 'object') {
        return;
    }

    // 创建对应的观察者
    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    // 将 watcher 添加大 dep 中
    addSub: function(sub) {
        this.subs.push(sub);
    },

    // 建立 dep 和 watcher 之间的关系
    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    // 遍历所有的 watcher， 通知 watcher 更新
    notify: function() {
        this.subs.forEach(function(sub) {

            // 调用 watcher 中更新方法
            sub.update();
        });
    }
};

Dep.target = null;