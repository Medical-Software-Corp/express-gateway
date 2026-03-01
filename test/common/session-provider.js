let data;
class Provider {
  constructor (options) {
    data = options;
  }
  ;
  on () {}
}

export default function (session) {
  return Provider;
}

export const getOptions = () => {
  return data;
};

export const reset = () => {
  data = null;
};
