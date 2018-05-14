/*
    AheadTec Flash Linker Library V1.0

    Author by niwz  210963@qq.com
    Create Date: 2017.05.08

    Require Files: 
        jquery.query-2.1.7.js
        swfobject.js
        expressInstall.swf
        LXFlashLinker.swf
        LXFlashSWITCH.swf
*/

/*
2017.05.08  初始本脚本。
2017.05.15  增加转接的抽象访问。
2017.05.16  修正在Debian环境下访问时的缺陷。
2017.05.16  增加 静音/取消静音 的方法。
2017.05.16  修正方法 showPrivacy的显示情况，同时增加参数 bChecked，以区分日常的设置。
2017.05.16  修正在"自动应答"模式下未触发incoming事件的缺陷。
2017.05.16  支持即时销毁操作，可重复进行实例化。
2017.05.23  修正IE 11.0下无法正常加载Flash的缺陷；
2017.05.23  增加页面刷新时的现场清理，以免遗留相应的连接。
2017.05.27  增加在CTI断开时，取消注册话机的操作，以保证不在服务端保留多个Session。
2017.06.09  对部分异常进行容错处理。
2017.06.10  incoming事件中增加字段flag，  为false时表示为CTI进线，否则为FS进线；
2017.06.13  页面刷新时添加取消注册的操作；
2017.07.12  增加呼叫转移方法(需更新LXFlashLinker.swf文件);
2017.07.28  封装"三方通话"方法；  operate事件增加操作编码opid
2017.08.23  添加最后错误信息的字段，操作失败时，可以通过实例的lastError属性获取帮助信息；
2017.08.23  添加强拆、侦听、强插的方法封装；
2017.09.11 增加通知类消息回调函数(需更新LXFlashLinker.swf文件)；
2017.10.23 增加短消息发送功能以及回调函数(需更新LXFlashLinker.swf文件)；
2018.03.12 增加获取队列座席信息的函数以及消息事件(需更新LXFlashLinker.swf文件)；
2018.03.13 增加方法SetConfGroupMute，适用于板卡；
*/

/*
全局实例。
*/
var global_instance = null;
/*状态中文名称*/
var STATUS_CHN_NAME = ['不可用', '空闲', '摘机', '拨号', '按键', '振铃', '通话', '催挂', '', '', '', '', '', '置忙', '监听', '', '', '', '', '', '', '', '', '', '', '', '休息', '话后处理'];

/*休眠*/
function sleep(msecs) {
    var now = new Date();
    var exitTime = now.getTime() + msecs;
    while (true) {
        now = new Date();
        if (now.getTime() > exitTime)
            return;
    }
}

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

/*
获取url中的参数
*/
function getUrlParam(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
    var r = window.location.search.substr(1).match(reg);  //匹配目标参数
    if (r != null) return unescape(r[2]); return null; //返回参数值
}

/*
显示浏览器版本到控件。
*/
function showNavigator(ctrl) {
    var userAgent = navigator.userAgent,
            rMsie = /(msie\s|trident.*rv:|edge\/)([\w.]+)/,
            rFirefox = /(firefox)\/([\w.]+)/,
            rOpera = /(opera).+version\/([\w.]+)/,
            rChrome = /(chrome)\/([\w.]+)/,
            rSafari = /version\/([\w.]+).*(safari)/;
    var browser;
    var version;
    var ua = userAgent.toLowerCase();
    function uaMatch(ua) {
        var match = rMsie.exec(ua);
        if (match != null) {
            return { browser: "IE", version: match[2] || "0" };
        }
        var match = rFirefox.exec(ua);
        if (match != null) {
            return { browser: match[1] || "", version: match[2] || "0" };
        }
        var match = rOpera.exec(ua);
        if (match != null) {
            return { browser: match[1] || "", version: match[2] || "0" };
        }
        var match = rChrome.exec(ua);
        if (match != null) {
            return { browser: match[1] || "", version: match[2] || "0" };
        }
        var match = rSafari.exec(ua);
        if (match != null) {
            return { browser: match[2] || "", version: match[1] || "0" };
        }
        if (match != null) {
            return { browser: "", version: "0" };
        }
    }
    var browserMatch = uaMatch(userAgent.toLowerCase());
    if (browserMatch.browser) {
        browser = browserMatch.browser;
        version = browserMatch.version;
    }
    $('#' + ctrl).text("Version:" + browser + '  ' + version);
}

