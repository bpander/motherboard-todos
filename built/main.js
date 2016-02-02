/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../../node_modules/almond/almond", function(){});

(function (root, factory) {

  if (typeof define === 'function' && define.amd) {
    define('xelement',factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root['XElement'] = factory();
  }

}(this, function () {

var Binding, MediaDef, XElementMixin, utils_StringUtil, AttrDef, XElementjs;
Binding = function () {
  function Binding(target, type, handler) {
    this.target = target;
    this.type = type;
    this.handler = handler;
    this.isEnabled = false;
  }
  Binding.prototype.enable = function () {
    if (this.isEnabled === true) {
      return;
    }
    if (this.target instanceof EventTarget) {
      this.target.addEventListener(this.type, this.handler);
    } else if (this.target instanceof NodeList) {
      var i = this.target.length;
      while (--i > -1) {
        this.target[i].addEventListener(this.type, this.handler);
      }
    }
    this.isEnabled = true;
  };
  Binding.prototype.disable = function () {
    if (this.target instanceof EventTarget) {
      this.target.removeEventListener(this.type, this.handler);
    } else if (this.target instanceof NodeList) {
      var i = this.target.length;
      while (--i > -1) {
        this.target[i].removeEventListener(this.type, this.handler);
      }
    }
    this.isEnabled = false;
  };
  return Binding;
}();
MediaDef = function () {
  function MediaDef(params) {
    this.attrDef = null;
    this.element = null;
    this.mqls = [];
    this.listener = Function.prototype;
    // noop
    this.set(params);
  }
  MediaDef.prototype.set = function (params) {
    var prop;
    for (prop in params) {
      if (params.hasOwnProperty(prop) && this.hasOwnProperty(prop)) {
        this[prop] = params[prop];
      }
    }
  };
  MediaDef.prototype.update = function () {
    this.mqls.forEach(function (mql) {
      mql.removeListener(this.listener);
    }, this);
    this.mqls = [];
    if (document.contains(this.element) === false) {
      return;
    }
    var prop = this.attrDef.getPropertyName();
    var parsed = this.attrDef.parseResponsiveAttribute(this.element[prop]);
    var oldVal = parsed.unmatched;
    this.listener = function () {
      var newVal = this.element[this.attrDef.getEvaluatedPropertyName()];
      if (newVal !== oldVal) {
        this.attrDef.mediaChangedCallback.call(this.element, oldVal, newVal);
        oldVal = newVal;
      }
    }.bind(this);
    this.mqls = parsed.breakpoints.map(function (breakpoint) {
      var mql = window.matchMedia(breakpoint.mediaQuery);
      if (mql.matches) {
        oldVal = breakpoint.value;
      }
      mql.addListener(this.listener);
      return mql;
    }, this);
  };
  return MediaDef;
}();
XElementMixin = function (Binding, MediaDef) {
  var XElementMixin = {
    customAttributes: [],
    createdCallback: function () {
      this.bindings = [];
      this.mediaDefs = this.customAttributes.filter(function (x) {
        return x.responsive === true;
      }).map(function (attrDef) {
        return new MediaDef({
          element: this,
          attrDef: attrDef
        });
      }, this);
    },
    attachedCallback: function () {
      this.mediaDefs.forEach(function (mediaDef) {
        mediaDef.update();
      });
    },
    detachedCallback: function () {
      this.mediaDefs.forEach(function (mediaDef) {
        mediaDef.update();
      });
    },
    attributeChangedCallback: function (attrName, oldVal, newVal) {
      var attrDef = this.customAttributes.find(function (x) {
        return x.name === attrName;
      });
      if (attrDef === undefined) {
        return;
      }
      attrDef.changedCallback.call(this, oldVal, newVal);
      var mediaDef = this.mediaDefs.find(function (x) {
        return x.attrDef === attrDef;
      });
      if (mediaDef === undefined || document.contains(this) === false) {
        return;
      }
      mediaDef.update();
      var oldProp = oldVal === null ? '' + attrDef.default : oldVal;
      var oldEvaluatedProp = attrDef.evaluateResponsiveAttribute(oldProp);
      var newEvaluatedProp = this[attrDef.getEvaluatedPropertyName()];
      if (oldEvaluatedProp !== newEvaluatedProp) {
        attrDef.mediaChangedCallback.call(this, oldEvaluatedProp, newEvaluatedProp);
      }
    },
    getComponent: function (T, tag) {
      var selector = T.prototype.selector;
      if (tag !== undefined) {
        selector += '[data-tag="' + tag + '"]';
      }
      return this.querySelector(selector);
    },
    getComponents: function (T, tag) {
      var selector = T.prototype.selector;
      if (tag !== undefined) {
        selector += '[data-tag="' + tag + '"]';
      }
      return _nodeListToArray(this.querySelectorAll(selector));
    },
    findWithTag: function (tag) {
      return this.querySelector('[data-tag="' + tag + '"]');
    },
    findAllWithTag: function (tag) {
      return _nodeListToArray(this.querySelectorAll('[data-tag="' + tag + '"]'));
    },
    createBinding: function (target, type, handler) {
      var binding = new Binding(target, type, handler.bind(this));
      this.bindings.push(binding);
      return binding;
    },
    enable: function () {
      var i;
      var l = this.bindings.length;
      for (i = 0; i < l; i++) {
        this.bindings[i].enable();
      }
    },
    disable: function () {
      var i;
      var l = this.bindings.length;
      for (i = 0; i < l; i++) {
        this.bindings[i].disable();
      }
    },
    trigger: function (type, detail) {
      var e = new CustomEvent(type, {
        detail: detail,
        bubbles: true
      });
      return this.dispatchEvent(e);
    }
  };
  var _nodeListToArray = function (nodeList) {
    var l = nodeList.length;
    var arr = new Array(l);
    // Setting the length first speeds up the conversion
    for (var i = 0; i < l; i++) {
      arr[i] = nodeList[i];
    }
    return arr;
  };
  return XElementMixin;
}(Binding, MediaDef);
utils_StringUtil = function () {
  var StringUtil = {};
  StringUtil.toCamelCase = function (str) {
    return str.replace(/(\-[a-z])/g, function ($1) {
      return $1.toUpperCase().replace('-', '');
    });
  };
  StringUtil.capitalize = function (str) {
    return str.replace(/./, function ($1) {
      return $1.toUpperCase();
    });
  };
  return StringUtil;
}();
AttrDef = function (StringUtil) {
  function AttrDef(name, params) {
    this.name = name;
    this.type = null;
    this.default = null;
    this.responsive = false;
    this.mediaChangedCallback = Function.prototype;
    // noop
    this.changedCallback = Function.prototype;
    // noop
    this.set(params);
  }
  AttrDef.prototype.set = function (params) {
    var prop;
    for (prop in params) {
      if (params.hasOwnProperty(prop) && this.hasOwnProperty(prop)) {
        this[prop] = params[prop];
      }
    }
  };
  AttrDef.prototype.getPropertyName = function () {
    return StringUtil.toCamelCase(this.name);  // 'attr-name' => 'attrName'
  };
  AttrDef.prototype.getEvaluatedPropertyName = function () {
    return 'current' + StringUtil.capitalize(this.getPropertyName());  // 'attr-name' => 'currentAttrName'
  };
  AttrDef.prototype.parseResponsiveAttribute = function (value) {
    if (value === null) {
      return {
        unmatched: null,
        breakpoints: []
      };
    }
    var definitions = value.split(',').map(function (x) {
      return x.trim();
    });
    var unmatched = definitions.pop();
    if (this.type === Number) {
      unmatched = +unmatched;
    }
    return {
      unmatched: unmatched,
      breakpoints: definitions.map(function (definition) {
        var parts = definition.split(/\s(?=[^\s]*$)/);
        // Find last occurence of whitespace and split at it
        var mediaQuery = parts[0];
        var value = parts[1];
        if (this.type === Number) {
          value = +value;
        }
        return {
          mediaQuery: mediaQuery,
          value: value
        };
      }, this)
    };
  };
  AttrDef.prototype.evaluateResponsiveAttribute = function (value) {
    var parsed = this.parseResponsiveAttribute(value);
    return parsed.breakpoints.reduce(function (previous, breakpoint) {
      if (window.matchMedia(breakpoint.mediaQuery).matches) {
        return breakpoint.value;
      }
      return previous;
    }, parsed.unmatched);
  };
  AttrDef.prototype.addToPrototype = function (prototype) {
    var attrDef = this;
    var prop = this.getPropertyName();
    Object.defineProperty(prototype, prop, {
      get: function () {
        var attrValue = this.getAttribute(attrDef.name);
        switch (attrDef.type) {
        case Number:
          // If the attribute is responsive, fallthrough to the String case
          if (attrDef.responsive !== true) {
            if (attrValue === null || attrValue.trim() === '' || isNaN(+attrValue)) {
              if (attrDef.default === null) {
                return null;
              }
              attrValue = attrDef.default;
            }
            return +attrValue;  // `+` quickly casts to a number
          }
        case String:
          if (attrValue === null) {
            if (attrDef.default === null) {
              return null;
            }
            attrValue = attrDef.default + '';
          }
          return attrValue;
        case Boolean:
          return attrValue !== null;
        }
      },
      set: function (value) {
        switch (attrDef.type) {
        case Number:
          // If the attribute is responsive, fallthrough to the String case
          if (attrDef.responsive !== true) {
            if (isNaN(+value)) {
              break;
            }
            this.setAttribute(attrDef.name, value);
            break;
          }
        case String:
          this.setAttribute(attrDef.name, value);
          break;
        case Boolean:
          if (!!value) {
            // `!!` quickly casts to a boolean
            this.setAttribute(attrDef.name, '');
          } else {
            this.removeAttribute(attrDef.name);
          }
          break;
        }
      }
    });
    if (attrDef.responsive === true) {
      Object.defineProperty(prototype, this.getEvaluatedPropertyName(), {
        get: function () {
          return attrDef.evaluateResponsiveAttribute(this[prop]);
        }
      });
    }
  };
  return AttrDef;
}(utils_StringUtil);
XElementjs = function (XElementMixin, AttrDef) {
  function XElement() {
  }
  XElement.attribute = function (name, params) {
    return new AttrDef(name, params);
  };
  XElement.define = function (customTagName, definition) {
    var constructor = HTMLElement;
    var base = Object.assign(Object.create(constructor.prototype), XElementMixin);
    var prototype = Object.create(base);
    Object.defineProperty(prototype, 'selector', { value: customTagName });
    definition(prototype, base);
    return _register(customTagName, { prototype: prototype });
  };
  XElement.extend = function () {
    if (typeof arguments[0] === 'string') {
      return _extendNative.apply(this, arguments);
    }
    return _extendCustom.apply(this, arguments);
  };
  var _extendNative = function (tagName, customTagName, definition) {
    var constructor = document.createElement(tagName).constructor;
    var base = Object.assign(Object.create(constructor.prototype), XElementMixin);
    var prototype = Object.create(base);
    Object.defineProperty(prototype, 'selector', { value: tagName + '[is="' + customTagName + '"]' });
    definition(prototype, base);
    return _register(customTagName, {
      prototype: prototype,
      extends: tagName
    });
  };
  var _extendCustom = function (T, customTagName, definition) {
    var options = {};
    var selector;
    var selectorParts = T.prototype.selector.split('[');
    var extendsNative = selectorParts.length > 1;
    if (extendsNative) {
      options.extends = selectorParts[0];
      selector = options.extends + '[is="' + customTagName + '"]';
    } else {
      selector = customTagName;
    }
    var base = T.prototype;
    var prototype = Object.create(base);
    Object.defineProperty(prototype, 'selector', { value: selector });
    definition(prototype, base);
    options.prototype = prototype;
    return _register(customTagName, options);
  };
  var _register = function (customTagName, options) {
    // Register custom attributes
    var prototype = options.prototype;
    prototype.customAttributes.forEach(function (attrDef) {
      attrDef.addToPrototype(prototype);
    });
    // Register the custom element
    return document.registerElement(customTagName, options);
  };
  XElement.setTag = function (element, tag) {
    element.dataset.tag = tag;
  };
  XElement.getTag = function (element) {
    return element.dataset.tag;
  };
  return XElement;
}(XElementMixin, AttrDef);    return XElementjs;
}));

/*!
 * routie - a tiny hash router
 * v0.3.2
 * http://projects.jga.me/routie
 * copyright Greg Allen 2013
 * MIT License
*/
(function(w) {

  var routes = [];
  var map = {};
  var reference = "routie";
  var oldReference = w[reference];

  var Route = function(path, name) {
    this.name = name;
    this.path = path;
    this.keys = [];
    this.fns = [];
    this.params = {};
    this.regex = pathToRegexp(this.path, this.keys, false, false);

  };

  Route.prototype.addHandler = function(fn) {
    this.fns.push(fn);
  };

  Route.prototype.removeHandler = function(fn) {
    for (var i = 0, c = this.fns.length; i < c; i++) {
      var f = this.fns[i];
      if (fn == f) {
        this.fns.splice(i, 1);
        return;
      }
    }
  };

  Route.prototype.run = function(params) {
    for (var i = 0, c = this.fns.length; i < c; i++) {
      this.fns[i].apply(this, params);
    }
  };

  Route.prototype.match = function(path, params){
    var m = this.regex.exec(path);

    if (!m) return false;


    for (var i = 1, len = m.length; i < len; ++i) {
      var key = this.keys[i - 1];

      var val = ('string' == typeof m[i]) ? decodeURIComponent(m[i]) : m[i];

      if (key) {
        this.params[key.name] = val;
      }
      params.push(val);
    }

    return true;
  };

  Route.prototype.toURL = function(params) {
    var path = this.path;
    for (var param in params) {
      path = path.replace('/:'+param, '/'+params[param]);
    }
    path = path.replace(/\/:.*\?/g, '/').replace(/\?/g, '');
    if (path.indexOf(':') != -1) {
      throw new Error('missing parameters for url: '+path);
    }
    return path;
  };

  var pathToRegexp = function(path, keys, sensitive, strict) {
    if (path instanceof RegExp) return path;
    if (path instanceof Array) path = '(' + path.join('|') + ')';
    path = path
      .concat(strict ? '' : '/?')
      .replace(/\/\(/g, '(?:/')
      .replace(/\+/g, '__plus__')
      .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
        keys.push({ name: key, optional: !! optional });
        slash = slash || '';
        return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
      })
      .replace(/([\/.])/g, '\\$1')
      .replace(/__plus__/g, '(.+)')
      .replace(/\*/g, '(.*)');
    return new RegExp('^' + path + '$', sensitive ? '' : 'i');
  };

  var addHandler = function(path, fn) {
    var s = path.split(' ');
    var name = (s.length == 2) ? s[0] : null;
    path = (s.length == 2) ? s[1] : s[0];

    if (!map[path]) {
      map[path] = new Route(path, name);
      routes.push(map[path]);
    }
    map[path].addHandler(fn);
  };

  var routie = function(path, fn) {
    if (typeof fn == 'function') {
      addHandler(path, fn);
      routie.reload();
    } else if (typeof path == 'object') {
      for (var p in path) {
        addHandler(p, path[p]);
      }
      routie.reload();
    } else if (typeof fn === 'undefined') {
      routie.navigate(path);
    }
  };

  routie.lookup = function(name, obj) {
    for (var i = 0, c = routes.length; i < c; i++) {
      var route = routes[i];
      if (route.name == name) {
        return route.toURL(obj);
      }
    }
  };

  routie.remove = function(path, fn) {
    var route = map[path];
    if (!route)
      return;
    route.removeHandler(fn);
  };

  routie.removeAll = function() {
    map = {};
    routes = [];
  };

  routie.navigate = function(path, options) {
    options = options || {};
    var silent = options.silent || false;

    if (silent) {
      removeListener();
    }
    setTimeout(function() {
      window.location.hash = path;

      if (silent) {
        setTimeout(function() { 
          addListener();
        }, 1);
      }

    }, 1);
  };

  routie.noConflict = function() {
    w[reference] = oldReference;
    return routie;
  };

  var getHash = function() {
    return window.location.hash.substring(1);
  };

  var checkRoute = function(hash, route) {
    var params = [];
    if (route.match(hash, params)) {
      route.run(params);
      return true;
    }
    return false;
  };

  var hashChanged = routie.reload = function() {
    var hash = getHash();
    for (var i = 0, c = routes.length; i < c; i++) {
      var route = routes[i];
      if (checkRoute(hash, route)) {
        return;
      }
    }
  };

  var addListener = function() {
    if (w.addEventListener) {
      w.addEventListener('hashchange', hashChanged, false);
    } else {
      w.attachEvent('onhashchange', hashChanged);
    }
  };

  var removeListener = function() {
    if (w.removeEventListener) {
      w.removeEventListener('hashchange', hashChanged);
    } else {
      w.detachEvent('onhashchange', hashChanged);
    }
  };
  addListener();

  w[reference] = routie;
   
})(window);

