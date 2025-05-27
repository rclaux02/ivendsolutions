var serviceUrl;

/*=====/Settings=====*/

function GetPropertyValue(propertyName, successFunction) {
    Get(serviceUrl + '/Settings/GetPropertyValue?propertyName=' + propertyName, successFunction);
}

function SetPropertyValue(propertyName, value, successFunction) {
    Post(serviceUrl + '/Settings/SetPropertyValue?propertyName=' + propertyName, successFunction, value);
}

/*=====/Methods=====*/

function AppendImage(AImage, AFormat, ALightType, APageIndex, successFunction) {
    var img = AImage.replace('data:image/jpeg;base64,', '');
    Post(serviceUrl + '/Methods/AppendImage?AFormat=' + AFormat + '&ALightType=' + ALightType + '&APageIndex=' + APageIndex, successFunction, img);
}

function AppendImageFromFile(AFileName, ALightType, APageIndex, successFunction) {
    Post(serviceUrl + '/Methods/AppendImageFromFile?AFileName=' + AFileName + '&ALightType=' + ALightType + '&APageIndex=' + APageIndex, successFunction);
}

function BatteryStatusByIdx(index, successFunction) {
    Get(serviceUrl + '/Methods/BatteryStatusByIdx?index=' + index, successFunction);
}

function Calibrate(successFunction) {
    Post(serviceUrl + '/Methods/Calibrate', successFunction);
}

function CancelOpticalOperation(successFunction) {
    Post(serviceUrl + '/Methods/CancelOpticalOperation', successFunction);
}

function CheckReaderImageLight(index, successFunction) {
    Get(serviceUrl + '/Methods/CheckReaderImageLight?AIdx=' + index, successFunction);
}

function CheckReaderImagePageIndex(index, successFunction) {
    Get(serviceUrl + '/Methods/CheckReaderImagePageIndex?AIdx=' + index, successFunction);
}

function CheckReaderResult(type, index, output, param, successFunction) {
    Get(serviceUrl + '/Methods/CheckReaderResult?AType=' + type + '&AIdx=' + index + '&AOutput=' + output + '&AParam=' + param, successFunction);
}

function CheckReaderResultFromList(container, output, param, successFunction) {
    Get(serviceUrl + '/Methods/CheckReaderResultFromList?AContainer=' + container + '&AOutput=' + output + '&AParam=' + param, successFunction);
}

function CheckReaderResultXML(type, index, output, successFunction) {
    Get(serviceUrl + '/Methods/CheckReaderResultXML?AType=' + type + '&AIdx=' + index + '&AOutput=' + output, successFunction);
}

function CheckRFIDResult(type, output, param, successFunction) {
    Get(serviceUrl + '/Methods/CheckRFIDResult?AType=' + type + '&AOutput=' + output + '&AParam=' + param, successFunction);
}

function CheckRFIDResultFromList(container, output, param, successFunction) {
    Get(serviceUrl + '/Methods/CheckRFIDResultFromList?AContainer=' + container + '&AOutput=' + output + '&AParam=' + param, successFunction);
}

function CheckRFIDResultXML(type, output, successFunction) {
    Get(serviceUrl + '/Methods/CheckRFIDResultXML?AType=' + type + '&AOutput=' + output, successFunction);
}

function CheckUpdates(successFunction) {
    Post(serviceUrl + '/Methods/CheckUpdates', successFunction);
}

function ClearResults(successFunction) {
    Post(serviceUrl + '/Methods/ClearResults', successFunction);
}

function Connect(successFunction) {
    Post(serviceUrl + '/Methods/Connect', successFunction);
}

function Disconnect(successFunction) {
    Post(serviceUrl + '/Methods/Disconnect', successFunction);
}

function DoProcessImage(AFilename, successFunction) {
    Post(serviceUrl + '/Methods/DoProcessImage?AFilename=' + AFilename, successFunction);
}

function DoProcessImages(AFolder, successFunction) {
    Post(serviceUrl + '/Methods/DoProcessImages?AFolder=' + AFolder, successFunction);
}

