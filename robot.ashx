<%@ WebHandler Language="C#" Class="robot" %>

using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Web;
using System.Text;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Net.Sockets;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

/// <summary>
/// 机器人管理测试页面。
/// </summary>
public class robot : IHttpHandler
{
    //const string hangupKeys = "挂机;滚蛋;去死;再见;去你妈的;你个死王八蛋;";
    //const string transferKeys = "转人工;转座席;找客服;转客服;转坐席;";

    lxkj_asr_engine engine = lxkj_asr_engine.defaultEngine;

    /// <summary>
    /// 处理请求。
    /// </summary>
    /// <param name="context"></param>
    public void ProcessRequest(HttpContext context)
    {
        var rsp = context.Response;
        var req = context.Request;
        //跨域请求
        rsp.AddHeader("Access-Control-Allow-Origin", "*");
        rsp.ContentEncoding = Encoding.UTF8;
        rsp.ContentType = "text/json";
        rsp.Clear();

        var oper = req["operate"];
        //执行指令
        if (string.Compare(oper, "command", true) == 0)
        {
            var code = req["code"];
            var data = req["objstring"];
            var appkey = req["appkey"];
            var baseData = req["objbase64"];
            var curEncodeData = Convert.ToBase64String(Encoding.UTF8.GetBytes(data));
            try
            {
                var md5str = Utils.GetMD5WithString(curEncodeData);
                MemoryStream ms = new MemoryStream();
                byte[] buffer;
                using (BinaryWriter writer = new BinaryWriter(ms))
                {
                    writer.Write(Encoding.UTF8.GetBytes(appkey));
                    writer.Write(Encoding.UTF8.GetBytes(md5str));
                    writer.Write(Encoding.UTF8.GetBytes(curEncodeData));
                    buffer = ms.ToArray();
                }
#if USE_TCP_CLIENT
                using (TcpClient clnt = new TcpClient())
                {
                    clnt.Connect("192.168.1.96", 6119);
                    //发送数据
                    NetworkStream stream = clnt.GetStream();
                    stream.Write(buffer, 0, buffer.Length);
                    //读取响应
                    byte[] readBuffer = new byte[1024];
                    StringBuilder recvString = new StringBuilder();
                    int readBytes = 0;
                    do
                    {
                        readBytes = stream.Read(readBuffer, 0, readBuffer.Length);
                        if (readBytes > 0)
                            recvString.Append(Encoding.UTF8.GetString(readBuffer, 0, readBytes));
                    } while (stream.DataAvailable);
                    //
                    rsp.Write(recvString.ToString());
                }
#else
                //httprequest模式
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://192.168.1.96:6119");
                request.Method = "POST";
                request.ContentLength = buffer.Length;
                request.ContentType = "application/x-www-form-urlencoded; charset=UTF-8";
                var stream = request.GetRequestStream();
                stream.Write(buffer, 0, buffer.Length);
                //读取响应
                HttpWebResponse myResponse = (HttpWebResponse)request.GetResponse();  
                StreamReader reader = new StreamReader(myResponse.GetResponseStream(), Encoding.UTF8);  
                string content = reader.ReadToEnd();  
                //
                rsp.Write(content);
#endif
            }
            catch (Exception ex)
            {
                rsp.Write("{\"retCode\":-1,\"retMsg\":\"" + ex.Message + "\"}");
            }
            rsp.End();
            return;
        }
        //ASR处理
        if (string.Compare(oper, "asr", true) == 0)
        {
            byte[] buffer = req.BinaryRead(req.ContentLength);
            string strJson = Encoding.UTF8.GetString(buffer);
            strJson = Encoding.UTF8.GetString(Convert.FromBase64String(strJson));
            JObject jobj = (JObject)JsonConvert.DeserializeObject(strJson);
            string appkey = jobj["appkey"].ToString();
            string uuid = jobj["uuid"].ToString();
            string asr = jobj["asrtext"].ToString();
            JObject staff = new JObject();
            staff.Add(new JProperty("appkey", appkey));
            staff.Add(new JProperty("uuid", uuid));
            /*
            //null、http、agent、hangup、text
            if (string.IsNullOrEmpty(asr))
            {
                //不予以处理
                staff.Add(new JProperty("type", "null"));
            }
            else if (hangupKeys.Contains(asr))
            {
                //挂机
                staff.Add(new JProperty("type", "hangup"));
                //挂机语音(支持http以及文件路径或需要TTS转换的文本)
                staff.Add(new JProperty("value", "感谢您的接听，再见！"));
            }
            else if (transferKeys.Contains(asr))
            {
                //转座席
                staff.Add(new JProperty("type", "agent"));
                //可以指定转接的座席列表，以分号分隔
                //staff.Add(new JProperty("value", "7011;7012;7013;7014;"));
            }
            else
            {
                //独立文本处理
                staff.Add(new JProperty("type", "text"));
                staff.Add(new JProperty("value", "返回文本" + asr));
            }*/
            //ASR处理引擎
            var ap = engine.Match(asr);
            if (ap != null)
            {
                staff.Add(new JProperty("type", ap.Type.ToString()));
                staff.Add(new JProperty("value", ap.Value));
            }
            rsp.Write(staff.ToString());
            rsp.End();
            return;
        }
        //End回调
        if (string.Compare(oper, "end", true) == 0)
        {
            byte[] buffer = req.BinaryRead(req.ContentLength);
            string strJson = Encoding.UTF8.GetString(buffer);
            strJson = Encoding.UTF8.GetString(Convert.FromBase64String(strJson));
            JObject Jo = (JObject)JsonConvert.DeserializeObject(strJson);
            JToken token = Jo["phoneinfo"];
            string caller = token["caller"].ToString();
            JObject staff = new JObject();
            staff.Add(new JProperty("retCode", 0));
            staff.Add(new JProperty("caller", caller));
            rsp.Write(staff.ToString());
            rsp.End();
        }
    }

