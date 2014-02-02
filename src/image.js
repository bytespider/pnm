module.exports = PNMImage;

function PNMImage(width, height, max_colors, pixels) {
    this.width = width;
    this.height = height;
    this.colors = max_colors;
    this.pixels = pixels || new Buffer(null);
}