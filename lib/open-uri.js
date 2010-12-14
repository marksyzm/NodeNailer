var fs = require('fs'),
    url = require('url'),
    http = require('http'),
    sys = require('sys');
      
function OpenURI(uri, options){
  this.options = options;
  this.uri = url.parse(uri);
  this.headers = {
    'Accept': '*/*',
    'Host': this.uri.host,
    'User-Agent': 'Node.js based thumbnailer'
  };
  var _this = this;
  Object.keys(options.headers || {}).forEach(function(headerKey) {
    _this.headers[headerKey] = options.headers[headerKey];
  });
  this.secure = this.uri.protocol == 'https';
  this.client = http.createClient(this.uri.port || (this.secure ? 443 : 80), this.uri.host);
  if (!this.uri.pathname) this.uri.pathname = '/';
  if (!this.uri.search) this.uri.search = '';
  if (this.secure) _applySSL();
  this.body = '';
  this.request = this.client.request('GET', this.uri.pathname + this.uri.search, this.headers);
  this.request.addListener('response', function(res){ _this._responseHandler(res) });
}
OpenURI.prototype = new process.EventEmitter();
var instanceMethods = {
  _responseHandler: function(response){
    var _this = this;
    if([301, 302].indexOf(response.statusCode) >= 0) {
      try {
        this.options.originalRequest = this.options.originalRequest || this;
        this.options.redirectAttempts = this.options.redirectAttempts || 0;
        this.options.redirectAttempts += 1;
        if(this.options.redirectAttempts > 4)
          this._response('error', '', 'Redirect loop too deep');
        else {
          var location = url.resolve(this.uri, response.headers['location']);
          new OpenURI(location, this.options).open(this.filename);
        }
      } catch(e) {
        this._respond('error', '', 'Failed to follow redirect');
      }
    } else {
      response.on('data', function (chunk) {
        if(_this.filename) {
          if(!_this.file.write(chunk)) response.pause();
        } else _this.body += chunk;
      });
      response.on('end', function () {
        if(_this.filename) _this.file.end();
        if (parseInt(response.statusCode) >= 400) _this._respond('error', _this._data(), response);
        else _this._respond('success', _this._data(), response);
        _this._respond('complete', _this._data(), response);
      });
      this.file.on('drain', function(){
        response.resume();
      });
      this.file.on('error', function(ex){
        _this._respond('error', ex, 'File system error');
      });
    }
  },
  _data: function(){
    return this.file || this.body;
  },
  _applySSL: function(){
    try {
      this.client.setSecure("X509_PEM");
    } catch(e) {
      sys.puts('WARNING: SSL not supported in your version of node JS');
    }
  },
  _respond: function(type, data, response) {
    if (this.options.originalRequest) this.options.originalRequest.emit(type, data, response);
    else this.emit(type, data, response);
  },
  open: function(filename){
    this.filename = filename;
    if(this.filename){
      this.file = fs.createWriteStream(this.filename, { 
        'flags': 'w', 
        'encoding': 'ascii', 
        'mode': 0666
      });
    }
    this.request.end();
    return this;
  },
  save: function(filename) {
    return this.open(filename);
  },
  retrieve: function() {
    return this.open();
  }
}
Object.keys(instanceMethods).forEach(function(instanceMethod) {
  OpenURI.prototype[instanceMethod] = instanceMethods[instanceMethod];
});
exports.OpenURI = OpenURI;
exports.open = function(remote, opts){
  return new OpenURI(remote, opts).open(opts.filename);
}