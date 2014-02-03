var util = require("util");
var Transform = require("stream").Transform;

var PNMImage = require('./image');

module.exports = Parser;
util.inherits(Parser, Transform);

function Parser(options) {
    if (!(this instanceof Parser)) {
        return new Parser(options);
    }

    Transform.call(this, options);

    this._writableState.objectMode = false;
    this._readableState.objectMode = true;

    this._parsedMetadata = { type: null, width: 0, height: 0, colors: 0 };
    this._parsedPixelData = null;
}

Parser.prototype._transform = function (chunk, encoding, cb) {
    console.time('transform');
    var token;
    if (chunk.length > 0 && this._parsedMetadata.type == null) {
        console.time('type');
        token = getToken(chunk);
        var type = token.bytes.toString();

        if (!Parser.ImageTypes.indexOf(type)) {
            this.emit('error', new Error('Image type not supported. Image type: ' + type));
            return;
        }

        this._parsedMetadata.type = type;

        chunk = chunk.slice(token.offset);
        console.timeEnd('type');
    }

    if (chunk.length > 0 && this._parsedMetadata.width == 0) {
        console.time('width');
        token = getToken(chunk);
        this._parsedMetadata.width = +token.bytes.toString();

        chunk = chunk.slice(token.offset);
        console.timeEnd('width');
    }

    if (chunk.length > 0 && this._parsedMetadata.height == 0) {
        console.time('height');
        token = getToken(chunk);
        this._parsedMetadata.height = +token.bytes.toString();

        chunk = chunk.slice(token.offset);
        console.timeEnd('height');
    }

    if (chunk.length > 0 && this._parsedMetadata.colors == 0) {
        console.time('colors');
        token = getToken(chunk);
        var maxval = +token.bytes.toString();
        if (maxval <= 0 || maxval >= 65536) {
            this.emit('error', new Error('Color max is not within the supported rage for the format: ' + maxval));
            return;
        }
        this._parsedMetadata.colors = maxval;

        chunk = chunk.slice(token.offset);
        console.timeEnd('colors');
    }

    if (chunk.length > 0 && hasMetadata(this._parsedMetadata)) {
        console.time('data');
        if (this._headerSent == false) {
            this.emit('header', this._parsedMetadata);
            this._headerSent = true;
        }
        // this should be pixel data
        if (chunk.length) {
            this.emit('data', chunk);
        }

        if (null == this._parsedPixelData) {
            this._parsedPixelData = chunk;
        } else {
            this._parsedPixelData = Buffer.concat([this._parsedPixelData, chunk]);
        }

        if (this._parsedPixelData.length == this._parsedMetadata.width * this._parsedMetadata.height * (this._parsedMetadata.type == 'P6' ? 3 : 1)) {
            var image = new PNMImage(
                this._parsedMetadata.width,
                this._parsedMetadata.height,
                this._parsedMetadata.colors,
                this._parsedPixelData
            );

            console.timeEnd('transform');
            return cb(null, image);
        }
        console.timeEnd('data');
    }

    cb();
    console.timeEnd('transform');
};

Parser.prototype._flush = function (cb) {
    cb();
};

// only the binary formats are supported
Parser.ImageTypes = [ 'P4', 'P5', 'P6' ];

function getToken(chunk) {
    console.time('token');
    var i = 0;
    while(!isWhitespace(chunk[i])) { i += 1 }

    if (i > chunk.length) {
        return false; // couldn't determine a token, ran out of bytes
    }

    console.timeEnd('token');
    return {offset: i + 1, bytes: chunk.slice(0, i)};
}

function hasMetadata(meta) {
    return meta.type != null && meta.type != '' && meta.width > 0 && meta.height > 0 && meta.colors > 0;
}

function parseMetadataType(chunk) {

}

function isWhitespace(byte) {
    return [0x20, 0x09, 0x0a, 0x0b, 0x0c, 0x0d].indexOf(byte) !== -1;
}