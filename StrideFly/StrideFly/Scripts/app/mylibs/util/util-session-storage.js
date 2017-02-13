(function () {
    define(["jQuery", "kendo"], function ($, kendo) {

        var _liveObject = {};
        //var _subscriptions = {};
        var _toUpdate;

        var setVar = function (varName, val) {
            if (varName != undefined && varName.length && val != undefined) {
                _liveObject[varName] = val;

                if (!_toUpdate) {
                    _toUpdate = setTimeout(function () {
                        updateWindowName();
                        _toUpdate = undefined;
                    }, 50);
                }

              //  publish(varName);

                return true;
            }
            return false;       
        };


        var getVar = function (varName) {
            return _liveObject[varName] || false;
        };


        var removeVar = (function (varName) {
            if (_liveObject[varName] != undefined) {
                delete _liveObject[varName];
                if (!_toUpdate) {
                    _toUpdate = setTimeout(function () {
                        updateWindowName();
                        _toUpdate = undefined;
                    }, 50);
                }

                return true;
            }

            return false;
        });


/*        var publish = function (varName) {
            if (_subscriptions[varName]) {
                    for (var iX in _subscriptions[varName]) {
                        for (var iI = 0, iL = _subscriptions[varName][iX].length; iI < iL; iI++) {
                            _subscriptions[varName][iX][iI]();
                        }
                    }
                }
            };

            var _subscribe = (function (varName, callback) {
                if (varName != undefined && varName.length && callback != undefined && typeof callback === "function") {
                    var tempName = varName.split("."),
                    realVarName = tempName[0],
                    namespaceName = tempName[1] || "default";

                    if (_subscriptions[realVarName] && _subscriptions[realVarName][namespaceName]) {
                        _subscriptions[realVarName][namespaceName].push(callback);
                    }
                    else {
                        _subscriptions[realVarName] = _subscriptions[realVarName] || {};
                        _subscriptions[realVarName][namespaceName] = [callback];
                    }

                    return true;

                }

                return false;
            });

            var _unsubscribe = (function (varName) {
                if (varName.length) {
                    var tempName = varName.split("."),
                    realVarName = tempName[0],
                    namespaceName = tempName[1] || "default";

                    if (_subscriptions[realVarName] && _subscriptions[realVarName][namespaceName]) {
                        delete (_subscriptions[realVarName][namespaceName]);
                        return true;
                    }

                    return false;
                }

                return false;
            });*/


        var updateWindowName = function () {
            window.name = JSON.stringify(_liveObject);
        };


        var initFunction = (function () {
            if (window.name.length) {
                _liveObject = JSON.parse(window.name);
                  /*  for (var xI in _liveObject) {
                        publish(xI);
                    }*/
            }
        });


        var init = (function () {
            if (window.addEventListener) {
                window.addEventListener("load", initFunction, false);
            }
            else if (window.attachEvent) {
                window.attachEvent("onload", initFunction);
            }
            else {
                var oOnload = window.onload;
                window.onload = function () {
                    oOnload();
                    initFunction();
                }
            }
        })();

        return {
            setVar: setVar,
            getVar: getVar,
            removeVar: removeVar,
            //subscribe: _subscribe,
            //unsubscribe: _unsubscribe
        }
    });
}).call(this);