function get_AvailableDevices(index, successFunction) {
    Get(serviceUrl + '/Methods/get_AvailableDevices?Index=' + index, successFunction);
}

function get_AvailableGraphicFormats(index, successFunction) {
    Get(serviceUrl + '/Methods/get_AvailableGraphicFormats?Index=' + index, successFunction);
}

function get_AvailableLanguages(index, successFunction) {
    Get(serviceUrl + '/Methods/get_AvailableLanguages?Index=' + index, successFunction);
}

function GetBarcodeModuleCount(successFunction) {
    Get(serviceUrl + '/Methods/GetBarcodeModuleCount', successFunction);
}

function GetBarcodeModuleDataByIdx(index, successFunction) {
    Get(serviceUrl + '/Methods/GetBarcodeModuleDataByIdx?AIdx=' + index, successFunction);
}

function GetGraphicFieldByTypeAndSource(type, source, successFunction) {
    Get(serviceUrl + '/Methods/GetGraphicFieldByTypeAndSource?AType=' + type + '&ASourceType=' + source, successFunction);
}

function GetImages(successFunction) {
    Get(serviceUrl + '/Methods/GetImages', successFunction);
}

function GetReaderBitmapImage(index, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderBitmapImage?AIdx=' + index, successFunction);
}

function GetReaderBitmapImageByLightIndex(light, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderBitmapImageByLightIndex?ALight=' + light, successFunction);
}

function GetReaderBitmapImageByLightIndexAndPageIndex(light, page, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderBitmapImageByLightIndexAndPageIndex?ALight=' + light + '&APageIndex=' + page, successFunction);
}

function GetReaderEOSBitmapImage(index, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderEOSBitmapImage?AIdx=' + index, successFunction);
}

function GetReaderEOSBitmapImageByLightIndex(light, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderEOSBitmapImageByLightIndex?ALight=' + light, successFunction);
}

function GetReaderEOSBitmapImageByLightIndexAndPageIndex(light, page, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderEOSBitmapImageByLightIndexAndPageIndex?ALight=' + light + '&APageIndex=' + page, successFunction);
}

function GetReaderFileImage(index, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderFileImage?AIdx=' + index, successFunction);
}

function GetReaderFileImageByLightIndex(light, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderFileImageByLightIndex?ALight=' + light, successFunction);
}

function GetReaderFileImageByLightIndexAndPageIndex(light, page, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderFileImageByLightIndexAndPageIndex?ALight=' + light + '&APageIndex=' + page, successFunction);
}

function GetReaderGraphicsBitmapByFieldType(type, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderGraphicsBitmapByFieldType?AType=' + type, successFunction);
}

function GetReaderGraphicsFileImageByFieldType(type, successFunction) {
    Get(serviceUrl + '/Methods/GetReaderGraphicsFileImageByFieldType?AType=' + type, successFunction);
}

function GetRFIDDGRawData(type, successFunction) {
    Get(serviceUrl + '/Methods/GetRFIDDGRawData?AType=' + type, successFunction);
}

function GetRFIDDGValue(ADG, AFieldType, AOriginal, successFunction) {
    Get(serviceUrl + '/Methods/GetRFIDDGValue?ADG=' + ADG + '&AFieldType=' + AFieldType + '&AOriginal=' + AOriginal , successFunction);
}

function GetRFIDGraphicsBitmapByFieldType(type, successFunction) {
    Get(serviceUrl + '/Methods/GetRFIDGraphicsBitmapByFieldType?AType=' + type, successFunction);
}

function GetRFIDGraphicsFileImageByFieldType(type, successFunction) {
    Get(serviceUrl + '/Methods/GetRFIDGraphicsFileImageByFieldType?AType=' + type, successFunction);
}

function GetSnapshot(light, mode, successFunction) {
    Get(serviceUrl + '/Methods/GetSnapshot?ALight=' + light + '&AMode=' + mode, successFunction);
}

function GetTextFieldByType(type, successFunction) {
    Get(serviceUrl + '/Methods/GetTextFieldByType?AType=' + type, successFunction);
}

