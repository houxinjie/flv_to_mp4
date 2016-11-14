import path from 'path';
import fs from 'fs';
import FLVDemuxer from './demux/flv-demuxer.js';
import MP4Remuxer from './remux/mp4-remuxer.js';


const inputFilePath = path.join(__dirname, 'data/test.flv');
const outputFilePath = path.join(__dirname, 'data/output.mp4');

if(fs.existsSync(outputFilePath)){
    fs.unlinkSync(outputFilePath);
}

const arrayBuffer = fs.readFileSync(inputFilePath).buffer;

const demuxer = new FLVDemuxer(arrayBuffer);
const remuxer = new MP4Remuxer();

demuxer.onError = () => {

}

demuxer.onMediaInfo = () => {

}

remuxer.bindDataSource(demuxer);

remuxer.onInitSegment = data => {
    fs.writeFileSync(outputFilePath, Buffer.from(data), {flag: 'a'})
}

remuxer.onMediaSegment = (type, mediaSegment) => {
    //if(type === 'video'){
        fs.writeFileSync(outputFilePath, Buffer.from(mediaSegment.data), {flag: 'a'})
    //}
}

demuxer.parseChunks(arrayBuffer, 0);