/*
领先科技CTI集成SDK主类
*/
(function (window) {
    var LXKJ = (function () {
        "use strict";
        var
            productName = 'LXKJ',
            productVersion = 'v0.0.2';

        return {
            name: function () {
                return productName;
            },
            version: function () {
                return productVersion;
            }
        };
    }());

    /*话机状态*/
    var STATUS = {
        None: 0,
        Idle: 1,
        Pickup: 2,
        Dialing: 3,
        Dtmf: 4,
        Ringing: 5,
        Talking: 6,
        Hangup: 7,
        Busy: 13,
    };

    /**
* @fileoverview JsSIP EventEmitter
*/

    /**
     * @augments JsSIP
     * @class Class creating an event emitter.
     */

    LXKJ.EventEmitter = function () { };

    LXKJ.EventEmitter.prototype = {
        /**
         * Initialize events dictionary.
         * @param {Array} events
         */
        initEvents: function (events) {
            var i = events.length;

            this.events = {};
            this.onceNotFired = []; // Array containing events with _once_ defined tat didn't fire yet.
            this.maxListeners = 10;
            this.events.newListener = function (event) { // Default newListener callback
                console.log('new Listener added to event: ' + event);
            };

            while (i--) {
                console.log('Adding event: ' + events[i]);
                this.events[events[i]] = [];
            }
        },

        /**
        * Check whether an event exists or not.
        * @param {String} event
        * @returns {Boolean}
        */
        checkEvent: function (event) {
            if (!this.events[event]) {
                console.log('No event named: ' + event);
                return false;
            } else {
                return true;
            }
        },

        /**
        * Add a listener to the end of the listeners array for the specified event.
        * @param {String} event
        * @param {Function} listener
        */
        addListener: function (event, listener) {
            if (!this.checkEvent(event)) {
                return;
            }

            if (this.events[event].length >= this.maxListeners) {
                console.log('Max Listeners exceeded for event: ' + event);
            }

            this.events[event].push(listener);
            this.events.newListener.call(null, event);
        },

        on: function (event, listener) {
            this.addListener(event, listener);
        },

        /**
        * Add a one time listener for the event.
        * The listener is invoked only the first time the event is fired, after which it is removed.
        * @param {String} event
        * @param {Function} listener
        */
        once: function (event, listener) {
            this.events[event].unshift(listener);
            this.onceNotFired.push(event);
        },

        /**
        * Remove a listener from the listener array for the specified event.
        * Caution: changes array indices in the listener array behind the listener.
        * @param {String} event
        * @param {Function} listener
        */
        removeListener: function (event, listener) {
            if (!this.checkEvent(event)) {
                return;
            }

            var array = this.events[event], i = 0, length = array.length;

            while (i < length) {
                if (array[i] && array[i].toString() === listener.toString()) {
                    array.splice(i, 1);
                } else {
                    i++;
                }
            }
        },

        /**
        * Remove all listeners from the listener array for the specified event.
        * @param {String} event
        */
        removeAllListener: function (event) {
            if (!this.checkEvent(event)) {
                return;
            }

            this.events[event] = [];
        },

        /**
        * By default JsSIP.EventEmitter will print a warning if more than 10 listeners are added for a particular event. This function allows that limit to be modified.
        * @param {Number} listeners
        */
        setMaxListeners: function (listeners) {
            if (Number(listeners)) {
                this.maxListeners = listeners;
            }
        },

        /**
        * Get the listeners for a specific event.
        * @param {String} event
        * @returns {Array}  Array of listeners for the specified event.
        */
        listeners: function (event) {
            return this.events[event];
        },

        /**
        * Execute each of the listeners in order with the supplied arguments.
        * @param {String} events
        * @param {Array} args
        */
        emit: function (event, sender, data) {
            var listeners, length,
              idx = 0;

            if (!this.checkEvent(event)) {
                return;
            }

            console.log('Emitting event: ' + event);

            listeners = this.events[event];
            length = listeners.length;

            var e = new LXKJ.Event(event, sender, data);

            if (e) {
                for (idx; idx < length; idx++) {
                    listeners[idx].apply(null, [e]);
                }
            } else {
                for (idx; idx < length; idx++) {
                    listeners[idx].call();
                }
            }

            // Check whether _once_ was defined for the event
            idx = this.onceNotFired.indexOf(event);

            if (idx !== -1) {
                this.onceNotFired.splice(idx, 1);
                this.events[event].shift();
            }
        },

        /**
        * This function is executed anytime a new listener is added to EventEmitter instance.
        * @param {Function} listener
        */
        newListener: function (listener) {
            this.events.newListener = listener;
        }
    };

    LXKJ.Event = function (type, sender, data) {
        this.type = type;
        this.sender = sender;
        this.data = data;
    };

    /*连接器对象*/
    LXKJ.Linker = function (config) {
        /*事件名称*/
        var events = [
            'loaded',           //配置加载成功
            'failed',           //配置加载失败，失败时会提供type:事件类型  cause: 失败原因。
            'connecting',       //正在连接
            'connected',        //连接成功
            'loginready',       //签入准备状态
            'logining',         //正在签入
            'logined',          //签入成功
            'incoming',         //来电事件
            'statechanged',   	//状态变化事件
            'outcalling',       //正在外呼事件
            'recording',        //接收到录音地址事件
            'logout',           //退出事件
            'hangup',           //挂机事件
            'operate',          //操作结果事件
            'notification',     //通知类消息到达事件  //add by niwz 2017.09.11
			'queueinfo'		 //队列坐席消息到达事件 //add by niwz 2018.03.12
        ];

        var self = this;
        this.loaded = false;        //配置加载是否成功
        this.ctrlLinker = null;     //CTI控件内容。
        this.ctrlPhone = null;     //集成话机控件。
        //Edge下：Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393
        //IE 11.0 : Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; rv:11.0) like Gecko
        this.msie = /(msie\s|trident.*rv:|edge\/)([\w.]+)/.exec(navigator.userAgent.toLowerCase()) != null;
        this.setting = {  //默认的设置值
            address: "",                         //CTI服务器的地址。
            port: 6111,                         //CTI端口号
            domain: "",                         //域名，适用于使用集成IP电话时，即useSipPhone为True，默认为CTI服务器地址
            rport: 1935,                        //RTMP端口号
            useSipPhone: false,            //是否为集成IP电话模式
            extension: "",                      //分机号码
            agent: "",                            //座席工号
            passwd: "",                         //签入密码
            autologin: false,                 //是否自动签入，包括在集成IP电话时，是否自动连接
            autoanswer: false,              //是否自动摘机，适用于集成IP电话模式
            divLinker: "",                      //CTI控件容器ID
            divPhone: ""                       //FS软电话控件容器
        };
        this.divSecurity = null;
        this.statu = STATUS.None;
        this.sessionId = "";
        this.callUuid = "";
        this.initEvents(events);
        this.iscallout = false;
        this.lastError = "";
        //
        this.loaded = this.LoadConfig(config);

        this.findCtrl = function (bPhone) {
            var ctrlId = bPhone ? this.setting.divPhone : this.setting.divLinker;
            if (ctrlId.substring(0, 1) != '#')
                ctrlId = '#' + ctrlId;

            return $(ctrlId);
        }

        /*创建IE下的Flash控件*/
        this.createElementObject = function (ctrlId, url, rtmp) {
            //获取IE下的Flash版本
            try {
                var obj = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
                if (obj) {
                    var d = obj.GetVariable("$version");
                    console.log("FlashVersion:", d);
                }
            }
            catch (e) {
                console.log("createElementObject", e.message);
            }
            //
            var width = rtmp == "" ? "1px" : "250px";
            var height = rtmp == "" ? "1px" : "150px";
            var paramStr = rtmp == "" ? "" : '<param name="flashvars" value="rtmp_url=' + rtmp + '" />';
            var objHtml = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" '
                + 'type="application/x-shockwave-flash" data="' + url + '" width="' + width + '" height="' + height + '"><param name="movie" value="' + url + '">'
                + '<param name="menu" value="false" /><param name="quality" value="high" /><param name="allowScriptAccess" value="always" />' + paramStr + "</object>";
            var div = document.createElement("div");
            div.innerHTML = objHtml;
            //替换当前节点
            var el = document.getElementById(ctrlId);
            var o = div.firstChild;
            el.parentNode.replaceChild(o, el);
            o.id = ctrlId;
            //        return ['<object '+myclass+'  id="', this.movieName, '" type="application/x-shockwave-flash" data="', this.settings.flash_url, '" width="', this.settings.button_width, '" height="', this.settings.button_height, '" class="swfupload">',
            //'<param name="wmode" value="', this.settings.button_window_mode, '" />',
            //'<param name="movie" value="', this.settings.flash_url, '" />',
            //'<param name="quality" value="high" />',
            //'<param name="menu" value="false" />',
            //'<param name="allowScriptAccess" value="always" />',
            //'<param name="flashvars" value="' + this.getFlashVars() + '" />',
            //'</object>'].join("");
            //};
        };

        /*
        加载Flash控件。
        */
        this.loadSWF = function (bPhone) {
            var ctrlId = bPhone ? this.setting.divPhone : this.setting.divLinker;
            var swf = bPhone ? "./LXFlashSWITCH.swf" : "./LXFlashLinker.swf";
            var rtmp = bPhone ? 'rtmp://' + this.setting.domain + ':' + this.setting.rport + '/phone' : "";
            //var para = {};
            //if (bPhone)                
            //IE环境创建Flash的方法 //add by niwz 2017.05.23
            if (this.msie) {
                this.createElementObject(ctrlId, swf, rtmp);
            }
            else {
                //嵌入swf
                if (bPhone) {
                    swfobject.embedSWF(swf, ctrlId, "250px", "150px", "10.0.0", "expressInstall.swf", { rtmp_url: rtmp }, { allowScriptAccess: 'always' }, []);
                }
                else {
                    swfobject.embedSWF(swf, ctrlId, "1px", "1px", "10.0.0", "expressInstall.swf", [], [], []);
                }
            }
            //隐藏swf
            if (ctrlId.substring(0, 1) != '#')
                ctrlId = '#' + ctrlId;
            if (bPhone)
                this.ctrlPhone = $(ctrlId);
            else
                this.ctrlLinker = $(ctrlId);
            //
            if (this.msie/*swfobject.ua.ie*/) {
                if (bPhone) {
                    //正在连接
                    this.fireEvent("connecting");
                }
                $(ctrlId).css("top", "-400px");
                $(ctrlId).css("left", "-400px");
            } else {
                $(ctrlId).css("visibility", "hidden");
            }
        };
        /*
        状态变化
        */
        this.fireStateChanged = function (o, n, d) {
            //
            if (n == 1 || n == 0 || n == 13)
                this.iscallout = false;
            this.fireEvent("statechanged", { oldstate: o, newstate: n, routeData: d });
            this.statu = (n * 1);
        };

        /*
        触发事件。
        */
        this.fireEvent = function (event, data) {
            this.emit(event, this, data);
        };
        /*
       触发失败事件。
       */
        this.fireFailedEvent = function (type, message) {
            console.log("FireFailedEvent:", { type: type, cause: message });
            this.emit("failed", this, { type: type, cause: message });
        };
        /*检查麦克风是否静音*/
        this.checkMic = function () {
            if (!this.setting.useSipPhone)
                return true;
            //
            try {
                if (this.findCtrl(true)[0].isMuted()) {
                    return false;
                } else {
                    return true;
                }
            } catch (err) {
                return false;
            }
        }
        /*显示安全选项*/
        this.showPrivacy = function (bChecked) {
            if (!this.setting.useSipPhone)
                return;

            if (!bChecked) {
                if (this.checkMic())
                    return;
            }
            //动态添加一个对话框
            if (this.divSecurity == null) {
                $(document.body).append('<div id="divFlashSecurity" style="display: none; position: relative;left: 0;top: 0;z-index:9999" title="音频设备授权"><div id="divFakeFlashSecurity"></div></div>');
                this.divSecurity = $("#divFlashSecurity")[0];
                //debugger;
                $("#divFlashSecurity").dialog({
                    autoOpen: false,
                    modal: true,
                    resizable: false,
                    buttons: {
                        "确定": function () {
                            $(this).dialog("close");
                        }
                    },
                    //width: 350,
                    //minWidth: 320,
                    minHeight: 110,
                    drag: function () {
                        var flash = global_instance.findCtrl(true);
                        var fake_flash = $("#divFakeFlashSecurity");
                        var offset = fake_flash.offset();

                        flash.css("left", offset.left);
                        flash.css("top", offset.top + 20);
                    },
                    open: function () {
                        var flash = global_instance.findCtrl(true);
                        var fake_flash = $("#divFakeFlashSecurity");
                        var offset = fake_flash.offset();

                        //$(this).css({ "border": "1px solid red" });
                        //$(this).width("260px");
                        fake_flash.width("268px");
                        fake_flash.height("145px");
                        //fake_flash.css({ "border": "1px solid blue" });
                        //
                        flash.css("width", "216px");
                        flash.css("height", "144px");
                        flash.css("position", "absolute");
                        flash.css("left", offset.left + 28);
                        flash.css("top", offset.top);
                        flash.css("visibility", "visible");
                        flash.css("z-index", 10000);
                        flash[0].showPrivacy();
                    },
                    close: function () {
                        var flash = global_instance.findCtrl(true);
                        var fake_flash = $("#divFakeFlashSecurity");
                        flash.css("visibility", "hidden");
                        flash.css("width", "1");
                        flash.css("height", "1");
                        flash.css("left", 0);
                        flash.css("top", 0);
                        flash.css("z-index", "auto");
                    }
                });
            }
            //
            $("#divFlashSecurity").dialog('open');
        };
        //
        global_instance = this;
    };
    /*事件触发器*/
    LXKJ.Linker.prototype = new LXKJ.EventEmitter();
    /*加载配置信息，支持重载*/
    LXKJ.Linker.prototype.LoadConfig = function (config) {
        if (config == null)
            return false;
        //检查当前的连接情况
        if (this.loaded) {
            this.Logout("loadconfig");
        }
        //如果只传递了一个字符型的，则默认为CTI地址。
        if (typeof config === 'string' || config instanceof String) {
            this.setting.address = config;
        }
        else {
            //加载配置
            for (var p in this.setting) {
                if (config.hasOwnProperty(p)) {
                    this.setting[p] = config[p];
                }
            }
        }
        //动态创建该控件
        if (this.setting.divLinker == "")
            this.setting.divLinker = "divAheadtecFlashLinker";
        this.ctrlLinker = document.getElementById(this.setting.divLinker);
        if (this.ctrlLinker === null) {
            $(document.body).append('<div id="' + this.setting.divLinker + '" style="display: none; position: relative;left:-3px;top:-2px;width:1px;height:1px;"><h1>Alternative content</h1><p><a href="http://www.adobe.com/go/getflashplayer">Get Adobe Flash player</a></p></div>');
            this.ctrlLinker = document.getElementById(this.setting.divLinker);
            $("#" + this.setting.divLinker).css("visibility", "hidden");
        }
        if (this.ctrlLinker === null) {
            this.fireFailedEvent('loadconfig', "无效的CTI控件.");
            return false;
        }
        //加载Link控件
        this.loadSWF(false);
        //
        if (this.setting.address.length < 4) {
            this.fireFailedEvent('loadconfig', "无效的CTI地址.");
            return false;
        }
        if (this.setting.port < 400 || this.setting.port > 65500) {
            this.fireFailedEvent('loadconfig', "无效的CTI端口号.");
            return false;
        }
        if (this.setting.extension.length < 4) {
            this.fireFailedEvent('loadconfig', "无效的分机.");
            return false;
        }
        if (this.setting.agent.length < 1)
            this.setting.agent = this.setting.extension;
        //集成电话模式
        if (this.setting.useSipPhone) {
            if (this.setting.domain === '')
                this.setting.domain = this.setting.address;
            //
            if (this.setting.divPhone == "")
                this.setting.divPhone = "divAheadtecFlashPhone";
            this.ctrlPhone = document.getElementById(this.setting.divPhone);
            if (this.ctrlPhone === null) {
                $(document.body).append('<div id="' + this.setting.divPhone + '"><h1>Alternative content</h1><p><a href="http://www.adobe.com/go/getflashplayer">Get Adobe Flash player</a></p></div>');
                $("#" + this.setting.divPhone).css("visibility", "hidden");
                this.ctrlPhone = document.getElementById(this.setting.divPhone);
            }
            if (this.ctrlPhone === null) {
                this.fireFailedEvent('loadconfig', "无效的集成话机控件.");
                return false;
            }
            if (this.setting.rport < 400 || this.setting.rport > 65500) {
                this.fireFailedEvent('loadconfig', "无效的集成话机端口.");
                return false;
            }
            //加载Phone控件
            this.loadSWF(true);
        }
        //Flash加载需要一定的时间，延时执行设置和签入
        //也可以通过OnSWITCHLoaded、OnConnected回调函数进行触发
        //setTimeout(function () {
        //    var inst = global_instance;
        //    if (inst == null)
        //        return;
        //    //已经加载的，则不再加载
        //    if (inst.loaded == true)
        //        return;
        //    //设置服务器信息
        //    try {
        //        var ctrl = document.getElementById(inst.setting.divLinker);
        //        if (ctrl != null)
        //            ctrl.SetCTIServer(inst.setting.address, inst.setting.port);
        //    }
        //    catch (e) {
        //        console.log("SetCTIServer:", e.message);
        //        inst.fireFailedEvent('SetCTIServer', e.message);
        //        return;
        //    }
        //    //
        //    inst.emit("loaded", inst, {});
        //    //加载成功
        //    inst.loaded = true;
        //    //自动签入
        //    if (inst.setting.autologin)
        //        inst.Login();
        //}, 1000);
        //
        return true;
    };

    /*
    签入CTI功能。
    */
    LXKJ.Linker.prototype.loginCTI = function () {
        var extn = this.setting.extension;
        var agent = this.setting.agent;
        var passwd = this.setting.passwd;
        //注册IP软电话
        if (this.setting.useSipPhone && this.ctrlPhone != null) {
            var ctrl = this.findCtrl(true);
            if (ctrl != null) {
                var u = extn + '@' + this.setting.domain;
                ctrl[0].register(u, agent);
            }
        }
        if (this.ctrlLinker != null) {
            this.fireEvent("logining", { source: "ctilogin" });
            var ctrl = this.findCtrl(false);
            if (ctrl != null) {
                //判断连接状态
                if (!ctrl[0].GetConnectionStatu()) {
                    ctrl[0].SetCTIServer(this.setting.address, this.setting.port);
                    //等待连接状态返回
                    //var count = 1;
                    //while (!ctrl[0].GetConnectionStatu() && count < 10) {
                    //    sleep(100);
                    //    count++;
                    //}
                    //未连接则退出
                    //if (!ctrl[0].GetConnectionStatu()) {
                    //    this.fireFailedEvent('Login', "Invalid CTI control.");
                    //    return;
                    //}
                }
                //签入操作
                ctrl[0].LogOn(extn, agent, passwd);
                this.fireEvent('logined', { source: "ctilogin" });
            }
            return;
        }
        this.fireFailedEvent('Login', "无效的CTI控件.");
    };

    /*
    登录到FS软电话。
    */
    LXKJ.Linker.prototype.LoginFS = function () {
        var inst = global_instance;
        if (inst == null)
            return;
        //未拿SessionId时需要等待  //add by niwz 2017.06.13
        if (!inst.sessionId || inst.sessionId.length < 2) {
            setTimeout(global_instance.LoginFS, 1000);
            return;
        }
        //登录
        try {
            inst.fireEvent("logining", { source: "siplogin" });
            inst.findCtrl(true)[0].login(inst.setting.extension + "@" + inst.setting.domain, inst.setting.passwd);
            return true;
        }
        catch (e) {
            setTimeout(global_instance.LoginFS, 1000);
        }
    }
    /*
    发送按键消息。
    */
    LXKJ.Linker.prototype.SendDTMF = function (key) {
        if (!this.loaded) {
            return false;
        }
        //
        try {
            var ctrl = this.findCtrl(true)[0];
            ctrl.sendDTMF(key, 2000);
        }
        catch (e) { }
    }
    /*
    签入操作。
    @extn : 分机号
    @agent :座席号
    @passwd :密码
    */
    LXKJ.Linker.prototype.Login = function () {
        if (!this.loaded) {
            return false;
        }
        //注册软电话
        if (this.setting.useSipPhone) {
            this.LoginFS();
            return true;
        }
        //直接签入
        this.loginCTI();
    };

    /*
    签出系统。
    */
    LXKJ.Linker.prototype.Logout = function (flag) {
        if (this.ctrlLinker != null) {
            try {
                var ctrl = this.findCtrl(false)[0];
                ctrl.LogOff(flag);
            }
            catch (e) { }
        }
        //取消注册
        if (this.setting.useSipPhone && this.ctrlPhone != null) {
            var agent = this.setting.extension;
            var addr = this.setting.domain;
            var u = agent + "@" + addr;
            var ctrl = this.findCtrl(true)[0];
            try {
                ctrl.unregister(u, this.setting.agent);
                ctrl.logout(u);
            }
            catch (e) { }
        }
        //签出事件
        this.fireEvent("logout", { cause: "logout" });
        this.statu = STATUS.None;
    };

    /*
    置忙或置闲
    */
    LXKJ.Linker.prototype.SetInGroup = function (bDND) {
        if (this.ctrlLinker != null) {
            if (bDND)
                this.findCtrl(false)[0].SetOutGroup();
            else
                this.findCtrl(false)[0].SetInGroup();
            console.log("SetInGroup", { bDND: bDND });
        }
    };
    /*
    外呼号码。
    */
    LXKJ.Linker.prototype.MakeCall = function (caller) {
        if (this.ctrlLinker != null) {
            try {
                this.iscallout = true;
                this.findCtrl(false)[0].DialOut(caller);
                console.log("MakeCall", { Destination: caller });
            }
            catch (e) {
                this.iscallout = false;
            }
        }
    };

    /*
    转接号码。
    */
    LXKJ.Linker.prototype.TransferCall = function (caller) {
        if (this.ctrlLinker != null) {
            this.findCtrl(false)[0].TransferCall(caller);
            console.log("TransferCall", { Destination: caller });
        }
    };

    /*
    设置呼叫转移号码。
    */
    LXKJ.Linker.prototype.SetDivert = function (dstNum, state) {
        if (this.ctrlLinker != null) {
            this.findCtrl(false)[0].SetDivert(dstNum, state);
            console.log("SetDivert", { Destination: dstNum, State: state });
        }
    };

    /*
    加入三方通话。
    */
    LXKJ.Linker.prototype.JoinCall = function (dstNum) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].JoinCall(dstNum);   //先尝试是否有该方法，有可能Flash文件是旧的
                console.log("JoinCall", { Destination: dstNum });
            }
            catch (e) {
                try {
                    this.findCtrl(false)[0].BSetupConf(this.setting.extension, this.setting.extension, dstNum);
                    console.log("BSetupConf", { Destination: dstNum });
                }
                catch (e) {
                    console.log("BSetupConf failed:" + e.description);
                }
            }
        }
    }

    /*
	创建三方通话，用于兼容板卡老程序。  //add by niwz 2018.03.13
	*/
    LXKJ.Linker.prototype.BSetupConf = function (agentId, confName, dstNum) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].BSetupConf(this.setting.extension, confName, dstNum);
                console.log("BSetupConf", { Destination: dstNum });
            }
            catch (e) {
                console.log("BSetupConf failed:" + e.description);
            }
        }
    }

    /*
	对会议中某个号码的通道进行“静音/取消静音”操作。  //add by niwz 2018.03.13
	*/
    LXKJ.Linker.prototype.SetConfGroupMute = function (confName, caller, bMuted) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].BSetupConf(this.setting.extension, confName, dstNum);
                console.log("BSetupConf", { Destination: dstNum });
            }
            catch (e) {
                console.log("BSetupConf failed:" + e.description);
            }
        }
    }

    /*
    监听
    */
    LXKJ.Linker.prototype.Listen = function (agent) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].Listen(agent);
                console.log("Listen", { Destination: agent });
            }
            catch (e) {
                console.log("Listen failed:" + e.description);
            }
        }
    }

    /*
    强插
    */
    LXKJ.Linker.prototype.Intrude = function (agent) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].Intrude(agent);
                console.log("Intrude", { Destination: agent });
            }
            catch (e) {
                console.log("Intrude failed:" + e.description);
            }
        }
    }


    /*
    强拆
    */
    LXKJ.Linker.prototype.Interrupt = function (agent) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].Interrupt(agent);
                console.log("Interrupt", { Destination: agent });
            }
            catch (e) {
                console.log("Interrupt failed:" + e.description);
            }
        }
    }

    /*
    挂断当前通话。
    */
    LXKJ.Linker.prototype.Hangup = function () {
        if (this.ctrlLinker != null) {
            this.findCtrl(false)[0].Hangup();
        }
        if (this.ctrlPhone != null) {
            this.findCtrl(true)[0].hangup(this.callUuid);
        }
    };

    /*
    应答当前通话。
    */
    LXKJ.Linker.prototype.Answer = function () {
        if (this.ctrlPhone != null) {
            this.findCtrl(true)[0].answer(this.callUuid);
        }
    };

    /*
    当前通话启用/停用 静音模式。
    */
    LXKJ.Linker.prototype.CaptureSound = function (bMuted) {
        if (this.ctrlPhone != null) {
            this.findCtrl(true)[0].CaptureSound(bMuted);
        }
    };
    /*
    发送短信。
    */
    LXKJ.Linker.prototype.SendSMS = function (caller, smsinfo) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].SendSMS(caller, smsinfo);
                console.log("SendSMS", { Caller: caller, SMSInfo: smsinfo });
            }
            catch (e) {
                console.log("SendSMS failed:" + e.description);
            }
        }
    }

    /*
	获取队列信息。  add by niwz 2018.03.12
	*/
    LXKJ.Linker.prototype.GetQueueInfo = function (count) {
        if (this.ctrlLinker != null) {
            try {
                this.findCtrl(false)[0].GetQueueInfo(count);
                console.log("GetQueueInfo", { Count: count });
            }
            catch (e) {
                console.log("GetQueueInfo failed:" + e.description);
            }
        }
    }

    /*
    关闭系统。
    */
    LXKJ.Linker.prototype.Shutdown = function (flag) {
        this.Logout(flag);
        //销毁所有内容
        if (this.ctrlLinker != null) {
            var ctrl = this.findCtrl(false);
            if (ctrl != null) {
                try {
                    ctrl[0].LogOff();
                    ctrl.remove();
                }
                catch (e) { }
            }
            //$('#' + this.setting.divLinker).remove();
            this.ctrlLinker = null;
        }
        //
        if (this.ctrlPhone != null) {
            var ctrl = this.findCtrl(true);
            if (ctrl != null) {
                //取消注册
                var agent = this.setting.extension;
                var addr = this.setting.domain;
                var u = agent + "@" + addr;
                try {
                    ctrl[0].unregister(u, this.setting.agent);
                    ctrl[0].logout(u);
                }
                catch (e) { }
                //断开连接
                try {
                    ctrl[0].disconnect();
                    ctrl.remove();
                }
                catch (e) { }
            }
            this.ctrlPhone = null;
        }
        //
        if (this.divSecurity != null) {
            $(this.divSecurity).remove();
            divSecurity = null;
        }
        //
        this.events = {};
        //
        global_instance = null;
    };

    //链接内容
    window.LXKJ = LXKJ;
}(window));

