export const wait = tm => new Promise(res => setTimeout(res, tm));
export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a));
export const randElem = ar => (ar[randInt(0, ar.length)]);
export const dt = () => {
  let iDate = Date.now();
  let date = new Date(iDate);
  let strDate = date.toISOString();
  return strDate;
};