define("routie", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.routie;
    };
}(this)));

define('components/XStatefulElement',['require','xelement'],function (require) {
    'use strict';

    var XElement = require('xelement');


    return XElement.define('x-stateful-element', function (proto, base) {


        var VAR_NAME = 'state';

        /**
         * This essentially works the same way as doT.js's compilation except without any logic tags and it returns an object instead of a string.
         *
         * @private
         * @static
         * @param  {String} templateString  A string to be evaluated (note: not eval'd) with a `state` context, e.g. `'{ textContent: state.text }'`.
         * @return {Function}  A template function
         */
        var _compileObjectTemplate = function (templateString) {
            return new Function(VAR_NAME, 'return ' + templateString + ';');
        };


        proto.customAttributes = [

            XElement.attribute('props-attr', {
                type: String,
                default: 'data-props'
            })

        ];


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.pieces = Array.prototype.map.call(this.querySelectorAll('[' + this.propsAttr + ']') || [], function (element) {
                return {
                    element: element,
                    template: _compileObjectTemplate(element.getAttribute(this.propsAttr))
                };
            }, this);

            this.state = {};

        };


        proto.setState = function (state) {
            var piece;
            var prop;
            var props;
            var i;
            var l;
            var oldVal;
            var newVal;
            Object.assign(this.state, state);
            // TODO: Make this work on nested properties like element.style
            for (i = 0, l = this.pieces.length; i < l; i++) {
                piece = this.pieces[i];
                props = piece.template(this.state);
                for (prop in props) {
                    if (props.hasOwnProperty(prop)) {
                        oldVal = piece.element[prop];
                        newVal = props[prop];
                        if (oldVal !== newVal) {
                            piece.element[prop] = props[prop];
                        }
                    }
                }
            }
        };


    });
});

