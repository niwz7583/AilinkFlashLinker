AilinkFlashLinker����˵��

һ������

AilinkFlashLinker��һ����ȫ����Flash��CTI���ӿؼ����ܹ��ڲ�ͬ�������ʵ����AilinkServer��AilinkSWITCH��CTI������������жԽӡ��ÿؼ�ʹ��Javascript���н���������������֧��B/SӦ�õļ��ɡ�

AilinkFlashLinker��Ҫ��������swf�ļ���˵�����£�
1��LXFlashLinker.swf  ��Ҫ������CTI������֮���ǩ�롢ǩ������æ�����С����Ⲧ��CTI������
2��LXFlashSWITCH.swf  ���ɵ绰ģʽ�����ڴ���IP��������ʵ�����������ʹ�ü�����������Ƶ����˷��豸��������ͨ�绰֮���ͨ�������ļ��ķ���˱���ΪAilinkSWITCH����֧��AilinkServerϵ�У�

�������뼯�ɲ���

����1����������5��js�ļ�
<link href="jquery-ui.css" rel="stylesheet" type="text/css" />
<script language="javascript" content-type="text/javascript" src="swfobject.js"></script>
<script language="javascript" type="text/javascript" src="jquery-3.2.1.js"></script>
<script language="javascript" content-type="text/javascript" src="jquery.min.js"></script>
<script type="text/javascript" src="jquery-ui.min.js"></script>
<script language="javascript" type="text/javascript" src="jquery.tmpl.js"></script>
<script language="javascript" type="text/javascript" src="AilinkFlashLinker.js"></script>


����AilinkFlashLinker.js���ص��װ���ļ�(���ļ���Ҫswfobject.js��jquery.js)������js�ļ�������ʵ��ʹ�ù������鿼�ǡ�


����2�����÷�������Ϣ

�ṩһ��������Ϣ����ʵ�����༴�ɣ��磺
var conf = {
address: 192.168.1.96,
extension: 8001,
passwd: 8001,
};

var local_linker = new LXKJ.Linker();

����Ĳ�����Ϣ���£�
address: "",                         //CTI�������ĵ�ַ��
port: 6111,                         //CTI�˿ں�
domain: "",                         //������������ʹ�ü���IP�绰ʱ����useSipPhoneΪTrue��Ĭ��ΪCTI��������ַ
rport: 1935,                        //RTMP�˿ں�
useSipPhone: false,            //�Ƿ�Ϊ����IP�绰ģʽ
extension: "",                      //�ֻ�����
agent: "",                            //��ϯ����
passwd: "",                         //ǩ������
autologin: false,                 //�Ƿ��Զ�ǩ�룬�����ڼ���IP�绰ʱ���Ƿ��Զ�����
autoanswer: false,              //�Ƿ��Զ�ժ���������ڼ���IP�绰ģʽ
divLinker: "",                      //CTI�ؼ�����ID
divPhone: ""                       //FS��绰�ؼ�����


����3���ҽ��¼��ص�

����֧�ֵ��¼�������
 'loaded',              //���ü��سɹ�
'failed',                //���ü���ʧ�ܣ�ʧ��ʱ���ṩtype:�¼�����  cause: ʧ��ԭ��
'connecting',       //��������
'connected',        //���ӳɹ�
'logining',            //����ǩ��
'logined',             //ǩ��ɹ�
'incoming',          //�����¼�
'statechanged',   //״̬�仯�¼�
'outcalling',         //��������¼�
'recording',         //���յ�¼���¼�
'logout',              //�˳��¼�

�ҽ��¼��ķ������£�
//������Ϣ�ص�
local_linker.on("incoming", function (event) {
var d = event.data;
if (!d.callIn) {  //���Զ�����ʱ��ʾժ����ť
	$("#log").append("incoming: caller:" + d.caller + "  uuid:" + d.uuid + "<br/>");
}
else {
	$("#log").append("incoming: caller:" + d.caller + "  called:" + d.called + " trunk:" + d.trunk + " sData:" + d.sData + "<br/>");
}
});

�ҽ�����Ҫ�¼��ص������󣬼������ã�ִ��local_linker.LoadConfig(conf);

����4�����"ǩ�롢ǩ��"�ű�
$("#btnLogin").click(function () {
    if (local_linker == null) {
        softAlert("�����÷�������Ϣ�����ԣ�");
        return;
    }
    if ($("#btnLogin").text() == 'ǩ��') {
        local_linker.Login();
        $("#btnLogin").text('ǩ��');
    }
    else {
        local_linker.Logout();
        $("#btnLogin").text('ǩ��');
    }
});

����5�����"���Ⲧ"�ű�
$("#btnDialout").click(function () {
    if (local_linker == null) {
        softAlert("�����÷�������Ϣ�����ԣ�");
        return;
    }
    if ($("#telno").val() == '') {
        softAlert("������绰��������ԣ�");
        return;
    }
    //���к���
    local_linker.MakeCall($("#telno").val());
});


������Ϣ���Բο�index.html��AilinkFlashLinker.js��Դ�����Լ�Ailink SDK�ķ����¼�����˵����


			�������ȿƼ����޹�˾
                            2017.05.11