    public bool IsReusable { get { return false; } }
}
/// <summary>
/// ASR返回类型。
/// </summary>
public enum lxkj_asr_type
{
    none = 0,
    http = 1,
    agent = 2,
    hangup = 3,
    text = 4,
    breakoff = 5,
    keepon = 6,
}

//{"type":1,"value":"http://192.168.1.92:8888/maotai.mp3","keywords":["挂机","滚蛋","去死","再见","去你妈的","你个死王八蛋"],"Excludes":["有趣死","说再见"]}
/// <summary>
/// ASR识别条件。
/// </summary>
[Serializable]
public class lxkj_asr_pair
{
    /// <summary>
    /// 符合条件并返回的类型。
    /// </summary>
    public lxkj_asr_type Type { get; set; }
    /// <summary>
    /// 符合条件时返回的音乐内容。
    /// </summary>
    public string Value { get; set; }
    /// <summary>
    /// 包含的关键字。
    /// </summary>
    public List<string> KeyWords { get; private set; }
    /// <summary>
    /// 排斥的关键字。
    /// </summary>
    public List<string> Excludes { get; private set; }
    /// <summary>
    /// 构造函数
    /// </summary>
    public lxkj_asr_pair()
    {
        KeyWords = new List<string>();
        Excludes = new List<string>();
    }

    /// <summary>
    /// 是否匹配。
    /// </summary>
    /// <param name="key"></param>
    /// <returns></returns>
    public bool IsMatched(string key)
    {
        if (string.IsNullOrEmpty(key))
            return false;
        //分词
        //排斥的词语
        if (Excludes.Contains(key))
            return false;
        //包含模式
        if (key.ToCharArray().Length > 4)
        {
            if (KeyWords.Exists(s => s.Contains(key)))
                return true;
        }

        //逐个匹配
        if (!KeyWords.Contains(key))
            return false;
        //
        return true;
    }
}

