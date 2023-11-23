const utilCommon = {
    getLocalStorageItem: function (key) {
        return utilCommon.useLocalStorage()
            ? window.localStorage.getItem(key)
            : utilCommon.useCookies()
                ? utilCommon.getCookie(key)
                : utilCommon.getLocalVariable(key);
    },

    getSessionStorageItem: function (key) {
        return utilCommon.useLocalStorage()
            ? window.sessionStorage.getItem(key)
            : utilCommon.useCookies()
                ? utilCommon.getCookie(key)
                : utilCommon.getLocalVariable(key);
    },

    getCookie: function(cname) {
        const name = cname + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1);
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        return "";
    },

    getLocalVariable: function(key) {
        return localVariables[key];
    },

    setLocalStorageItem: function (key, value) {
        if (utilCommon.useLocalStorage()) {
            window.localStorage.setItem(key, value);
        } else if (utilCommon.useCookies()) {
            utilCommon.setCookie(key, value);
        } else {
            utilCommon.setLocalVariable(key, value);
        }
    },

    setSessionStorageItem: function (key, value) {
        if (utilCommon.useLocalStorage()) {
            window.sessionStorage.setItem(key, value)
        } else if (utilCommon.useCookies()) {
            utilCommon.setCookie(key, value, 1);
        } else {
            utilCommon.setLocalVariable(key, value);
        }
    },

    setCookie: function(cname, cvalue, days) {
        const d = new Date();
        d.setTime(d.getTime() + ((days || 1) * 24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    },

    setLocalVariable: function(key, value) {
        localVariables[key] = value;
    },

    removeLocalStorageItem: function (key) {
        if (utilCommon.useLocalStorage()) {
            window.localStorage.removeItem(key);
        } else if (utilCommon.useCookies()) {
            utilCommon.removeCookie(key);
        } else {
            utilCommon.removeLocalVariable(key);
        }
    },

    removeSessionStorageItem: function (key) {
        if (utilCommon.useLocalStorage()) {
            window.sessionStorage.removeItem(key);
        } else if (utilCommon.useCookies()) {
            utilCommon.removeCookie(key);
        } else {
            utilCommon.removeLocalVariable(key);
        }
    },

    removeCookie: function(cname) {
        utilCommon.setCookie(cname, null, -1);
    },

    removeLocalVariable: function(key) {
        delete localVariables[key];
    },

    isIOS: function () {
        const iDevice = ['iPad', 'iPhone', 'iPod'];
        for (let i = 0; i < iDevice.length; i++) {
            if (navigator.userAgent.indexOf(iDevice[i]) > -1) {
                return true;
            }
        }

        // VRAS-1850 - Another approach for detecting new iPad versions (iOS 14.4+) is to use navigator.maxTouchPoints instead of the user-agent string
        // This is because the newer user agent string is like "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko)"
        // Whereas the older is "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        // Thanks to a change in iOS around desktop browsing: https://developer.apple.com/videos/play/wwdc2019/203/
        return /^Mac/.test(navigator.platform) &&
            navigator.maxTouchPoints > 4;
    },

    isAndroid: function () {
        return navigator.userAgent.toLowerCase().indexOf("android") > -1;
    },

    /**
     * Waits for the condition function to return true. Optionally pass a
     * waitTimeout in ms to stop waiting once the timeout is reached.
     * @param conditionFunc - The function that will be executed to determine whether the condition has passed.
     * @param [waitTimeout] - The number of ms to wait until ceasing the search, defaults to indefinitely, can also pass 0 for indefinitely.
     * @param [retryInterval] - The retry frequency, defaults to 100ms.
     * @returns {Promise<any>}
     */
    waitForCondition: function (conditionFunc, waitTimeout, retryInterval) {
        retryInterval = utilCommon.isNumber(retryInterval) ? retryInterval : 100;
        let waitedForMs = 0;
        return new Promise(function (resolve, reject) {
            if (conditionFunc()) {
                resolve();
            } else {
                waitForCondition();
            }

            function waitForCondition() {
                if (!conditionFunc()) {
                    if (utilCommon.isNumber(waitTimeout) && waitTimeout !== 0 && waitedForMs >= waitTimeout) {
                        return reject('condition failed after ' + waitTimeout + 'ms');
                    }
                    waitedForMs += retryInterval;
                    setTimeout(function () {
                        waitForCondition();
                    }, retryInterval);
                    return;
                }
                resolve();
            }
        });
    },

    /**
     * Resolves when the `vras` object is detected otherwise rejects after `waitTimeout` or 5 seconds.
     * @param [waitTimeout]
     * @returns {Promise<unknown>}
     */
    waitForNativeAppDetection: function (waitTimeout) {
        waitTimeout = utilCommon.isNumber(waitTimeout) ? waitTimeout : 5000;
        return new Promise(function (resolve, reject) {
            utilCommon.waitForCondition(
                function () {
                    return !!(typeof vras !== 'undefined' && utilCommon.isObject(vras));
                }, waitTimeout
            ).then(function () {
                resolve();
            }).catch(function () {
                reject();
            });
        });
    },

    /**
     * Waits until we know whether the current user is a native app user.
     * @returns {Promise<unknown>}
     */
    waitForNativeAppCheck: function () {
        return new Promise(function (resolve) {
            utilCommon.waitForCondition(function () {
                return typeof stateCommon.isNativeApp === 'boolean';
            }).then(function () {
                resolve();
            });
        });
    },

    isString: function (str) {
        return !!(str && typeof str === 'string');
    },

    isValidString: function (str) {
        return !!(str && typeof str === 'string' && str.trim().length > 0);
    },

    isValidObject: function (obj) {
        return !!(utilCommon.isObject(obj) && Object.keys(obj).length > 0);
    },

    isBoolean: function (boolean) {
        return typeof boolean === 'boolean';
    },

    isNumber: function (number) {
        return !!(typeof number === 'number' && !Number.isNaN(number));
    },

    isObject: function (obj) {
        return !!(obj && typeof obj === 'object');
    },

    matchesOneOf: function (item, items) {
        return utilCommon.isArray(items) && items.indexOf(item) > -1;
    },

    startsWith: function (str, subStr) {
        return !!(utilCommon.isValidString(str) && utilCommon.isValidString(subStr) && str.indexOf(subStr) === 0);
    },

    isFunction: function (func) {
        return !!(func && typeof func === 'function');
    },

    isArray: function (arr) {
        return !!(arr && Array.isArray(arr));
    },

    contains: function (arrOrStr, elemOrStr) {
        return !!((utilCommon.isArray(arrOrStr) || utilCommon.isString(arrOrStr)) && arrOrStr.indexOf(elemOrStr) > -1);
    },

    containsOneOf: function (arrOrStr, elems) {
        if ((!utilCommon.isArray(arrOrStr) && !utilCommon.isString(arrOrStr)) || !utilCommon.isArray(elems)) {
            return false;
        }
        for (let i = 0; i < elems.length; i++) {
            if (arrOrStr.indexOf(elems[i]) > -1) {
                return true;
            }
        }
        return false;
    },

    getLength: function (arrOrStr) {
        if (utilCommon.isArray(arrOrStr) || utilCommon.isString(arrOrStr)) {
            return arrOrStr.length;
        }
        return 0;
    },

    hasItems: function (arrOrObj) {
        return !!(
            (utilCommon.isArray(arrOrObj) && arrOrObj.length > 0) ||
            (utilCommon.isObject(arrOrObj) && Object.keys(arrOrObj).length > 0)
        );
    },

    hasOneItem: function (arrOrObj) {
        return !!(
            (utilCommon.isArray(arrOrObj) && arrOrObj.length === 1) ||
            (utilCommon.isObject(arrOrObj) && Object.keys(arrOrObj).length === 1)
        );
    },

    hasManyItems: function (arrOrObj) {
        return !!(
            (utilCommon.isArray(arrOrObj) && arrOrObj.length > 1) ||
            (utilCommon.isObject(arrOrObj) && Object.keys(arrOrObj).length > 1)
        )
    },

    removeItem: function (arr, item) {
        let i = utilCommon.isArray(arr) ? arr.indexOf(item) : -1;
        if (i > -1) {
            arr.splice(i, 1);
            return true;
        }
        return false;
    },

    isDefined: function (toCheck) {
        return typeof toCheck !== 'undefined';
    },

    isGreaterThanZero: function (toCheck) {
        return toCheck > 0;
    },

    parseObject: function (obj) {
        try {
            obj = JSON.parse(obj);
        } catch (ignore) {
        }
        return obj;
    },

    cloneObject: function (obj) {
        try {
            return (utilCommon.isObject(obj) ? JSON.parse(JSON.stringify(obj)) : null);
        } catch (e) {
            return null;
        }
    },

    cloneArray: function (arr) {
        if (utilCommon.isArray(arr)) {
            return arr.slice();
        }
        return arr;
    },

    mapByProperty: function (arr, property) {
        return arr.reduce(function (objMapping, obj) {
            objMapping[obj[property]] = obj;
            return objMapping;
        }, {});
    },

    /**
     * Wait for a DOM element matching the selector. Optionally pass a
     * waitTimeout in ms to stop waiting once the timeout is reached.
     * @param elemSelector - The CSS selector to use to find the element.
     * @param waitTimeout - The number of ms to wait until ceasing the search, defaults to indefinitely.
     * @param retryInterval - The retry frequency, defaults to 100ms.
     */
    waitForElement: function (elemSelector, waitTimeout, retryInterval) {
        const _this = this;
        retryInterval = utilCommon.isNumber(retryInterval) ? retryInterval : 100;
        let waitedForMs = 0;
        return new Promise(function (resolve, reject) {
            let elem = document.querySelector(elemSelector);
            if (elem) {
                resolve(elem);
            } else {
                waitForElement();
            }

            function waitForElement() {
                elem = document.querySelector(elemSelector);
                if (!elem) {
                    if (utilCommon.isNumber(waitTimeout) && waitedForMs >= waitTimeout) {
                        return reject('element not found after ' + waitTimeout + 'ms');
                    }
                    waitedForMs += retryInterval;
                    setTimeout(function () {
                        waitForElement();
                    }, retryInterval);
                    return;
                }
                resolve(elem);
            }
        });
    },

    /**
     * Simple listener that activates the button when the user presses the space key.
     * @param e
     */
    activateOnSpaceKey: function (e) {
        if (e.key === ' ') {
            this.click();
            this.focus();
        }
    },
    
	keydownEnter: function(e, cb) {
	    if (e && e.key === 'Enter') {
	        if (e.target) {
	            e.target.dispatchEvent(new Event('change'));
	        }
	        if (cb && utilCommon.isFunction(cb)) {
	            cb(e);
	        }
	    }
	},
	
    /**
     * Try to detect whether the user is using the Safari mobile browser.
     */
    isSafariMobile: function () {
        // Do some preliminary checks to ensure we are on iOS and that we are not using the native app (WebView)
        if (stateCommon.isIOS && !stateCommon.isNativeApp && navigator && navigator.userAgent) {
            // Try and distinguish between WebView and basic mobile Safari
            // https://stackoverflow.com/a/37705154
            let userAgent = navigator.userAgent.toLowerCase();
            let isIos = /iphone|ipod|ipad/.test(userAgent); // Detects iOS device (present for both WebView and Safari)
            let isSafari = /safari/.test(userAgent); // Detects Safari browser (not present for WebView)
            return !!(isIos && isSafari);
        }
        return false;
    },

    getScrollPosition: function () {
        return document.documentElement.scrollTop || document.body.scrollTop;
    },

    isAndroidBrowser: function () {
        return !!(stateCommon.isAndroid && !stateCommon.isNativeApp);
    },

    /**
     * Throttles the maximum times the passed function can be invoked over the passed
     * interval. For example, execute this function at most once every 200ms.
     * @param func - The function to be throttled.
     * @param interval - The interval, in ms. Defaults to 200ms.
     * @returns {Function}
     */
    throttle: function (func, interval) {
        let ignoreInvocation;
        return function () {
            const funcThis = this;
            const permitInvocation = function () {
                ignoreInvocation = false;
            };
            if (!ignoreInvocation) {
                func.apply(funcThis, arguments);
                ignoreInvocation = true;
                setTimeout(permitInvocation, interval || 200)
            }
        }
    },

    /**
     * Debounces the passed function so that it will not be invoked again unless a certain interval has passed without
     * it being triggered. For example, execute this function only if 200ms have passed since it was last called.
     * @param func - The function to be debounced.
     * @param interval - The interval, in ms. Defaults to 200ms.
     * @returns {Function}
     */
    debounce: function (func, interval) {
        let timeout;
        return function () {
            const funcThis = this;
            const invokeFunction = function () {
                timeout = 0;
                func.apply(funcThis, arguments);
            };
            clearTimeout(timeout);
            timeout = setTimeout(invokeFunction, interval || 200);
        }
    },

    /**
     * Executes the passed function continuously at the passed interval until
     * `maxExecutions` is reached or forever if `maxExecutions` is 0.
     * @param func {Function} - The function to be executed.
     * @param interval {Number} - How frequently to execute the function, in ms. Defaults to 200ms.
     * @param maxExecutions {Number} - How many times to execute the function after the specified interval.
     *                                 Specify 0 to never stop executing. Defaults to 5.
     *
     * @returns {Promise} When all intervals are done
     */
    executeAtInterval: function (func, interval, maxExecutions) {
        if (utilCommon.isFunction(func)) {
            let count = 0;
            maxExecutions = utilCommon.isNumber(maxExecutions) ? maxExecutions : 5;
            return new Promise(function (resolve) {
                let intervalFunc = setInterval(function () {
                    func();
                    count++;
                    if (maxExecutions && count === maxExecutions) {
                        clearInterval(intervalFunc);
                        resolve();
                    }
                }, utilCommon.isNumber(interval) ? interval : 200);
            });
        }
    },

    /**
     * Fires a custom event.
     * @param {string} type - The type of the event.
     * @param {*} [detail] - The data passed when initializing the event. The default is null.
     * @param {boolean} [bubbles] - Indicates whether the event bubbles. The default is false.
     * @param {boolean} [cancelable] - Indicates whether the event can be cancelled. The default is false.
     * @returns {boolean} - Indicates if the event was cancelled in at least one of the listening event handlers.
     */
    fire: function (type, detail, bubbles, cancelable) {
        detail = detail || null;
        // IE 11
        if (typeof window.CustomEvent !== 'function') {
            CustomEvent.prototype = window.Event.prototype;
            window.CustomEvent = CustomEvent;
        }
        let evt = new utilCommon.CustomEvent(type, {'detail': detail, 'bubbles': !!bubbles, 'cancelable': !!cancelable});
        return !window.dispatchEvent(evt);
    },
}

export { utilCommon };