define('components/XNav',['require','xelement','components/XStatefulElement'],function (require) {
    'use strict';

    var XElement = require('xelement');
    var XStatefulElement = require('components/XStatefulElement');


    return XElement.extend(XStatefulElement, 'x-nav', function (proto, base) {

        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                selected: 'selected',
                page: ''
            };

        };

    });
});

(function (window, document, undefined) {
  'use strict';

  var formToObject = function () {

    if (!(this instanceof formToObject)) {
      var test = new formToObject(); // jscs:ignore requireCapitalizedConstructors
      return test.init.call(test, Array.prototype.slice.call(arguments));
    }

    /**
     * Defaults
     */

    var formRef = null;

    // Experimental. Don't rely on them yet.
    var settings = {
      includeEmptyValuedElements: false,
      w3cSuccessfulControlsOnly: false
    };

    // Currently matching only '[]'.
    var keyRegex = /[^\[\]]+|\[\]/g;
    var $form = null;
    var $formElements = [];

    /**
     * Private methods
     */

    /**
     * Check to see if the object is a HTML node.
     *
     * @param {object} node
     * @returns {boolean}
     */
    function isDomElementNode(node) {
      return !!(node &&
        typeof node === 'object' &&
        'nodeType' in node &&
        node.nodeType === 1);
    }

    /**
     * Check for last numeric key.
     *
     * @param o object
     * @return mixed (string|undefined)
     */
    function checkForLastNumericKey(o) {
      if (!o || typeof o !== 'object') {
        return undefined;
      }

      return Object.keys(o).filter(function (elem) {
        return !isNaN(parseInt(elem, 10));
      }).splice(-1)[0];
    }

    /**
     * Get last numeric key from an object.
     * @param o object
     * @return int
     */
    function getLastIntegerKey(o) {
      var lastKeyIndex = checkForLastNumericKey(o);
      if (typeof lastKeyIndex === 'string') {
        return parseInt(lastKeyIndex, 10);
      } else {
        return 0;
      }
    }

    /**
     * Get the next numeric key (like the index from a PHP array)
     * @param o object
     * @return int
     */
    function getNextIntegerKey(o) {
      var lastKeyIndex = checkForLastNumericKey(o);
      if (typeof lastKeyIndex === 'string') {
        return parseInt(lastKeyIndex, 10) + 1;
      } else {
        return 0;
      }
    }

    /**
     * Get the real number of properties from an object.
     *
     * @param {object} o
     * @returns {number}
     */
    function getObjLength(o) {
      if (typeof o !== 'object' || o === null) {
        return 0;
      }

      var l = 0;
      var k;

      if (typeof Object.keys === 'function') {
        l = Object.keys(o).length;
      } else {
        for (k in o) {
          if (o.hasOwnProperty(k)) {
            l++;
          }
        }
      }

      return l;
    }

    /**
     * Simple extend of own properties.
     * Needed for our settings.
     *
     * @param  {object} destination The object we want to extend.
     * @param  {object} sources The object with new properties that we want to add the the destination.
     * @return {object}
     */
    function extend(destination, sources) {
      var i;
      for (i in sources) {
        if (sources.hasOwnProperty(i)) {
          destination[i] = sources[i];
        }
      }

      return destination;
    }

    // Iteration through arrays and objects. Compatible with IE.
    function forEach(arr, callback) {
      if ([].forEach) {
        return [].forEach.call(arr, callback);
      }

      var i;
      for (i in arr) {
        // Using Object.prototype.hasOwnProperty instead of
        // arr.hasOwnProperty for IE8 compatibility.
        if (Object.prototype.hasOwnProperty.call(arr, i)) {
          callback.call(arr, arr[i]);
        }
      }

      return;
    }

    // Constructor
    function init(options) {
      // Assign the current form reference.
      if (!options || typeof options !== 'object' || !options[0]) {
        return false;
      }

      // The form reference is always the first parameter of the method.
      // Eg: formToObject('myForm')
      formRef = options[0];

      // Override current settings.
      // Eg. formToObject('myForm', {mySetting: true})
      if (typeof options[1] !== 'undefined' && getObjLength(options[1]) > 0) {
        extend(settings, options[1]);
      }

      if (!setForm()) {
        return false;
      }

      if (!setFormElements()) {
        return false;
      }

      return convertToObj();
    }

    // Set the main form object we are working on.
    function setForm() {
      switch (typeof formRef) {
      case 'string':
        $form = document.getElementById(formRef);
        break;

      case 'object':
        if (isDomElementNode(formRef)) {
          $form = formRef;
        }

        break;
      }

      return $form;
    }

    function isUploadForm() {
      return ($form.enctype && $form.enctype === 'multipart/form-data' ? true : false);
    }

    // Set the elements we need to parse.
    function setFormElements() {
      $formElements = $form.querySelectorAll('input, textarea, select');
      return $formElements.length;
    }

    function isRadio($domNode) {
      return $domNode.nodeName === 'INPUT' && $domNode.type === 'radio';
    }

    function isCheckbox($domNode) {
      return $domNode.nodeName === 'INPUT' && $domNode.type === 'checkbox';
    }

    function isFileField($domNode) {
      return $domNode.nodeName === 'INPUT' && $domNode.type === 'file';
    }

    function isTextarea($domNode) {
      return $domNode.nodeName === 'TEXTAREA';
    }

    function isSelectSimple($domNode) {
      return $domNode.nodeName === 'SELECT' && $domNode.type === 'select-one';
    }

    function isSelectMultiple($domNode) {
      return $domNode.nodeName === 'SELECT' && $domNode.type === 'select-multiple';
    }

    function isSubmitButton($domNode) {
      return $domNode.nodeName === 'BUTTON' && $domNode.type === 'submit';
    }

    function isChecked($domNode) {
      return $domNode.checked;
    }

    //function isMultiple($domNode){
    //  return ($domNode.multiple ? true : false);
    //}

    function isFileList($domNode) {
      return (window.FileList && $domNode.files instanceof window.FileList);
    }

    function getNodeValues($domNode) {
      // We're only interested in the radio that is checked.
      if (isRadio($domNode)) {
        return isChecked($domNode) ? $domNode.value : false;
      }

      // We're only interested in the checkbox that is checked.
      if (isCheckbox($domNode)) {
        return isChecked($domNode) ? $domNode.value : false;
      }

      // File inputs are a special case.
      // We have to grab the .files property of the input, which is a FileList.
      if (isFileField($domNode)) {
        // Ignore input file fields if the form is not encoded properly.
        if (isUploadForm()) {
          // HTML5 compatible browser.
          if (isFileList($domNode) && $domNode.files.length > 0) {
            return $domNode.files;
          } else {
            return ($domNode.value && $domNode.value !== '' ? $domNode.value : false);
          }
        } else {
          return false;
        }
      }

      // We're only interested in textarea fields that have values.
      if (isTextarea($domNode)) {
        return ($domNode.value && $domNode.value !== '' ? $domNode.value : false);
      }

      if (isSelectSimple($domNode)) {
        if ($domNode.value && $domNode.value !== '') {
          return $domNode.value;
        } else if ($domNode.options && $domNode.options.length && $domNode.options[0].value !== '') {
          return $domNode.options[0].value;
        } else {
          return false;
        }
      }

      // We're only interested in multiple selects that have at least one option selected.
      if (isSelectMultiple($domNode)) {
        if ($domNode.options && $domNode.options.length > 0) {
          var values = [];
          forEach($domNode.options, function ($option) {
            if ($option.selected) {
              values.push($option.value);
            }
          });

          if (settings.includeEmptyValuedElements) {
            return values;
          } else {
            return (values.length ? values : false);
          }

        } else {
          return false;
        }
      }

      // We're only interested if the button is type="submit"
      if (isSubmitButton($domNode)) {
        if ($domNode.value && $domNode.value !== '') {
          return $domNode.value;
        }

        if ($domNode.innerText && $domNode.innerText !== '') {
          return $domNode.innerText;
        }

        return false;
      }

      // Fallback or other non special fields.
      if (typeof $domNode.value !== 'undefined') {
        if (settings.includeEmptyValuedElements) {
          return $domNode.value;
        } else {
          return ($domNode.value !== '' ? $domNode.value : false);
        }
      } else {
        return false;
      }
    }

    function processSingleLevelNode($domNode, arr, domNodeValue, result) {
      // Get the last remaining key.
      var key = arr[0];

      // We're only interested in the radio that is checked.
      if (isRadio($domNode)) {
        if (domNodeValue !== false) {
          result[key] = domNodeValue;
          return domNodeValue;
        } else {
          return;
        }
      }

      // Checkboxes are a special case.
      // We have to grab each checked values
      // and put them into an array.
      if (isCheckbox($domNode)) {
        if (domNodeValue !== false) {
          if (!result[key]) {
            result[key] = [];
          }

          return result[key].push(domNodeValue);
        } else {
          return;
        }
      }

      // Multiple select is a special case.
      // We have to grab each selected option and put them into an array.
      if (isSelectMultiple($domNode)) {
        if (domNodeValue !== false) {
          result[key] = domNodeValue;
        } else {
          return;
        }
      }

      // Fallback or other cases that don't
      // need special treatment of the value.
      result[key] = domNodeValue;

      return domNodeValue;
    }

    function processMultiLevelNode($domNode, arr, value, result) {
      var keyName = arr[0];

      if (arr.length > 1) {
        if (keyName === '[]') {
          //result.push({});
          result[getNextIntegerKey(result)] = {};
          return processMultiLevelNode(
            $domNode,
            arr.splice(1, arr.length),
            value,
            result[getLastIntegerKey(result)]
          );
        } else {
          if (result[keyName] && getObjLength(result[keyName]) > 0) {
            //result[keyName].push(null);
            return processMultiLevelNode(
              $domNode,
              arr.splice(1, arr.length),
              value,
              result[keyName]
            );
          } else {
            result[keyName] = {};
          }

          return processMultiLevelNode($domNode, arr.splice(1, arr.length), value, result[keyName]);
        }
      }

      // Last key, attach the original value.
      if (arr.length === 1) {
        if (keyName === '[]') {
          //result.push(value);
          result[getNextIntegerKey(result)] = value;
          return result;
        } else {
          processSingleLevelNode($domNode, arr, value, result);

          //  result[keyName] = value;
          return result;
        }
      }
    }

    function convertToObj() {
      var i = 0;
      var objKeyNames;
      var $domNode;
      var domNodeValue;
      var result = {};
      var resultLength;

      for (i = 0; i < $formElements.length; i++) {

        $domNode = $formElements[i];

        // Skip the element if the 'name' attribute is empty.
        // Skip the 'disabled' elements.
        // Skip the non selected radio elements.
        if (!$domNode.name ||
          $domNode.name === '' ||
          $domNode.disabled ||
          (isRadio($domNode) && !isChecked($domNode))
        ) {
          continue;
        }

        // Get the final processed domNode value.
        domNodeValue = getNodeValues($domNode);

        // Exclude empty valued nodes if the settings allow it.
        if (domNodeValue === false && !settings.includeEmptyValuedElements) {
          continue;
        }

        // Extract all possible keys
        // Eg. name="firstName", name="settings[a][b]", name="settings[0][a]"
        objKeyNames = $domNode.name.match(keyRegex);

        if (objKeyNames.length === 1) {
          processSingleLevelNode(
            $domNode,
            objKeyNames, (domNodeValue ? domNodeValue : ''),
            result
          );
        }

        if (objKeyNames.length > 1) {
          processMultiLevelNode(
            $domNode,
            objKeyNames, (domNodeValue ? domNodeValue : ''),
            result
          );
        }

      }

      // Check the length of the result.
      resultLength = getObjLength(result);

      return resultLength > 0 ? result : false;
    }

    /**
     * Expose public methods.
     */
    return {
      init: init
    };

  };

  /**
   * Expose the final class.
   * @type Function
   */

  if (typeof define === 'function' && define.amd) {
    // AMD/requirejs: Define the module
    define('components/../../../bower_components/formToObject.js/dist/formToObject',[],function () {
      return formToObject;
    });
  } else {
    // Browser: Expose to window
    window.formToObject = formToObject;
  }

})(window, document);

