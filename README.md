# NodeNailer

This is a small Node app built using express framework on top of node to thumbnail images.  
Currently it accepts a publicly available image url as a query parameter, caches the original image, and then exposes arbitrary thumbnail sizes.  Node was chosen to avoid backing up the request loop while images are cached and thumbnailed.

# Starting the server
Run `npm bundle` to pull the latest dependencies.
From the base directory, run:

`node app/server.js`
    
# Parameters

* w = width in pixels; required
* h = height in pixels; required
* method = ['crop', 'resize']; defaults to 'crop'
* info = ['true', 'false']; defaults to 'false'
    
# How it works
    
If neither `w` or `h` is not specified, the original image will be cached (if not already) and displayed:

    GET /?url=http://sample.com/image.jpg
    
If either `w` or `h` is specified, the original image will be cached (if not already), thumbnailed to specified size and cached (if not already), and displayed:

    GET /?url=http://sample.com/image.jpg&w=50
    
If either `w` or `h` and `method` is specified, then the original image will be cached (if not already), thumbnailed using the specified `method` and cached (if not already), and displayed:

    GET /?url=http://sample.com/image.jpg&w=50&method=resize
    
If the parameter `info=true` is added, then the width and height of the image is returned in JSON format

    GET /?url=http://sample.com/image.jpg&w=50&method=resize&info=true
    {"x":1200,"y":500}
    
## Copyright
    
Copyright (c) 2010 CrowdFlower. All code is released under the MIT license.