# NodeNailer

This is a small Node app built using express framework on top of node to thumbnail images.  
Currently it accepts a publicly available image url as a query parameter, caches the original image, and then exposes arbitrary thumbnail sizes.  Node was chosen to avoid backing up the request loop while images are cached and thumbnailed.

The basic url look as follows:

    GET /?url=http://sample.com/image.jpg&w=50&h=100
    
If `w` or `h` are not specified, the image will be cached and the width and height will be returned as JSON:

    GET /?url=http://sample.com/image.jpg
    {"x":1200,"y":500}
    
Run `npm bundle` to pull the latest dependencies.
To run the server, `cd` into the base directory, and run:
  
    node app/server.js
    
## Copyright
    
Copyright (c) 2010 CrowdFlower. All code is released under the MIT license.