define('components/XForm',['require','xelement','../../../bower_components/formToObject.js/dist/formToObject'],function (require) {
    'use strict';

    var XElement = require('xelement');
    var formToObject = require('../../../bower_components/formToObject.js/dist/formToObject');


    return XElement.extend('form', 'x-form', function (proto, base) {


        proto.EVENT = {
            CUSTOM_SUBMIT: 'x-form.customsubmit'
        };


        proto.createdCallback = function () {
            base.createdCallback.call(this);
            this.createBinding(this, 'submit', proto.handleSubmit);
            this.enable();
        };


        proto.handleSubmit = function (e) {
            e.preventDefault();
            var i = this.elements.length;
            var element;
            var isValid = true;
            while ((element = this.elements[--i]) !== undefined) {
                if (element.checkValidity() === false) {
                    isValid = false;
                }
            }
            if (isValid) {
                this.trigger(this.EVENT.CUSTOM_SUBMIT, {
                    request: formToObject(this)
                });
            }
        };


    });
});
define('components/XList',['require','xelement'],function (require) {
    'use strict';

    var XElement = require('xelement');


    return XElement.extend('ul', 'x-list', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.elements = [];

        };


        proto.add = function (element) {
            var li = document.createElement('li');
            li.appendChild(element);
            this.appendChild(li);
            this.elements.push(element);
        };


        proto.remove = function (element) {
            var i = this.elements.indexOf(element);
            if (i === -1) {
                return;
            }
            this.removeChild(this.children[i]);
            this.elements.splice(i, 1);
        };


    });
});

