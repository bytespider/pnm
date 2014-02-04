var fs = require('fs');
var parser = require('./').Parser();

var file_in = fs.createReadStream('sample.ppm');
file_in.pipe(parser);

var png, ctx, img_data, pixel = 0, read_length = 0, pixels = [];
parser.once('header', function (meta) {
});

parser.on('readable', function () {
    var data;
    while(null !== (data = this.read())) {
        pixels.push(data);
    }
});

parser.once('end', function () {
    var data = Buffer.concat(pixels);
});