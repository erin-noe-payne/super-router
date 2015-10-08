'use strict';

const _ = require('lodash');

class RouteTreeNode {
  constructor(path) {
    if(_.isUndefined(path)){
      throw new Error("Path must be specified for a new RouteTreeNode.");
    }

    if(path.indexOf('/') != 0){
      throw new Error("Path must start with a /");
    }

    this._path = path;
    this.init();
  }

  init(){
    this._parent = null;
    this._children = [];
  }

  get path(){
    return this._path;
  }

  get parent(){
    return this._parent;
  }

  set parent(parent){
    this._parent = parent;
  }

  get children(){
    return this._children;
  }

  addChild(node){
    const match = this.findChild(node.path);

    if(!match){
      this._children.push(node);
    }
  }

  findChild(path){
    const match = _.find(this._children, function (child) {
      return child.path === path;
    });

    return match;
  }

}

module.exports = RouteTreeNode;