define('components/XTodo',['require','xelement','components/XStatefulElement'],function (require) {
    'use strict';

    var XElement = require('xelement');
    var XStatefulElement = require('components/XStatefulElement');


    return XElement.extend(XStatefulElement, 'x-todo', function (proto, base) {


        proto.customAttributes = [

            XElement.attribute('editing-class', {
                type: String,
                default: 'editing'
            })

        ];


        proto.EVENT = {
            STATUS_CHANGE: 'x-todo.complete',
            TEXT_CHANGE: 'x-todo.textchange',
            REMOVE: 'x-todo.remove'
        };


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                complete: false,
                text: ''
            };

            this.checkbox = this.findWithTag('x-todo.checkbox');

            this.editField = this.findWithTag('x-todo.editField');

            this.label = this.findWithTag('x-todo.label');

            this.createBinding(this.checkbox, 'change', proto.handleCheckboxChange);
            this.createBinding(this.label, 'dblclick', proto.handleLabelDblClick);
            this.createBinding(this.editField, 'keyup', proto.handleEditFieldBlur);
            this.createBinding(this.editField, 'blur', proto.handleEditFieldBlur)
            this.createBinding(this.findWithTag('x-todo.removalButton'), 'click', proto.handleRemovalButtonClick);
            this.enable();
        };


        proto.handleCheckboxChange = function (e) {
            this.trigger(this.EVENT.STATUS_CHANGE, { complete: e.target.checked });
        };


        proto.handleRemovalButtonClick = function () {
            this.trigger(this.EVENT.REMOVE);
        };


        proto.handleLabelDblClick = function () {
            this.parentElement.classList.add(this.editingClass);
            // Normally you would never use parentElement this way but it's necessary to work with the (not really exemplary) todomvc css (e.g. `.todo-list li.editing .view`)
            this.editField.value = this.label.textContent;
            this.editField.select();
        };


        proto.handleEditFieldBlur = function (e) {
            if (e.type === 'keyup' && e.keyCode !== 13) {
                return;
            }
            this.parentElement.classList.remove(this.editingClass);
            this.label.textContent = this.editField.value;
            this.trigger(this.EVENT.TEXT_CHANGE, { text: this.editField.value });
        };


    });
});

