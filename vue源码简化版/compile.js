/* 
1- 先判断 el 是不是一个元素节点，是就赋值，不是就获取 el对应的
2- 如果 el 存在 就创建 文档碎片，并将其中的所有节点放入 文档碎片
3- 将文档碎片的表达式进行解析，处理
4- 将处理后的文档碎片插入ul
*/
function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        // 创建文档碎片，并el中所有节点放入文档碎片
        this.$fragment = this.node2Fragment(this.$el);
        // 对文档碎片中所有的节点进行编译
        this.init();
        // 将编译好的 文档碎片放入 el中
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    constructor: Compile,
    node2Fragment: function(el) {
        // 创建文档碎片
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        // 编译 文档碎片 中的节点
        this.compileElement(this.$fragment);
    },

    // 编译(解析)元素
    compileElement: function(el) {
        // 取出el 下所有节点
        var childNodes = el.childNodes,
            me = this;
        // 遍历 el 下所有子节点
        [].slice.call(childNodes).forEach(function(node) {
            // 获取文本节点
            var text = node.textContent;
            // 匹配{} 表达式
            var reg = /\{\{(.*)\}\}/;
            // 是否是元素节点
            if (me.isElementNode(node)) {
                // 编译元素节点（解析指令）
                me.compile(node);
            // 是文本节点 并且满足正则匹配{{}}
            } else if (me.isTextNode(node) && reg.test(text)) {
                // 编译{{}}中的表达式
                me.compileText(node, RegExp.$1.trim());
            }
            // 判断当前节点是否还存在子节点，存在则进行递归。实现对所有元素进行递归
            if (node.childNodes && node.childNodes.length) {
                me.compileElement(node);
            }
        });
    },

    // 解析指令
    compile: function(node) {
        // 得到标签的所有属性
        var nodeAttrs = node.attributes,
            me = this;

        // 遍历所有属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 得到属性名 v-on:click
            var attrName = attr.name;
            // 判断是否是指令属性（是否为 v- 开头的）
            if (me.isDirective(attrName)) {
                // 得到指令属性的属性值 => 比如是show（绑定事件的方法是哪个）
                var exp = attr.value;
                // 在属性名中得到指令名 on:click
                var dir = attrName.substring(2);
                // 是否为事件指令（on开头）
                if (me.isEventDirective(dir)) {
                    // 解析事件指令
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                // 普通指令
                } else {
                    // 解析普通指令
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }
                // 移除指令属性 v-on:click
                node.removeAttribute(attrName);
            }
        });
    },

    // 解析文本节点
    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    // 解析 v-text || {{}}
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    // 解析 v-html
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    // 解析 v-module
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    // 解析 v-class
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    // 解析 v-bind
    bind: function(node, vm, exp, dir) {
        // 得到对应的更新函数，dir是更新的函数名
        var updaterFn = updater[dir + 'Updater'];

        // 调用函数更新节点
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        // 为表达式建立一个对应的 watcher，实现节点的更新
        new Watcher(vm, exp, function(value, oldValue) { // 表达式中对应的属性值改变时，进行回调

            // 更新页面中的指定节点
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        // 得到事件名 click
        var eventType = dir.split(':')[1],
            // 从 methos 中得到事件的回调函数
            fn = vm.$options.methods && vm.$options.methods[exp];
        // 事件名 对应回调函数都存在
        if (eventType && fn) {
            // 绑定事件监听 将回调函数的 this 指向 vm
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    // 从 vm 中得到表达式（指令）所对应的值
    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

// 更新节点中的属性
var updater = {
    // 更新节点的 textContent 属性
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    // 更新节点的 innerHTML 属性
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },
    
    // 更新节点的 className 属性
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        // className = className.replace(oldValue, '').replace(/\s$/, '');

        // var space = className && String(value) ? ' ' : '';

        // node.className = className + space + value;

        // 将静态的 class 属性值和动态的class属性值合并后设置为新的 className 属性值
        node.className = className + (className?'':'')+value;
    },

    // 更新节点的 value 属性
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};