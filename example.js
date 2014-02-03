var fs = require('fs');
var parser = require('./').Parser();

var Canvas = require('canvas');

var sample = fs.createReadStream('sample.ppm');
/**/
console.time('parser');
sample.pipe(parser).on('readable', function () {
    var ppm_image = this.read();
    console.timeEnd('parser');

    var canvas = new Canvas(ppm_image.width, ppm_image.height);
    var ctx = canvas.getContext('2d');

    var img = ctx.createImageData(ppm_image.width, ppm_image.height)
    for (var y = 0; y < ppm_image.height; y++) {
        for (var x = 0; x < ppm_image.width; x++) {
            var index = 4 * (x + y * ppm_image.width);
            var pnm_index = index / 4 * 3;

            var r = ppm_image.pixels[pnm_index+0];
            var g = ppm_image.pixels[pnm_index+1];
            var b = ppm_image.pixels[pnm_index+2];

            img.data[index+0] = r;
            img.data[index+1] = g;
            img.data[index+2] = b;
            img.data[index+3] = 255;
            //console.dir(img.data);
        }
        //break;
    }

    ctx.putImageData(img, 0, 0);
    var out = fs.createWriteStream('out_v1.png');

    var stream = canvas.createPNGStream();
    stream.pipe(out);
});
/**/

/*
sample.pipe(parser);

var canvas, ctx, img_data, pixel = 0;
parser.once('header', function (metadata) {
    canvas = new Canvas(metadata.width, metadata.height);
    
    ctx = canvas.getContext('2d');
    img_data = ctx.createImageData(metadata.width, metadata.height);
});

parser.on('data', function (chunk) {
    for (var i = 0; i < chunk.length; i++) {
        img_data.data[pixel++] = chunk[i];
        if (pixel % 4 == 3) {
            img_data.data[pixel++] = 255;
        }
    }
});

parser.once('end', function () {
    var stream = canvas.createPNGStream();
    var out = fs.createWriteStream('out_v2.png');
    stream.pipe(out);
    ctx.putImageData(img_data, 0, 0);
});
*/