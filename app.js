var fs      = require('fs');
var im      = require('imagemagick');
var url     = require('url');
var http    = require('http');
var request = require('request');

var port    = 8888;
var server  = http.createServer(function requestListener(httpReq, httpRes) {
  var params   = url.parse(httpReq.url, true).query;
  var imageURL = params.url || params.uri || params.image;
  var cbName   = params.callback || params.cb || '';
  var finish   = function (code, obj) {
    obj = obj || {};
    if (code >= 400)    obj.error = true;
    if (!obj.http)      obj.http = {};
    if (!obj.http.code) obj.http.code = code;
    if (!obj.http.text) obj.http.text = http.STATUS_CODES[code];

    var jsonString  = JSON.stringify(obj);
    var jsonpString = cbName + '(' + jsonString + ')';
    var result      = cbName ? jsonpString : jsonString;

    httpRes.writeHead(params.code || code, {'Content-Type': 'application/json'});
    httpRes.write(result);
    return httpRes.end();
  };
  var onImageResponse = function (error, imageRes, binaryImage) {

    if (error || !binaryImage || imageRes.statusCode >= 400)
      return finish(imageRes && imageRes.statusCode || 500);

    var args = ['-format', '%wx%h', {data: binaryImage, encoding: 'binary'}];
    im.identify(args, function onImageMagickIdentify(error, responseString) {
      if (error || !responseString)
        return finish(
          500, { error: error, string: 'Could not retrieve dimensions' }
        );

      var dimensions = responseString.split('x');
      var width      = parseInt(dimensions[0], 10);
      var height     = parseInt(dimensions[1], 10);
      var mimeType   = imageRes.headers['content-type'];
      var base64     = new Buffer(binaryImage, 'binary').toString('base64');
      var dataURI    = 'data:' + mimeType + ';base64,' + base64;
      var response   = {
        data: dataURI,
        meta: {
          width: width,
          height: height
        }
      };

      finish(imageRes.statusCode, response);
    });
  };

  if (!imageURL) return finish(400, {http: {text: 'Bad or missing URL'}});
  var requestOptions = {
    url: decodeURIComponent(imageURL),
    encoding: 'binary'
  };

  request(requestOptions, onImageResponse);
});

server.listen(port);
console.log('base64 server created and listening on port', port);