/// <summary>
/// ASR文本识别引擎。
/// </summary>
public class lxkj_asr_engine
{
    static readonly lxkj_asr_pair NullAP = new lxkj_asr_pair() { Type = lxkj_asr_type.none };
    public static readonly lxkj_asr_engine defaultEngine = new lxkj_asr_engine("");
    /// <summary>
    /// 模板名称。
    /// </summary>
    public string TemplateName { get; private set; }
    /// <summary>
    /// ASR键值队列。
    /// </summary>
    public List<lxkj_asr_pair> ASRPairs { get; private set; }
    /// <summary>
    /// 构造一个模板引擎。
    /// </summary>
    /// <param name="filepath"></param>
    public lxkj_asr_engine(string filepath)
    {
        ASRPairs = new List<lxkj_asr_pair>();
        Initialize(filepath);
    }
    /// <summary>
    /// 从文件读取相关配置信息，初始化匹配。
    /// </summary>
    /// <returns>初始化是否成功。</returns>
    public bool Initialize(string filepath)
    {
        try
        {
            //lxkj_asr_pair ap = new lxkj_asr_pair { Type = lxkj_asr_type.hangup, Value = "感谢您的接听，再见。" };
            //ap.KeyWords.AddRange(new string[] { "挂机", "滚蛋", "去死", "再见", "去你妈的", "你个死王八蛋" });
            //ap.Excludes.AddRange(new string[] { "有趣死", "说再见" });
            //var str = Utils.ObjToJsonString<lxkj_asr_pair>(ap);
            //var obj = Utils.JsonStringToObj<lxkj_asr_pair>(str);

            string jsonstr = "{\"type\":3,\"value\":\"感谢您的接听，再见。\",\"keywords\":[\"挂机\",\"滚蛋\",\"去死\",\"再见\",\"好的再见\",\"去你妈的\",\"你个死王八蛋\"],\"Excludes\":[\"有趣死\",\"说再见\"]}";
            ASRPairs.Add(Utils.JsonStringToObj<lxkj_asr_pair>(jsonstr));
            jsonstr = "{\"type\":2,\"value\":\"\",\"keywords\":[\"转人工\",\"转座席\",\"找客服\",\"转客服\",\"转坐席\"],\"Excludes\":[]}";
            ASRPairs.Add(Utils.JsonStringToObj<lxkj_asr_pair>(jsonstr));
            jsonstr = "{\"type\":5,\"value\":\"我在，您说。\",\"keywords\":[\"等一下\",\"等会再说\",\"你听我说\",\"慢一点\",\"我上个厕所\"],\"Excludes\":[]}";
            ASRPairs.Add(Utils.JsonStringToObj<lxkj_asr_pair>(jsonstr));
            jsonstr = "{\"type\":4,\"value\":\"贵宾您好，这套系统是按照使用的情况来计算费用的，每个机器人每月的租赁费用是200元，非常的划算，可以大大的降低您的人工费用。\",\"keywords\":[\"多少钱\",\"什么价格\",\"什么价\",\"要钱吗\",\"几块钱\",\"怎么租\"],\"Excludes\":[]}";
            ASRPairs.Add(Utils.JsonStringToObj<lxkj_asr_pair>(jsonstr));
            jsonstr = "{\"type\":4,\"value\":\"一分价钱一分货，系统确实不错，而且还能降低您的人工费用。\",\"keywords\":[\"太贵了\",\"好贵的\",\"可以便宜点吗\",\"有折扣吗\",\"便宜点\",\"有套餐吗\"],\"Excludes\":[]}";
            ASRPairs.Add(Utils.JsonStringToObj<lxkj_asr_pair>(jsonstr));
            jsonstr = "{\"type\":6,\"value\":\"\",\"keywords\":[\"你继续\",\"继续说\",\"接着说\",\"然后呢\"],\"Excludes\":[]}";
            ASRPairs.Add(Utils.JsonStringToObj<lxkj_asr_pair>(jsonstr));
        }
        catch (Exception)
        {

        }
        return true;
    }

    /// <summary>
    /// 查找返回匹配的内容。
    /// </summary>
    /// <param name="key"></param>
    /// <returns></returns>
    public lxkj_asr_pair Match(string key)
    {
        //分词处理
        //去掉语气词
        string localKey = key.Replace("嗯", "").Replace("啊", "").Replace("哦", "").Replace("？", "").Replace("！", "");
        if (string.IsNullOrEmpty(localKey))
            return NullAP;

        //可考虑匹配数量情况，启用多线程计算
        var ap = ASRPairs.Find(p => p.IsMatched(localKey));
        return ap != null ? ap : NullAP;
    }
}

