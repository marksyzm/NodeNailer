require.paths.unshift('./vendor');
require.paths.unshift('./lib');

var vows = require('vows'),
    assert = require('assert'),
    nn = require('node-nailer'),
    path = require('path'),
    spawn = require('child_process').spawn,
    im = require('imagemagick'),
    fs = require('fs'),
    request = require('request');
    
var server;

var testImage = 'https://web.archive.org/web/20110203003852/http://chrisandsnez.com/images/marriage.jpg';


vows.describe('NodeNailer Core').addBatch({
  'when downloading': {
    'a valid image': {
      topic: function() {
        nn.downloadSource(testImage, '/tmp/nodenailertest.jpg', this.callback);
      },
    
      'we get no error': function(err, source, saveTo) {
        assert.isNull(err);
      }
    },
    'an invalid image': {
      topic: function() {
        nn.downloadSource(testImage + 'asdf', '/tmp/nodenailertest.jpg', this.callback);
      },
      
      'we get an error': function(err, source, saveTo) {
        assert.isNotNull(err);
      }
    }
  },
  
  'when grabbing': {
    'an original': {
      topic: function() {
        nn.grabOriginal(testImage, this.callback);
      },
      
      'we get no error': function(err, url, saveTo) {
        assert.isNull(err);
      }
    },
    'a thumbnail': {
      'without sufficient parameters': {
        topic: function() {
          nn.grabThumbnail({
            url: testImage,
            method: 'crop'
          }, this.callback);
        },
      
        'we get an error': function(err, source, saveTo) {
          assert.isNotNull(err);
        }
      },
      'with sufficient parameters': {
        topic: function() {
          nn.grabThumbnail({
            url: testImage,
            method: 'crop',
            w: 50,
            h: 50
          }, this.callback);
        },
      
        'we get no error': function(err, source, saveTo) {
          assert.isNull(err);
        },
      }
    }
  }
}).run({ error: false });

vows.describe('NodeNailer Web Server').addBatch({
  'when requesting a valid image': {
    topic: function() {
      request({
        uri: 'http://localhost:3000/?url=' + testImage
      }, this.callback)
    },

    'we get a good status code': function(err, res, body) {
      assert.equal(res.statusCode, 200);
    },
    
    'we get an image content type': function(err, res, body) {
      assert.equal(res.headers['content-type'], 'image/jpeg');
    }
  }
}).addBatch({
  'when requesting info': {
    topic: function() {
      request({
        uri: 'http://localhost:3000/?info=true&url=' + testImage,
      }, this.callback)
    },
    
    'we get a good status code': function(err, res, body) {
      assert.equal(res.statusCode, 200);
    },
    
    'we get an application/json content type': function(err, res, body) {
      assert.match(res.headers['content-type'], /^application\/json/);
    },
    
    'we get the right info back': function(err, res, body) {
      var info = JSON.parse(body);
      assert.isNotNull(info.x);
      assert.isNotNull(info.y);
    }
  }
}).addBatch({
  'when cropping an image': {
    topic: function() {
      request({
        uri: 'http://localhost:3000/?info=true&url=' + testImage + '&w=50&h=50&method=crop',
      }, this.callback)
    },

    'we get a good status code': function(err, res, body) {
      assert.equal(res.statusCode, 200);
    },

    'we get an application/json content type': function(err, res, body) {
      assert.match(res.headers['content-type'], /^application\/json/);
    },

    'the image is the width we expect': function(err, res, body) {
      var info = JSON.parse(body);
      assert.isTrue(info.width == 50);
    },

    'the image is the height we expect': function(err, res, body) {
      var info = JSON.parse(body);
      assert.isTrue(info.height == 50);
    }
  }
}).addBatch({
  'when requesting an image from an invalid domain': {
    topic: function() {
      request({
        uri: 'http://localhost:3000/?url=http://asdf'
      }, this.callback)
    },
    
    'we get a good status code': function(err, res, body) {
      assert.equal(res.statusCode, 200);
    },
    
    'we get a applicaton/json content type': function(err, res, body) {
      assert.match(res.headers['content-type'], /^application\/json/);
    },

    'we get a domain name error': function(err, res, body) {
      body = JSON.stringify(body);
      assert.match(body, /Domain name/);
    }
  }
}).run({ error: false }); // Run it
