// http://127.0.0.1:4000
// node --experimental-modules pupit_node_client.mjs pupit_server_url=http://127.0.0.1:4000 pupit_script=append_timestamp

//index.html: utils.mjs, cmder_common.mjs, cmder_web.mjs
//pupit_node_client.mjs: utils.mjs, cmder_common.mjs, cmder_node.mjs
//pupit_scripts/*

import express from 'express';
import puppeteer from 'puppeteer';
import UserAgent from 'user-agents';
import devices from 'puppeteer/DeviceDescriptors.js';
import os from 'os';
import {dt, randInt, randElem} from './utils.mjs';
import {
  readFile, writeFile, appendFile, existsAsync, mkdirAsync
} from './file_utils.mjs';

const proxiesFileName = './proxies.txt';
const objectsFolder = 'objects';
const objectListsFolder = 'lists';
const listPermissionsFile = './list_permissions.json';

const port = process.env.PORT || 4000;
let strProxy = process.env.PROXY || null;

const puppiteerDebugConfigFileName = 'puppiteer.debug.config.json';
const puppiteerProductionConfigFileName = 'puppiteer.production.config.json';

const pass = 'pass';
let resourceList = [];

let browser = undefined;
let objProxy = undefined;

let clients = {};
let listPermissions = {};

let defaultClient = {
  context: undefined,
  tabIndex: 0,
  page: undefined,
  token: undefined,
  strUserAgent: undefined,
  device: undefined,
  objViewport: {
    width: 1024,
    height: 768
  },

  isInitiated: false,
  isOpened: false,
  isNavigated: false
};

if (!Array.prototype.flat) {
  Array.prototype.flat = function () {
    return this.reduce((acc, val) => acc.concat(val), []);
  }
}

const hashCode = s => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0)

const parseProxy = (strProxy) => {
  if (!strProxy) return null;
  const [user, password, ip, port] = strProxy.split(/:|@/);
  return { user, password, ip, port };
};

const getRandomProxy = async (proxiesFileName) => {
  let strProxy = '';
  let isProxiesFileExist = await existsAsync(proxiesFileName);
  if(isProxiesFileExist){
    let strProxies = await readFile(proxiesFileName);
    let arrProxies = strProxies.split('\n').filter(str=>!!str);
    let i = randInt(0, arrProxies.length);
    strProxy = arrProxies[i];
  }
  return strProxy;
};

const applyPageParams = async (page, client) => {
  if (client.strUserAgent) await page.setUserAgent(client.strUserAgent);
  await page.setViewport(client.objViewport);
  if(client.device) await page.emulate(client.device);
  
  // await page.setRequestInterception(true);
  // page.on("request", r => {
  //   console.log(r.method(), r.resourceType(), r.url());
    // if (
    // ['image', 'stylesheet', 'font', 'script', 'other', 'fetch', 'xhr'].includes(r.resourceType())
    //   && resourceList.every(str => !r.url().includes(str))
    // ) {
    //   r.abort();
    // } else {
    //   if(r.url().includes('clck/click'))console.log(r.headers(),r.postData())
    //   r.continue();
    // }
  //});
  if (objProxy) await page.authenticate({
    'username': objProxy.user,
    'password': objProxy.password
  });
  // const preloadFile = readFile('./preload.js');
  // await page.evaluateOnNewDocument(preloadFile);
};

const readList = async (listName) => {
  let list = [];
  let listFileName = `${objectListsFolder}/${listName}.txt`;
  let isListFileExist = await existsAsync(listFileName);
  if (isListFileExist) {
    let strList = await readFile(listFileName);
    list = strList.split('\n').filter(str => !!str);
  }
  return list;
};

const writeList = async (listName, list) => {
  let strList = list.join('\n') + '\n';
  let listFileName = `${objectListsFolder}/${listName}.txt`;
  await writeFile(listFileName, strList);
};