function GetTextFieldByTypeAndLCID(type, lcid, successFunction) {
    Get(serviceUrl + '/Methods/GetTextFieldByTypeAndLCID?AType=' + type + '&ALCID=' + lcid, successFunction);
}

function GetTextFieldByTypeAndSource(type, source, originalSource, lcid, successFunction) {
    Get(serviceUrl + '/Methods/GetTextFieldByTypeAndSource?AType=' + type + '&ASourceType=' + source + '&AOriginalSource=' + originalSource + '&ALCID=' + lcid, successFunction);
}

function Hide(successFunction) {
    Post(serviceUrl + '/Methods/Hide', successFunction);
}

function HideResultPopup(successFunction) {
    Post(serviceUrl + '/Methods/HideResultPopup', successFunction);
}

function IsReaderResultTypeAvailable(type, successFunction) {
    Get(serviceUrl + '/Methods/IsReaderResultTypeAvailable?AType=' + type, successFunction);
}

function LED(color, rate, index, successFunction) {
    Post(serviceUrl + '/Methods/LED?AColor=' + color + '&ABlinkRate=' + rate + '&AIndex=' + index, successFunction);
}

function PlaySound(ATimes, successFunction) {
    Post(serviceUrl + '/Methods/PlaySound?ATimes=' + ATimes, successFunction);
}

function RefreshPACertStore(successFunction) {
    Post(serviceUrl + '/Methods/RefreshPACertStore', successFunction);
}

function ReportCurrentSampleIssue(successFunction) {
    Post(serviceUrl + '/Methods/ReportCurrentSampleIssue', successFunction);
}

function RFIDCancelReading(successFunction) {
    Post(serviceUrl + '/Methods/RFIDCancelReading', successFunction);
}

function SetActiveLights(activeLights, successFunction) {
    Post(serviceUrl + '/Methods/SetActiveLights?ALights=' + activeLights, successFunction);
}

function GetActiveLights(successFunction) {
    Get(serviceUrl + '/Methods/GetActiveLights', successFunction);
}

function SaveConfig(successFunction) {
    Post(serviceUrl + '/Methods/SaveConfig', successFunction);
}

function Show(successFunction) {
    Post(serviceUrl + '/Methods/Show', successFunction);
}

function WaitAndReadRFID(successFunction) {
    Post(serviceUrl + '/Methods/WaitAndReadRFID', successFunction);
}

function EjectDocument(successFunction) {
    Post(serviceUrl + '/Methods/EjectDocument', successFunction);
}

function AddActiveLight(ALight, successFunction) {
    Post(serviceUrl + '/Methods/AddActiveLight?ALight=' + ALight, successFunction);
}

function CheckReaderResultJSON(type, index, output) {
    Get(serviceUrl + '/Methods/CheckReaderResultJSON?AType=' + type + '&AIdx=' + index + '&AOutput=' + output, successFunction);
}

function GetLED(index, successFunction) {
    Get(serviceUrl + '/Methods/GetLED?idx=' + index, successFunction);
}

function CheckRFIDResultJSON(type, output, successFunction) {
    Get(serviceUrl + '/Methods/CheckRFIDResultJSON?AType=' + type + '&AOutput=' + output, successFunction);
}

function AddActiveLight(ALight, successFunction) {
    Post(serviceUrl + '/Methods/AddActiveLight?ALight=' + ALight, successFunction);
}

function AppendPortrait(image, format, type, successFunction) {
    var img = image.replace('data:image/jpeg;base64,', '');
    Post(serviceUrl + '/Methods/AppendPortrait?AFormat=' + format + '&AType=' + type, successFunction, img);

}

function AppendPortrait(filename, type, successFunction) {
    Post(serviceUrl + '/Methods/AppendPortraitFromFile?AType=' + type, successFunction, filename);
}

function AppendRFIDData(data, type, successFunction) {
    Post(serviceUrl + '/Methods/AppendPortrait?AType=' + type, successFunction, data);
}

