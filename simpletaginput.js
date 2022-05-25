// ref: https://www.jb51.net/article/243656.htm

(function () {
    const _ = {
        // get random letter with specified length
        getRandomLetter(length=1) {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const charactersLength = characters.length;
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        },
        get(q, p = document) {
            return p.querySelector(q);
        },
        getAll(q, p = document, asArray=true) {
            let res = p.querySelectorAll(q);
            if (asArray) return [...res];
            else return res;
        },
        css(content, id = _.getRandomLetter(10)) {
            //if element with specified id exists, remove it
            let old = _.get(`#${id}`);
            if (old) old.remove();
            const style = document.createElement('style');
            // style.type = 'text/css';
            style.id = id;
            style.innerHTML = content;
            document.head.appendChild(style);
            return style;
        },
        dom(tagName, propertyMap = {}) {// minified version of domHelper
            let d = Object.assign(document.createElement(tagName),propertyMap);
            if (propertyMap.style) {
                for (let key of Object.keys(propertyMap.style)) {
                    d.style[key] = propertyMap.style[key];
                }
            }
            if (propertyMap.text) d.innerText = propertyMap.text;
            if (propertyMap.html) d.innerHTML = propertyMap.html;
            if (propertyMap.cssText) d.style.cssText = propertyMap.cssText;
            if (propertyMap.classList&&propertyMap.classList?.length) {
                d.className = '';
                for (let cl of propertyMap.classList) {
                    d.classList.add(cl);
                }
            }
            if (propertyMap.attr) {
                for (let key of Object.keys(propertyMap.attr)) {
                    d.setAttribute(key, propertyMap.attr[key]);
                }
            }
            if (propertyMap.on) {
                for (let key of Object.keys(propertyMap.on)) {
                    if(typeof(propertyMap.on[key])=='function')
                        d.addEventListener(key, propertyMap.on[key]);
                }
            }
            if (propertyMap.childs&&propertyMap.childs?.length) {
                for (let child of propertyMap.childs) {
                    if(typeof child === 'string') {
                        d.appendChild(document.createTextNode(child));
                    } else {
                        d.appendChild(child);
                    }
                }
            }
            if (propertyMap.append) {
                if(propertyMap.append instanceof HTMLElement || propertyMap.append instanceof Node) {
                    propertyMap.append.appendChild(d);
                }
            }
            if (propertyMap.init) {
                if (typeof (propertyMap.init) == 'function') {
                    if (propertyMap.init.constructor.name == 'AsyncFunction') {
                        return propertyMap.init(d).then(_ => d);
                    }
                    propertyMap.init(d);
                }
            }
            return d;
        }
    }
    class SimpleTagInput{
        static getDefaultProperties() {
            return {
                parent: null,// throw error if not set
                maxcount: -1,// infinity
                splitor: [' ', '/'],
                enterToAdd: true,
                value: [],
                placeholder: "添加标签...",
                validator: () => true,
                onchange: (val, el) => { },
                id: _.getRandomLetter(10),
                className: "",
                insertCSS: true,
            }
        }
        get value() {
            return this.opts.value;
        }
        set value(value) {
            this.setTags(value);
        }
        constructor(opt = {}) {
            this.opts = Object.assign(SimpleTagInput.getDefaultProperties(), opt);
            if (this.opts.parent == null) throw new Error('Must specify parent HTMLElement or query selector');
            if (typeof (this.opts.parent) === 'string') {
                this.opts.parent = _.get(this.opts.parent);
                if (this.opts.parent == null) throw new Error('Parent element not found with specified query selector');
            }else if(!(this.opts.parent instanceof HTMLElement)){
                throw new Error('Parent element is invalid');
            }
        }

        insertCss() {
            this.cssEl = _.css(`
            .tags-contents{
                display: flex;
                flex-wrap: wrap;
                align-items: flex-start;
                gap: 6px;
                width: 400px;
                box-sizing: border-box;
                padding: 8px 12px;
                border: 1px solid #D9D9D9;
                border-radius: 4px;
                font-size: 16px;
                line-height: 24px;
                color: #333;
                outline-color: #4F46E5;
                overflow: auto;
                cursor: text;
            }
            tag{
                display: flex;
                align-items: center;
                padding: 4px 0 4px 8px;
                font-size: 16px;
                line-height: 24px;
                background: #F5F5F5;
                color: rgba(0, 0, 0, 0.85);
                cursor: default;
            }
            .tag-close{
                width: 18px;
                height: 18px;
                cursor: pointer;
                background: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5.578 5l2.93-3.493a.089.089 0 0 0-.068-.146h-.891a.182.182 0 0 0-.137.064l-2.417 2.88-2.416-2.88a.178.178 0 0 0-.137-.064h-.89a.089.089 0 0 0-.069.146L4.413 5l-2.93 3.493a.089.089 0 0 0 .068.146h.89a.182.182 0 0 0 .138-.064l2.416-2.88 2.417 2.88c.033.04.083.064.137.064h.89a.089.089 0 0 0 .069-.146l-2.93-3.493z' fill='%23000' fill-opacity='.45'/%3E%3C/svg%3E") center no-repeat;
            }
            .tags-input{
                flex: auto;
                border: 0;
                outline: 0;
                padding: 4px 0;
                line-height: 24px;
                font-size: 16px;
                -webkit-user-modify: read-write-plaintext-only;
            }
            .tags-content:focus-within,
            .tags-content:active{
                outline: auto #4F46E5;
            }
            .tags-input:empty::before{
                content: attr(placeholder);
                color: #828282;
            }
            `, 'simpletaginput-style');
        }

        getValue() {
            return this.opts.value;
        }

        create() {
            if(this.opts.insertCSS)this.insertCss();
            this.elementMap = {};
            this.input = null;
            this.element = _.dom("div", {
                id: this.opts.id,
                append: this.opts.parent,
                classList: ['tags-contents'],
                instance: this,
                childs: [
                    _.dom("div", {
                        classList: ['tags-input'],
                        attr: {
                            placeholder: this.opts.placeholder
                        },
                        on: {
                            keydown: e => {
                                if (this.opts.splitor.includes(e.key)||(this.opts.enterToAdd&&e.key=='Enter')) {
                                    e.preventDefault();
                                    let txt = (this.input?.innerText??"").trim();
                                    if (txt.length) {
                                        this.addTag(txt);
                                        this.input.innerText = '';
                                    }
                                } else if (e.key == 'Backspace' && this.input.innerText.length === 0&&Object.keys(this.elementMap).length>0) {
                                    e.preventDefault();
                                    this.removeTag(Object.keys(this.elementMap).at(-1));
                                }
                            }
                        },
                        init:(el)=>this.input=el,
                    })
                ]
            });
            Object.defineProperty(this.element, 'value', {
                get: () => {
                    return this.value;
                },
                set: (val) => {
                    this.value = val;
                }
            });
        }
        addTag(tag) {
            if (Object.keys(this.elementMap).includes(tag)) return (console.warn("Already existed",Object.keys(this.elementMap),tag),false);
            if(this.opts.maxcount>=0&&Object.keys(this.elementMap).length>=this.opts.maxcount)return (console.warn("Maximium count exceeded",Object.keys(this.elementMap).length,this.opts.maxcount),false);;
            if (this.opts.validator(tag)) {
                this.opts.value.push(tag);
                this.input.before(_.dom("TAG", {
                    html: tag,
                    childs: [
                        _.dom("a", {
                            classList: ['tag-close'],
                            on: {
                                click: e => {
                                    this.removeTag(tag);
                                }
                            }
                        })
                    ],
                    init: el => {
                        this.elementMap[tag] = el;
                    }
                }));
                this.opts.onchange(this.opts.value, this.element);
                return true;
            }
            return (console.warn("Validation failed",tag),false);
        }
        removeTag(tag) {
            if (!Object.keys(this.elementMap).includes(tag)) return (console.warn("Tag not found",tag),false);
            this.elementMap[tag].remove();
            delete this.elementMap[tag];
            this.opts.value = this.opts.value.filter(t => t !== tag);
            this.opts.onchange(this.opts.value, this.element);
            return true;
        }
        setTags(tags = []) {
            for (let k of Object.keys(this.elementMap)) {
                this.removeTag(k);
            }
            for (let tag of tags) {
                this.addTag(tag);
            }
        }
    }

    window.SimpleTagInput = SimpleTagInput;
})();