const app = express();
app.use(express.text());
app.use((req, res, next) => {
  console.log(`${dt()}: query: ${req.originalUrl}`);
  next();
});

app.get([
  '/',
  '/utils.mjs',
  '/cmder_common.mjs',
  '/cmder_web.mjs'
], async (req, res) => {
  try {
    let path = req.path;
    if (path === '/') path = '/index.html';
    path = path.slice(1);
    console.log(path);

    let contentType = {
      'index.html': 'text/html',
      'utils.mjs': 'application/javascript',
      'cmder_common.mjs': 'application/javascript',
      'cmder_web.mjs': 'application/javascript',
    }[path];
    //
    const file = await readFile(path);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(file);
  } catch (e) { res.end(e.toString()) }
});

app.get('/getTokens', async (req, res) => {
  try {
    const tokens = Object.keys(clients);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('token:' + tokens);
  } catch (e) { res.end(e.toString()) }
});

app.get('/checkToken', async (req, res) => {
  try {
    const token = String(req.query.token);
    const hasAuth = !!clients[token];
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('status:' + hasAuth);
  } catch (e) { res.end(e.toString()) }
});

app.get('/getTabsCount', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isOpened) {
      let pages = await client.context.pages();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('tabs count:' + pages.length);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/init', async (req, res) => {
  try {
    //const hasAuth = String(req.query.token) === String(client.token);
    //if (!client.isInitiated) {
    let randStr = Math.random().toString().slice(2);
    let token = hashCode(pass + randStr);
    clients[token] = Object.assign({}, defaultClient, {
      isInitiated: true,
      token
    });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(randStr);
    //} else {
    //  res.end();
    //}
  } catch (e) { res.end(e.toString()) }
});

app.get('/loadScript', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated) {
      const scriptName = decodeURIComponent(req.query.script);
      const script = await readFile(`pupit_scripts/${scriptName}.pupit.txt`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(script);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/setUserAgent', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated && !client.isOpened) {
      client.strUserAgent = decodeURIComponent(req.query.userAgent);
      //Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36
      console.log(client.strUserAgent);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(client.strUserAgent);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});


app.get('/genUserAgent', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated && !client.isOpened) {
      const userAgent = new UserAgent();
      client.strUserAgent = userAgent.toString();
      console.log(client.strUserAgent);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(client.strUserAgent);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/setViewportSize', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated && !client.isOpened) {
      client.objViewport = {
        width: Number(req.query.w),
        height: Number(req.query.h)
      };
      console.log(client.objViewport);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(JSON.stringify(client.objViewport));
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});