function AppendRFIDDataFromFile(filename, type, successFunction) {
    Post(serviceUrl + '/Methods/AppendRFIDDataFromFile?AType=' + type, successFunction, filename);
}

function ComparePortraits() {
    Post(serviceUrl + '/Methods/ComparePortraits', successFunction);
} 

function CustomProcess(params) {
    Post(serviceUrl + '/Methods/CustomProcess', successFunction, params);
}

function DoLiveFaceCapture(successFunction) {
    Post(serviceUrl + '/Methods/DoLiveFaceCapture', successFunction);
}

function PKDAddResource(type, data, name, autorefresh) {
    Post(serviceUrl + '/Methods/PKDAddResource?AType=' + type + '&AName=' + name + '&AutoRefresh=' + autorefresh, successFunction, data);
}

function PKDAddResourceFromFile(type, filename, autorefresh) {
    Post(serviceUrl + '/Methods/PKDAddResourceFromFile?AType=' + type  + '&AutoRefresh=' + autorefresh, successFunction, filename);
}

function PKDClearPAStore(successFunction) {
    Post(serviceUrl + '/Methods/PKDClearPAStore', successFunction);
}

function PKDClearTAStore(successFunction) {
    Post(serviceUrl + '/Methods/PKDClearTAStore', successFunction);
}

function PKDRefreshPAStore(successFunction) {
    Post(serviceUrl + '/Methods/PKDRefreshPAStore', successFunction);
}

function PKDRefreshTAStore(successFunction) {
    Post(serviceUrl + '/Methods/PKDRefreshTAStore', successFunction);
}

function ShowPrintDialog(successFunction) {
    Post(serviceUrl + '/Methods/ShowPrintDialog', successFunction);
}

function LiveCameraDevices(index, successFunction) {
    Get(serviceUrl + "/Methods/LiveCameraDevices?Index=" + index, successFunction);
}

/*=====/Methods (SPECIAL)=====*/

function ShutdownComputer(doRestart, successFunction) {
    Post(serviceUrl + '/Methods/ShutdownComputer', successFunction, doRestart);
}

function RestartSdk(successFunction) {
    Post(serviceUrl + '/Methods/RestartSdk', successFunction);
}

function GetServiceVersion(successFunction) {
    Post(serviceUrl + '/Methods/GetServiceVersion', successFunction);
}

function GetSystemDateTime(successFunction) {
    Get(serviceUrl + '/Methods/GetSystemDateTime', successFunction);
}

function SetSystemDateTime(value, successFunction) {
    Post(serviceUrl + '/Methods/SetSystemDateTime', successFunction, value);
}

function NotifyRfidRequestHandled(successFunction) {
    Post(serviceUrl + '/Events/NotifyRfidRequestHandled', successFunction);
}

function NotifyCalibrationHandled(successFunction) {
    Post(serviceUrl + '/Events/NotifyCalibrationHandled', successFunction);
}

function NotifyPortraitRequestHandled(successFunction) {
    Post(serviceUrl + '/Events/NotifyPortraitRequestHandled', successFunction);
}

/*=====EVENTS=====*/

var OnNotificationOpticalCallback;
var OnImageReadyCallback;
var OnNotificationRFIDCallback;
var OnProcessingFinishedCallback;
var OnProcessingStartedCallback;
var OnResultReadyCallback;
var OnResultReadyXMLCallback;
var OnRFIDRequestCallback;
var OnSystemNotificationCallback;
var OnExtPortraitRequestCallback;