/*
页面刷新时关闭当前实例
*/
window.onbeforeunload = function (event) {
    //alert("onbeforeunload");
    if (global_instance != null) {
        global_instance.Shutdown("onbefore");
        global_instance = null;
    }
};
/*********************************************************************LXFlashLinker.swf********************************************************************/

/*
Flash控件加载完成回调
*/
function OnSWITCHLoaded() {
    console.log("OnSWITCHLoaded");
    var inst = global_instance;
    if (inst != null) {
        if (!inst.loaded) {
            //设置服务器信息
            try {
                var ctrl = document.getElementById(inst.setting.divLinker);
                if (ctrl != null)
                    ctrl.SetCTIServer(inst.setting.address, inst.setting.port);
            }
            catch (e) {
                console.log("SetCTIServer_OnSWITCHLoaded:", e.message);
                inst.fireFailedEvent('SetCTIServer_OnSWITCHLoaded', e.message);
                return;
            }
            //
            inst.emit("loaded", inst, {});
            //加载成功
            inst.loaded = true;
            //自动签入
            if (inst.setting.autologin)
                inst.Login();
        }
    }
}

/*
该函数为消息输出日志，实际使用场景中并不需要。
*/
function printSocketInfo(sLine) {
    if (sLine !== "") {
        console.log("printSocketInfo:", sLine);
        if (global_instance != null) {  //添加最后的错误消息。
            var inst = global_instance;
            inst.lastError = "";
            try {
                var args = sLine.split("/");
                if (args.length > 2 && $.trim(args[1]) == '-1') {
                    inst.lastError = args[2];
                }
            }
            catch (e) {
                inst.lastError = sLine;
            }
        }
    }
}

