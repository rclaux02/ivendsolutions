var serviceUrl;
var client;
var useSignalR;

/*=====/Settings=====*/

function GetPropertyValue(propertyName, successFunction) {
    Post('GetPropertyValue', successFunction, propertyName);
}

function SetPropertyValue(propertyName, value, successFunction) {
    Post('GetPropertyValue', successFunction, propertyName, value);
}

/*=====/Methods=====*/

function AppendImage(AImage, AFormat, ALightType, APageIndex, successFunction) {
    var img = AImage.replace('data:image/jpeg;base64,', '');
    Post('CheckUpdates', successFunction, AFormat, ALightType, APageIndex, img);
}

function AppendImageFromFile(AFileName, ALightType, APageIndex, successFunction) {
    Post('AppendImageFromFile', successFunction, AFileName, ALightType, APageIndex);
}

function BatteryStatusByIdx(index, successFunction) {
    Post('BatteryStatusByIdx', successFunction, index);
}

function Calibrate(successFunction) {
    Post('Calibrate', successFunction);
}

function CancelOpticalOperation(successFunction) {
    Post('CancelOpticalOperation', successFunction);
}

function CheckReaderImageLight(index, successFunction) {
    Post('CheckReaderImageLight', successFunction, index);
}

function CheckReaderImagePageIndex(index, successFunction) {
    Post('CheckReaderImagePageIndex', successFunction, index);
}

function CheckReaderResult(type, index, output, param, successFunction) {
    Post('CheckReaderResult', successFunction, type, index, output, param);
}

function CheckReaderResultFromList(container, output, param, successFunction) {
    Post('CheckReaderResultFromList', successFunction, container, output, param);
}

function CheckReaderResultXML(type, index, output, successFunction) {
    Post('CheckReaderResultXML', successFunction, type, index);
}

function CheckRFIDResult(type, output, param, successFunction) {
    Post('CheckRFIDResult', successFunction, type, output, param);
}

function CheckRFIDResultFromList(container, output, param, successFunction) {
    Post('CheckRFIDResultFromList', successFunction, container, output, param);
}

function CheckRFIDResultXML(type, output, successFunction) {
    Post('CheckRFIDResultXML', successFunction, type);
}

function CheckUpdates(successFunction) {
    Post('CheckUpdates', successFunction);
}

function ClearResults(successFunction) {
    Post('ClearResults', successFunction);
}

function Connect(successFunction) {
    Post('Connect', successFunction);
}

function Disconnect(successFunction) {
    Post('Disconnect', successFunction);
}

function DoProcessImage(AFilename, successFunction) {
    Post('DoProcessImage', successFunction, AFilename);
}

function DoProcessImages(AFolder, successFunction) {
    Post('DoProcessImages', successFunction, AFolder);
}

function get_AvailableDevices(index, successFunction) {
    Post('get_AvailableDevices', successFunction, index);
}

function get_AvailableGraphicFormats(index, successFunction) {
    Post('get_AvailableGraphicFormats', successFunction, index);
}

function get_AvailableLanguages(index, successFunction) {
    Post('get_AvailableLanguages', successFunction, index);
}

function GetBarcodeModuleCount(successFunction) {
    Post('GetBarcodeModuleCount', successFunction);
}

function GetBarcodeModuleDataByIdx(index, successFunction) {
    Post('GetBarcodeModuleDataByIdx', successFunction, index);
}

function GetGraphicFieldByTypeAndSource(type, source, successFunction) {
    Post('GetGraphicFieldByTypeAndSource', successFunction, type, source);
}

function GetImages(successFunction) {
    Post('GetImages', successFunction);
}

function GetReaderBitmapImage(index, successFunction) {
    Post('GetReaderBitmapImage', successFunction, index);
}

function GetReaderBitmapImageByLightIndex(light, successFunction) {
    Post('GetReaderBitmapImageByLightIndex', successFunction, light);
}

function GetReaderBitmapImageByLightIndexAndPageIndex(light, page, successFunction) {
    Post('GetReaderBitmapImageByLightIndexAndPageIndex', successFunction, light, page);
}

function GetReaderEOSBitmapImage(index, successFunction) {
    if (useSignalR)
        Get(serviceUrl + '/Methods/GetReaderEOSBitmapImage?AIdx=' + index, successFunction);
    else
        Post('GetReaderEOSBitmapImage', successFunction, index);
}

function GetReaderEOSBitmapImageByLightIndex(light, successFunction) {
    Post('GetReaderEOSBitmapImageByLightIndex', successFunction, light);
}

function GetReaderEOSBitmapImageByLightIndexAndPageIndex(light, page, successFunction) {
    Post('GetReaderEOSBitmapImageByLightIndexAndPageIndex', successFunction, light, page);
}

function GetReaderFileImage(index, successFunction) {
    Post('GetReaderFileImage', successFunction, index);
}

function GetReaderFileImageByLightIndex(light, successFunction) {
    Post('GetReaderFileImageByLightIndex', successFunction, light);
}

function GetReaderFileImageByLightIndexAndPageIndex(light, page, successFunction) {
    Post('GetReaderFileImageByLightIndexAndPageIndex', successFunction, light, page);
}

function GetReaderGraphicsBitmapByFieldType(type, successFunction) {
    Post('GetReaderGraphicsBitmapByFieldType', successFunction, type);
}

