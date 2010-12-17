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

exports.downloadSource = downloadSource = function(source, save_to, callback) {
  source = unescape(source);
  
  util.log('Downloading: ' + source);
  
  request({
    uri: source,
    responseBodyStream: new BufferList()
  }, function (err, res, body) {
    if (err) return callback(err, source, save_to);
    if (res.statusCode != 200 || !res.headers['content-type'].test('image')) return callback(new Error("The provided URL is not a valid image"), source, save_to);
    
    mkdir(path.dirname(save_to), function(err) {
      if (err) return callback(err, source, save_to);

      body = new Buffer(body.toString(), 'binary');
      fs.writeFile(save_to, body, 'binary', function (err) {
        if (err) return callback(err, source, save_to);
        
        util.log('Downloaded successfully to ' + save_to)
        
        return callback(null, source, save_to);
      });
    });
  });
};

exports.grabOriginal = grabOriginal = function(url, callback) {  
  //  sha used to generate path
  var sha = crypto.createHash('sha1').update(url).digest('hex')
  var save_to = '/tmp/origs/' + sha.slice(0, 2) + '/' + sha.slice(2) + '.jpg';
  
  util.log('Grabbing original');
  
  path.exists(save_to, function(cached) {
    if (cached) {
      util.log('Found cached original');
      return callback(null, url, save_to);
    } else {
      downloadSource(url, save_to, function(err) {
        if (err) return callback(err, url, save_to);
        
        return callback(null, url, save_to);
      });
    }
  });
}

exports.grabThumbnail = grabThumbnail = function(params, callback) {
  //  sha used to generate path
  var sha = crypto.createHash('sha1').update(JSON.stringify(params)).digest('hex')
  var save_to = '/tmp/thumbs/' + sha.slice(0, 2) + '/' + sha.slice(2) + '.jpg';
  
  util.log('Grabbing thumbnail');
  
  path.exists(save_to, function(exists) {
    if (exists) {
      util.log('Found cached thumbnail');
      return callback(null, params.url, save_to);
    }
    
    //  no cached original
    grabOriginal(params.url, function(err, url, orig_save_to) {
      if (err) return callback(err, params.url, save_to);
    
      mkdir(path.dirname(save_to), function(err) {
        if (err) return callback(err, params.url, save_to);
      
        util.log('Generating thumbnail');
        try {
          im[params['method']](Object.merge(cropOptions, {
            srcPath: orig_save_to,
            dstPath: save_to,
            width: params.w || 0,
            height: params.h || 0
          }), function(err, stdout, stderr) {
            if (err) return callback(err, params.url, save_to);
        
            util.log('Saved thumbnail successfully to ' + save_to);

            return callback(null, params.url, save_to);
          });
        } catch (e) {
          return callback(e, params.url, save_to)
        }
      });
    });
  });
}