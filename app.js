import path from 'path';
import fs from 'fs';
import FLVDemuxer from './demux/flv-demuxer.js';
import MP4Remuxer from './remux/mp4-remuxer.js';


const inputFilePath = path.join(path.resolve('./'), 'demo/test.flv');
const outputFilePath = path.join(path.resolve('./'), 'demo/output.mp4');

if(fs.existsSync(outputFilePath)){
    fs.unlinkSync(outputFilePath);
}

const buffer = fs.readFileSync(inputFilePath);

const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const demuxer = new FLVDemuxer(arrayBuffer);
const remuxer = new MP4Remuxer();

demuxer.onError = () => {

}

demuxer.onMediaInfo = () => {

}

remuxer.bindDataSource(demuxer);

remuxer.onInitSegment = (type, mediaSegment) => {
    fs.writeFileSync(outputFilePath, Buffer.from(mediaSegment.data), {flag: 'a'})
}

remuxer.onMediaSegment = (type, mediaSegment) => {
    fs.writeFileSync(outputFilePath, Buffer.from(mediaSegment.data), {flag: 'a'})

}

demuxer.parseChunks(arrayBuffer, 0);