/*
状态变化回调事件。
*/
function OnAgentIDStateChange(oldState, newState, sData) {
    console.log("OnAgentIDStateChange:", { oldState: oldState, newState: newState, sData: sData });
    if (global_instance != null) {
        global_instance.fireStateChanged(oldState, newState, sData);
    }
}

/*
显示具体操作状态
*/
function showReturnState(id, iRet, state) {
    var data =
        {
            opId: id,
            operate: state,
            value: iRet,
            result: (iRet == 0 ? "成功" : "失败")
        };
    console.log("showReturnState", data);
    if (global_instance != null) {
        global_instance.fireEvent('operate', data);
    }
}

/*
签入操作返回状态
*/
function OnLogIn(iRet) {
    showReturnState(102, iRet, "签入");
    if (iRet == 0 && global_instance != null) {
        global_instance.fireEvent('logined', {});
    }
}

/*
签出操作
*/
function OnLogOut(iRet) {
    showReturnState(103, iRet, "签出");
    //踢下线时
    if (iRet == 0 && global_instance != null) {
        var inst = global_instance;
        inst.fireStateChanged(inst.statu, 0, null);
        //注销
        inst.Shutdown("logout");
    }
}

/*
设置呼叫转移返回状态
*/
function OnSetDivert(iRet) {
    showReturnState(110, iRet, "设置转移");
}