"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function initRegulaReader(url, isFallback) {
    var signalRUrl = trimChar(url, "/");
    serviceUrl = url;

    if (isFallback)
        signalRUrl += 'notifications';

    jQuery.support.cors = true;

    $.ajax({
        url: signalRUrl + '/signalr/hubs',
        type: 'GET',
        complete: function (xhr, status) {
            if (xhr.status == 200) {
                $.getScript(serviceUrl + "/signalR.min.js", function (data) {

                    var connection = $.hubConnection(signalRUrl); //, { useDefaultPath: false }
                    var hubProxy = connection.createHubProxy('EventsHub');

                    hubProxy.on("OnNotificationOptical", function (ACode, AValue) {
                        if (OnNotificationOpticalCallback != null)
                            OnNotificationOpticalCallback(ACode, AValue);
                    });

                    hubProxy.on("OnImageReady", function (ALight, APageIndex) {
                        if (OnImageReadyCallback != null)
                            OnImageReadyCallback(ALight, APageIndex);
                    });

                    hubProxy.on("OnNotificationRFID", function (ACode, AValue) {
                        if (OnNotificationRFIDCallback != null)
                            OnNotificationRFIDCallback(ACode, AValue);
                    });

                    hubProxy.on("OnProcessingFinished", function () {
                        if (OnProcessingFinishedCallback != null)
                            OnProcessingFinishedCallback();
                    });

                    hubProxy.on("OnProcessingStarted", function () {
                        if (OnProcessingStartedCallback != null)
                            OnProcessingStartedCallback();
                    });

                    hubProxy.on("OnResultReady", function (AType) {
                        if (OnResultReadyCallback != null)
                            OnResultReadyCallback(AType);
                    });

                    hubProxy.on("OnResultReadyXML", function (AType, ResultXML) {
                        if (OnResultReadyXMLCallback != null)
                            OnResultReadyXMLCallback(AType, ResultXML);
                    });

                    hubProxy.on("OnRFIDRequest", function (RequestXML) {
                        if (OnRFIDRequestCallback != null)
                            OnRFIDRequestCallback(RequestXML);
                        else
                            NotifyRfidRequestHandled();
                    });

                    hubProxy.on("OnSystemNotification", function (code, value) {
                        if (OnSystemNotificationCallback != null)
                            OnSystemNotificationCallback(code, value);
                    });

                    hubProxy.on("OnExtPortraitRequest", function () {
                        if (OnExtPortraitRequestCallback != null)
                            OnExtPortraitRequestCallback();
                        else
                            NotifyPortraitRequestHandled();
                    });

                    connection.logging = true;

                    connection.start({ transport: 'longPolling' }).done(function () {
                        console.log("Connected to hub");
                    }).fail(function (data) {
                        alert('Connection to Regula SDK Service failed!!!!!');
                    });
                });
            } else {
                if (!isFallback) {
                    initRegulaReader(signalRUrl, true);
                } else {
                    alert('Connection to Regula SDK Service failed!aaaa');
                }
            }
        }
    });
}

function Post(url, successFunction) {
    var args = arguments[2]
    jQuery.support.cors = true;
    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(args),
        success: function (data) {
            if (successFunction != null)
                successFunction(data);
        }
    });
}

function Get(url, successFunction) {
    var urlP = url.split('?')[1];
    var urlArgs = [];
    if (urlP) {
        var sParams = parse_query_string(urlP);
        var entries = (Object.entries ? Object.entries(sParams) : entriesPolyFill(sParams));

        for (var i = 0; i < entries.length; i++)
            urlArgs.push(entries[i][1]);
    }

    jQuery.support.cors = true;
    $.ajax({
        url: url,
        cache: false,
        type: 'GET',
        contentType: 'text/xml;charset=utf-8',
        success: function (data) {
            if (successFunction != null)
                successFunction.apply(void 0, [data].concat(_toConsumableArray(urlArgs)));
        }
    });
}

function parse_query_string(query) {
    var vars = query.split("&");
    var query_string = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        var key = decodeURIComponent(pair[0]);
        var value = decodeURIComponent(pair[1]);
        // If first entry with this name
        if (typeof query_string[key] === "undefined") {
            query_string[key] = decodeURIComponent(value);
            // If second entry with this name
        } else if (typeof query_string[key] === "string") {
            var arr = [query_string[key], decodeURIComponent(value)];
            query_string[key] = arr;
            // If third or later entry with this name
        } else {
            query_string[key].push(decodeURIComponent(value));
        }
    }
    return query_string;
}

function entriesPolyFill(obj) {
    var ownProps = Object.keys(obj),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
        resArray[i] = [ownProps[i], obj[ownProps[i]]];

    return resArray;
};

