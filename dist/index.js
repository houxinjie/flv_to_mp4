'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _flvDemuxer = require('./demux/flv-demuxer.js');

var _flvDemuxer2 = _interopRequireDefault(_flvDemuxer);

var _mp4Remuxer = require('./remux/mp4-remuxer.js');

var _mp4Remuxer2 = _interopRequireDefault(_mp4Remuxer);

var _logger = require('./utils/logger.js');

var _logger2 = _interopRequireDefault(_logger);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _package = require('../package.json');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version(_package.version).option('-i, --input <inputFile>').option('-o, --output <outputFile>').usage('-i <inputFile> -o <outputFile>').parse(process.argv);

var Tag = 'Ftom4';

if (!_commander2.default.input || !_commander2.default.output) {
    _commander2.default.help();
    process.exit(0);
}

var inputFilePath = _path2.default.join(process.cwd(), _commander2.default.input);
var outputFilePath = _path2.default.join(process.cwd(), _commander2.default.output);

if (!_fs2.default.existsSync(inputFilePath)) {
    _logger2.default.e(Tag, 'input file not exist');
    process.exit(0);
}

if (_fs2.default.existsSync(outputFilePath)) {
    _fs2.default.unlinkSync(outputFilePath);
}

var arrayBuffer = _fs2.default.readFileSync(inputFilePath).buffer;

var demuxer = new _flvDemuxer2.default(arrayBuffer);
var remuxer = new _mp4Remuxer2.default();

demuxer.onError = function () {};

demuxer.onMediaInfo = function () {};

remuxer.bindDataSource(demuxer);

remuxer.onInitSegment = function (data) {
    _fs2.default.writeFileSync(outputFilePath, Buffer.from(data), { flag: 'a' });
};

remuxer.onMediaSegment = function (type, mediaSegment) {
    _fs2.default.writeFileSync(outputFilePath, Buffer.from(mediaSegment.data), { flag: 'a' });
};

demuxer.parseChunks(arrayBuffer, 0);