/*
软外拨操作返回状态
*/
function OnDialOut(iRet) {
    showReturnState(107, iRet, "软外拨");
}
/*
置闲操作返回状态
*/
function OnSetInGroup(iRet) {
    showReturnState(108, iRet, "置闲");
}

/*
转接操作返回状态
*/
function OnTransferCall(iRet) {
    showReturnState(106, iRet, "转接");
}

/*
置忙操作返回状态
*/
function OnSetOutGroup(iRet) {
    showReturnState(109, iRet, "置忙");
}

/*
三方通话返回状态。
*/
function OnJoinCall(iRet) {
    showReturnState(129, iRet, "三方通话");
}

/*
会议操作返回状态。
*/
function OnBSetupConf(iRet) {
    showReturnState(130, iRet, "创建会议");
}

/*
设置会议通道静音返回状态。
*/
function OnSetConfGroupMute(iRet) {
    showReturnState(136, iRet, "会议通道静音");
}

/*
接收到录音地址
*/
function OnBListenAddress(filePath, httpPath) {
    console.log("OnBListenAddress:", httpPath);
    if (global_instance != null) {
        global_instance.fireEvent("recording", { recordUrl: httpPath });
    }
}
/*
CTI来电事件
*/
function OnCallIn(caller, called, trunkNum, sData) {
    console.log("OnCallIn:", [caller, called, trunkNum, sData]);
    if (global_instance != null) {
        //处理随路数据的是否为转接的电话功能  //by niwz 2017.05.31
        var transfered = false;
        var pos = sData.indexOf("_Transfered");
        var caller_uuid = "";
        if (pos > 0) {
            if (sData.length > pos + 13)
                caller_uuid = sData.substring(pos + 13);
            //
            sData = sData.substring(0, pos);
            transfered = true;
        }
        global_instance.fireEvent("incoming", { callIn: true, flag: false, caller: caller, called: called, trunk: trunkNum, sData: sData, transfered: transfered, caller_uuid: caller_uuid });
    }
}

