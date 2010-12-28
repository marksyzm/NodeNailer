var mkdir = require("mkdir-p"),
    crypto = require('crypto'),
    util = require('util'),
    im = require('imagemagick'),
    request = require('request'),
    fs = require('fs'),
    BufferList = require('bufferlist').BufferList,
    path = require('path');
  
require('MooTools').apply(GLOBAL);

Object.extend({
  alphabetize: function(object) {
    var organized = {};
    var keys = Object.keys(object);
    keys.sort().each(function(a) {
      organized[a] = object[a];
    });
    return organized;
  }
});

var cropOptions = {
  srcPath: undefined,
  srcData: null,
  srcFormat: null,
  dstPath: undefined,
  quality: 0.8,
  format: 'jpg',
  progressive: false,
  width: 0,
  height: 0,
  strip: true,
  filter: 'Lagrange',
  sharpening: 0.2,
  customArgs: []
};

var downloadSource = exports.downloadSource = function(source, saveTo, callback) {
  source = unescape(source);
  
  util.log('Downloading: ' + source);
  
  request({
    uri: source,
    responseBodyStream: new BufferList()
  }, function (err, res, body) {
    if (err) return callback(err, source, saveTo);
    if (res.statusCode != 200 || !res.headers['content-type'].test('image')) return callback(new Error("The provided URL is not a valid image"), source, saveTo);
    
    mkdir(path.dirname(saveTo), function(err) {
      if (err) return callback(err, source, saveTo);

      body = new Buffer(body.toString(), 'binary');
      fs.writeFile(saveTo, body, 'binary', function (err) {
        if (err) return callback(err, source, saveTo);
        
        util.log('Downloaded successfully to ' + saveTo)
        
        return callback(null, source, saveTo);
      });
    });
  });
};

var grabOriginal = exports.grabOriginal = function(url, callback) {
  //  sha used to generate path
  var sha = crypto.createHash('sha1').update(url).digest('hex')
  var saveTo = '/tmp/origs/' + sha.slice(0, 2) + '/' + sha.slice(2) + '.jpg';
  
  util.log('Grabbing original');
  
  path.exists(saveTo, function(cached) {
    if (cached) {
      util.log('Found cached original');
      return callback(null, url, saveTo);
    } else {
      downloadSource(url, saveTo, function(err) {
        if (err) return callback(err, url, saveTo);
        
        return callback(null, url, saveTo);
      });
    }
  });
};

var grabThumbnail = exports.grabThumbnail = function(params, callback) {
  //  sha used to generate path
  var sha = crypto.createHash('sha1').update(JSON.stringify(params)).digest('hex')
  var saveTo = '/tmp/thumbs/' + sha.slice(0, 2) + '/' + sha.slice(2) + '.jpg';
  
  util.log('Grabbing thumbnail');
  
  path.exists(saveTo, function(exists) {
    if (exists) {
      util.log('Found cached thumbnail');
      return callback(null, params.url, saveTo);
    }
    
    //  no cached original
    grabOriginal(params.url, function(err, url, orig_saveTo) {
      if (err) return callback(err, params.url, saveTo);
    
      mkdir(path.dirname(saveTo), function(err) {
        if (err) return callback(err, params.url, saveTo);
      
        util.log('Generating thumbnail');
        try {
          im[params['method']](Object.merge(cropOptions, {
            srcPath: orig_saveTo,
            dstPath: saveTo,
            width: params.w || 0,
            height: params.h || 0
          }), function(err, stdout, stderr) {
            if (err) return callback(err, params.url, saveTo);
            
            //  make sure the saveTo path exists
            path.exists(saveTo, function(exists) {
              if (!exists) {
                util.log(saveTo + " hasn't successfully been saved yet.  Checking again.");
                
                return grabThumbnail.delay(50, this, [params, callback]);
              }
              
              util.log('Saved thumbnail successfully to ' + saveTo);
              
              return callback(null, params.url, saveTo);
            });
          });
        } catch (e) {
          return callback(e, params.url, saveTo)
        }
      });
    });
  });
};

var grabInfo = exports.grabInfo = function(filename, callback) {
  im.identify(filename, function(err, features) {
    if (err) return callback(err);
    
    features = Object.merge(features, {
      filename: filename
    });

    return callback(null, features);
  });
};