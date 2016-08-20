var net=require("net"),
	crypto=require("crypto"),
    http = require("http"),
    stream=require("stream")

var client = [];

function createSocektServer(callback,port) {

    var httpServer = http.createServer(function (argument) {
        callback(argument);
    });
    
    httpServer.listen(port);

    httpServer.on("upgrade", function (req, socket, head) {
        //console.log(req);
        console.log("用户升级连接请求。");
        var serverArray = buildServerHead(req["headers"]["sec-websocket-key"]);
        
        //socket.setNoDelay(true);
        socket.setTimeout(0);
        socket.write(serverArray.toString(), "utf-8");
        
        
        var clientConnectin = new wsClient(req, socket, head);
        clientConnectin.shakeHands();
        client.push(clientConnectin);
        
        

        socket.on("data", function (data) {
            ReadData(data, socket, false);
            
            //socket.write(SendData("333", 1));
            socket.write(SendData("", 1));
        });
        socket.on("end", function () {
            console.log("用户断开连接。");
        });

        socket.on("close", function () {
            console.log("关闭");
        });
        var client = new wsClient(req, socket, head);
        client.shakeHands();
    
    });

    return httpServer;
}



//httpServer.timeout = 0;

var wsClient = function (req, socekt, head){
    this.socket = socekt;
    this.req = req;
    this.head = head;
}

wsClient.prototype.bindEvent = function () {
    
    this.socket.on("data", function () { 
        
    });
    this.socket.on("close", function () { 
    
    });
    this.socket.on("end", function () { 
    
    });

    this.socket.on("error", function (had_error) {
        if (had_error) {
            console.log("发生传输错误");
        }
        else {
            console.log("其他错误");
        }
    });

}

wsClient.prototype.closeConnection = function () { 

}

wsClient.prototype.readData=function(message){ 

}
wsClient.prototype.sendData = function (message) { 

}
wsClient.prototype.shakeHands = function () {
    var serverArray = buildServerHead(req["headers"]["sec-websocket-key"]);
    this.socket.write(serverArray);
}




/*读取客户端数据
	
*/
function ReadData(data,socket) {
	/*这里要改一下！*/
	var readIndex=2;
	var fin=data.readUInt8(0) >>7;
	var opcode=data.readUInt8(0) & 0x7f;
	var isMask=data.readUInt8(1)>>7;
	var dataLength=0;
	var maskBytes=new Buffer(4);

    
    dataLength = data.readUInt8(1) & 0x7f;
    
    /*如果长度为126则要截取后2个字节为数据长度*/
    console.log("fin:" + fin);
    console.log("当前长度:" + dataLength);
	if (dataLength==126){
		dataLength=data.readUInt16BE(2);
		readIndex=readIndex+2;
    }

	/*如果长度为127则要截取后8个字节为数据长度*/
    else if (dataLength == 127) {
        var hightbit = data.readUInt32BE(2);
        if (hightbit > 0) {
            /*关闭连接,因为NodeJs Buffer模块最多只能读取4个字节二进制Int */
            return;
        }
        dataLength=data.readUInt32BE(6);
        readIndex = readIndex + 8;
	}
    
    

	if (dataLength==0) {

		return;
	}

	if (isMask==1) {
		maskBytes=data.slice(readIndex,readIndex+4);
		readIndex=readIndex+4;
	}

	var rawData=data.slice(readIndex,readIndex+dataLength);

	if(isMask==1){
		rawData=unMask(maskBytes,rawData);
	}

	//console.log("原始数据长度："+data.length);
	//console.log("数据长度："+dataLength);

	switch (opcode){
		case 1:
                //console.log("文本信息:" + rawData.toString("utf8"));
		break;

		case 2:
			//console.log("二进制,官方不推荐这种传输了。");
		break;

		case 8:
		    var closeCode=rawData.readUInt16BE(0);
		    var reason=rawData.slice(2,rawData.length);
		    console.log("关闭码："+closeCode);
		    console.log("关闭原因："+reason);
		break;

		case 9:
			console.log("客户端或服务器端发送ping");
		break;

		case 10:
			console.log("客户端或服务端发送pong");
		break;

	}



}


function CloseConnection(socket) { 


}

function  SendData(message,opcode) {
    
    
    var meslength = Buffer.byteLength(message);
    var mesBuffer = new Buffer(message);
    var dataBuffer = null;

    if (meslength < 126) {
        dataBuffer=new Buffer(meslength + 2);
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
}


/*用于解除掩码。

	arguments:
	maskBytes:掩码字节。
	data:解密的数据。
	
	Return:
	payload:解密后的数据
*/
function  unMask(maskBytes,data) {
    	var payload=new Buffer(data.length);
   		for(var i=0; i<data.length;i++){

   				payload[i]= data[i] ^  maskBytes[i%4];
   				//console.log(payload[i]);
   		}
   		return payload;  	
}
  



/*创建服务端握手验证返回的包头

	arguments:
	webSocketKey:客户端发送古来的Sec-WebSocket-Key。
	
	Return:
	headArray:数组。

*/
function buildServerHead(webSocketKey) {

	var  headArray=new Array();
	var  key="258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	var  hash=crypto.createHash("sha1");
		 hash.update(webSocketKey.trim()+key);

	var  cryptoAcceptKey=hash.digest("base64");

	headArray.push("HTTP/1.1 101 Switching Protocols");
	headArray.push("Upgrade:websocket");
	//headArray.push("Origin:http://192.168.1.230:8001");
	headArray.push("Connection:Upgrade");
	//headArray.push("Sec-WebSocket-Protocol: chat");
	headArray.push("Sec-WebSocket-Accept:"+cryptoAcceptKey);
    
	return headArray.join("\n") + "\r\n\r\n";
}


