import fs from 'fs';

export const readFile = filename => new Promise((resolve, reject) => {
  fs.readFile(filename, "utf8", (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
export const writeFile = (
  path, data, opts = 'utf8'
) => new Promise((resolve, reject) => {
  fs.writeFile(path, data, opts, (err) => {
    if (err) reject(err)
    else resolve()
  });
});
export const appendFile = (
  path, data, opts = 'utf8'
) => new Promise((resolve, reject) => {
  fs.appendFile(path, data, opts, (err) => {
    if (err) reject(err)
    else resolve()
  });
});
export const existsAsync = path => new Promise(resolve => {
  fs.exists(path, resolve)
});
export const mkdirAsync = path => new Promise(resolve => {
  fs.mkdir(path, resolve)
});
export const readdirAsync = path => new Promise(resolve=>{
  fs.readdir(path, (_,list)=>resolve(list))
});
export const unlinkAsync = path => new Promise(resolve=>{
  fs.unlink(path, resolve)
});
