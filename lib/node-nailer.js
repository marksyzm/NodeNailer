
var crypto = require('crypto'),
    util = require('util'),
    mkdir = require('../lib/mkdir-p'),
    im = require('imagemagick'),
    request = require('request'),
    fs = require('fs'),
    BufferList = require('bufferlist').BufferList,
    path = require('path');
  
require('../lib/MooTools').apply(GLOBAL);

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

// defaults to /tmp dir unless specified
var assetsDir = process.env.NODENAILER_ASSETS_DIR || '/tmp'

var downloadSource = exports.downloadSource = function(source, saveTo, callback) {
  source = encodeURI(source);

// This seems like debugging information. Do we need to log it?  
//  util.log('Original source: ' + source);
//  util.log('Original downloading: ' + saveTo);
  
  request.head(source, function (err, res, body) {
    if (err) return callback(err, source, saveTo);
    if (res.statusCode != 200)
      return callback(new Error(source + " returns a non-200 status code: " + res.statusCode));
      
    if (!res.headers['content-type'] || !res.headers['content-type'].test('image'))
      return callback(new Error(source +  " does not appear to be a valid image"), source, saveTo);

    //fs.mkdir(path.dirname(saveTo), function(err) {
    mkdir(path.dirname(saveTo), function(err) {
      if (err) return callback(err, source, saveTo);
      var stream = fs.createWriteStream(saveTo);
      stream.on('finish', function() {
	stream.close();
        return callback(null, source, saveTo);
      });
      //body = new Buffer(body.toString(), 'binary');
      request(source).pipe(stream);
      //fs.writeFile(saveTo, body, 'binary', function (err) {
      //  if (err) return callback(err, source, saveTo);
      //  
      //  util.log('Original saved: ' + saveTo)
        
      //return callback(null, source, saveTo);
      });
    });
};

var grabOriginal = exports.grabOriginal = function(url, callback) {
  //  sha used to generate path
  var sha = crypto.createHash('sha1').update(url).digest('hex')
  var saveTo = assetsDir + '/origs/' + sha.slice(0, 2) + '/' + sha.slice(2) + '.jpg';
 
// This seems like debugging information. Do we need to log it?  
//  util.log('Original check: ' + saveTo);
  
  // path.exists is now called `fs.exists`
  //path.exists(saveTo, function(cached) {
  fs.exists(saveTo, function(cached) {
    if (cached) {
// This seems like debugging information. Do we need to log it?  
//      util.log('Original found: ' + saveTo);
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
  var saveTo = assetsDir + '/thumbs/' + sha.slice(0, 2) + '/' + sha.slice(2) + '.jpg';
  
// This seems like debugging information. Do we need to log it?  
//  util.log('Thumbnail check: ' + saveTo);
  
  // path.exists is now called `fs.exists`
  //path.exists(saveTo, function(exists) {
  fs.exists(saveTo, function(exists) {
    if (exists) {
// This seems like debugging information. Do we need to log it?  
//      util.log('Thumbnail found: ' + saveTo);
      return callback(null, params.url, saveTo);
    }
    
    //  no cached original
    grabOriginal(params.url, function(err, url, orig_saveTo) {
      if (err) return callback(err, params.url, saveTo);
   
      //fs.mkdir(path.dirname(saveTo), function(err) {
      mkdir(path.dirname(saveTo), function(err) {
        if (err) return callback(err, params.url, saveTo);
      
        try {
          im[params['method']](Object.merge(cropOptions, {
            srcPath: orig_saveTo,
            dstPath: saveTo,
            width: params.w || 0,
            height: params.h || 0
          }), function(err, stdout, stderr) {
            if (err) return callback(err, params.url, saveTo);
            
// This seems like debugging information. Do we need to log it?  
//            util.log('Thumbnail saved: ' + saveTo);
            
            return callback(null, params.url, saveTo);
          });
        } catch (e) {
          util.log('Thumbnail failure: ' + e.message)
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
