import {dt} from './utils.mjs';
import createCmder from './cmder_node.mjs';

const objDefaultArgs = {
  pupit_server_url: 'http://127.0.0.1:4000',
  pupit_scripts_folder: 'pupit_scripts',
  pupit_script: 'append_timestamp',
  pupit_script_params: ''
};

if (!Object.fromEntries) {
  Object.fromEntries = arr => arr.reduce((obj, [k, v]) => { obj[k] = v; return obj }, {});
}

(async()=>{try{
  let arrStrArgs = process.argv.slice(2);
  if(arrStrArgs[0]==='help') {
    console.log('pupit_server_url=http://127.0.0.1:4000,pupit_scripts_folder=pupit_scripts,pupit_script=append_timestamp,pupit_script_params');
    return;
  }
  console.log(`${dt()}: parsing args...`);
  let arrEntryArgs = arrStrArgs.map(strArg=>strArg.split('='));
  let objArgs = Object.fromEntries(arrEntryArgs);
  let params = objDefaultArgs;
  Object.assign(params, objArgs);

  console.log(params);
  
  //put_value_to test true
  let strCmdParams = params.pupit_script_params
  .split(',')
  .map(p=>p.split(':'))
  .map(([k,v])=>`put_value_to ${k} ${v}`)
  .join('\n');
  let cmdScript = `expand_with ${params.pupit_script}`;



  const cmder = createCmder({pupit_server_url:params.pupit_server_url});

  // cmder.setToken('1960178728');
  // await cmder.execPupitScript(`screenshot`,result=>{
  //   console.log(result)
  // });
  //return

  let strCmds = `init\n${strCmdParams}\n${cmdScript}`;
  //let strCmds = 'init\put_value_to test true\nexpand_with append_timestamp';
  console.log(strCmds);
  await cmder.execPupitScript(strCmds, result=>{
    console.log(result)
  });
}catch(e){
  console.log(e);
}})();