/// <summary>
/// 工具函数。
/// </summary>
public class Utils
{
    /// <summary>  
    /// 对象转为json  
    /// </summary>  
    /// <typeparam name="ObjType"></typeparam>  
    /// <param name="obj"></param>  
    /// <returns></returns>  
    public static string ObjToJsonString<ObjType>(ObjType obj) where ObjType : class
    {
        string s = JsonConvert.SerializeObject(obj);
        return s;
    }
    /// <summary>  
    /// json转为对象  
    /// </summary>  
    /// <typeparam name="ObjType"></typeparam>  
    /// <param name="JsonString"></param>  
    /// <returns></returns>  
    public static ObjType JsonStringToObj<ObjType>(string JsonString) where ObjType : class
    {
        ObjType s = JsonConvert.DeserializeObject<ObjType>(JsonString);
        return s;
    }
    /// <summary>
    /// 生成唯一字符串
    /// </summary>
    /// <returns></returns>
    public static string GetNewId()
    {
        return Guid.NewGuid().ToString().Replace("-", "").ToLower();
    }

    /// <summary>
    /// 生成字符串的MD5值。
    /// </summary>
    /// <param name="sDataIn"></param>
    /// <returns></returns>
    static public string GetMD5WithString(string sDataIn)
    {
        string str = "";
        //
        byte[] data = Encoding.GetEncoding("utf-8").GetBytes(sDataIn);
        MD5 md5 = new MD5CryptoServiceProvider();
        byte[] bytes = md5.ComputeHash(data);
        for (int i = 0; i < bytes.Length; i++)
        {
            str += bytes[i].ToString("x2");
        }
        return str;
    }
    /// <summary>
    /// 获取web会话ID号。
    /// </summary>
    /// <returns></returns>
    public static string GetSessionId()
    {
        string sessionId = string.Empty;
        try
        {
            if (System.Web.HttpContext.Current == null)
                sessionId = "CurrentIsNull";
            else if (System.Web.HttpContext.Current.Session == null)
                sessionId = "SessionIsNull";
            //
            if (System.Web.HttpContext.Current != null && System.Web.HttpContext.Current.Session != null)
                sessionId = System.Web.HttpContext.Current.Session.SessionID;
        }
        catch (Exception)
        {
        }
        //
        if (string.IsNullOrEmpty(sessionId))
            sessionId = GetNewId();
        //
        return sessionId;
    }
    /// <summary>
    /// 获取web客户端ip
    /// </summary>
    /// <returns></returns>
    public static string GetWebClientIp()
    {
        string userIP = "未获取用户IP";
        try
        {
            if (System.Web.HttpContext.Current == null
        || System.Web.HttpContext.Current.Request == null
        || System.Web.HttpContext.Current.Request.ServerVariables == null)
                return "";

            string CustomerIP = "";

            //CDN加速后取到的IP
            CustomerIP = System.Web.HttpContext.Current.Request.Headers["Cdn-Src-Ip"];
            if (!string.IsNullOrEmpty(CustomerIP))
            {
                return CustomerIP;
            }

            CustomerIP = System.Web.HttpContext.Current.Request.ServerVariables["HTTP_X_FORWARDED_FOR"];
            if (!String.IsNullOrEmpty(CustomerIP))
                return CustomerIP;

            if (System.Web.HttpContext.Current.Request.ServerVariables["HTTP_VIA"] != null)
            {
                CustomerIP = System.Web.HttpContext.Current.Request.ServerVariables["HTTP_X_FORWARDED_FOR"];
                if (CustomerIP == null)
                    CustomerIP = System.Web.HttpContext.Current.Request.ServerVariables["REMOTE_ADDR"];
            }
            else
            {
                CustomerIP = System.Web.HttpContext.Current.Request.ServerVariables["REMOTE_ADDR"];

            }

            if (string.Compare(CustomerIP, "unknown", true) == 0)
                return System.Web.HttpContext.Current.Request.UserHostAddress;
            return CustomerIP;
        }
        catch { }

        return userIP;
    }
}