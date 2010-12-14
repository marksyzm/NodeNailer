def im: require 'imagemagick'
def uri: require 'open-uri'
using 'crypto', 'sys', 'fs', 'path'

def crop: (orig, thumb, opts, res) ->
  fs.mkdir path.dirname(thumb), 0777
  im.crop({
    srcPath: orig,
    dstPath: thumb,
    width:   opts.w || '',
    height:  opts.h || '',
    progressive: false,
    format:  'jpg'
  }, (err, stdout, stderr) ->
    if err
      sys.puts('Error', err)
      res.sendfile('./error.jpg')
    else
      sys.puts('resized '+opts.url+' to fit within '+opts.w+'px')
      res.sendfile(thumb)
  )

get '/': 'hi'

get '/:key': (req, res) ->
  tsha: crypto.createHash('sha1').update(JSON.stringify(req.query)).digest('hex')
  osha: crypto.createHash('sha1').update(JSON.stringify(req.query.url)).digest('hex')
  thumb: path.join("/tmp/thumbs", tsha.slice(0,2), tsha.slice(2,40)+".jpg")
  orig: path.join("/tmp/orig/", osha.slice(0,2), osha.slice(2,40)+".jpg")
  sys.puts('RAD!', req.query.url)
  path.exists thumb, (cached) ->
    if cached
      res.sendfile(thumb)
    else
      path.exists orig, (cached) ->
        if cached
          crop(orig, thumb, req.query, res)
        else
          fs.mkdir(path.dirname(orig), 0777)
          uri.open(req.query.url, {filename: orig}).on 'success', ()->
            crop(orig, thumb, req.query, res)