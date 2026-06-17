import url from 'url';

export default class StaticProxy {
  constructor (proxyOptions, endpoints) {
    this.proxyOptions = proxyOptions;
    this.endpoints = endpoints;
    this.target = url.parse(this.endpoints[0]);
  }

  nextTarget () {
    return Object.assign({}, this.proxyOptions.target, this.target);
  }
}
