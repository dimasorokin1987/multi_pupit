import {wait, randInt} from './utils.mjs';
export default ({arrayBufferToBase64, fetchCmd, cmdAssigns})=>{
  const pass = 'pass';
  let token = null;
  let mustStop = false;
  let mustSkip = false;
  let lastResult = undefined;
  let arrSeq = [];
  let execIndex = 0;
  let vs = {};
  
  const hashCode = s => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
  const parseTimeout = (str)=>{
    let units = str.slice(-1);
    let mult={'s':1000,'m':60*1000}[units]||1;
    if(mult!==1)str=str.slice(0,-1);
    let [a,b] = str.split('..').map(Number).map(x=>x*mult);
    let t = b? randInt(a, b): a;
    return t;
  };

  let cmds = {
    'wait': async(strTimeout)=>{
      const ms=parseTimeout(strTimeout);
      await wait(ms);
      return 'success';
    },
    'put_value_to': (name, ...arrValue)=>{
      vs[name] = arrValue.join(' ');
      return 'success';
    },
    'put_last_result_to': (name)=>{
      vs[name] = lastResult;
      return 'success';
    },
    'echo': (name)=>{
      return JSON.stringify(vs[name]);
    },
    'eval': async(...arrJs)=>{
      const strJs = arrJs.join(' ');
      return await eval(strJs);
    },
    'comment': ()=>'',
    'stop': ()=>{
      mustStop = true;
      return 'stopped';
    },
    'skip_next_if_true': (condition)=>(
      mustSkip = condition==='true'
    ),
    'init': async()=>{
      const randStr = await fetchCmd('init');
      token = hashCode(pass + randStr);
      return randStr;
    },
    'expand_with': async(pupitScriptName)=>{
      const strPupitScript = await fetchCmd('loadScript?script=' + pupitScriptName + '&token=' + token);
      const arrPupitScript = strPupitScript.split('\n');
      arrSeq.splice(execIndex+1, 0, ...arrPupitScript);
      return 'expanded';
    },
    'set_user_agent': async(...arrText)=>{
      const strText = arrText.join(' ');
      const encodedUserAgentString = encodeURIComponent(strText);
      return await fetchCmd('setUserAgent?userAgent=' + encodedUserAgentString + '&token=' + token);
    },
    'gen_user_agent': async()=>{
      return await fetchCmd('genUserAgent?token=' + token);
    },
    'set_viewport_size': async(resolution)=>{
      return await fetchCmd('setViewportSize?' + resolution + '&token=' + token);
    },
    'emulate_device': async(unspacedDeviceString)=>{
      return await fetchCmd('emulateDevice?device=' + unspacedDeviceString + '&token=' + token);
    },
    'set_proxy': async(proxy)=>{
      const encodedProxyString = encodeURIComponent(proxy);
      return await fetchCmd('setProxy?proxy=' + encodedProxyString + '&token=' + token);
    },
    'get_object_by_id': async(id)=>{
      const encodedIdString = encodeURIComponent(id);
      const obj = await fetchCmd('getObjectById?id=' + encodedIdString + '&token=' + token, 'json');
      Object.assign(vs, obj);
      return obj.id;
    },
    'put_object': async(name,id)=>{
      const str = vs[name];
      const txt = await fetchCmd('putObject?id=' + id + '&token=' + token, 'text', str);
      return txt;
    },
    'append_object_to_list': async(list,id)=>{
      const encodedIdString = encodeURIComponent(id);
      return await fetchCmd('appendObjectToList?list=' + list + '&id=' + encodedIdString + '&token=' + token);
    },
    'load_list': async(listName)=>{
      const list = await fetchCmd('loadList?list=' + listName + '&token=' + token, 'json');
      vs[listName] = list;
      return 'loaded';
    },
    'store_list': async(listName)=>{
      const list = vs[listName];
      const txt = await fetchCmd('storeList?list=' + listName + '&token=' + token, 'text', list);
      return txt;
    },
    'get_random_object_from_list': async(list)=>{
      const obj = await fetchCmd('getRandomObjectFromList?list=' + list + '&token=' + token, 'json');
      if(!obj) return 'none';
      Object.assign(vs, obj);
      return obj.id;
    },
    'open': async()=>{
      return await fetchCmd('open?token=' + token);
    },
    'create_tab': async()=>{
      return await fetchCmd('createTab?token=' + token);
    },
    'prev_tab': async()=>{
      return await fetchCmd('prevTab?token=' + token);
    },
    'next_tab': async()=>{
      return await fetchCmd('nextTab?token=' + token);
    },
    'goto': async(url)=>{
      const encodedUrlString = encodeURIComponent(url);
      return await fetchCmd('goto?url=' + encodedUrlString + '&token=' + token);
    },
    'screenshot': async()=>{
      return 'stub';
    },
    'click': async(x,y)=>{
      return await fetchCmd('click?x=' + x + '&y=' + y + '&token=' + token);
    },
    'enter_text': async(...arrText)=>{
      const strText = arrText.join(' ');
      const encodedText = encodeURIComponent(strText);
      return await fetchCmd('enterText?txt=' + encodedText + '&token=' + token);
    },
    'press_key': async(key)=>{
      return await fetchCmd('pressKey?key=' + key + '&token=' + token);
    },
    'exec': async(...arrJs)=>{
      const strJs = arrJs.join(' ');
      const strJsEncoded = encodeURIComponent(strJs);
      return await fetchCmd('exec?js=' + strJsEncoded + '&token=' + token);
    },
    'close': async()=>{
      return await fetchCmd('close?token=' + token);
    },
    'release': async()=>{
      return await fetchCmd('release?token=' + token);
    }
  };

  Object.assign(cmds, cmdAssigns);
  
  const executeCmd = async(strCmd) => {
    strCmd = strCmd.replace(/{\|(\w+)\|}/g,(_,name)=>vs[name]);
    console.log(strCmd)
    const arrCmd = strCmd.split(' ');
    const [type, ...args] = arrCmd;
    //console.log(strCmd)
    const r = await cmds[type](...args);
    lastResult = r;
    return r;
  };
  
  const execPupitScript = async(pupitScript, afterEach)=>{
    mustStop = false;
    arrSeq = pupitScript.split('\n');
    ;
    let result = '';
    for(
      execIndex = arrSeq.findIndex(str=>!str.includes(' => '));
      execIndex < arrSeq.length;
      execIndex++
    ){
      console.log(execIndex)
      if(mustStop) break;
      let strCmd = arrSeq[execIndex];
      if(mustSkip) {
        arrSeq[execIndex] = `${strCmd} => skipped`;
        mustSkip=false;
        continue;
      }
      if(!strCmd) continue;
      let isExecuted = strCmd.includes(' => ');
      if(isExecuted) continue;
      let r = await executeCmd(strCmd);
      arrSeq[execIndex] = `${strCmd} => ${r}`;
      afterEach&&afterEach(arrSeq[execIndex],execIndex,arrSeq);
    }
    result = arrSeq.join('\n');
    return result;
  };

  const setToken = str => {token=str};
  const getToken = () => token;

  const assignVariables = obj => {Object.assign(vs, obj)};
  const getVariables = () => vs;

  const stop = () =>{mustStop=true};
  
  return {executeCmd, execPupitScript, setToken, getToken, assignVariables, getVariables, stop};
};