require.paths.unshift('./node_modules');
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
    if (['wanted', 'url', 'w', 'h', 'method'].indexOf(i) == -1)
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
  
  if (params['method'] && ['crop', 'resize'].indexOf(params['method']) == -1) {
    util.log(params['method'] + ' is an invalid method.');
    res.send(404);
    return;
  } else {
    params['method'] = 'crop';
  }

  //  if either the width or height parameter is specified, a thumb is wanted
  //  else want the original
  params.wanted = params.wanted || (params.w || params.h ? 'thumb' : 'orig');
  if (params.wanted == 'orig') {
    //  delete the unnecessary parameters
    for (i in params)
      if (['wanted', 'url'].indexOf(i) == -1) delete params[i];
  }
  
  util.log("Requested image params: " + JSON.stringify(params));
  
  //  alphabetize the query for the sha
  params = Object.alphabetize(params);
  
  (function() {
    var callback = function(err, source, save_to) {
      if (err) {
        util.log(JSON.stringify(err));
        return res.send(err.message);
      }
      
      res.contentType(save_to);
      res.sendfile(save_to);
    };
    
    if (params.wanted == 'orig') {
      nn.grabOriginal(params.url, callback)
    } else {
      nn.grabThumbnail(params, callback);
    }
    
  })();
});

app.listen(3000);