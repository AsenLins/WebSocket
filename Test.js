var webSocketServer = require("./WebSocketServer.js");
var repl = require('repl');


var connection = new Object(null);

var remoteTest = function (cmd, context, filename, callback) {
    for (var i in connection) {
        var wsclient = connection[i];
        wsclient.socket.write(wsclient.sendData(cmd,1));
    }
    callback(null, "{result pending}");
}


webSocketServer(
    function () { 
        console.log("这是监听端口后的事件");
    }, 
    function (wsClient) {
        
        var connid = Math.random().toString();
        connection[connid] = wsClient;
        console.log(connid + "已连接。");
       
        wsClient.onMessage(function (data) {
            console.log(data);
            wsClient.socket.write(wsClient.sendData("1",9));
        });
        
        wsClient.onClose(function (closeCode,closeReson) { 
            console.log("this is Close");
        });

        wsClient.onError(function (e) { 
            console.log("this is error");
        });



    }, 
   
    8030);


repl.start({"eval":remoteTest});
