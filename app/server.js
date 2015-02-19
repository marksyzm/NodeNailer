
require('newrelic');

var express = require('express'),
    app = express(),
    fs = require('fs'),
    nn = require('../lib/node-nailer'),
    util = require('util'),
    logger = require('morgan'),
    bodyParser = require('body-parser');

//  Create the server
// express.createServer() is deprecated, express applications no longer inherit from http.Server
app.use(
  logger('combined'),
// express.bodyDecoder() is deprecated
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true })
);

var port = 3000;
app.get('/', function fn(req, res, tries) {
  tries = tries || 0

  // check referer
  if (process.argv[2]) {
    if (req.headers.referer) {
      if (!req.headers.referer.test(process.argv[2])) {
        util.log("Unallowed Referer");
        return res.send(404);
      }
    } else {
      /*
      util.log("Bad Referer");
      return res.send(404);
      */
    }
  }
  
  var params = req.query;
  
  for (var i in params) {
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

//  util.log(params.url);
  if (!params.url) {
    util.log('No URL provided');
    
    //  no way to detect if coming from img tag based on headers
    //  http://stackoverflow.com/questions/4063123
    if (req.headers.accept.test("image")) {
      util.log('Showing Error Picture');
      res.contentType('./fixtures/error.jpg');
//      res.set('Content-Type', 'image/jpeg');
      res.sendfile('./fixtures/error.jpg');
    } else {
      util.log('Bad Accept Header');
      res.send(404);
    }
    return;
  }
  
  if (!params['method'] || (params['method'] && ['crop', 'resize'].indexOf(params['method']) == -1)) {
    params['method'] = 'crop';
  }

  //  alphabetize the query for the sha
  params = Object.alphabetize(params);
  
// This seems like debugging information. Do we need to log it?
//  util.log("Requested image params: " + JSON.stringify(params));
  
  (function() {
    var callback = function(err, source, saveTo) {
      if (err) {
        util.log('Error');
        util.log(JSON.stringify(err));
        return res.send({ error: err.message });
      }
      if (params.info) {
        nn.grabInfo(saveTo, function(err, info) {
          if (err) {
            util.log("Unable to grab info");
            return res.send(404);
          }

          var repackage = {
            width: info.width,
            height: info.height
          }
          
          res.send(repackage);
        });
      } else {
        var workaround = function() {
          tries++;
          
          if (tries > 10) {
            util.log("Number of tries have been exhausted, serving 404 instead for URL: " + params.url);
            res.send(404);
          } else {
            util.log("Refreshing request try #(" + tries + ") for URL: " + params.url);
            fn.delay(5000, fn, [req, res, tries]);
          }
        }
        
        //  make sure the saveTo path exists
        //path.exists(saveTo, function(exists) {
        fs.exists(saveTo, function(exists) {
          if (!exists) return workaround();
          
          res.contentType(saveTo);
//          res.set('Content-Type', 'image/jpeg');
          res.sendfile(saveTo, function(err, path) {
            if (err) return workaround();
            
// This seems like debugging information. Do we need to log it?
//            util.log("Serving Image for URL: " + params.url)
          });
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

module.exports = app;