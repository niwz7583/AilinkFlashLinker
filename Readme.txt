AilinkFlashLinker集成说明

一、概述

AilinkFlashLinker是一个完全基于Flash的CTI连接控件，能够在不同浏览器上实现与AilinkServer、AilinkSWITCH等CTI服务器软件进行对接。该控件使用Javascript进行交互操作，可完美支持B/S应用的集成。

AilinkFlashLinker主要包括两个swf文件，说明如下：
1、LXFlashLinker.swf  主要负责与CTI服务器之间的签入、签出、置忙、置闲、软外拨等CTI操作；
2、LXFlashSWITCH.swf  集成电话模式，用于代替IP话机，可实现在浏览器中使用计算机本身的音频和麦克风设备进行与普通电话之间的通话；该文件的服务端必须为AilinkSWITCH，不支持AilinkServer系列；

二、代码集成步骤

步骤1、引用以下5个js文件
<link href="jquery-ui.css" rel="stylesheet" type="text/css" />
<script language="javascript" content-type="text/javascript" src="swfobject.js"></script>
<script language="javascript" type="text/javascript" src="jquery-3.2.1.js"></script>
<script language="javascript" content-type="text/javascript" src="jquery.min.js"></script>
<script type="text/javascript" src="jquery-ui.min.js"></script>
<script language="javascript" type="text/javascript" src="jquery.tmpl.js"></script>
<script language="javascript" type="text/javascript" src="AilinkFlashLinker.js"></script>


其中AilinkFlashLinker.js是重点封装的文件(该文件需要swfobject.js和jquery.js)，其它js文件可以在实际使用过程酌情考虑。


步骤2、设置服务器信息

提供一个配置信息，并实例化类即可，如：
var conf = {
address: 192.168.1.96,
extension: 8001,
passwd: 8001,
};

var local_linker = new LXKJ.Linker();

更多的参数信息如下：
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


步骤3、挂接事件回调

该类支持的事件包括：
 'loaded',              //配置加载成功
'failed',                //配置加载失败，失败时会提供type:事件类型  cause: 失败原因。
'connecting',       //正在连接
'connected',        //连接成功
'logining',            //正在签入
'logined',             //签入成功
'incoming',          //来电事件
'statechanged',   //状态变化事件
'outcalling',         //正在外呼事件
'recording',         //接收到录音事件
'logout',              //退出事件

挂接事件的方法如下：
//来电消息回调
local_linker.on("incoming", function (event) {
var d = event.data;
if (!d.callIn) {  //非自动接听时显示摘机按钮
	$("#log").append("incoming: caller:" + d.caller + "  uuid:" + d.uuid + "<br/>");
}
else {
	$("#log").append("incoming: caller:" + d.caller + "  called:" + d.called + " trunk:" + d.trunk + " sData:" + d.sData + "<br/>");
}
});

挂接所需要事件回调函数后，加载配置，执行local_linker.LoadConfig(conf);

步骤4、添加"签入、签出"脚本
$("#btnLogin").click(function () {
    if (local_linker == null) {
        softAlert("请设置服务器信息后再试！");
        return;
    }
    if ($("#btnLogin").text() == '签入') {
        local_linker.Login();
        $("#btnLogin").text('签出');
    }
    else {
        local_linker.Logout();
        $("#btnLogin").text('签入');
    }
});

步骤5、添加"软外拨"脚本
$("#btnDialout").click(function () {
    if (local_linker == null) {
        softAlert("请设置服务器信息后再试！");
        return;
    }
    if ($("#telno").val() == '') {
        softAlert("请输入电话号码后再试！");
        return;
    }
    //进行呼叫
    local_linker.MakeCall($("#telno").val());
});


更多信息可以参考index.html、AilinkFlashLinker.js的源代码以及Ailink SDK的方法事件函数说明。


			杭州领先科技有限公司
                            2017.05.11
