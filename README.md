# flv_to_mp4

A tool can remux flv to mp4 written by Node.js.

### Installation

Prerequisites: [Node.js](https://nodejs.org/en/) (>=7.x) and [Git](https://git-scm.com/).

``` bash
$ npm install -g https://github.com/houxinjie/flv_to_mp4
```

### Usage

``` bash
$ ftom4 -i <inputFile> -o <outFile>
```

Example:

``` bash
$ ftom4 -i data/test.flv -o data/test.mp4
```

### Build

``` bash
$ git clone https://github.com/houxinjie/flv_to_mp4
$ cd flv_to_mp4
$ npm install && npm run build
```
