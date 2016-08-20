var webSocketServer = require("./WebSocketServer.js");

webSocketServer(
    function () {
        console.log("这是监听端口后的事件");
    }, 
    function (wsClient) {
        
        var connid = Math.random().toString();
        connection[connid] = wsClient;
        console.log(connid + "已连接。");
        wsClient.socket.on("data", function (message) {
            console.log(connid + "输入的信息：" + wsClient.readData(message));
        });
        wsClient.socket.on("close", function () {
            delete connection[connid];
            console.log(connid + "已关闭");
        });
        
        wsClient.socket.on("error", function () { 
        
        });


    }, 
   
    8030);