/* 相当于 Vue 构造函数 */
function MVVM(options) {
    // 将配置对象保存到实例Vue中（vm） => new Vue({options就是这个对象})
    this.$options = options || {};
    // 将 配置对象options中的 data 保存到 实例（vm）中的变量data和_data中
    var data = this._data = this.$options.data;
    // 因为this指向实例Vue（vm），所以下面将实例Vue（vm） 保存到 me 变量中
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function(key) { // key 是data中的每个属性名
        // 对data中的属性名进行代理
        me._proxyData(key);
    });

    this._initComputed();

    // 创建 观察者
    observe(data, this);

    // 创建编译对象，实现对模板的编译 
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    constructor: MVVM,
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },
    /* 实现指定属性代理的方法 */
    _proxyData: function(key, setter, getter) {
        var me = this;
        setter = setter || 
        // 使用属性描述符 给Vue实例（vm）添加与key对应的属性描述符
        Object.defineProperty(me, key, {
            configurable: false, // 是否可以重新定义
            enumerable: true,   // 是否可以枚举
            // 通过 vm.xxx 读取属性值时调用，从data中获取对应的属性值返回，代理读取操作
            get: function proxyGetter() {
                return me._data[key];
            },
            // 通过 vm.xxx = value 时，value将被保存到data对应到属性上， 代理写入操作
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};