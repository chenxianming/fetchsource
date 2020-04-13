/*
    High performance get source
    support continue transfering from break point.
    
    Author:chenxianming
    Example:
    
    // options: maxRedirects:number timeout:number(ms) headers:object output:string(fetch file path) url:string
    
    const fetchUrl = 'https://github.com/chenxianming/sqapi/archive/master.zip';
    
    let fetchSource = new Fetch({
        url:fetchUrl,
        timeout: 6000,
        output: './temp', // not a directory, be attentioned
        onProgress(len, cur, tol) {
            console.log( ~~( cur / tol * 100 ) + '%' );
            console.log( len, cur, tol );
        }
    });
    
    // By chain called
    fetchSource.then( ( request ) => {
        console.log('The file save as ./temp');
    } ).catch( e => console.log(e) );
    
    
    // By async/await
    ( async() => {
        try{
            await fetchSource;
            console.log('The file save as ./temp');
        }catch(e){
            console.log(e);
        }
    } )();
    
*/

const fs = require('fs'),
    http = require('http'),
    https = require('https'),
    url = require('url');

const officialObject = (object) => {
    for (let key in object) {
        object[key.toLocaleLowerCase()] = object[key];
    }

    return object;
}

const protocols = {
    'http:': http,
    'https:': https
};

const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1';

class Fetch {
    constructor(props) {
        this.maxRedirects = props.maxRedirects || 10;
        this.timeout = props.timeout || 15 * 1000;
        this.headers = props.headers || {};
        this.output = props.output || '';
        this.location = props.url || '';
        this.url = url.parse(this.location);

        this.requestLock = false;
        this.request = null;
        this.timmer = null;
        this.isFetch = false;
        this.flowRedirect = 0;
        this.total = 0;

        this.progress = props.onProgress || function () {};

        return new Promise((resolve, reject) => this.fetch(resolve, reject));
    }

    rq(location, callback) {
        let headers = {
                Referer: this.url.protocol + '//' + this.url.hostname,
                'User-Agent': mobileUa
            },
            self = this,
            options = url.parse(location);
        
        this.headers = Object.assign(this.headers, headers);
        options.headers = this.headers;
        
        // reject check certificate
        (this.url.protocol == 'https:') && (options.agent = new protocols[this.url.protocol].Agent({
            rejectUnauthorized: false
        }));
        
        // abort each request when over time
        // i don't recommend used Promise.race method, cause u can never finished redirect url at 6ms
        clearTimeout(this.timmer);
        this.timmer = setTimeout(() => {
            if (!self.isFetch) {
                self.request.abort();
                callback(null);
            };
        }, this.timeout);
        
        const response = (response) => {
            let headers = officialObject(response.headers),
                redirect = headers['location'];
            
            // flowrredirect
            if (response.statusCode >= 300 && response.statusCode < 400 && redirect) {
                if (self.flowRedirect <= self.maxRedirects) {
                    self.flowRedirect++;
                    self.request.abort();
                    return self.rq(redirect, callback);
                } else {
                    return callback(null);
                }
            }
            
            // checking from breakpoint
            self.total = headers['content-range'] ? headers['content-range'].split('/').pop() * 1 : headers['content-length'] * 1;
            
            if ((fs.existsSync(self.output)) && !self.requestLock) {
                if ((fs.statSync(self.output).size >= self.total)) {
                    fs.unlinkSync(self.output)
                } else {
                    // continue transfering form breakpoint
                    self.headers.range = `bytes=${ ( fs.statSync(self.output).size ) }-`;
                    self.request.abort();
                    self.requestLock = true;
                    return self.rq(location, callback);
                }
            }
            
            // create / append source
            let wsm = fs.createWriteStream(self.output, {
                flags: 'a'
            });

            response.on('data', (data) => {
                wsm.write(data);
                self.progress(data.length, fs.statSync(self.output).size, self.total || 'Unkown size');
            });
            
            response.on('end', () => {
                // That's important delay, continue transfering must waiting for disk write completed
                setTimeout( () => {
                    // veryfy file size
                    if( fs.statSync(self.output).size < self.total ){
                        self.request.abort();
                        self.requestLock = false;
                        return self.rq(location, callback);
                    }
                    
                    callback(self.request);
                }, 50 );
            });
            
            self.isFetch = true;
            clearTimeout(self.timmer);
        }
        
        // sending request
        this.request = protocols[this.url.protocol].request(options, response);
        this.request.end();
        
        this.request.on('error', (err) => self.rq(location, callback));
    }
    
    fetch(resolve, reject) {
        if (!this.url.protocol) {
            return reject('invalid url');
        }

        let self = this;

        this.rq(this.location, (request) => {
            request ? resolve(request) : reject('connection timeout or networking error');
        });
    }
}

module.exports = Fetch;
