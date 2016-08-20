var test = function () {
    this.sam = "123";

    this.say5 = function () { 

        console.log("!" + this.sam);
        this.say();
    }

};
test.prototype = {
    constructor: test,
    dosometing: function () {
        this.say();
    },
    say: function () {
        console.log("good");
    },

    say3: function (callBack) { 
        
        if(callBack!=null){
            return callBack;
        }
    }

}




var kc = new test();
//var kc3 = new test();
//kc.say3(function () {
     
//    console.log("cool");
//});
//kc3.say3(function () {
//    console.log("cool2");
//});

console.log(kc.say5());


//kc.say3();
//kc3.say3();
//kc.say3();