app.get('/emulateDevice', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated && !client.isOpened) {
      let strDevice = req.query.device.replace('_', ' ');
      console.log(strDevice)
      client.device = devices[strDevice];
      console.log(strDevice, client.device);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(strDevice);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

// app.get('/setProxy', async (req, res) => {
//   try {
//     const token = String(req.query.token);
//     const client = clients[token];
//     const hasAuth = !!client;
//     if (hasAuth && client.isInitiated && !client.isOpened) {
//       const strProxy = decodeURIComponent(req.query.proxy);
//       const[user,password,ip,port]=strProxy.split(/:|@/);
//       objProxy = {user,password,ip,port};
//       console.log(objProxy);
//       res.writeHead(200, { 'Content-Type': 'text/plain' });
//       res.end(strProxy);
//     } else {
//       res.end();
//     }
//   } catch (e) { res.end(e.toString()) }
// });

app.post('/putObject', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated) {
      const id = req.query.id;
      const json = req.body;
      const obj = JSON.parse(json);
      console.log(obj);
      let jsonObj = JSON.stringify(obj, null, 2);
      let isObjectsFolderExist = await existsAsync(objectsFolder);
      if (!isObjectsFolderExist) await mkdirAsync(objectsFolder);
      await writeFile(`${objectsFolder}/${id}.json`, jsonObj);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`object ${id} putted`);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/getObjectById', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated) {
      const id = decodeURIComponent(req.query.id);
      let obj = await readFile(`${objectsFolder}/${id}.json`);
      res.writeHead(200, { 'Content-Type': 'text/json' });
      res.end(obj);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/appendObjectToList', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated) {
      const listName = req.query.list;
      if (listPermissions.appendable.includes(listName)) {
        const id = decodeURIComponent(req.query.id);
        console.log(id);
        if(listName==='permitted_urls'){
          resourceList.push(id);
          console.log(resourceList);
        }else{
          let isObjectListsFolderExist = await existsAsync(objectListsFolder);
          if (!isObjectListsFolderExist) await mkdirAsync(objectListsFolder);
          await appendFile(`${objectListsFolder}/${listName}.txt`, `${id}\n`);
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`object ${id} appended to ${listName}`);
      } else {
        res.end('list not found');
      }
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/loadList', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated) {
      const listName = req.query.list;
      if (listPermissions.loadable.includes(listName)) {
        let list = [];
        console.log(listName)
        if(listName==='permitted_urls'){
          console.log(resourceList)
          list = resourceList;
        }else{
          list = await readList(listName);
        }
        const json = JSON.stringify(list);
        console.log(json);
        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end(json);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end('[]');
      }
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.post('/storeList', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated) {
      const listName = req.query.list;
      if (listPermissions.storable.includes(listName)) {
        const json = req.body;
        const list = JSON.parse(json);
        console.log(list.join)
        const n = list.length;
        if(listName==='permitted_urls'){
          resourceList = list;
          console.log(resourceList);
        }else{
          await writeList(listName, list);
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`list ${listName} with ${n} objects stored`);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('list not found');
      }
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/getRandomObjectFromList', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isInitiated) {
      const listName = req.query.list;
      if (listPermissions.readable.includes(listName)) {
        let list = await readList(listName);
        let id = randElem(list);
        if(id){
          let obj = await readFile(`${objectsFolder}/${id}.json`);
          res.writeHead(200, { 'Content-Type': 'text/json' });
          res.end(obj);
        }else{
          res.writeHead(200, { 'Content-Type': 'text/json' });
          res.end('null');
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end('null');
      }
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

//http://127.0.0.1:4000/open/?w=640&h=480
app.get('/open', async (req, res) => {
  const token = String(req.query.token);
  const client = clients[token];
  const hasAuth = !!client;
  if (hasAuth && client.isInitiated && !client.isOpened) {
    // client.context = browser.defaultBrowserContext();
    // client.context.overridePermissions('https://example.com', [
    //   'geolocation', 'notifications'
    // ]);
    client.context = await browser.createIncognitoBrowserContext();
    console.log('New Context Created');
    client.context.on('targetcreated', async (target) => {
      //console.log('New Tab Created');
      //console.log(target.type());
      if (target.type() === 'page') {
        console.log('New Page Created');
        const newPage = await target.page();
        await applyPageParams(newPage, client);
      }
    });

    client.page = await client.context.newPage();
    client.isOpened = true;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('opened');
  } else {
    res.end();
  }
});

app.get('/createTab', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isOpened) {
      client.page = await client.context.newPage();
      //await applyPageParams(page, client);
      let pages = await client.context.pages();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('tab created: ' + pages.length);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/nextTab', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isOpened) {
      let pages = await client.context.pages();
      client.tabIndex = Math.min(client.tabIndex + 1, pages.length - 1);
      client.page = pages[client.tabIndex];
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(String(client.tabIndex));
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/prevTab', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isOpened) {
      let pages = await client.context.pages();
      client.tabIndex = Math.max(0, client.tabIndex - 1);
      client.page = pages[client.tabIndex];
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(String(client.tabIndex));
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

//http://127.0.0.1:4000/goto/?url=http://127.0.0.1:5000
app.get('/goto', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isOpened) {
      let url = decodeURIComponent(req.query.url);
      await client.page.goto(url,{
        waitUntil: 'networkidle2'
      });
      client.isNavigated = true;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('navigated');
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/screenshot', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isNavigated) {
      let strRect = req.query.rect;
      console.log(strRect);
      let screenshotBuffer;
      if (strRect) {
        let arrRect = strRect.split(',').map(Number);
        let objRect = {
          x: arrRect[0],
          y: arrRect[1],
          width: arrRect[2],
          height: arrRect[3]
        };
        console.log(objRect);
        screenshotBuffer = await client.page.screenshot({
          type: 'png',
          clip: objRect
        });
      } else {
        screenshotBuffer = await client.page.screenshot();
      }
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': screenshotBuffer.length
      });
      res.end(screenshotBuffer);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/click', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isNavigated) {
      let x = Number(req.query.x);
      let y = Number(req.query.y);
      await client.page.mouse.click(x, y, { delay: 500 });
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('clicked:' + x + 'x' + y);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/enterText', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isNavigated) {
      const txt = decodeURIComponent(req.query.txt);
      await client.page.keyboard.type(txt, { delay: 100 });
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('text entered:' + req.query.txt);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/pressKey', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isNavigated) {
      await client.page.keyboard.press(req.query.key, { delay: 200 });
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('key pressed:' + req.query.key);
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/exec', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isNavigated) {
      const js = decodeURIComponent(req.query.js);
      let result = '';
      if (js) {
        result = await client.page.evaluate(js => {
          const $$ = selector => Array.from(document.querySelectorAll(selector))
          let r;
          try {
            r = eval(js);
          } catch (e) {
            r = 'error:' + e.toString();
          }
          return r;
        }, js);
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      if (typeof (result) === 'undefined') res.end();
      else res.end(result.toString());
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/setBackgroundColor', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isNavigated) {
      //res.end(req.query.color);
      const color = req.query.color || '#000';

      await client.page.evaluate(color => {
        document.body.style.background = color;
      }, color);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('processed');
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});


app.get('/close', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth && client.isOpened) {
      await client.context.close();
      client.isInitiated = false;
      client.isOpened = false;
      client.isNavigated = false;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('closed');
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

app.get('/release', async (req, res) => {
  try {
    const token = String(req.query.token);
    const client = clients[token];
    const hasAuth = !!client;
    if (hasAuth) {
      delete clients[token];
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('released');
    } else {
      res.end();
    }
  } catch (e) { res.end(e.toString()) }
});

(async () => {
  const strListPermissions = await readFile(listPermissionsFile);
  listPermissions = JSON.parse(strListPermissions);

  let puppiteerConfigFileName = process.env.NODE_ENV === 'production'
  ?puppiteerProductionConfigFileName
  :puppiteerDebugConfigFileName;

  let strPuppiteerConfig = await readFile(puppiteerConfigFileName);
  let objPuppiteerConfig = JSON.parse(strPuppiteerConfig);
  console.log(objPuppiteerConfig);

  if (!strProxy) {
    strProxy = await getRandomProxy(proxiesFileName);
  }
  objProxy = parseProxy(strProxy);
  console.log(objProxy);
  if (objProxy) objPuppiteerConfig.args.push(`--proxy-server=${objProxy.ip}:${objProxy.port}`);

  try {
    browser = await puppeteer.launch(objPuppiteerConfig);
  } catch (e) {
    console.log(e);
  }

  let networkInterfaces = os.networkInterfaces();
  let ips = Object
    .values(networkInterfaces)
    .flat()
    .filter(it => it.family === 'IPv4')
    .map(it => it.address);
  let urls = ips.map(ip => `http://${ip}:${port}/`).join(', ');

  console.log(`server started:\n at ${urls}`);
  if(strProxy){
    console.log(`with proxy ${strProxy}`);
  }
  app.listen(port);
})();
