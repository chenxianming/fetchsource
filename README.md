# fetchsource
High performance fetch source, support continue transfering from break point.


[![NPM version](https://img.shields.io/npm/v/fetchsource.svg)](https://www.npmjs.com/package/fetchsource)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/dt/fetchsource.svg)](https://www.npmjs.com/package/fetchsource)
[![node](https://img.shields.io/node/v/fetchsource.svg)](https://nodejs.org/en/download/)


```
npm install fetchsource
const Fetch = require('fetchsource');
```


```
// options: maxRedirects:number timeout:number(ms) headers:object output:string(fetch file path) url:string

const fetchUrl = 'https://github.com/chenxianming/sqapi/archive/master.zip';

let fetchSource = new Fetch({
    url:fetchUrl,
    timeout: 6000,
    output: './temp',
    onProgress(len, cur, tol) {
        console.log( ~~( cur / tol * 100 ) + '%' );
        console.log( len, cur, tol );
    }
});
```

```
// By chain called
fetchSource.then( ( request ) => {
    console.log('The file save as ./temp');
} ).catch( e => console.log );
```

```
// By async/await
( async() => {
    try{
        await fetchSource;
        console.log('The file save as ./temp');
    }catch(e){
        console.log(e);
    }
} )();
```