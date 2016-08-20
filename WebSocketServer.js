var net = require("net"),
    crypto = require("crypto"),
    http = require("http")

var wsServer=function createSocektServer(createServerCallBack, socketCallBack, port) {
    
    var httpServer = http.createServer(function (argument) {
        
    });
    
    httpServer.listen(port, function () {
        console.log("服务已创建,端口：" + port);
        createServerCallBack();
    });
    
    httpServer.on("upgrade", function (req, socket, head) {
        var clientConnectin = new wsClient(req, socket, head);       
        clientConnectin.shakeHands(req);
        clientConnectin.Heartbeat();
        socketCallBack(clientConnectin);
    });
}


module.exports = wsServer;


var wsClient = function (req, socket, head) {
    var that = this;
    
    this.socket = socket;
    this.req = req;
    this.head = head;
    this.HeartbeatTime = 5000;
    this.onlineStatus = true;

    
   
    this.closeEvent = null;
    this.errorEvent = null;
    this.dataEvent = null;
    
    
    this.Heartbeat = function () {
        setTimeout(function () {
            if (onlineStatus) {
                that.socket.write(that.sendData(0, 9));
                onlineStatus = false;
            }
            else {

            }
        }, HeartbeatTime);    
    }

    this.onClose = function (callBack) {
        this.closeEvent = callBack;
    };
    this.onError = function (callBack) {
        this.errorEvent = callBack;
    };
    this.onMessage = function (callback) {
        this.dataEvent = callback;
    };
    
    
    this.socket.on("data", function (data) {
        var _readObj = that.readData(data);
        
        if (_readObj.dataType == "text") {
            that.dataEvent(_readObj.data);
        }
        else if (_readObj.dataType == "close"){
            that.closeEvent(_readObj.closeCode, _readObj.closeReson);
        }
        else if (_readObj.dataType == "pong"){
            that.onlineStatus = true;
        }
    });
    

        

    this.socket.on("error", function () {
            that.errorEvent();
    });

}

var readObj = function (){
    this.target = "";
    this.dataType= ""
    this.data = "";
    this.closeReson = "";
    this.closeCode ="";
}




wsClient.prototype = {
    constructor: wsClient,
    //onPing: function (callBack) {
    //    return callBack;
    //},
    //onPong: function (callBack) {
    //    return callBack;
    //},
    //onClose: function (callBack) {
    //    return callBack;
    //},
    //onError: function (callBack) {
    //    this.socket.on("error", function (e) {
    //        callBack(e);
    //    });
    //},
    //onMessage: function (callback) {
    //    this.socket.on("data", function (data) {
    //        var _readObj = this.readData(data);
            
    //        if (_readObj.dataType == "text") {
    //            callback(_readObj.data);
    //        }
    //        else if (_readObj.dataType == "close") {
    //            this.onClose(_readObj.closeCode, _readObj.closeReson)();
    //        }
    //        else if (_readObj.dataType == "ping") {
    //            this.onPing()();
    //        }
    //        else if (_readObj.dataType == "pong") {
    //            this.onPong()();
    //        }
    //    });
    //},
    readData: function (data) {
        var readIndex = 2;
        var fin = data.readUInt8(0) >> 7;
        var opcode = data.readUInt8(0) & 0x7f;
        var isMask = data.readUInt8(1) >> 7;
        var dataLength = 0;
        var maskBytes = new Buffer(4);
        
        dataLength = data.readUInt8(1) & 0x7f;
        
        /*如果长度为126则要截取后2个字节为数据长度*/
        console.log("fin:" + fin);
        console.log("当前长度:" + dataLength);
        if (dataLength == 126) {
            dataLength = data.readUInt16BE(2);
            readIndex = readIndex + 2;
        }

	    /*如果长度为127则要截取后8个字节为数据长度*/
        else if (dataLength == 127) {
            var hightbit = data.readUInt32BE(2);
            if (hightbit > 0) {
                /*关闭连接,因为NodeJs Buffer模块最多只能读取4个字节二进制Int */
                return;
            }
            dataLength = data.readUInt32BE(6);
            readIndex = readIndex + 8;
        }
        
        if (dataLength == 0) {
            
            return;
        }
        
        if (isMask == 1) {
            maskBytes = data.slice(readIndex, readIndex + 4);
            readIndex = readIndex + 4;
        }
        
        var rawData = data.slice(readIndex, readIndex + dataLength);
        
        if (isMask == 1) {
            
            var payload = new Buffer(rawData.length);
            for (var i = 0; i < rawData.length; i++) {
                
                payload[i] = rawData[i] ^ maskBytes[i % 4];
            }
            rawData=payload;
        }
        
        var _readObj = new readObj();
        switch (opcode) {
            case 1:
                _readObj.data = rawData.toString("utf8");
                _readObj.dataType = "text";
                
                break;

            case 2:
                //console.log("二进制,官方不推荐这种传输了。");
                break;

            case 8:
                _readObj.closeCode= rawData.readUInt16BE(0);
                _readObj.closeReson = rawData.slice(2, rawData.length);
                _readObj.dataType = "close";
                break;

            case 9:
                _readObj.dataType = "ping";
                _readObj.data = "";
                break;

            case 10:
                _readObj.dataType = "pong";
                _readObj.data = "";
                break;
        }
        return _readObj;    
    },
    
    sendData: function (message,opcode) {
        var meslength = Buffer.byteLength(message);
        var mesBuffer = new Buffer(message);
        var dataBuffer = null;
        
        if (meslength < 126) {
            dataBuffer = new Buffer(meslength + 2);
            dataBuffer.writeUInt8(0x81 | opcode, 0);
            dataBuffer.writeUInt8(meslength, 1)
            dataBuffer.write(message, 2, meslength, "utf8");
        }
        else if (meslength > 126 && meslength <= 65535) {
            dataBuffer = new Buffer(meslength + 4);
            dataBuffer.writeUInt8(0x81 | opcode, 0);
            dataBuffer.writeUInt8(126, 1);
            dataBuffer.writeUInt16BE(meslength, 2);
            dataBuffer.write(message, 4, meslength, "utf8");
        }
        else {
            dataBuffer = new Buffer(meslength + 10);
            dataBuffer.writeUInt8(0x81 | opcode, 0);
            dataBuffer.writeUInt8(127, 1);
            dataBuffer.writeUInt32BE(0, 2);
            dataBuffer.writeUInt32BE(meslength, 6);
            dataBuffer.write(message, 4, meslength, "utf8");
        }
        
        return dataBuffer;
    },
    
    /*创建服务端握手验证返回的包头

	arguments:
	webSocketKey:客户端发送古来的Sec-WebSocket-Key。
	
	Return:
	headArray:数组。

    */
    shakeHands:function (req) {
        var webSocketKey = req["headers"]["sec-websocket-key"];
        var headArray = new Array();
        var key = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        var hash = crypto.createHash("sha1");
        hash.update(webSocketKey.trim() + key);
        
        var cryptoAcceptKey = hash.digest("base64");
        
        headArray.push("HTTP/1.1 101 Switching Protocols");
        headArray.push("Upgrade:websocket");
        //headArray.push("Origin:http://192.168.1.230:8001");
        headArray.push("Connection:Upgrade");
        //headArray.push("Sec-WebSocket-Protocol: chat");
        headArray.push("Sec-WebSocket-Accept:" + cryptoAcceptKey);

        this.socket.write(headArray.join("\n") + "\r\n\r\n");
    }
   
}




