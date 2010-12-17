require.paths.unshift('./vendor');
require.paths.unshift('./lib');

var express = require('express'),
    nn = require('node-nailer'),
    util = require('util');

//  Create the server
var app = express.createServer(
  express.logger(),
  express.bodyDecoder()
);

app.get('/', function(req, res) {
  params = req.query;
  
  for (i in params) {
    var errors = [];
    if (['url', 'w', 'h', 'method', 'info'].indexOf(i) == -1)
      errors.push("Parameter '" + i + "' is not allowed.'");

    if (typeOf(params[i]) == 'array')
      errors.push("Parameter '" + i + "' was specified twice");
    
    if (errors.length > 0) {
      util.log(JSON.stringify(errors));
      res.send(JSON.stringify(errors));
      return;
    }
    
    params[i] = params[i].toLowerCase();
  }
  
  if (!params.url) {
    util.log('No URL provided')
    
    //  this shit doesn't work
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
        util.log(JSON.stringify(err));
        return res.send(err.message);
      }
      if (params.info) {
        nn.grabInfo(saveTo, function(err, info) {
          if (err) return res.send(404);
          
          var repackage = {
            x: info.width,
            y: info.height
          }
          
          res.send(repackage);
        });
      } else {
        res.contentType(saveTo);
        res.sendfile(saveTo);
      }
    };
    
    if (!params.w && !params.h)
      nn.grabOriginal(params.url, callback);
    else
      nn.grabThumbnail(params, callback);    
  })();
});

app.listen(3000);