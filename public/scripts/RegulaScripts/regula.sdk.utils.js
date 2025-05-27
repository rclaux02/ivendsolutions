/*=====Utilities=====*/

function getFromEnum(set, value) {
    for (var k in set) {
        if (set.hasOwnProperty(k)) {
            if (set[k] == value) {
                return k;
            }
        }
    }
    return undefined;
}

function GetTranslation(value) {
    var cookieLang = getCookie('language');

    var entry = Strings[value];
    if (entry) {
        var result = entry[cookieLang];
        if (result != null)
            return result;
    }

    return value;
}

function setLang(language) {
    let secure = (window.location.protocol == "https:")
    $("#lang").val(language);
    setCookie("language", language, secure);

    translateElements();
}

function translateElements() {
    $("[data-translate]").each(function () {
        if ('value' in this) {
            $(this).val(function () {
                var key = $(this).data("translate");
                return GetTranslation(key);
            });
        } else {
            $(this).text(function () {
                var key = $(this).data("translate");
                return GetTranslation(key);
            });
        }
        ;
    });
}

// Set a cookie with additional options
function setCookie(name, value, secure = false) {
    let expires = "";
    const date = new Date();
    date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();

    let cookieString = name + "=" + encodeURIComponent(value);
    cookieString += expires; 
    cookieString += "; path=/";

    if (secure) {
        cookieString += "; SameSite=None";
        cookieString += "; Secure";
    }

    document.cookie = cookieString;
}

// Get a cookie value by name
function getCookie(name) {
    const nameEQ = name + "="; 
    const cookiesArray = document.cookie.split('; '); 

    for (let cookie of cookiesArray) {
        if (cookie.startsWith(nameEQ)) { 
            return decodeURIComponent(cookie.substring(nameEQ.length)); 
        }
    }
    return null; 
}

function trimChar(string, charToRemove) {
    while (string.charAt(0) == charToRemove) {
        string = string.substring(1);
    }

    while (string.charAt(string.length - 1) == charToRemove) {
        string = string.substring(0, string.length - 1);
    }

    return string;
}

String.format = function () {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "gm");
        s = s.replace(reg, arguments[i + 1]);
    }
    return s;
};