define('models/ModelAbstract',['require'],function (require) {
    'use strict';


    function ModelAbstract (guid) {

        this.guid = guid || ModelAbstract.generateGUID();

        this.props = {};

    }


    var _s4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    };


    ModelAbstract.generateGUID = function () {
        return _s4() + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + _s4() + _s4();
    };


    ModelAbstract.prototype.set = function (props) {
        var selfProps = this.props;
        var prop;
        for (prop in props) {
            if (props.hasOwnProperty(prop) && selfProps.hasOwnProperty(prop)) {
                selfProps[prop] = props[prop];
            }
        }
        return this;
    };


    return ModelAbstract;
});

define('models/TodoModel',['require','models/ModelAbstract'],function (require) {
    'use strict';

    var ModelAbstract = require('models/ModelAbstract');


    function TodoModel (guid) {
        ModelAbstract.call(this, guid);

        this.props.text = '';

        this.props.complete = false;

    }
    TodoModel.prototype = Object.create(ModelAbstract.prototype);
    TodoModel.prototype.constructor = TodoModel;


    return TodoModel;
});

define('repositories/TodoRepository',['require','models/TodoModel'],function (require) {
    'use strict';

    var TodoModel = require('models/TodoModel');


    function TodoRepository () {

        this.localModels = [];

    }


    TodoRepository.prototype.fetch = function () {
        var rawModels = JSON.parse(localStorage.getItem('TodoRepository')) || [];
        this.localModels = rawModels.map(function (rawModel) {
            return new TodoModel(rawModel.guid).set(rawModel.props);
        });
        return this.localModels;
    };


    TodoRepository.prototype.push = function (models) {
        localStorage.setItem('TodoRepository', JSON.stringify(models));
        this.localModels = models;
    };


    TodoRepository.prototype.create = function (data) {
        var models = this.fetch();
        var model = new TodoModel().set(data);
        models.push(model);
        this.push(models);
        return model;
    };


    TodoRepository.prototype.update = function (guid, data) {
        var models = this.fetch();
        var model = models.find(function (model) {
            return model.guid === guid;
        });
        if (model === undefined) {
            console.warn('No model with guid "' + guid + '" found');
            return;
        }
        model.set(data);
        this.push(models);
    };


    TodoRepository.prototype.delete = function (guids) {
        if (typeof guids === 'string') {
            return this.delete([ guids ]);
        }
        var models = this.fetch();
        guids.forEach(function (guid) {
            var i = models.length;
            var model;
            while ((model = models[--i]) !== undefined) {
                if (model.guid === guid) {
                    models.splice(i, 1);
                    break;
                }
            }
        }, this);
        this.push(models);
    };


    TodoRepository.prototype.deleteWhere = function (predicate) {
        var models = this.fetch();
        var removed = [];
        var model;
        var prop;
        var i = models.length;
        while ((model = models[--i]) !== undefined) {
            for (prop in predicate) {
                if (predicate.hasOwnProperty(prop)) {
                    if (model.props[prop] === predicate[prop]) {
                        removed.push(models.splice(i, 1)[0]);
                    }
                }
            }
        }
        this.push(models);
        return removed;
    };


    return TodoRepository;
});

