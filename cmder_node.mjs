import http from 'http';
import stream from 'stream';
import {writeFile,existsAsync,mkdirAsync} from './file_utils.mjs';
import createCmder from './cmder_common.mjs';

const screenshotsFolder = 'screenshots';

const arrayBufferToBase64 = buf => Buffer.from(buf).toString('base64');

const Stream = stream.Transform;


const get = (url) => new Promise(
  (resolve, reject) => {
    const req = http.request(url, res => {
      //console.log(`statusCode: ${res.statusCode}`)
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function () {
        resolve(body);
      });
    })
    req.on('error', error => {
      reject(error);
    })
    req.end();
  }
);

const getBuffer = (url) => new Promise(
  (resolve, reject) => {
    //console.log(url)
    const req = http.request(url, res => {
      //console.log(`statusCode: ${res.statusCode}`)
      //res.setEncoding('binary');
      let data = new Stream();
      res.on('data', function (chunk) {
        //console.log(chunk)
        data.push(chunk);
      });
      res.on('end', function () {
        resolve(data.read());
      });
    });
    req.on('error', error => {
      reject(error);
    });
    req.end();
  }
);

const post = (url, data) => new Promise(
  (resolve, reject) => {
    let json = JSON.stringify(data);
    let [host, port, path] = url.split(/:|\//).slice(3);
    path = '/' + path;
    const opt = {
      host, port, path,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(json)
      }
    };
    const req = http.request(opt, res => {
      //console.log(`statusCode: ${res.statusCode}`)
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function () {
        resolve(body);
      });
    })

    req.on('error', error => {
      reject(error);
    })
    req.write(json);
    req.end();
  }
);

export default ({pupit_server_url})=>{
  let cmder = null;

  const fetchCmd = async (path, format = 'text', data) => {
    console.log("fetchCmd",path,data)
    if (typeof (data) === 'undefined') {
      switch(format){
        case 'text':
          return await get(`${pupit_server_url}/${path}`);
        case 'json':
          const txt = await get(`${pupit_server_url}/${path}`);
          const json = JSON.parse(txt);
          return json;
        case 'buffer':
          return await getBuffer(`${pupit_server_url}/${path}`);
      }
    } else {
      switch(format){
        case 'text':
          return await post(`${pupit_server_url}/${path}`, data);
        case 'json':
          const txt = await post(`${pupit_server_url}/${path}`, data);
          const json = JSON.parse(txt);
          return json;
      }
    }
  };
  
  const cmdAssigns = {
    ///need get token here
    'screenshot': async(rect)=>{
      let token = cmder.getToken();
      let strRequest = 'screenshot?token=' + token;
      if(rect) strRequest += '&rect=' + rect;
      const buf = await fetchCmd(strRequest, 'buffer');
      let iDateTime=Date.now();
      let dateTime=new Date(iDateTime);
      let strDateTime=dateTime.toISOString();
      let strScreenshotId = strDateTime.split(/\D+/).slice(0,-1).join('_');
      let isScreenshotFolderExist = await existsAsync(screenshotsFolder);
      if (!isScreenshotFolderExist) await mkdirAsync(screenshotsFolder);
      await writeFile(`${screenshotsFolder}/test_${strScreenshotId}.png`, buf);
      return 'success';
    }
  };

  cmder = createCmder({arrayBufferToBase64, fetchCmd, cmdAssigns});
  return cmder;
};