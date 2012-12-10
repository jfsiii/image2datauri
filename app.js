var fs      = require('fs');
var url     = require('url');
var http    = require('http');
var request = require('request');

var port    = 8888;
var server  = http.createServer(function requestListener(httpReq, httpRes) {
  var params   = url.parse(httpReq.url, true).query;
  var imageURL = params.url || params.uri || params.image;
  var cbName   = params.callback || params.cb || '';

  if (!imageURL) {
    var usageHTML = [
      '<!doctype HTML>',
      '<html>',
        '<body>',
          '<script src="https://gist.github.com/3739251.js?file=request.js"></script>',
          '<script src="https://gist.github.com/3739251.js?file=response.txt"></script>',
          '<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js"></script>',
        '</body>',
      '</html>'
    ].join('');

    httpRes.writeHead(200, {'Content-Type': 'text/html'});
    httpRes.write(usageHTML);
    httpRes.end();
    return;
  }

  var requestOptions = {
    url: decodeURIComponent(imageURL),
    encoding: 'binary'
  };

  request(requestOptions, onImageResponse);

  function finish(code, obj) {
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
  }

  function onImageResponse(error, imageRes, binaryImage) {
    if (error) {
      return finish(
        500, { error: error, string: 'TODO' }
      );
    }

    var mimeType = imageRes.headers['content-type'];
    var base64   = new Buffer(binaryImage, 'binary').toString('base64');
    var dataURI  = 'data:' + mimeType + ';base64,' + base64;
    var response = { data: dataURI };

    finish(imageRes.statusCode, response);
  }

});

server.listen(port);
console.log('base64 server created and listening on port', port);