define('components/XTodoList',['require','xelement','components/XForm','components/XList','components/XStatefulElement','components/XTodo','repositories/TodoRepository'],function (require) {
    'use strict';

    var XElement = require('xelement');
    var XForm = require('components/XForm');
    var XList = require('components/XList');
    var XStatefulElement = require('components/XStatefulElement');
    var XTodo = require('components/XTodo');
    var TodoRepository = require('repositories/TodoRepository');


    return XElement.extend(XStatefulElement, 'x-todo-list', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                totalCount: 0,
                completedCount: 0
            };

            this.filter = {};

            this.todoTemplate = this.findWithTag('x-todo-list.todoTemplate');

            this.checkAllBox = this.findWithTag('TodosDispatcher:checkAllBox');

            this.clearCompletedButton = this.findWithTag('TodosDispatcher:clearCompletedButton');

            this.xform = this.getComponent(XForm, 'x-todo-list.xform');

            this.xlist = this.getComponent(XList, 'x-todo-list.xlist');

            this.todoRepository = new TodoRepository();

            this.createBinding(this.checkAllBox, 'change', proto.handleCheckAllChange);
            this.createBinding(this.clearCompletedButton, 'click', proto.handleClearCompletedClick);
            this.createBinding(this.xform, this.xform.EVENT.CUSTOM_SUBMIT, proto.handleSubmit);
            this.createBinding(this, XTodo.prototype.EVENT.STATUS_CHANGE, proto.handleTodoStatusChange);
            this.createBinding(this, XTodo.prototype.EVENT.TEXT_CHANGE, proto.handleTodoTextChange);
            this.createBinding(this, XTodo.prototype.EVENT.REMOVE, proto.handleTodoRemove);
            this.enable();

            var self = this;
            this.add( this.todoRepository.fetch().map(function (todo) { return self.createTodoFromModel(todo); }) );
            this.updateUI();
        };


        proto.createTodoFromModel = function (model) {
            var docFrag = document.importNode(this.todoTemplate.content, true);
            var xtodo = docFrag.querySelector(XTodo.prototype.selector);
            XElement.setTag(xtodo, model.guid);
            xtodo.setState(model.props);
            return xtodo;
        };


        proto.add = function (xtodos) {
            // TODO: Filter stuff goes here
            var self = this;
            xtodos.forEach(function (xtodo) { self.xlist.add(xtodo); });
        };


        proto.remove = function (xtodos) {
            var self = this;
            xtodos.forEach(function (xtodo) { self.xlist.remove(xtodo); });
        };


        proto.setFilter = function (filter) {
            console.log(filter);
        };


        proto.updateUI = function () {
            var todoModels = this.todoRepository.localModels;
            var totalCount = todoModels.length;
            this.setState({
                totalCount: totalCount,
                completedCount: todoModels.filter(function (model) { return model.props.complete; }).length
            });
        };


        proto.handleSubmit = function (e) {
            var todoModel = this.todoRepository.create(e.detail.request);
            this.add([ this.createTodoFromModel(todoModel) ]);
            this.xform.reset();
            this.updateUI();
        };


        proto.handleTodoStatusChange = function (e) {
            var guid = XElement.getTag(e.target);
            this.todoRepository.update(guid, { complete: e.target.checkbox.checked });
            this.updateUI();
        };


        proto.handleTodoTextChange = function (e) {
            var guid = XElement.getTag(e.target);
            this.todoRepository.update(guid, { text: e.detail.text });
        };


        proto.handleTodoRemove = function (e) {
            this.todoRepository.delete(XElement.getTag(e.target));
            this.remove([ e.target ]);
            this.updateUI();
        };


        proto.handleCheckAllChange = function (e) {
            var self = this;
            var complete = e.target.checked;
            this.getComponents(XTodo).forEach(function (xtodo) {
                var guid = XElement.getTag(xtodo);
                xtodo.setState({ complete: complete });
                self.todoRepository.update(guid, { complete: complete }); // TODO: This could be optimized by updating multiple models at once
            });
            this.updateUI();
        };


        proto.handleClearCompletedClick = function () {
            var removed = this.todoRepository.deleteWhere({ complete: true });
            removed.forEach(function (model) {
                this.remove([ this.getComponent(XTodo, model.guid) ]);
            }, this);
            this.updateUI();
        };

    });
});

