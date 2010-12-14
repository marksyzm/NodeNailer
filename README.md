# NodeNailer

This is a small Node app built using zappa https://github.com/mauricemach/zappa which uses ImageMagick to thumbnail images.  Currently it accepts a publicly available image url as a query parameter, caches the original image, and then exposes arbitrary thumbnail sizes.  Node was chosen to avoid backing up the request loop while images are cached and thumbnailed.  The basic url look as follows:

    GET /secret_key?url=http://sample.com/image.jpg&w=50&h=100
    
If `w` or `h` are not specified, the image will be cached and the width and height will be returned as JSON:

    GET /secret_key?url=http://sample.com/image.jpg
    {"x":1200,"y":500}
    
All dependencies are stored in vendor.  You can use `npm bundle` to pull the latest dependencies.  This will create a new directory called npm_bundles, just rename this to vendor and everything *should* work.  Both the zappa and coffee executables have been altered to load the vendored dependancies.  Running the app in development is done as follows:

    bin/zappa -w app.coffee
    
This will restart the server if you make changes to any of the files.
    
## Copyright
    
Copyright (c) 2010 CrowdFlower. All code is released under the MIT license.