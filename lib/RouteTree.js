'use strict';

const util = require('util');
const _ = require('lodash');
const RouteTreeNode = require('./RouteTreeNode.js');

class RouteTree {
  constructor(){
    this._root = new RouteTreeNode('/');
    this._paths = [];
  }

  get root(){
    return this._root;
  }

  _clear(){
    delete this._root;
    this._root = new RouteTreeNode('/');
  }

  addPath(path){
    this._paths = _.union(this._paths, [path]); // push, if its not already there
    this._clear();

    let pathsAdded = [];
    let dashCount = 0;
    while(pathsAdded.length < this._paths.length){
      dashCount++;
      _.each(this._paths, (path) => {
        if((path.match(/\//g) || []).length === dashCount){
          pathsAdded.push(path);
          this._addNodeHelper(this._root, new RouteTreeNode(path));
        }
      });
    }
  }

  _addNodeHelper(node, newNode){
    const self = this;
    let childrenToTry = [];

    _.each(node.children, function (child) {
      if(newNode.path.startsWith(child.path+'/')){
        childrenToTry.push(child);
        self._addNodeHelper(child, newNode);
      }
    });

    if(childrenToTry.length === 0){
      node.addChild(newNode);
      newNode.parent = node.path;
    }
  }

  findPath(path){
    return this._findPathHelper(this._root, path);
  }

  _findPathHelper(node, path){
    if(node.path === path){
      return node;
    }

    for(let i = 0;i<node.children.length;i++){
      const match = this._findPathHelper(node.children[i], path);
      if(match){
        return match;
      }
    }
    
    // _.each(node.children, function(child) {
    //   const match = self._findPathHelper(child, path);
    //   if(match){
    //     console.log("returning " +match.path);
    //     return match;
    //     ret = match;
    //     // return match;
    //   }
    // });
    //
    // if(ret){
    //   return ret;
    // }

  }

  printTree(){
    this._printHelper(this._root, '');
  }

  _printHelper(node, s){
    const self = this;

    s = s + node.path + " -> ";
    _.each(node.children, function (child) {
      self._printHelper(child, s);
    });


    if(s !== ""){
      console.log(s)
    }

  }

}

module.exports = RouteTree;