define('components/App',['require','xelement','routie','components/XNav','components/XTodoList'],function (require) {
    'use strict';

    var XElement = require('xelement');
    var routie = require('routie');
    var XNav = require('components/XNav');
    var XTodoList = require('components/XTodoList');


    return XElement.extend('html', 'x-app', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.todoList = this.getComponent(XTodoList, 'app.todoList');

            this.nav = this.getComponent(XNav, 'app.nav');

            this.registerRoutes();
        };


        proto.registerRoutes = function () {
            var self = this;
            routie({
                '': function () {
                    self.todoList.setFilter({});
                    self.nav.setState({ page: this.path });
                },
                '/active': function () {
                    self.todoList.setFilter({ completed: false });
                    self.nav.setState({ page: this.path });
                },
                '/completed': function () {
                    self.todoList.setFilter({ completed: true });
                    self.nav.setState({ page: this.path });
                }
            });
        };


    });
});

define('ComponentManifest',['require','components/App','components/XForm','components/XList','components/XNav','components/XTodo','components/XTodoList'],function (require) {
    'use strict';


    return {
        App: require('components/App'),
        XForm: require('components/XForm'),
        XList: require('components/XList'),
        XNav: require('components/XNav'),
        XTodo: require('components/XTodo'),
        XTodoList: require('components/XTodoList')
    };
});

require([
    'ComponentManifest'
], function (
    ComponentManifest
) {


});

define("main", function(){});

