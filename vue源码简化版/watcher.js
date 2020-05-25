function Watcher(vm, expOrFn, cb) { 
    this.cb = cb; // 更新页面的回调
    this.vm = vm;
    this.expOrFn = expOrFn;
    this.depIds = {};   // 存放与 watcher 相关的 dep

    if (typeof expOrFn === 'function') {
        this.getter = expOrFn;
    } else {
        this.getter = this.parseGetter(expOrFn.trim());
    }

    this.value = this.get();    // 获得表达式的初始值
}

Watcher.prototype = {
    constructor: Watcher,
    update: function() {
        this.run();
    },
    run: function() {
        var value = this.get();
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;

            // 调用回调函数更新页面
            this.cb.call(this.vm, value, oldVal);
        }
    },
    addDep: function(dep) {
        // 判断 dep 和 watcher 的关系是否建立
        if (!this.depIds.hasOwnProperty(dep.id)) {
            // 将 watcher 添加到 dep 中，用于更新页面
            dep.addSub(this);
            // 将 dep 添加到 watcher 中，防止重复建立连着之间关系
            this.depIds[dep.id] = dep;
        }
    },
    get: function() {
        // 给 dep 指定当前的 watcher
        Dep.target = this;
        var value = this.getter.call(this.vm, this.vm);

        // 去除 dep 中指定的 watcher， 因为关系已经建立之后不需要了
        Dep.target = null;
        return value;
    },

    parseGetter: function(exp) {
        if (/[^\w.$]/.test(exp)) return; 

        var exps = exp.split('.');

        return function(obj) {
            for (var i = 0, len = exps.length; i < len; i++) {
                if (!obj) return;
                obj = obj[exps[i]];
            }
            return obj;
        }
    }
};