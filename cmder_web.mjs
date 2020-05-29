import createCmder from './cmder_common.mjs';

const arrayBufferToBase64 = (
  buf, typedArray, array, str
) => {
  typedArray = new Uint8Array(buf);
  array = [...typedArray];
  str = array.map(b => String.fromCharCode(b)).join('');
  return btoa(str);
};

const fetchCmd = async(path, format='text', data)=>{
  let r;
  if(typeof(data)==='undefined'){
    r = await fetch(path);
  }else{
    r = await fetch(path, {
      method: 'POST',
      headers: {
        //'Accept': 'application/json',
        'Content-Type': 'text/plain; charset=utf-8'
      },
      body: JSON.stringify(data)
    });
  }
  if(format==='text') return await r.text();
  else if(format==='json') return await r.json();
  else if(format==='buffer') return await r.arrayBuffer();
};

export default ({imgScreenshot})=>{
  let cmder = null;
  const cmdAssigns = {
    'screenshot': async(rect)=>{
      let token = cmder.getToken();
      let strRequest = 'screenshot?token=' + token;
      if(rect) strRequest += '&rect=' + rect;
      const buf = await fetchCmd(strRequest, 'buffer');
      let imgStr = 'data:image/jpeg;base64,';
      imgStr += arrayBufferToBase64(buf);
      imgScreenshot.src = imgStr;
      return 'success';
    }
  };
  cmder = createCmder({arrayBufferToBase64, fetchCmd, cmdAssigns});
  return cmder;
};