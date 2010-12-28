require.paths.unshift('./vendor');
require.paths.unshift('./lib');

var express = require('express'),
    path = require('path'),
    nn = require('node-nailer'),
    util = require('util');

//  Create the server
var app = express.createServer(
  express.logger(),
  express.bodyDecoder()
);

var port = 3000;

app.get('/', function(req, res) {
  params = req.query;
  
  for (i in params) {
    var errors = null;
    
    if (['url', 'w', 'h', 'method', 'info'].indexOf(i) == -1)
      errors = "Parameter '" + i + "' is not allowed.'";
    else if (typeOf(params[i]) == 'array')
      errors = "Parameter '" + i + "' was specified twice";
    
    if (errors) {
      util.inspect(errors);
      res.send({ error: errors });
      return;
    }
  }
  
  if (!params.url) {
    util.log('No URL provided')
    
    //  no way to detect if coming from img tag based on headers
    //  http://stackoverflow.com/questions/4063123
    if (req.headers.accept.test("image")) {
      util.log('Showing Error Picture');
      res.contentType('./fixtures/error.jpg');
      res.sendfile('./fixtures/error.jpg');
    } else {
      util.log('Showing 404');
      res.send(404);
    }
    return;
  }
  
  if (!params['method'] || (params['method'] && ['crop', 'resize'].indexOf(params['method']) == -1)) {
    params['method'] = 'crop';
  }

  //  alphabetize the query for the sha
  params = Object.alphabetize(params);
  
  util.log("Requested image params: " + JSON.stringify(params));
  
  (function() {
    var callback = function(err, source, saveTo) {
      if (err) {
        util.log('Error');
        util.inspect(err);
        return res.send({ error: err.message });
      }
      if (params.info) {
        nn.grabInfo(saveTo, function(err, info) {
          if (err) return res.send(404);
          
          var repackage = {
            width: info.width,
            height: info.height
          }
          
          res.send(repackage);
        });
      } else {  
        //  make sure the saveTo path exists
        path.exists(saveTo, function(exists) {
          if (!exists) {
            util.log("Image unreadable, retrying: " + saveTo);
            
            return callback.delay(50, this, [err, source, saveTo]);
          }
          
          res.contentType(saveTo);
          res.sendfile(saveTo);
        });
      }
    };
    
    if (!params.w && !params.h)
      nn.grabOriginal(params.url, callback);
    else
      nn.grabThumbnail(params, callback);    
  })();
});

app.listen(port);