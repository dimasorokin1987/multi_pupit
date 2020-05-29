import http from 'http';
import https from 'https';

export const loadJson = url => new Promise((resolve, reject) => {
  http.get(url, (resp) => {
    let data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });
    resp.on('end', () => {
      resolve(JSON.parse(data));
    });
  }).on("error", (err) => {
    reject(err);
  });
});

export const postJson = (url, json) => new Promise(
  (resolve, reject) => {
    let {protocol, host, port=80, pathname='/'} = new URL(url);
    let params = {
      method: 'POST',
      host, port, path:pathname, 
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json)
      }
    };
    //console.log(params);
    protocol = protocol.slice(0,-1);
    const requester = ({http: http, https: https})[protocol];
    const req = requester.request(params, res => {
      //console.log(`statusCode: ${res.statusCode}`)
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function () {
        resolve(JSON.parse(body));
      });
    });
    req.on('error', error => {
      reject(error);
    });
    req.write(json);
    req.end();
  }
);