/*
侦听结果。
*/
function OnListen(iRet) {
    showReturnState(114, iRet, "侦听");
}

/*
通知类消息回调函数
//add by niwz 2017.09.11
*/
function OnNotification(head, data) {
    console.log("OnNotification:", [head, data]);
    //触发事件
    if (global_instance != null)
        global_instance.fireEvent("notification", { head: head, data: data });
}

/*
短信发送结果。
*/
function OnSendSMS(iRet) {
    showReturnState(161, iRet, "发送短信");
}

/*
队列信息返回
*/
function OnGetQueueInfo(iRet, queue) {
    console.log("OnGetQueueInfo:", [iRet, queue]);
    //触发事件
    if (global_instance != null)
        global_instance.fireEvent("queueinfo", { queue: queue });
}

/*
CTI连接成功时的回调。
*/
function OnConnected(bLogin) {
    console.log("OnConnected: CTI server connected:" + bLogin);
    //调用可以执行签入的回调  //modify by niwz 2017.05.22
    if (!bLogin && global_instance != null)
        global_instance.fireEvent("loginready", {});
}

/*
CTI连接已断开。
*/
function OnDisconnected() {
    console.log("OnDisconnected: CTI server disconnected.");
    if (global_instance != null) {
        var inst = global_instance;
        //inst.Shutdown();
        //取消注册
        if (inst.setting.useSipPhone && inst.ctrlPhone != null) {
            var agent = inst.setting.extension;
            var addr = inst.setting.domain;
            var u = agent + "@" + addr;
            var ctrl = inst.findCtrl(true)[0];
            try {
                ctrl.unregister(u, inst.setting.agent);
                ctrl.logout(u);
            }
            catch (e) { }
        }
        try {
            inst.fireEvent("logout", { cause: "shutdown" });
            inst.statu = STATUS.None;
        } catch (e) { }

        global_instance = null;
        //if (inst.setting.autologin) {
        //    //5秒钟后自动重连
        //    setTimeout(function () {
        //        var inst = global_instance;
        //        if (inst == null)
        //            return;
        //        //
        //        var ctrl = document.getElementById(inst.setting.divLinker);
        //        if (ctrl != null)
        //            ctrl.SetCTIServer(inst.setting.address, inst.setting.port);
        //    }, 5000);
        //}
    }
}
/*
消息输出句柄。
*/
function printPacket(packet) {
    console.log("printPacket:", { packet: packet });
}

