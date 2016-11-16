'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _logger = require('../utils/logger.js');

var _logger2 = _interopRequireDefault(_logger);

var _mp4Generator = require('./mp4-generator.js');

var _mp4Generator2 = _interopRequireDefault(_mp4Generator);

var _aacSilent = require('./aac-silent.js');

var _aacSilent2 = _interopRequireDefault(_aacSilent);

var _mediaSegmentInfo = require('../core/media-segment-info.js');

var _exception = require('../utils/exception.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Fragmented mp4 remuxer
var MP4Remuxer = function () {
    function MP4Remuxer() {
        _classCallCheck(this, MP4Remuxer);

        this.TAG = 'MP4Remuxer';

        this._isLive = false;

        this._dtsBase = -1;
        this._dtsBaseInited = false;
        this._audioDtsBase = Infinity;
        this._videoDtsBase = Infinity;
        this._audioNextDts = undefined;
        this._videoNextDts = undefined;

        this._audioMeta = null;
        this._videoMeta = null;

        this._audioSegmentInfoList = new _mediaSegmentInfo.MediaSegmentInfoList('audio');
        this._videoSegmentInfoList = new _mediaSegmentInfo.MediaSegmentInfoList('video');

        this._onInitSegment = null;
        this._onMediaSegment = null;

        this._forceFirstIDR = false;
        this._fillSilentAfterSeek = false;
    }

    _createClass(MP4Remuxer, [{
        key: 'destroy',
        value: function destroy() {
            this._dtsBase = -1;
            this._dtsBaseInited = false;
            this._audioMeta = null;
            this._videoMeta = null;
            this._audioSegmentInfoList.clear();
            this._audioSegmentInfoList = null;
            this._videoSegmentInfoList.clear();
            this._videoSegmentInfoList = null;
            this._onInitSegment = null;
            this._onMediaSegment = null;
        }
    }, {
        key: 'bindDataSource',
        value: function bindDataSource(producer) {
            producer.onDataAvailable = this.remux.bind(this);
            producer.onTrackMetadata = this._onTrackMetadataReceived.bind(this);
            return this;
        }

        /* prototype: function onInitSegment(type: string, initSegment: ArrayBuffer): void
           InitSegment: {
               type: string,
               data: ArrayBuffer,
               codec: string,
               container: string
           }
        */

    }, {
        key: 'insertDiscontinuity',
        value: function insertDiscontinuity() {
            this._audioNextDts = this._videoNextDts = undefined;
        }
    }, {
        key: 'seek',
        value: function seek(originalDts) {
            this._videoSegmentInfoList.clear();
            this._audioSegmentInfoList.clear();
        }
    }, {
        key: 'remux',
        value: function remux(audioTrack, videoTrack) {
            if (!this._onMediaSegment) {
                throw new _exception.IllegalStateException('MP4Remuxer: onMediaSegment callback must be specificed!');
            }
            if (!this._dtsBaseInited) {
                this._calculateDtsBase(audioTrack, videoTrack);
            }
            this._remuxVideo(videoTrack);
            this._remuxAudio(audioTrack);
        }
    }, {
        key: '_onTrackMetadataReceived',
        value: function _onTrackMetadataReceived(type, metadata) {
            var metabox = null;

            if (type === 'audio') {
                this._audioMeta = metadata;
                if (this._videoMeta) {
                    metabox = _mp4Generator2.default.generateInitSegment(this._videoMeta, this._audioMeta);
                } else {
                    return;
                }
            } else if (type === 'video') {
                this._videoMeta = metadata;
                if (this._audioMeta) {
                    metabox = _mp4Generator2.default.generateInitSegment(this._videoMeta, this._audioMeta);
                } else {
                    return;
                }
            } else {
                return;
            }

            // dispatch metabox (Initialization Segment)
            if (!this._onInitSegment) {
                throw new _exception.IllegalStateException('MP4Remuxer: onInitSegment callback must be specified!');
            }
            this._onInitSegment(metabox.buffer);
        }
    }, {
        key: '_calculateDtsBase',
        value: function _calculateDtsBase(audioTrack, videoTrack) {
            if (this._dtsBaseInited) {
                return;
            }

            if (audioTrack.samples && audioTrack.samples.length) {
                this._audioDtsBase = audioTrack.samples[0].dts;
            }
            if (videoTrack.samples && videoTrack.samples.length) {
                this._videoDtsBase = videoTrack.samples[0].dts;
            }

            this._dtsBase = Math.min(this._audioDtsBase, this._videoDtsBase);
            this._dtsBaseInited = true;
        }
    }, {
        key: '_remuxAudio',
        value: function _remuxAudio(audioTrack) {
            var track = audioTrack;
            var samples = track.samples;
            var dtsCorrection = undefined;
            var firstDts = -1,
                lastDts = -1,
                lastPts = -1;

            var remuxSilentFrame = false;
            var silentFrameDuration = -1;

            if (!samples || samples.length === 0) {
                return;
            }

            var bytes = 8 + track.length;
            var mdatbox = new Uint8Array(bytes);
            mdatbox[0] = bytes >>> 24 & 0xFF;
            mdatbox[1] = bytes >>> 16 & 0xFF;
            mdatbox[2] = bytes >>> 8 & 0xFF;
            mdatbox[3] = bytes & 0xFF;

            mdatbox.set(_mp4Generator2.default.types.mdat, 4);

            var offset = 8; // size + type
            var mp4Samples = [];

            while (samples.length) {
                var aacSample = samples.shift();
                var unit = aacSample.unit;
                var originalDts = aacSample.dts - this._dtsBase;

                if (dtsCorrection == undefined) {
                    if (this._audioNextDts == undefined) {
                        if (this._audioSegmentInfoList.isEmpty()) {
                            dtsCorrection = 0;
                            if (this._fillSilentAfterSeek && !this._videoSegmentInfoList.isEmpty()) {
                                remuxSilentFrame = true;
                            }
                        } else {
                            var lastSample = this._audioSegmentInfoList.getLastSampleBefore(originalDts);
                            if (lastSample != null) {
                                var distance = originalDts - (lastSample.originalDts + lastSample.duration);
                                if (distance <= 3) {
                                    distance = 0;
                                }
                                var expectedDts = lastSample.dts + lastSample.duration + distance;
                                dtsCorrection = originalDts - expectedDts;
                            } else {
                                // lastSample == null
                                dtsCorrection = 0;
                            }
                        }
                    } else {
                        dtsCorrection = originalDts - this._audioNextDts;
                    }
                }

                var dts = originalDts - dtsCorrection;
                if (remuxSilentFrame) {
                    // align audio segment beginDts to match with current video segment's beginDts
                    var videoSegment = this._videoSegmentInfoList.getLastSegmentBefore(originalDts);
                    if (videoSegment != null && videoSegment.beginDts < dts) {
                        silentFrameDuration = dts - videoSegment.beginDts;
                        dts = videoSegment.beginDts;
                    } else {
                        remuxSilentFrame = false;
                    }
                }
                if (firstDts === -1) {
                    firstDts = dts;
                }

                if (remuxSilentFrame) {
                    remuxSilentFrame = false;
                    samples.unshift(aacSample);

                    var frame = this._generateSilentAudio(dts, silentFrameDuration);
                    if (frame == null) {
                        continue;
                    }
                    var _mp4Sample = frame.mp4Sample;
                    var _unit = frame.unit;

                    mp4Samples.push(_mp4Sample);

                    // re-allocate mdatbox buffer with new size, to fit with this silent frame
                    bytes += _unit.byteLength;
                    mdatbox = new Uint8Array(bytes);
                    mdatbox[0] = bytes >>> 24 & 0xFF;
                    mdatbox[1] = bytes >>> 16 & 0xFF;
                    mdatbox[2] = bytes >>> 8 & 0xFF;
                    mdatbox[3] = bytes & 0xFF;
                    mdatbox.set(_mp4Generator2.default.types.mdat, 4);

                    // fill data now
                    mdatbox.set(_unit, offset);
                    offset += _unit.byteLength;
                    continue;
                }

                var sampleDuration = 0;

                if (samples.length >= 1) {
                    var nextDts = samples[0].dts - this._dtsBase - dtsCorrection;
                    sampleDuration = nextDts - dts;
                } else {
                    if (mp4Samples.length >= 1) {
                        // use second last sample duration
                        sampleDuration = mp4Samples[mp4Samples.length - 1].duration;
                    } else {
                        // the only one sample, use reference sample duration
                        sampleDuration = this._audioMeta.refSampleDuration;
                    }
                }

                var mp4Sample = {
                    dts: dts,
                    pts: dts,
                    cts: 0,
                    size: unit.byteLength,
                    duration: sampleDuration,
                    originalDts: originalDts,
                    flags: {
                        isLeading: 0,
                        dependsOn: 1,
                        isDependedOn: 0,
                        hasRedundancy: 0
                    }
                };
                mp4Samples.push(mp4Sample);
                mdatbox.set(unit, offset);
                offset += unit.byteLength;
            }
            var latest = mp4Samples[mp4Samples.length - 1];
            lastDts = latest.dts + latest.duration;
            this._audioNextDts = lastDts;

            // fill media segment info & add to info list
            var info = new _mediaSegmentInfo.MediaSegmentInfo();
            info.beginDts = firstDts;
            info.endDts = lastDts;
            info.beginPts = firstDts;
            info.endPts = lastDts;
            info.originalBeginDts = mp4Samples[0].originalDts;
            info.originalEndDts = latest.originalDts + latest.duration;
            info.firstSample = new _mediaSegmentInfo.SampleInfo(mp4Samples[0].dts, mp4Samples[0].pts, mp4Samples[0].duration, mp4Samples[0].originalDts, false);
            info.lastSample = new _mediaSegmentInfo.SampleInfo(latest.dts, latest.pts, latest.duration, latest.originalDts, false);
            if (!this._isLive) {
                this._audioSegmentInfoList.append(info);
            }

            track.samples = mp4Samples;
            track.sequenceNumber = ++MP4Remuxer.sequenceNumber;

            var moofbox = _mp4Generator2.default.moof(track, firstDts);
            track.samples = [];
            track.length = 0;

            this._onMediaSegment('audio', {
                type: 'audio',
                data: this._mergeBoxes(moofbox, mdatbox).buffer,
                sampleCount: mp4Samples.length,
                info: info
            });
        }
    }, {
        key: '_generateSilentAudio',
        value: function _generateSilentAudio(dts, frameDuration) {
            _logger2.default.v(this.TAG, 'GenerateSilentAudio: dts = ' + dts + ', duration = ' + frameDuration);

            var unit = _aacSilent2.default.getSilentFrame(this._audioMeta.channelCount);
            if (unit == null) {
                _logger2.default.w(this.TAG, 'Cannot generate silent aac frame for channelCount = ' + this._audioMeta.channelCount);
                return null;
            }

            var mp4Sample = {
                dts: dts,
                pts: dts,
                cts: 0,
                size: unit.byteLength,
                duration: frameDuration,
                originalDts: dts,
                flags: {
                    isLeading: 0,
                    dependsOn: 1,
                    isDependedOn: 0,
                    hasRedundancy: 0
                }
            };

            return {
                unit: unit,
                mp4Sample: mp4Sample
            };
        }
    }, {
        key: '_remuxVideo',
        value: function _remuxVideo(videoTrack) {
            var track = videoTrack;
            var samples = track.samples;
            var dtsCorrection = undefined;
            var firstDts = -1,
                lastDts = -1;
            var firstPts = -1,
                lastPts = -1;

            if (!samples || samples.length === 0) {
                return;
            }

            var bytes = 8 + videoTrack.length;
            var mdatbox = new Uint8Array(bytes);
            mdatbox[0] = bytes >>> 24 & 0xFF;
            mdatbox[1] = bytes >>> 16 & 0xFF;
            mdatbox[2] = bytes >>> 8 & 0xFF;
            mdatbox[3] = bytes & 0xFF;
            mdatbox.set(_mp4Generator2.default.types.mdat, 4);

            var offset = 8;
            var mp4Samples = [];
            var info = new _mediaSegmentInfo.MediaSegmentInfo();

            while (samples.length) {
                var avcSample = samples.shift();
                var keyframe = avcSample.isKeyframe;
                var originalDts = avcSample.dts - this._dtsBase;

                if (dtsCorrection == undefined) {
                    if (this._videoNextDts == undefined) {
                        if (this._videoSegmentInfoList.isEmpty()) {
                            dtsCorrection = 0;
                        } else {
                            var lastSample = this._videoSegmentInfoList.getLastSampleBefore(originalDts);
                            if (lastSample != null) {
                                var distance = originalDts - (lastSample.originalDts + lastSample.duration);
                                if (distance <= 3) {
                                    distance = 0;
                                }
                                var expectedDts = lastSample.dts + lastSample.duration + distance;
                                dtsCorrection = originalDts - expectedDts;
                            } else {
                                // lastSample == null
                                dtsCorrection = 0;
                            }
                        }
                    } else {
                        dtsCorrection = originalDts - this._videoNextDts;
                    }
                }

                var dts = originalDts - dtsCorrection;
                var cts = avcSample.cts;
                var pts = dts + cts;

                if (firstDts === -1) {
                    firstDts = dts;
                    firstPts = pts;
                }

                // fill mdat box
                var sampleSize = 0;
                while (avcSample.units.length) {
                    var unit = avcSample.units.shift();
                    var data = unit.data;
                    mdatbox.set(data, offset);
                    offset += data.byteLength;
                    sampleSize += data.byteLength;
                }

                var sampleDuration = 0;

                if (samples.length >= 1) {
                    var nextDts = samples[0].dts - this._dtsBase - dtsCorrection;
                    sampleDuration = nextDts - dts;
                } else {
                    if (mp4Samples.length >= 1) {
                        // lastest sample, use second last duration
                        sampleDuration = mp4Samples[mp4Samples.length - 1].duration;
                    } else {
                        // the only one sample, use reference duration
                        sampleDuration = this._videoMeta.refSampleDuration;
                    }
                }

                if (keyframe) {
                    var syncPoint = new _mediaSegmentInfo.SampleInfo(dts, pts, sampleDuration, avcSample.dts, true);
                    syncPoint.fileposition = avcSample.fileposition;
                    info.appendSyncPoint(syncPoint);
                }

                var mp4Sample = {
                    dts: dts,
                    pts: pts,
                    cts: cts,
                    size: sampleSize,
                    isKeyframe: keyframe,
                    duration: sampleDuration,
                    originalDts: originalDts,
                    flags: {
                        isLeading: 0,
                        dependsOn: keyframe ? 2 : 1,
                        isDependedOn: keyframe ? 1 : 0,
                        hasRedundancy: 0,
                        isNonSync: keyframe ? 0 : 1
                    }
                };

                mp4Samples.push(mp4Sample);
            }
            var latest = mp4Samples[mp4Samples.length - 1];
            lastDts = latest.dts + latest.duration;
            lastPts = latest.pts + latest.duration;
            this._videoNextDts = lastDts;

            // fill media segment info & add to info list
            info.beginDts = firstDts;
            info.endDts = lastDts;
            info.beginPts = firstPts;
            info.endPts = lastPts;
            info.originalBeginDts = mp4Samples[0].originalDts;
            info.originalEndDts = latest.originalDts + latest.duration;
            info.firstSample = new _mediaSegmentInfo.SampleInfo(mp4Samples[0].dts, mp4Samples[0].pts, mp4Samples[0].duration, mp4Samples[0].originalDts, mp4Samples[0].isKeyframe);
            info.lastSample = new _mediaSegmentInfo.SampleInfo(latest.dts, latest.pts, latest.duration, latest.originalDts, latest.isKeyframe);
            if (!this._isLive) {
                this._videoSegmentInfoList.append(info);
            }

            track.samples = mp4Samples;
            track.sequenceNumber = ++MP4Remuxer.sequenceNumber;

            // workaround for chrome < 50: force first sample as a random access point
            // see https://bugs.chromium.org/p/chromium/issues/detail?id=229412
            if (this._forceFirstIDR) {
                var flags = mp4Samples[0].flags;
                flags.dependsOn = 2;
                flags.isNonSync = 0;
            }

            var moofbox = _mp4Generator2.default.moof(track, firstDts);
            track.samples = [];
            track.length = 0;

            this._onMediaSegment('video', {
                type: 'video',
                data: this._mergeBoxes(moofbox, mdatbox).buffer,
                sampleCount: mp4Samples.length,
                info: info
            });
        }
    }, {
        key: '_mergeBoxes',
        value: function _mergeBoxes(moof, mdat) {
            var result = new Uint8Array(moof.byteLength + mdat.byteLength);
            result.set(moof, 0);
            result.set(mdat, moof.byteLength);
            return result;
        }
    }, {
        key: 'onInitSegment',
        get: function get() {
            return this._onInitSegment;
        },
        set: function set(callback) {
            this._onInitSegment = callback;
        }

        /* prototype: function onMediaSegment(type: string, mediaSegment: MediaSegment): void
           MediaSegment: {
               type: string,
               data: ArrayBuffer,
               sampleCount: int32
               info: MediaSegmentInfo
           }
        */

    }, {
        key: 'onMediaSegment',
        get: function get() {
            return this._onMediaSegment;
        },
        set: function set(callback) {
            this._onMediaSegment = callback;
        }
    }]);

    return MP4Remuxer;
}();

MP4Remuxer.sequenceNumber = 0;

exports.default = MP4Remuxer;