function GetReaderGraphicsFileImageByFieldType(type, successFunction) {
    Post('GetReaderGraphicsFileImageByFieldType', successFunction, type);
}

function GetRFIDDGRawData(type, successFunction) {
    Post('GetRFIDDGRawData', successFunction, type);
}

function GetRFIDGraphicsBitmapByFieldType(type, successFunction) {
    Post('GetRFIDGraphicsBitmapByFieldType', successFunction, type);
}

function GetRFIDGraphicsFileImageByFieldType(type, successFunction) {
    Post('GetRFIDGraphicsFileImageByFieldType', successFunction, type);
}

function GetSnapshot(light, mode, successFunction) {
    Post('GetSnapshot', successFunction, light, mode);
}

function GetTextFieldByType(type, successFunction) {
    Post('GetTextFieldByType', successFunction);
}

function GetTextFieldByTypeAndLCID(type, lcid, successFunction) {
    Post('GetTextFieldByTypeAndLCID', successFunction, type, lcid);
}

function GetTextFieldByTypeAndSource(type, source, originalSource, lcid, successFunction) {
    Post('GetTextFieldByTypeAndSource', successFunction, type, source, originalSource, lcid);
}

function Hide(successFunction) {
    Post('Hide', successFunction);
}

function HideResultPopup(successFunction) {
    Post('HideResultPopup', successFunction);
}

function IsReaderResultTypeAvailable(type, successFunction) {
    Post('IsReaderResultTypeAvailable', successFunction, type);
}

function LED(color, rate, index, successFunction) {
    Post('LED', successFunction, color, rate, index);
}

function PlaySound(ATimes, successFunction) {
    Post('PlaySound', successFunction);
}

function RefreshPACertStore(successFunction) {
    Post('RefreshPACertStore', successFunction);
}

function ReportCurrentSampleIssue(successFunction) {
    Post('ReportCurrentSampleIssue', successFunction);
}

function RFIDCancelReading(successFunction) {
    Post('RFIDCancelReading', successFunction);
}

function SetActiveLights(activeLights, successFunction) {
    Post('SetActiveLights', successFunction, activeLights);
}

function GetActiveLights(successFunction) {
    Post('GetActiveLights', successFunction);
}

function SaveConfig(successFunction) {
    Post('SaveConfig', successFunction);
}

function Show(successFunction) {
    Post('Show', successFunction);
}

function WaitAndReadRFID(successFunction) {
    Post('WaitAndReadRFID', successFunction);
}

/*=====/Methods (SPECIAL)=====*/

function ShutdownComputer(doRestart, successFunction) {
    Post('RestartSdk', successFunction, doRestart);
}

function RestartSdk(successFunction) {
    Post('RestartSdk', successFunction);
}

function GetServiceVersion(successFunction) {
    Post('GetServiceVersion', successFunction);
}

function GetSystemDateTime(successFunction) {
    Post('GetSystemDateTime', successFunction);
}

function SetSystemDateTime(value, successFunction) {
    Post('SetSystemDateTime', successFunction, value);
}

function NotifyRfidRequestHandled(successFunction) {
    Post('NotifyRfidRequestHandled', successFunction);
}

function NotifyCalibrationHandled(successFunction) {
    Post('NotifyCalibrationHandled', successFunction);
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

function initRegulaReader(url, isFallback) {
    this.socket = io(url);

    // Setup callbacks based on socket messages coming from server
    this.socket.on("OnNotificationOptical", function (ACode, AValue) {
        if (OnNotificationOpticalCallback != null)
            OnNotificationOpticalCallback(ACode, AValue);
    });

    this.socket.on("OnImageReady", function (ALight, APageIndex) {
        if (OnImageReadyCallback != null)
            OnImageReadyCallback(ALight, APageIndex);
    });

    this.socket.on("OnNotificationRFID", function (ACode, AValue) {
        if (OnNotificationRFIDCallback != null)
            OnNotificationRFIDCallback(ACode, AValue);
    });

    this.socket.on("OnProcessingFinished", function () {
        if (OnProcessingFinishedCallback != null)
            OnProcessingFinishedCallback();
    });

    this.socket.on("OnProcessingStarted", function () {
        if (OnProcessingStartedCallback != null)
            OnProcessingStartedCallback();
    });

    this.socket.on("OnResultReady", function (AType) {
        if (OnResultReadyCallback != null)
            OnResultReadyCallback(AType);
    });

    this.socket.on("OnResultReadyXML", function (AType, ResultXML) {
        if (OnResultReadyXMLCallback != null)
            OnResultReadyXMLCallback(AType, ResultXML);
    });

    this.socket.on("OnRFIDRequest", function (RequestXML) {
        if (OnRFIDRequestCallback != null)
            OnRFIDRequestCallback(RequestXML);

        NotifyRfidRequestHandled();
    });

    this.socket.on("OnSystemNotification", function (code, value) {
        if (OnSystemNotificationCallback != null)
            OnSystemNotificationCallback(code, value);
    });
}


function Post(url, successFunction) {
    var args = Array.from(arguments).slice(2);

    var callback = function (reply) {
        if (reply.hasOwnProperty("result")) {
            if (successFunction != null)
                successFunction(reply.result);
        } else {
            console.log(reply);
        }
    }

    if (args.length > 0) {
        args.push(callback);
        this.socket.emit(url, ...args);
    }
    else
        this.socket.emit(url, callback);
}

function Get(url, successFunction) {
    Post(url, successFunction, arguments);
}