/*
异常消息处理委托回调。
*/
function ProccessException(flag, msg) {
    console.log("ProccessException:", { flag: flag, message: msg });
}

/*********************************************************************LXFlashSWITCH.swf********************************************************************/
/*
FS软电话初始化成功(Debian下无此函数时会报错)。
*/
function onFSInit() {
    console.log("onFSInit");
}

/*
FS连接成功。
*/
function onFSConnected(sessionid) {
    console.log("onFSConnected:", sessionid);
    if (global_instance != null) {
        global_instance.sessionId = sessionid;
        global_instance.fireEvent("connected", { sessionId: sessionid });
        //显示Flash安全选项
        global_instance.showPrivacy();
    }
};

/*
FS断开时，持续重连
*/
function onFSDisconnected() {
    console.log("onFSDisconnected.");
    //断开CTI操作  //add by niwz 2017.06.05
    //OnDisconnected();  //修改成为重新签入连接  //modify by niwz 2017.09.26
    if (global_instance != null) {
        if (global_instance.setting.autologin && global_instance.ctrlPhone != null) {
            //自动重连
            setTimeout(function () {
                global_instance.findCtrl(true)[0].connect();
            }, 5000);
        }
    }
    else {
        OnDisconnected();
    }
};

/*
FS登录成功回调事件。
*/
function onFSLogin(status, user, domain) {
    console.log("onFSLogin:", [status, user, domain]);
    if (global_instance == null)
        return;
    //
    if (status != "success") {
        global_instance.fireFailedEvent("FSLogin", "集成话机登录失败.");
        return;
    }
    //登录CTI
    global_instance.loginCTI();
}

/*
FS呼入电话回调。
*/
function onFSIncomingCall(uuid, name, number, account, evt) {
    console.log("onFSIncomingCall:", [uuid, name, number, account, evt]);
    if (global_instance != null) {
        global_instance.callUuid = uuid;
        if (global_instance.setting.autoanswer) {  //自动应答
            global_instance.Answer();
        }
        //触发incoming事件
        var isCallIn = !global_instance.iscallout;
        global_instance.fireEvent("incoming", { callIn: isCallIn, uuid: uuid, called: number, flag: true });
    }
};

/*
挂机事件回调。
*/
function onFSHangup(uuid, cause) {
    console.log("onFSHangup:", { uuid: uuid, cause: cause });
    if (global_instance != null) {
        global_instance.fireEvent('hangup', {});
    }
}

/*
输出信息
*/
function onFSDebug(message) {
    console.log("onFSDebug:", [message]);
}

/*
状态变化。
*/
function onFSCallState(uuid, state) {
    console.log("onFSCallState:", { uuid: uuid, state: state });
}