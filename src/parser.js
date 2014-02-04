'use strict';

var util = require("util");
var Transform = require("stream").Transform;

module.exports = Parser;
util.inherits(Parser, Transform);

function Parser(options) {
    if (!(this instanceof Parser)) {
        return new Parser(options);
    }

    Transform.call(this, options);
    this._parsedMetadata = { type: null, width: 0, height: 0, colors: 0 };
}

Parser.prototype._headerSent = false;

Parser.prototype._transform = function (chunk, encoding, cb) {
    var token;
    var meta = this._parsedMetadata;

    if (chunk.length > 0 && meta.type == null) {
        token = getToken(chunk);

        var type = token.bytes.toString();

        if (type != 'P4' && type != 'P5' && type != 'P6') {
            this.emit('error', new Error('Image type not supported. Image type: ' + type));
            return;
        }

        meta.type = type;
        chunk = getChunk(chunk, token.offset);
    }

    if (chunk.length > 0 && meta.width == 0) {
        token = getToken(chunk);

        meta.width = +token.bytes;
        chunk = getChunk(chunk, token.offset);
    }

    if (chunk.length > 0 && meta.height == 0) {
        token = getToken(chunk);

        meta.height = +token.bytes;
        chunk = getChunk(chunk, token.offset);
    }

    if (chunk.length > 0 && meta.colors == 0) {
        token = getToken(chunk);

        var maxval = +token.bytes;
        if (maxval <= 0 || maxval >= 65536) {
            this.emit('error', new Error('Color max is not within the supported rage for the format: ' + maxval));
            return;
        }

        meta.colors = maxval;
        chunk = getChunk(chunk, token.offset);
    }

    if (chunk.length > 0 && hasMetadata(meta)) {
        if (this._headerSent == false) {
            this.emit('header', meta);
            this._headerSent = true;
        }


        this.push(chunk);
    }

    return cb();
};

function getToken(chunk) {
    var i = 0, offset;

    // find the whitespace
    while(!isWhitespace(chunk[i])) { i += 1 }
    
    // keep looking until no more whitespace
    offset = i + 1;
    while(isWhitespace(chunk[offset])) { offset += 1 }

    if (i > chunk.length || offset > chunk.length) {
        return false; // couldn't determine a token, ran out of bytes
    }

    return {offset: offset, bytes: chunk.slice(0, i)};
}

function getChunk(chunk, offset, length) {
    return chunk.slice(offset, length);
}

function hasMetadata(meta) {
    return meta.type != null && meta.type != '' && meta.width > 0 && meta.height > 0 && meta.colors > 0;
}

function isWhitespace(byte) {
    return (byte >= 9 && byte <= 13) || byte == 32;
}