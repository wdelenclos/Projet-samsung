(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// Console-polyfill. MIT license.
// https://github.com/paulmillr/console-polyfill
// Make it safe to do console.log() always.
(function(global) {
  'use strict';
  global.console = global.console || {};
  var con = global.console;
  var prop, method;
  var empty = {};
  var dummy = function() {};
  var properties = 'memory'.split(',');
  var methods = ('assert,clear,count,debug,dir,dirxml,error,exception,group,' +
     'groupCollapsed,groupEnd,info,log,markTimeline,profile,profiles,profileEnd,' +
     'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn').split(',');
  while (prop = properties.pop()) if (!con[prop]) con[prop] = empty;
  while (method = methods.pop()) if (!con[method]) con[method] = dummy;
})(typeof window === 'undefined' ? this : window);
// Using `this` for web workers while maintaining compatibility with browser
// targeted script loaders such as Browserify or Webpack where the only way to
// get to the global object is via `window`.

},{}],3:[function(require,module,exports){
(function (global){
/*!
 * VERSION: 1.18.2
 * DATE: 2015-12-22
 * UPDATES AND DOCS AT: http://greensock.com
 * 
 * Includes all of the following: TweenLite, TweenMax, TimelineLite, TimelineMax, EasePack, CSSPlugin, RoundPropsPlugin, BezierPlugin, AttrPlugin, DirectionalRotationPlugin
 *
 * @license Copyright (c) 2008-2016, GreenSock. All rights reserved.
 * This work is subject to the terms at http://greensock.com/standard-license or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 **/
var _gsScope = (typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window; //helps ensure compatibility with AMD/RequireJS and CommonJS/Node
(_gsScope._gsQueue || (_gsScope._gsQueue = [])).push( function() {

  "use strict";

  _gsScope._gsDefine("TweenMax", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {

    var _slice = function(a) { //don't use [].slice because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
        var b = [],
          l = a.length,
          i;
        for (i = 0; i !== l; b.push(a[i++]));
        return b;
      },
      _applyCycle = function(vars, targets, i) {
        var alt = vars.cycle,
          p, val;
        for (p in alt) {
          val = alt[p];
          vars[p] = (typeof(val) === "function") ? val.call(targets[i], i) : val[i % val.length];
        }
        delete vars.cycle;
      },
      TweenMax = function(target, duration, vars) {
        TweenLite.call(this, target, duration, vars);
        this._cycle = 0;
        this._yoyo = (this.vars.yoyo === true);
        this._repeat = this.vars.repeat || 0;
        this._repeatDelay = this.vars.repeatDelay || 0;
        this._dirty = true; //ensures that if there is any repeat, the totalDuration will get recalculated to accurately report it.
        this.render = TweenMax.prototype.render; //speed optimization (avoid prototype lookup on this "hot" method)
      },
      _tinyNum = 0.0000000001,
      TweenLiteInternals = TweenLite._internals,
      _isSelector = TweenLiteInternals.isSelector,
      _isArray = TweenLiteInternals.isArray,
      p = TweenMax.prototype = TweenLite.to({}, 0.1, {}),
      _blankArray = [];

    TweenMax.version = "1.18.2";
    p.constructor = TweenMax;
    p.kill()._gc = false;
    TweenMax.killTweensOf = TweenMax.killDelayedCallsTo = TweenLite.killTweensOf;
    TweenMax.getTweensOf = TweenLite.getTweensOf;
    TweenMax.lagSmoothing = TweenLite.lagSmoothing;
    TweenMax.ticker = TweenLite.ticker;
    TweenMax.render = TweenLite.render;

    p.invalidate = function() {
      this._yoyo = (this.vars.yoyo === true);
      this._repeat = this.vars.repeat || 0;
      this._repeatDelay = this.vars.repeatDelay || 0;
      this._uncache(true);
      return TweenLite.prototype.invalidate.call(this);
    };
    
    p.updateTo = function(vars, resetDuration) {
      var curRatio = this.ratio,
        immediate = this.vars.immediateRender || vars.immediateRender,
        p;
      if (resetDuration && this._startTime < this._timeline._time) {
        this._startTime = this._timeline._time;
        this._uncache(false);
        if (this._gc) {
          this._enabled(true, false);
        } else {
          this._timeline.insert(this, this._startTime - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
        }
      }
      for (p in vars) {
        this.vars[p] = vars[p];
      }
      if (this._initted || immediate) {
        if (resetDuration) {
          this._initted = false;
          if (immediate) {
            this.render(0, true, true);
          }
        } else {
          if (this._gc) {
            this._enabled(true, false);
          }
          if (this._notifyPluginsOfEnabled && this._firstPT) {
            TweenLite._onPluginEvent("_onDisable", this); //in case a plugin like MotionBlur must perform some cleanup tasks
          }
          if (this._time / this._duration > 0.998) { //if the tween has finished (or come extremely close to finishing), we just need to rewind it to 0 and then render it again at the end which forces it to re-initialize (parsing the new vars). We allow tweens that are close to finishing (but haven't quite finished) to work this way too because otherwise, the values are so small when determining where to project the starting values that binary math issues creep in and can make the tween appear to render incorrectly when run backwards. 
            var prevTime = this._totalTime;
            this.render(0, true, false);
            this._initted = false;
            this.render(prevTime, true, false);
          } else {
            this._initted = false;
            this._init();
            if (this._time > 0 || immediate) {
              var inv = 1 / (1 - curRatio),
                pt = this._firstPT, endValue;
              while (pt) {
                endValue = pt.s + pt.c;
                pt.c *= inv;
                pt.s = endValue - pt.c;
                pt = pt._next;
              }
            }
          }
        }
      }
      return this;
    };
        
    p.render = function(time, suppressEvents, force) {
      if (!this._initted) if (this._duration === 0 && this.vars.repeat) { //zero duration tweens that render immediately have render() called from TweenLite's constructor, before TweenMax's constructor has finished setting _repeat, _repeatDelay, and _yoyo which are critical in determining totalDuration() so we need to call invalidate() which is a low-kb way to get those set properly.
        this.invalidate();
      }
      var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
        prevTime = this._time,
        prevTotalTime = this._totalTime, 
        prevCycle = this._cycle,
        duration = this._duration,
        prevRawPrevTime = this._rawPrevTime,
        isComplete, callback, pt, cycleDuration, r, type, pow, rawPrevTime;
      if (time >= totalDur - 0.0000001) { //to work around occasional floating point math artifacts.
        this._totalTime = totalDur;
        this._cycle = this._repeat;
        if (this._yoyo && (this._cycle & 1) !== 0) {
          this._time = 0;
          this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
        } else {
          this._time = duration;
          this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
        }
        if (!this._reversed) {
          isComplete = true;
          callback = "onComplete";
          force = (force || this._timeline.autoRemoveChildren); //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
        }
        if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
          if (this._startTime === this._timeline._duration) { //if a zero-duration tween is at the VERY end of a timeline and that timeline renders at its end, it will typically add a tiny bit of cushion to the render time to prevent rounding errors from getting in the way of tweens rendering their VERY end. If we then reverse() that timeline, the zero-duration tween will trigger its onReverseComplete even though technically the playhead didn't pass over it again. It's a very specific edge case we must accommodate.
            time = 0;
          }
          if (prevRawPrevTime < 0 || (time <= 0 && time >= -0.0000001) || (prevRawPrevTime === _tinyNum && this.data !== "isPause")) if (prevRawPrevTime !== time) { //note: when this.data is "isPause", it's a callback added by addPause() on a timeline that we should not be triggered when LEAVING its exact start time. In other words, tl.addPause(1).play(1) shouldn't pause.
            force = true;
            if (prevRawPrevTime > _tinyNum) {
              callback = "onReverseComplete";
            }
          }
          this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
        }
        
      } else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
        this._totalTime = this._time = this._cycle = 0;
        this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
        if (prevTotalTime !== 0 || (duration === 0 && prevRawPrevTime > 0)) {
          callback = "onReverseComplete";
          isComplete = this._reversed;
        }
        if (time < 0) {
          this._active = false;
          if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
            if (prevRawPrevTime >= 0) {
              force = true;
            }
            this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
          }
        }
        if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
          force = true;
        }
      } else {
        this._totalTime = this._time = time;
        
        if (this._repeat !== 0) {
          cycleDuration = duration + this._repeatDelay;
          this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but Flash reports it as 0.79999999!)
          if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
            this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
          }
          this._time = this._totalTime - (this._cycle * cycleDuration);
          if (this._yoyo) if ((this._cycle & 1) !== 0) {
            this._time = duration - this._time;
          }
          if (this._time > duration) {
            this._time = duration;
          } else if (this._time < 0) {
            this._time = 0;
          }
        }

        if (this._easeType) {
          r = this._time / duration;
          type = this._easeType;
          pow = this._easePower;
          if (type === 1 || (type === 3 && r >= 0.5)) {
            r = 1 - r;
          }
          if (type === 3) {
            r *= 2;
          }
          if (pow === 1) {
            r *= r;
          } else if (pow === 2) {
            r *= r * r;
          } else if (pow === 3) {
            r *= r * r * r;
          } else if (pow === 4) {
            r *= r * r * r * r;
          }

          if (type === 1) {
            this.ratio = 1 - r;
          } else if (type === 2) {
            this.ratio = r;
          } else if (this._time / duration < 0.5) {
            this.ratio = r / 2;
          } else {
            this.ratio = 1 - (r / 2);
          }

        } else {
          this.ratio = this._ease.getRatio(this._time / duration);
        }
        
      }
        
      if (prevTime === this._time && !force && prevCycle === this._cycle) {
        if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
          this._callback("onUpdate");
        }
        return;
      } else if (!this._initted) {
        this._init();
        if (!this._initted || this._gc) { //immediateRender tweens typically won't initialize until the playhead advances (_time is greater than 0) in order to ensure that overwriting occurs properly. Also, if all of the tweening properties have been overwritten (which would cause _gc to be true, as set in _init()), we shouldn't continue otherwise an onStart callback could be called for example.
          return;
        } else if (!force && this._firstPT && ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration))) { //we stick it in the queue for rendering at the very end of the tick - this is a performance optimization because browsers invalidate styles and force a recalculation if you read, write, and then read style data (so it's better to read/read/read/write/write/write than read/write/read/write/read/write). The down side, of course, is that usually you WANT things to render immediately because you may have code running right after that which depends on the change. Like imagine running TweenLite.set(...) and then immediately after that, creating a nother tween that animates the same property to another value; the starting values of that 2nd tween wouldn't be accurate if lazy is true.
          this._time = prevTime;
          this._totalTime = prevTotalTime;
          this._rawPrevTime = prevRawPrevTime;
          this._cycle = prevCycle;
          TweenLiteInternals.lazyTweens.push(this);
          this._lazy = [time, suppressEvents];
          return;
        }
        //_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
        if (this._time && !isComplete) {
          this.ratio = this._ease.getRatio(this._time / duration);
        } else if (isComplete && this._ease._calcEnd) {
          this.ratio = this._ease.getRatio((this._time === 0) ? 0 : 1);
        }
      }
      if (this._lazy !== false) {
        this._lazy = false;
      }

      if (!this._active) if (!this._paused && this._time !== prevTime && time >= 0) {
        this._active = true; //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
      }
      if (prevTotalTime === 0) {
        if (this._initted === 2 && time > 0) {
          //this.invalidate();
          this._init(); //will just apply overwriting since _initted of (2) means it was a from() tween that had immediateRender:true
        }
        if (this._startAt) {
          if (time >= 0) {
            this._startAt.render(time, suppressEvents, force);
          } else if (!callback) {
            callback = "_dummyGS"; //if no callback is defined, use a dummy value just so that the condition at the end evaluates as true because _startAt should render AFTER the normal render loop when the time is negative. We could handle this in a more intuitive way, of course, but the render loop is the MOST important thing to optimize, so this technique allows us to avoid adding extra conditional logic in a high-frequency area.
          }
        }
        if (this.vars.onStart) if (this._totalTime !== 0 || duration === 0) if (!suppressEvents) {
          this._callback("onStart");
        }
      }
      
      pt = this._firstPT;
      while (pt) {
        if (pt.f) {
          pt.t[pt.p](pt.c * this.ratio + pt.s);
        } else {
          pt.t[pt.p] = pt.c * this.ratio + pt.s;
        }
        pt = pt._next;
      }
      
      if (this._onUpdate) {
        if (time < 0) if (this._startAt && this._startTime) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
          this._startAt.render(time, suppressEvents, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.
        }
        if (!suppressEvents) if (this._totalTime !== prevTotalTime || isComplete) {
          this._callback("onUpdate");
        }
      }
      if (this._cycle !== prevCycle) if (!suppressEvents) if (!this._gc) if (this.vars.onRepeat) {
        this._callback("onRepeat");
      }
      if (callback) if (!this._gc || force) { //check gc because there's a chance that kill() could be called in an onUpdate
        if (time < 0 && this._startAt && !this._onUpdate && this._startTime) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
          this._startAt.render(time, suppressEvents, force);
        }
        if (isComplete) {
          if (this._timeline.autoRemoveChildren) {
            this._enabled(false, false);
          }
          this._active = false;
        }
        if (!suppressEvents && this.vars[callback]) {
          this._callback(callback);
        }
        if (duration === 0 && this._rawPrevTime === _tinyNum && rawPrevTime !== _tinyNum) { //the onComplete or onReverseComplete could trigger movement of the playhead and for zero-duration tweens (which must discern direction) that land directly back on their start time, we don't want to fire again on the next render. Think of several addPause()'s in a timeline that forces the playhead to a certain spot, but what if it's already paused and another tween is tweening the "time" of the timeline? Each time it moves [forward] past that spot, it would move back, and since suppressEvents is true, it'd reset _rawPrevTime to _tinyNum so that when it begins again, the callback would fire (so ultimately it could bounce back and forth during that tween). Again, this is a very uncommon scenario, but possible nonetheless.
          this._rawPrevTime = 0;
        }
      }
    };
    
//---- STATIC FUNCTIONS -----------------------------------------------------------------------------------------------------------
    
    TweenMax.to = function(target, duration, vars) {
      return new TweenMax(target, duration, vars);
    };
    
    TweenMax.from = function(target, duration, vars) {
      vars.runBackwards = true;
      vars.immediateRender = (vars.immediateRender != false);
      return new TweenMax(target, duration, vars);
    };
    
    TweenMax.fromTo = function(target, duration, fromVars, toVars) {
      toVars.startAt = fromVars;
      toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
      return new TweenMax(target, duration, toVars);
    };
    
    TweenMax.staggerTo = TweenMax.allTo = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
      stagger = stagger || 0;
      var delay = 0,
        a = [],
        finalComplete = function() {
          if (vars.onComplete) {
            vars.onComplete.apply(vars.onCompleteScope || this, arguments);
          }
          onCompleteAll.apply(onCompleteAllScope || vars.callbackScope || this, onCompleteAllParams || _blankArray);
        },
        cycle = vars.cycle,
        fromCycle = (vars.startAt && vars.startAt.cycle),
        l, copy, i, p;
      if (!_isArray(targets)) {
        if (typeof(targets) === "string") {
          targets = TweenLite.selector(targets) || targets;
        }
        if (_isSelector(targets)) {
          targets = _slice(targets);
        }
      }
      targets = targets || [];
      if (stagger < 0) {
        targets = _slice(targets);
        targets.reverse();
        stagger *= -1;
      }
      l = targets.length - 1;
      for (i = 0; i <= l; i++) {
        copy = {};
        for (p in vars) {
          copy[p] = vars[p];
        }
        if (cycle) {
          _applyCycle(copy, targets, i);
        }
        if (fromCycle) {
          fromCycle = copy.startAt = {};
          for (p in vars.startAt) {
            fromCycle[p] = vars.startAt[p];
          }
          _applyCycle(copy.startAt, targets, i);
        }
        copy.delay = delay + (copy.delay || 0);
        if (i === l && onCompleteAll) {
          copy.onComplete = finalComplete;
        }
        a[i] = new TweenMax(targets[i], duration, copy);
        delay += stagger;
      }
      return a;
    };
    
    TweenMax.staggerFrom = TweenMax.allFrom = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
      vars.runBackwards = true;
      vars.immediateRender = (vars.immediateRender != false);
      return TweenMax.staggerTo(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
    };
    
    TweenMax.staggerFromTo = TweenMax.allFromTo = function(targets, duration, fromVars, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
      toVars.startAt = fromVars;
      toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
      return TweenMax.staggerTo(targets, duration, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
    };
        
    TweenMax.delayedCall = function(delay, callback, params, scope, useFrames) {
      return new TweenMax(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, callbackScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, immediateRender:false, useFrames:useFrames, overwrite:0});
    };
    
    TweenMax.set = function(target, vars) {
      return new TweenMax(target, 0, vars);
    };
    
    TweenMax.isTweening = function(target) {
      return (TweenLite.getTweensOf(target, true).length > 0);
    };
    
    var _getChildrenOf = function(timeline, includeTimelines) {
        var a = [],
          cnt = 0,
          tween = timeline._first;
        while (tween) {
          if (tween instanceof TweenLite) {
            a[cnt++] = tween;
          } else {
            if (includeTimelines) {
              a[cnt++] = tween;
            }
            a = a.concat(_getChildrenOf(tween, includeTimelines));
            cnt = a.length;
          }
          tween = tween._next;
        }
        return a;
      }, 
      getAllTweens = TweenMax.getAllTweens = function(includeTimelines) {
        return _getChildrenOf(Animation._rootTimeline, includeTimelines).concat( _getChildrenOf(Animation._rootFramesTimeline, includeTimelines) );
      };
    
    TweenMax.killAll = function(complete, tweens, delayedCalls, timelines) {
      if (tweens == null) {
        tweens = true;
      }
      if (delayedCalls == null) {
        delayedCalls = true;
      }
      var a = getAllTweens((timelines != false)),
        l = a.length,
        allTrue = (tweens && delayedCalls && timelines),
        isDC, tween, i;
      for (i = 0; i < l; i++) {
        tween = a[i];
        if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
          if (complete) {
            tween.totalTime(tween._reversed ? 0 : tween.totalDuration());
          } else {
            tween._enabled(false, false);
          }
        }
      }
    };
    
    TweenMax.killChildTweensOf = function(parent, complete) {
      if (parent == null) {
        return;
      }
      var tl = TweenLiteInternals.tweenLookup,
        a, curParent, p, i, l;
      if (typeof(parent) === "string") {
        parent = TweenLite.selector(parent) || parent;
      }
      if (_isSelector(parent)) {
        parent = _slice(parent);
      }
      if (_isArray(parent)) {
        i = parent.length;
        while (--i > -1) {
          TweenMax.killChildTweensOf(parent[i], complete);
        }
        return;
      }
      a = [];
      for (p in tl) {
        curParent = tl[p].target.parentNode;
        while (curParent) {
          if (curParent === parent) {
            a = a.concat(tl[p].tweens);
          }
          curParent = curParent.parentNode;
        }
      }
      l = a.length;
      for (i = 0; i < l; i++) {
        if (complete) {
          a[i].totalTime(a[i].totalDuration());
        }
        a[i]._enabled(false, false);
      }
    };

    var _changePause = function(pause, tweens, delayedCalls, timelines) {
      tweens = (tweens !== false);
      delayedCalls = (delayedCalls !== false);
      timelines = (timelines !== false);
      var a = getAllTweens(timelines),
        allTrue = (tweens && delayedCalls && timelines),
        i = a.length,
        isDC, tween;
      while (--i > -1) {
        tween = a[i];
        if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
          tween.paused(pause);
        }
      }
    };
    
    TweenMax.pauseAll = function(tweens, delayedCalls, timelines) {
      _changePause(true, tweens, delayedCalls, timelines);
    };
    
    TweenMax.resumeAll = function(tweens, delayedCalls, timelines) {
      _changePause(false, tweens, delayedCalls, timelines);
    };

    TweenMax.globalTimeScale = function(value) {
      var tl = Animation._rootTimeline,
        t = TweenLite.ticker.time;
      if (!arguments.length) {
        return tl._timeScale;
      }
      value = value || _tinyNum; //can't allow zero because it'll throw the math off
      tl._startTime = t - ((t - tl._startTime) * tl._timeScale / value);
      tl = Animation._rootFramesTimeline;
      t = TweenLite.ticker.frame;
      tl._startTime = t - ((t - tl._startTime) * tl._timeScale / value);
      tl._timeScale = Animation._rootTimeline._timeScale = value;
      return value;
    };
    
  
//---- GETTERS / SETTERS ----------------------------------------------------------------------------------------------------------
    
    p.progress = function(value) {
      return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), false);
    };
    
    p.totalProgress = function(value) {
      return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, false);
    };
    
    p.time = function(value, suppressEvents) {
      if (!arguments.length) {
        return this._time;
      }
      if (this._dirty) {
        this.totalDuration();
      }
      if (value > this._duration) {
        value = this._duration;
      }
      if (this._yoyo && (this._cycle & 1) !== 0) {
        value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
      } else if (this._repeat !== 0) {
        value += this._cycle * (this._duration + this._repeatDelay);
      }
      return this.totalTime(value, suppressEvents);
    };

    p.duration = function(value) {
      if (!arguments.length) {
        return this._duration; //don't set _dirty = false because there could be repeats that haven't been factored into the _totalDuration yet. Otherwise, if you create a repeated TweenMax and then immediately check its duration(), it would cache the value and the totalDuration would not be correct, thus repeats wouldn't take effect.
      }
      return Animation.prototype.duration.call(this, value);
    };

    p.totalDuration = function(value) {
      if (!arguments.length) {
        if (this._dirty) {
          //instead of Infinity, we use 999999999999 so that we can accommodate reverses
          this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
          this._dirty = false;
        }
        return this._totalDuration;
      }
      return (this._repeat === -1) ? this : this.duration( (value - (this._repeat * this._repeatDelay)) / (this._repeat + 1) );
    };
    
    p.repeat = function(value) {
      if (!arguments.length) {
        return this._repeat;
      }
      this._repeat = value;
      return this._uncache(true);
    };
    
    p.repeatDelay = function(value) {
      if (!arguments.length) {
        return this._repeatDelay;
      }
      this._repeatDelay = value;
      return this._uncache(true);
    };
    
    p.yoyo = function(value) {
      if (!arguments.length) {
        return this._yoyo;
      }
      this._yoyo = value;
      return this;
    };
    
    
    return TweenMax;
    
  }, true);








/*
 * ----------------------------------------------------------------
 * TimelineLite
 * ----------------------------------------------------------------
 */
  _gsScope._gsDefine("TimelineLite", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {

    var TimelineLite = function(vars) {
        SimpleTimeline.call(this, vars);
        this._labels = {};
        this.autoRemoveChildren = (this.vars.autoRemoveChildren === true);
        this.smoothChildTiming = (this.vars.smoothChildTiming === true);
        this._sortChildren = true;
        this._onUpdate = this.vars.onUpdate;
        var v = this.vars,
          val, p;
        for (p in v) {
          val = v[p];
          if (_isArray(val)) if (val.join("").indexOf("{self}") !== -1) {
            v[p] = this._swapSelfInParams(val);
          }
        }
        if (_isArray(v.tweens)) {
          this.add(v.tweens, 0, v.align, v.stagger);
        }
      },
      _tinyNum = 0.0000000001,
      TweenLiteInternals = TweenLite._internals,
      _internals = TimelineLite._internals = {},
      _isSelector = TweenLiteInternals.isSelector,
      _isArray = TweenLiteInternals.isArray,
      _lazyTweens = TweenLiteInternals.lazyTweens,
      _lazyRender = TweenLiteInternals.lazyRender,
      _globals = _gsScope._gsDefine.globals,
      _copy = function(vars) {
        var copy = {}, p;
        for (p in vars) {
          copy[p] = vars[p];
        }
        return copy;
      },
      _applyCycle = function(vars, targets, i) {
        var alt = vars.cycle,
          p, val;
        for (p in alt) {
          val = alt[p];
          vars[p] = (typeof(val) === "function") ? val.call(targets[i], i) : val[i % val.length];
        }
        delete vars.cycle;
      },
      _pauseCallback = _internals.pauseCallback = function() {},
      _slice = function(a) { //don't use [].slice because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
        var b = [],
          l = a.length,
          i;
        for (i = 0; i !== l; b.push(a[i++]));
        return b;
      },
      p = TimelineLite.prototype = new SimpleTimeline();

    TimelineLite.version = "1.18.2";
    p.constructor = TimelineLite;
    p.kill()._gc = p._forcingPlayhead = p._hasPause = false;

    /* might use later...
    //translates a local time inside an animation to the corresponding time on the root/global timeline, factoring in all nesting and timeScales.
    function localToGlobal(time, animation) {
      while (animation) {
        time = (time / animation._timeScale) + animation._startTime;
        animation = animation.timeline;
      }
      return time;
    }

    //translates the supplied time on the root/global timeline into the corresponding local time inside a particular animation, factoring in all nesting and timeScales
    function globalToLocal(time, animation) {
      var scale = 1;
      time -= localToGlobal(0, animation);
      while (animation) {
        scale *= animation._timeScale;
        animation = animation.timeline;
      }
      return time * scale;
    }
    */

    p.to = function(target, duration, vars, position) {
      var Engine = (vars.repeat && _globals.TweenMax) || TweenLite;
      return duration ? this.add( new Engine(target, duration, vars), position) : this.set(target, vars, position);
    };

    p.from = function(target, duration, vars, position) {
      return this.add( ((vars.repeat && _globals.TweenMax) || TweenLite).from(target, duration, vars), position);
    };

    p.fromTo = function(target, duration, fromVars, toVars, position) {
      var Engine = (toVars.repeat && _globals.TweenMax) || TweenLite;
      return duration ? this.add( Engine.fromTo(target, duration, fromVars, toVars), position) : this.set(target, toVars, position);
    };

    p.staggerTo = function(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
      var tl = new TimelineLite({onComplete:onCompleteAll, onCompleteParams:onCompleteAllParams, callbackScope:onCompleteAllScope, smoothChildTiming:this.smoothChildTiming}),
        cycle = vars.cycle,
        copy, i;
      if (typeof(targets) === "string") {
        targets = TweenLite.selector(targets) || targets;
      }
      targets = targets || [];
      if (_isSelector(targets)) { //senses if the targets object is a selector. If it is, we should translate it into an array.
        targets = _slice(targets);
      }
      stagger = stagger || 0;
      if (stagger < 0) {
        targets = _slice(targets);
        targets.reverse();
        stagger *= -1;
      }
      for (i = 0; i < targets.length; i++) {
        copy = _copy(vars);
        if (copy.startAt) {
          copy.startAt = _copy(copy.startAt);
          if (copy.startAt.cycle) {
            _applyCycle(copy.startAt, targets, i);
          }
        }
        if (cycle) {
          _applyCycle(copy, targets, i);
        }
        tl.to(targets[i], duration, copy, i * stagger);
      }
      return this.add(tl, position);
    };

    p.staggerFrom = function(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
      vars.immediateRender = (vars.immediateRender != false);
      vars.runBackwards = true;
      return this.staggerTo(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
    };

    p.staggerFromTo = function(targets, duration, fromVars, toVars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
      toVars.startAt = fromVars;
      toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
      return this.staggerTo(targets, duration, toVars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
    };

    p.call = function(callback, params, scope, position) {
      return this.add( TweenLite.delayedCall(0, callback, params, scope), position);
    };

    p.set = function(target, vars, position) {
      position = this._parseTimeOrLabel(position, 0, true);
      if (vars.immediateRender == null) {
        vars.immediateRender = (position === this._time && !this._paused);
      }
      return this.add( new TweenLite(target, 0, vars), position);
    };

    TimelineLite.exportRoot = function(vars, ignoreDelayedCalls) {
      vars = vars || {};
      if (vars.smoothChildTiming == null) {
        vars.smoothChildTiming = true;
      }
      var tl = new TimelineLite(vars),
        root = tl._timeline,
        tween, next;
      if (ignoreDelayedCalls == null) {
        ignoreDelayedCalls = true;
      }
      root._remove(tl, true);
      tl._startTime = 0;
      tl._rawPrevTime = tl._time = tl._totalTime = root._time;
      tween = root._first;
      while (tween) {
        next = tween._next;
        if (!ignoreDelayedCalls || !(tween instanceof TweenLite && tween.target === tween.vars.onComplete)) {
          tl.add(tween, tween._startTime - tween._delay);
        }
        tween = next;
      }
      root.add(tl, 0);
      return tl;
    };

    p.add = function(value, position, align, stagger) {
      var curTime, l, i, child, tl, beforeRawTime;
      if (typeof(position) !== "number") {
        position = this._parseTimeOrLabel(position, 0, true, value);
      }
      if (!(value instanceof Animation)) {
        if ((value instanceof Array) || (value && value.push && _isArray(value))) {
          align = align || "normal";
          stagger = stagger || 0;
          curTime = position;
          l = value.length;
          for (i = 0; i < l; i++) {
            if (_isArray(child = value[i])) {
              child = new TimelineLite({tweens:child});
            }
            this.add(child, curTime);
            if (typeof(child) !== "string" && typeof(child) !== "function") {
              if (align === "sequence") {
                curTime = child._startTime + (child.totalDuration() / child._timeScale);
              } else if (align === "start") {
                child._startTime -= child.delay();
              }
            }
            curTime += stagger;
          }
          return this._uncache(true);
        } else if (typeof(value) === "string") {
          return this.addLabel(value, position);
        } else if (typeof(value) === "function") {
          value = TweenLite.delayedCall(0, value);
        } else {
          throw("Cannot add " + value + " into the timeline; it is not a tween, timeline, function, or string.");
        }
      }

      SimpleTimeline.prototype.add.call(this, value, position);

      //if the timeline has already ended but the inserted tween/timeline extends the duration, we should enable this timeline again so that it renders properly. We should also align the playhead with the parent timeline's when appropriate.
      if (this._gc || this._time === this._duration) if (!this._paused) if (this._duration < this.duration()) {
        //in case any of the ancestors had completed but should now be enabled...
        tl = this;
        beforeRawTime = (tl.rawTime() > value._startTime); //if the tween is placed on the timeline so that it starts BEFORE the current rawTime, we should align the playhead (move the timeline). This is because sometimes users will create a timeline, let it finish, and much later append a tween and expect it to run instead of jumping to its end state. While technically one could argue that it should jump to its end state, that's not what users intuitively expect.
        while (tl._timeline) {
          if (beforeRawTime && tl._timeline.smoothChildTiming) {
            tl.totalTime(tl._totalTime, true); //moves the timeline (shifts its startTime) if necessary, and also enables it.
          } else if (tl._gc) {
            tl._enabled(true, false);
          }
          tl = tl._timeline;
        }
      }

      return this;
    };

    p.remove = function(value) {
      if (value instanceof Animation) {
        this._remove(value, false);
        var tl = value._timeline = value.vars.useFrames ? Animation._rootFramesTimeline : Animation._rootTimeline; //now that it's removed, default it to the root timeline so that if it gets played again, it doesn't jump back into this timeline.
        value._startTime = (value._paused ? value._pauseTime : tl._time) - ((!value._reversed ? value._totalTime : value.totalDuration() - value._totalTime) / value._timeScale); //ensure that if it gets played again, the timing is correct.
        return this;
      } else if (value instanceof Array || (value && value.push && _isArray(value))) {
        var i = value.length;
        while (--i > -1) {
          this.remove(value[i]);
        }
        return this;
      } else if (typeof(value) === "string") {
        return this.removeLabel(value);
      }
      return this.kill(null, value);
    };

    p._remove = function(tween, skipDisable) {
      SimpleTimeline.prototype._remove.call(this, tween, skipDisable);
      var last = this._last;
      if (!last) {
        this._time = this._totalTime = this._duration = this._totalDuration = 0;
      } else if (this._time > last._startTime + last._totalDuration / last._timeScale) {
        this._time = this.duration();
        this._totalTime = this._totalDuration;
      }
      return this;
    };

    p.append = function(value, offsetOrLabel) {
      return this.add(value, this._parseTimeOrLabel(null, offsetOrLabel, true, value));
    };

    p.insert = p.insertMultiple = function(value, position, align, stagger) {
      return this.add(value, position || 0, align, stagger);
    };

    p.appendMultiple = function(tweens, offsetOrLabel, align, stagger) {
      return this.add(tweens, this._parseTimeOrLabel(null, offsetOrLabel, true, tweens), align, stagger);
    };

    p.addLabel = function(label, position) {
      this._labels[label] = this._parseTimeOrLabel(position);
      return this;
    };

    p.addPause = function(position, callback, params, scope) {
      var t = TweenLite.delayedCall(0, _pauseCallback, params, scope || this);
      t.vars.onComplete = t.vars.onReverseComplete = callback;
      t.data = "isPause";
      this._hasPause = true;
      return this.add(t, position);
    };

    p.removeLabel = function(label) {
      delete this._labels[label];
      return this;
    };

    p.getLabelTime = function(label) {
      return (this._labels[label] != null) ? this._labels[label] : -1;
    };

    p._parseTimeOrLabel = function(timeOrLabel, offsetOrLabel, appendIfAbsent, ignore) {
      var i;
      //if we're about to add a tween/timeline (or an array of them) that's already a child of this timeline, we should remove it first so that it doesn't contaminate the duration().
      if (ignore instanceof Animation && ignore.timeline === this) {
        this.remove(ignore);
      } else if (ignore && ((ignore instanceof Array) || (ignore.push && _isArray(ignore)))) {
        i = ignore.length;
        while (--i > -1) {
          if (ignore[i] instanceof Animation && ignore[i].timeline === this) {
            this.remove(ignore[i]);
          }
        }
      }
      if (typeof(offsetOrLabel) === "string") {
        return this._parseTimeOrLabel(offsetOrLabel, (appendIfAbsent && typeof(timeOrLabel) === "number" && this._labels[offsetOrLabel] == null) ? timeOrLabel - this.duration() : 0, appendIfAbsent);
      }
      offsetOrLabel = offsetOrLabel || 0;
      if (typeof(timeOrLabel) === "string" && (isNaN(timeOrLabel) || this._labels[timeOrLabel] != null)) { //if the string is a number like "1", check to see if there's a label with that name, otherwise interpret it as a number (absolute value).
        i = timeOrLabel.indexOf("=");
        if (i === -1) {
          if (this._labels[timeOrLabel] == null) {
            return appendIfAbsent ? (this._labels[timeOrLabel] = this.duration() + offsetOrLabel) : offsetOrLabel;
          }
          return this._labels[timeOrLabel] + offsetOrLabel;
        }
        offsetOrLabel = parseInt(timeOrLabel.charAt(i-1) + "1", 10) * Number(timeOrLabel.substr(i+1));
        timeOrLabel = (i > 1) ? this._parseTimeOrLabel(timeOrLabel.substr(0, i-1), 0, appendIfAbsent) : this.duration();
      } else if (timeOrLabel == null) {
        timeOrLabel = this.duration();
      }
      return Number(timeOrLabel) + offsetOrLabel;
    };

    p.seek = function(position, suppressEvents) {
      return this.totalTime((typeof(position) === "number") ? position : this._parseTimeOrLabel(position), (suppressEvents !== false));
    };

    p.stop = function() {
      return this.paused(true);
    };

    p.gotoAndPlay = function(position, suppressEvents) {
      return this.play(position, suppressEvents);
    };

    p.gotoAndStop = function(position, suppressEvents) {
      return this.pause(position, suppressEvents);
    };

    p.render = function(time, suppressEvents, force) {
      if (this._gc) {
        this._enabled(true, false);
      }
      var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
        prevTime = this._time,
        prevStart = this._startTime,
        prevTimeScale = this._timeScale,
        prevPaused = this._paused,
        tween, isComplete, next, callback, internalForce, pauseTween, curTime;
      if (time >= totalDur - 0.0000001) { //to work around occasional floating point math artifacts.
        this._totalTime = this._time = totalDur;
        if (!this._reversed) if (!this._hasPausedChild()) {
          isComplete = true;
          callback = "onComplete";
          internalForce = !!this._timeline.autoRemoveChildren; //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
          if (this._duration === 0) if ((time <= 0 && time >= -0.0000001) || this._rawPrevTime < 0 || this._rawPrevTime === _tinyNum) if (this._rawPrevTime !== time && this._first) {
            internalForce = true;
            if (this._rawPrevTime > _tinyNum) {
              callback = "onReverseComplete";
            }
          }
        }
        this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
        time = totalDur + 0.0001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off). Try (999999999999.7 - 999999999999) * 1 = 0.699951171875 instead of 0.7.

      } else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
        this._totalTime = this._time = 0;
        if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime !== _tinyNum && (this._rawPrevTime > 0 || (time < 0 && this._rawPrevTime >= 0)))) {
          callback = "onReverseComplete";
          isComplete = this._reversed;
        }
        if (time < 0) {
          this._active = false;
          if (this._timeline.autoRemoveChildren && this._reversed) { //ensures proper GC if a timeline is resumed after it's finished reversing.
            internalForce = isComplete = true;
            callback = "onReverseComplete";
          } else if (this._rawPrevTime >= 0 && this._first) { //when going back beyond the start, force a render so that zero-duration tweens that sit at the very beginning render their start values properly. Otherwise, if the parent timeline's playhead lands exactly at this timeline's startTime, and then moves backwards, the zero-duration tweens at the beginning would still be at their end state.
            internalForce = true;
          }
          this._rawPrevTime = time;
        } else {
          this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
          if (time === 0 && isComplete) { //if there's a zero-duration tween at the very beginning of a timeline and the playhead lands EXACTLY at time 0, that tween will correctly render its end values, but we need to keep the timeline alive for one more render so that the beginning values render properly as the parent's playhead keeps moving beyond the begining. Imagine obj.x starts at 0 and then we do tl.set(obj, {x:100}).to(obj, 1, {x:200}) and then later we tl.reverse()...the goal is to have obj.x revert to 0. If the playhead happens to land on exactly 0, without this chunk of code, it'd complete the timeline and remove it from the rendering queue (not good).
            tween = this._first;
            while (tween && tween._startTime === 0) {
              if (!tween._duration) {
                isComplete = false;
              }
              tween = tween._next;
            }
          }
          time = 0; //to avoid occasional floating point rounding errors (could cause problems especially with zero-duration tweens at the very beginning of the timeline)
          if (!this._initted) {
            internalForce = true;
          }
        }

      } else {

        if (this._hasPause && !this._forcingPlayhead && !suppressEvents) {
          if (time >= prevTime) {
            tween = this._first;
            while (tween && tween._startTime <= time && !pauseTween) {
              if (!tween._duration) if (tween.data === "isPause" && !tween.ratio && !(tween._startTime === 0 && this._rawPrevTime === 0)) {
                pauseTween = tween;
              }
              tween = tween._next;
            }
          } else {
            tween = this._last;
            while (tween && tween._startTime >= time && !pauseTween) {
              if (!tween._duration) if (tween.data === "isPause" && tween._rawPrevTime > 0) {
                pauseTween = tween;
              }
              tween = tween._prev;
            }
          }
          if (pauseTween) {
            this._time = time = pauseTween._startTime;
            this._totalTime = time + (this._cycle * (this._totalDuration + this._repeatDelay));
          }
        }

        this._totalTime = this._time = this._rawPrevTime = time;
      }
      if ((this._time === prevTime || !this._first) && !force && !internalForce && !pauseTween) {
        return;
      } else if (!this._initted) {
        this._initted = true;
      }

      if (!this._active) if (!this._paused && this._time !== prevTime && time > 0) {
        this._active = true;  //so that if the user renders the timeline (as opposed to the parent timeline rendering it), it is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the timeline already finished but the user manually re-renders it as halfway done, for example.
      }

      if (prevTime === 0) if (this.vars.onStart) if (this._time !== 0) if (!suppressEvents) {
        this._callback("onStart");
      }

      curTime = this._time;
      if (curTime >= prevTime) {
        tween = this._first;
        while (tween) {
          next = tween._next; //record it here because the value could change after rendering...
          if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
            break;
          } else if (tween._active || (tween._startTime <= curTime && !tween._paused && !tween._gc)) {
            if (pauseTween === tween) {
              this.pause();
            }
            if (!tween._reversed) {
              tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
            } else {
              tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
            }
          }
          tween = next;
        }
      } else {
        tween = this._last;
        while (tween) {
          next = tween._prev; //record it here because the value could change after rendering...
          if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
            break;
          } else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
            if (pauseTween === tween) {
              pauseTween = tween._prev; //the linked list is organized by _startTime, thus it's possible that a tween could start BEFORE the pause and end after it, in which case it would be positioned before the pause tween in the linked list, but we should render it before we pause() the timeline and cease rendering. This is only a concern when going in reverse.
              while (pauseTween && pauseTween.endTime() > this._time) {
                pauseTween.render( (pauseTween._reversed ? pauseTween.totalDuration() - ((time - pauseTween._startTime) * pauseTween._timeScale) : (time - pauseTween._startTime) * pauseTween._timeScale), suppressEvents, force);
                pauseTween = pauseTween._prev;
              }
              pauseTween = null;
              this.pause();
            }
            if (!tween._reversed) {
              tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
            } else {
              tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
            }
          }
          tween = next;
        }
      }

      if (this._onUpdate) if (!suppressEvents) {
        if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onUpdate on a timeline that reports/checks tweened values.
          _lazyRender();
        }
        this._callback("onUpdate");
      }

      if (callback) if (!this._gc) if (prevStart === this._startTime || prevTimeScale !== this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
        if (isComplete) {
          if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onComplete on a timeline that reports/checks tweened values.
            _lazyRender();
          }
          if (this._timeline.autoRemoveChildren) {
            this._enabled(false, false);
          }
          this._active = false;
        }
        if (!suppressEvents && this.vars[callback]) {
          this._callback(callback);
        }
      }
    };

    p._hasPausedChild = function() {
      var tween = this._first;
      while (tween) {
        if (tween._paused || ((tween instanceof TimelineLite) && tween._hasPausedChild())) {
          return true;
        }
        tween = tween._next;
      }
      return false;
    };

    p.getChildren = function(nested, tweens, timelines, ignoreBeforeTime) {
      ignoreBeforeTime = ignoreBeforeTime || -9999999999;
      var a = [],
        tween = this._first,
        cnt = 0;
      while (tween) {
        if (tween._startTime < ignoreBeforeTime) {
          //do nothing
        } else if (tween instanceof TweenLite) {
          if (tweens !== false) {
            a[cnt++] = tween;
          }
        } else {
          if (timelines !== false) {
            a[cnt++] = tween;
          }
          if (nested !== false) {
            a = a.concat(tween.getChildren(true, tweens, timelines));
            cnt = a.length;
          }
        }
        tween = tween._next;
      }
      return a;
    };

    p.getTweensOf = function(target, nested) {
      var disabled = this._gc,
        a = [],
        cnt = 0,
        tweens, i;
      if (disabled) {
        this._enabled(true, true); //getTweensOf() filters out disabled tweens, and we have to mark them as _gc = true when the timeline completes in order to allow clean garbage collection, so temporarily re-enable the timeline here.
      }
      tweens = TweenLite.getTweensOf(target);
      i = tweens.length;
      while (--i > -1) {
        if (tweens[i].timeline === this || (nested && this._contains(tweens[i]))) {
          a[cnt++] = tweens[i];
        }
      }
      if (disabled) {
        this._enabled(false, true);
      }
      return a;
    };

    p.recent = function() {
      return this._recent;
    };

    p._contains = function(tween) {
      var tl = tween.timeline;
      while (tl) {
        if (tl === this) {
          return true;
        }
        tl = tl.timeline;
      }
      return false;
    };

    p.shiftChildren = function(amount, adjustLabels, ignoreBeforeTime) {
      ignoreBeforeTime = ignoreBeforeTime || 0;
      var tween = this._first,
        labels = this._labels,
        p;
      while (tween) {
        if (tween._startTime >= ignoreBeforeTime) {
          tween._startTime += amount;
        }
        tween = tween._next;
      }
      if (adjustLabels) {
        for (p in labels) {
          if (labels[p] >= ignoreBeforeTime) {
            labels[p] += amount;
          }
        }
      }
      return this._uncache(true);
    };

    p._kill = function(vars, target) {
      if (!vars && !target) {
        return this._enabled(false, false);
      }
      var tweens = (!target) ? this.getChildren(true, true, false) : this.getTweensOf(target),
        i = tweens.length,
        changed = false;
      while (--i > -1) {
        if (tweens[i]._kill(vars, target)) {
          changed = true;
        }
      }
      return changed;
    };

    p.clear = function(labels) {
      var tweens = this.getChildren(false, true, true),
        i = tweens.length;
      this._time = this._totalTime = 0;
      while (--i > -1) {
        tweens[i]._enabled(false, false);
      }
      if (labels !== false) {
        this._labels = {};
      }
      return this._uncache(true);
    };

    p.invalidate = function() {
      var tween = this._first;
      while (tween) {
        tween.invalidate();
        tween = tween._next;
      }
      return Animation.prototype.invalidate.call(this);;
    };

    p._enabled = function(enabled, ignoreTimeline) {
      if (enabled === this._gc) {
        var tween = this._first;
        while (tween) {
          tween._enabled(enabled, true);
          tween = tween._next;
        }
      }
      return SimpleTimeline.prototype._enabled.call(this, enabled, ignoreTimeline);
    };

    p.totalTime = function(time, suppressEvents, uncapped) {
      this._forcingPlayhead = true;
      var val = Animation.prototype.totalTime.apply(this, arguments);
      this._forcingPlayhead = false;
      return val;
    };

    p.duration = function(value) {
      if (!arguments.length) {
        if (this._dirty) {
          this.totalDuration(); //just triggers recalculation
        }
        return this._duration;
      }
      if (this.duration() !== 0 && value !== 0) {
        this.timeScale(this._duration / value);
      }
      return this;
    };

    p.totalDuration = function(value) {
      if (!arguments.length) {
        if (this._dirty) {
          var max = 0,
            tween = this._last,
            prevStart = 999999999999,
            prev, end;
          while (tween) {
            prev = tween._prev; //record it here in case the tween changes position in the sequence...
            if (tween._dirty) {
              tween.totalDuration(); //could change the tween._startTime, so make sure the tween's cache is clean before analyzing it.
            }
            if (tween._startTime > prevStart && this._sortChildren && !tween._paused) { //in case one of the tweens shifted out of order, it needs to be re-inserted into the correct position in the sequence
              this.add(tween, tween._startTime - tween._delay);
            } else {
              prevStart = tween._startTime;
            }
            if (tween._startTime < 0 && !tween._paused) { //children aren't allowed to have negative startTimes unless smoothChildTiming is true, so adjust here if one is found.
              max -= tween._startTime;
              if (this._timeline.smoothChildTiming) {
                this._startTime += tween._startTime / this._timeScale;
              }
              this.shiftChildren(-tween._startTime, false, -9999999999);
              prevStart = 0;
            }
            end = tween._startTime + (tween._totalDuration / tween._timeScale);
            if (end > max) {
              max = end;
            }
            tween = prev;
          }
          this._duration = this._totalDuration = max;
          this._dirty = false;
        }
        return this._totalDuration;
      }
      return (value && this.totalDuration()) ? this.timeScale(this._totalDuration / value) : this;
    };

    p.paused = function(value) {
      if (!value) { //if there's a pause directly at the spot from where we're unpausing, skip it.
        var tween = this._first,
          time = this._time;
        while (tween) {
          if (tween._startTime === time && tween.data === "isPause") {
            tween._rawPrevTime = 0; //remember, _rawPrevTime is how zero-duration tweens/callbacks sense directionality and determine whether or not to fire. If _rawPrevTime is the same as _startTime on the next render, it won't fire.
          }
          tween = tween._next;
        }
      }
      return Animation.prototype.paused.apply(this, arguments);
    };

    p.usesFrames = function() {
      var tl = this._timeline;
      while (tl._timeline) {
        tl = tl._timeline;
      }
      return (tl === Animation._rootFramesTimeline);
    };

    p.rawTime = function() {
      return this._paused ? this._totalTime : (this._timeline.rawTime() - this._startTime) * this._timeScale;
    };

    return TimelineLite;

  }, true);








  
  
  
  
  
/*
 * ----------------------------------------------------------------
 * TimelineMax
 * ----------------------------------------------------------------
 */
  _gsScope._gsDefine("TimelineMax", ["TimelineLite","TweenLite","easing.Ease"], function(TimelineLite, TweenLite, Ease) {

    var TimelineMax = function(vars) {
        TimelineLite.call(this, vars);
        this._repeat = this.vars.repeat || 0;
        this._repeatDelay = this.vars.repeatDelay || 0;
        this._cycle = 0;
        this._yoyo = (this.vars.yoyo === true);
        this._dirty = true;
      },
      _tinyNum = 0.0000000001,
      TweenLiteInternals = TweenLite._internals,
      _lazyTweens = TweenLiteInternals.lazyTweens,
      _lazyRender = TweenLiteInternals.lazyRender,
      _easeNone = new Ease(null, null, 1, 0),
      p = TimelineMax.prototype = new TimelineLite();

    p.constructor = TimelineMax;
    p.kill()._gc = false;
    TimelineMax.version = "1.18.2";

    p.invalidate = function() {
      this._yoyo = (this.vars.yoyo === true);
      this._repeat = this.vars.repeat || 0;
      this._repeatDelay = this.vars.repeatDelay || 0;
      this._uncache(true);
      return TimelineLite.prototype.invalidate.call(this);
    };

    p.addCallback = function(callback, position, params, scope) {
      return this.add( TweenLite.delayedCall(0, callback, params, scope), position);
    };

    p.removeCallback = function(callback, position) {
      if (callback) {
        if (position == null) {
          this._kill(null, callback);
        } else {
          var a = this.getTweensOf(callback, false),
            i = a.length,
            time = this._parseTimeOrLabel(position);
          while (--i > -1) {
            if (a[i]._startTime === time) {
              a[i]._enabled(false, false);
            }
          }
        }
      }
      return this;
    };

    p.removePause = function(position) {
      return this.removeCallback(TimelineLite._internals.pauseCallback, position);
    };

    p.tweenTo = function(position, vars) {
      vars = vars || {};
      var copy = {ease:_easeNone, useFrames:this.usesFrames(), immediateRender:false},
        duration, p, t;
      for (p in vars) {
        copy[p] = vars[p];
      }
      copy.time = this._parseTimeOrLabel(position);
      duration = (Math.abs(Number(copy.time) - this._time) / this._timeScale) || 0.001;
      t = new TweenLite(this, duration, copy);
      copy.onStart = function() {
        t.target.paused(true);
        if (t.vars.time !== t.target.time() && duration === t.duration()) { //don't make the duration zero - if it's supposed to be zero, don't worry because it's already initting the tween and will complete immediately, effectively making the duration zero anyway. If we make duration zero, the tween won't run at all.
          t.duration( Math.abs( t.vars.time - t.target.time()) / t.target._timeScale );
        }
        if (vars.onStart) { //in case the user had an onStart in the vars - we don't want to overwrite it.
          t._callback("onStart");
        }
      };
      return t;
    };

    p.tweenFromTo = function(fromPosition, toPosition, vars) {
      vars = vars || {};
      fromPosition = this._parseTimeOrLabel(fromPosition);
      vars.startAt = {onComplete:this.seek, onCompleteParams:[fromPosition], callbackScope:this};
      vars.immediateRender = (vars.immediateRender !== false);
      var t = this.tweenTo(toPosition, vars);
      return t.duration((Math.abs( t.vars.time - fromPosition) / this._timeScale) || 0.001);
    };

    p.render = function(time, suppressEvents, force) {
      if (this._gc) {
        this._enabled(true, false);
      }
      var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
        dur = this._duration,
        prevTime = this._time,
        prevTotalTime = this._totalTime,
        prevStart = this._startTime,
        prevTimeScale = this._timeScale,
        prevRawPrevTime = this._rawPrevTime,
        prevPaused = this._paused,
        prevCycle = this._cycle,
        tween, isComplete, next, callback, internalForce, cycleDuration, pauseTween, curTime;
      if (time >= totalDur - 0.0000001) { //to work around occasional floating point math artifacts.
        if (!this._locked) {
          this._totalTime = totalDur;
          this._cycle = this._repeat;
        }
        if (!this._reversed) if (!this._hasPausedChild()) {
          isComplete = true;
          callback = "onComplete";
          internalForce = !!this._timeline.autoRemoveChildren; //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
          if (this._duration === 0) if ((time <= 0 && time >= -0.0000001) || prevRawPrevTime < 0 || prevRawPrevTime === _tinyNum) if (prevRawPrevTime !== time && this._first) {
            internalForce = true;
            if (prevRawPrevTime > _tinyNum) {
              callback = "onReverseComplete";
            }
          }
        }
        this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
        if (this._yoyo && (this._cycle & 1) !== 0) {
          this._time = time = 0;
        } else {
          this._time = dur;
          time = dur + 0.0001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off). Try (999999999999.7 - 999999999999) * 1 = 0.699951171875 instead of 0.7. We cannot do less then 0.0001 because the same issue can occur when the duration is extremely large like 999999999999 in which case adding 0.00000001, for example, causes it to act like nothing was added.
        }

      } else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
        if (!this._locked) {
          this._totalTime = this._cycle = 0;
        }
        this._time = 0;
        if (prevTime !== 0 || (dur === 0 && prevRawPrevTime !== _tinyNum && (prevRawPrevTime > 0 || (time < 0 && prevRawPrevTime >= 0)) && !this._locked)) { //edge case for checking time < 0 && prevRawPrevTime >= 0: a zero-duration fromTo() tween inside a zero-duration timeline (yeah, very rare)
          callback = "onReverseComplete";
          isComplete = this._reversed;
        }
        if (time < 0) {
          this._active = false;
          if (this._timeline.autoRemoveChildren && this._reversed) {
            internalForce = isComplete = true;
            callback = "onReverseComplete";
          } else if (prevRawPrevTime >= 0 && this._first) { //when going back beyond the start, force a render so that zero-duration tweens that sit at the very beginning render their start values properly. Otherwise, if the parent timeline's playhead lands exactly at this timeline's startTime, and then moves backwards, the zero-duration tweens at the beginning would still be at their end state.
            internalForce = true;
          }
          this._rawPrevTime = time;
        } else {
          this._rawPrevTime = (dur || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
          if (time === 0 && isComplete) { //if there's a zero-duration tween at the very beginning of a timeline and the playhead lands EXACTLY at time 0, that tween will correctly render its end values, but we need to keep the timeline alive for one more render so that the beginning values render properly as the parent's playhead keeps moving beyond the begining. Imagine obj.x starts at 0 and then we do tl.set(obj, {x:100}).to(obj, 1, {x:200}) and then later we tl.reverse()...the goal is to have obj.x revert to 0. If the playhead happens to land on exactly 0, without this chunk of code, it'd complete the timeline and remove it from the rendering queue (not good).
            tween = this._first;
            while (tween && tween._startTime === 0) {
              if (!tween._duration) {
                isComplete = false;
              }
              tween = tween._next;
            }
          }
          time = 0; //to avoid occasional floating point rounding errors (could cause problems especially with zero-duration tweens at the very beginning of the timeline)
          if (!this._initted) {
            internalForce = true;
          }
        }

      } else {
        if (dur === 0 && prevRawPrevTime < 0) { //without this, zero-duration repeating timelines (like with a simple callback nested at the very beginning and a repeatDelay) wouldn't render the first time through.
          internalForce = true;
        }
        this._time = this._rawPrevTime = time;
        if (!this._locked) {
          this._totalTime = time;
          if (this._repeat !== 0) {
            cycleDuration = dur + this._repeatDelay;
            this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but it gets reported as 0.79999999!)
            if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
              this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
            }
            this._time = this._totalTime - (this._cycle * cycleDuration);
            if (this._yoyo) if ((this._cycle & 1) !== 0) {
              this._time = dur - this._time;
            }
            if (this._time > dur) {
              this._time = dur;
              time = dur + 0.0001; //to avoid occasional floating point rounding error
            } else if (this._time < 0) {
              this._time = time = 0;
            } else {
              time = this._time;
            }
          }
        }

        if (this._hasPause && !this._forcingPlayhead && !suppressEvents) {
          time = this._time;
          if (time >= prevTime) {
            tween = this._first;
            while (tween && tween._startTime <= time && !pauseTween) {
              if (!tween._duration) if (tween.data === "isPause" && !tween.ratio && !(tween._startTime === 0 && this._rawPrevTime === 0)) {
                pauseTween = tween;
              }
              tween = tween._next;
            }
          } else {
            tween = this._last;
            while (tween && tween._startTime >= time && !pauseTween) {
              if (!tween._duration) if (tween.data === "isPause" && tween._rawPrevTime > 0) {
                pauseTween = tween;
              }
              tween = tween._prev;
            }
          }
          if (pauseTween) {
            this._time = time = pauseTween._startTime;
            this._totalTime = time + (this._cycle * (this._totalDuration + this._repeatDelay));
          }
        }

      }

      if (this._cycle !== prevCycle) if (!this._locked) {
        /*
        make sure children at the end/beginning of the timeline are rendered properly. If, for example,
        a 3-second long timeline rendered at 2.9 seconds previously, and now renders at 3.2 seconds (which
        would get transated to 2.8 seconds if the timeline yoyos or 0.2 seconds if it just repeats), there
        could be a callback or a short tween that's at 2.95 or 3 seconds in which wouldn't render. So
        we need to push the timeline to the end (and/or beginning depending on its yoyo value). Also we must
        ensure that zero-duration tweens at the very beginning or end of the TimelineMax work.
        */
        var backwards = (this._yoyo && (prevCycle & 1) !== 0),
          wrap = (backwards === (this._yoyo && (this._cycle & 1) !== 0)),
          recTotalTime = this._totalTime,
          recCycle = this._cycle,
          recRawPrevTime = this._rawPrevTime,
          recTime = this._time;

        this._totalTime = prevCycle * dur;
        if (this._cycle < prevCycle) {
          backwards = !backwards;
        } else {
          this._totalTime += dur;
        }
        this._time = prevTime; //temporarily revert _time so that render() renders the children in the correct order. Without this, tweens won't rewind correctly. We could arhictect things in a "cleaner" way by splitting out the rendering queue into a separate method but for performance reasons, we kept it all inside this method.

        this._rawPrevTime = (dur === 0) ? prevRawPrevTime - 0.0001 : prevRawPrevTime;
        this._cycle = prevCycle;
        this._locked = true; //prevents changes to totalTime and skips repeat/yoyo behavior when we recursively call render()
        prevTime = (backwards) ? 0 : dur;
        this.render(prevTime, suppressEvents, (dur === 0));
        if (!suppressEvents) if (!this._gc) {
          if (this.vars.onRepeat) {
            this._callback("onRepeat");
          }
        }
        if (prevTime !== this._time) { //in case there's a callback like onComplete in a nested tween/timeline that changes the playhead position, like via seek(), we should just abort.
          return;
        }
        if (wrap) {
          prevTime = (backwards) ? dur + 0.0001 : -0.0001;
          this.render(prevTime, true, false);
        }
        this._locked = false;
        if (this._paused && !prevPaused) { //if the render() triggered callback that paused this timeline, we should abort (very rare, but possible)
          return;
        }
        this._time = recTime;
        this._totalTime = recTotalTime;
        this._cycle = recCycle;
        this._rawPrevTime = recRawPrevTime;
      }

      if ((this._time === prevTime || !this._first) && !force && !internalForce && !pauseTween) {
        if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
          this._callback("onUpdate");
        }
        return;
      } else if (!this._initted) {
        this._initted = true;
      }

      if (!this._active) if (!this._paused && this._totalTime !== prevTotalTime && time > 0) {
        this._active = true;  //so that if the user renders the timeline (as opposed to the parent timeline rendering it), it is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the timeline already finished but the user manually re-renders it as halfway done, for example.
      }

      if (prevTotalTime === 0) if (this.vars.onStart) if (this._totalTime !== 0) if (!suppressEvents) {
        this._callback("onStart");
      }

      curTime = this._time;
      if (curTime >= prevTime) {
        tween = this._first;
        while (tween) {
          next = tween._next; //record it here because the value could change after rendering...
          if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
            break;
          } else if (tween._active || (tween._startTime <= this._time && !tween._paused && !tween._gc)) {
            if (pauseTween === tween) {
              this.pause();
            }
            if (!tween._reversed) {
              tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
            } else {
              tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
            }
          }
          tween = next;
        }
      } else {
        tween = this._last;
        while (tween) {
          next = tween._prev; //record it here because the value could change after rendering...
          if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
            break;
          } else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
            if (pauseTween === tween) {
              pauseTween = tween._prev; //the linked list is organized by _startTime, thus it's possible that a tween could start BEFORE the pause and end after it, in which case it would be positioned before the pause tween in the linked list, but we should render it before we pause() the timeline and cease rendering. This is only a concern when going in reverse.
              while (pauseTween && pauseTween.endTime() > this._time) {
                pauseTween.render( (pauseTween._reversed ? pauseTween.totalDuration() - ((time - pauseTween._startTime) * pauseTween._timeScale) : (time - pauseTween._startTime) * pauseTween._timeScale), suppressEvents, force);
                pauseTween = pauseTween._prev;
              }
              pauseTween = null;
              this.pause();
            }
            if (!tween._reversed) {
              tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
            } else {
              tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
            }
          }
          tween = next;
        }
      }

      if (this._onUpdate) if (!suppressEvents) {
        if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onUpdate on a timeline that reports/checks tweened values.
          _lazyRender();
        }
        this._callback("onUpdate");
      }
      if (callback) if (!this._locked) if (!this._gc) if (prevStart === this._startTime || prevTimeScale !== this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
        if (isComplete) {
          if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onComplete on a timeline that reports/checks tweened values.
            _lazyRender();
          }
          if (this._timeline.autoRemoveChildren) {
            this._enabled(false, false);
          }
          this._active = false;
        }
        if (!suppressEvents && this.vars[callback]) {
          this._callback(callback);
        }
      }
    };

    p.getActive = function(nested, tweens, timelines) {
      if (nested == null) {
        nested = true;
      }
      if (tweens == null) {
        tweens = true;
      }
      if (timelines == null) {
        timelines = false;
      }
      var a = [],
        all = this.getChildren(nested, tweens, timelines),
        cnt = 0,
        l = all.length,
        i, tween;
      for (i = 0; i < l; i++) {
        tween = all[i];
        if (tween.isActive()) {
          a[cnt++] = tween;
        }
      }
      return a;
    };


    p.getLabelAfter = function(time) {
      if (!time) if (time !== 0) { //faster than isNan()
        time = this._time;
      }
      var labels = this.getLabelsArray(),
        l = labels.length,
        i;
      for (i = 0; i < l; i++) {
        if (labels[i].time > time) {
          return labels[i].name;
        }
      }
      return null;
    };

    p.getLabelBefore = function(time) {
      if (time == null) {
        time = this._time;
      }
      var labels = this.getLabelsArray(),
        i = labels.length;
      while (--i > -1) {
        if (labels[i].time < time) {
          return labels[i].name;
        }
      }
      return null;
    };

    p.getLabelsArray = function() {
      var a = [],
        cnt = 0,
        p;
      for (p in this._labels) {
        a[cnt++] = {time:this._labels[p], name:p};
      }
      a.sort(function(a,b) {
        return a.time - b.time;
      });
      return a;
    };


//---- GETTERS / SETTERS -------------------------------------------------------------------------------------------------------

    p.progress = function(value, suppressEvents) {
      return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), suppressEvents);
    };

    p.totalProgress = function(value, suppressEvents) {
      return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, suppressEvents);
    };

    p.totalDuration = function(value) {
      if (!arguments.length) {
        if (this._dirty) {
          TimelineLite.prototype.totalDuration.call(this); //just forces refresh
          //Instead of Infinity, we use 999999999999 so that we can accommodate reverses.
          this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
        }
        return this._totalDuration;
      }
      return (this._repeat === -1 || !value) ? this : this.timeScale( this.totalDuration() / value );
    };

    p.time = function(value, suppressEvents) {
      if (!arguments.length) {
        return this._time;
      }
      if (this._dirty) {
        this.totalDuration();
      }
      if (value > this._duration) {
        value = this._duration;
      }
      if (this._yoyo && (this._cycle & 1) !== 0) {
        value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
      } else if (this._repeat !== 0) {
        value += this._cycle * (this._duration + this._repeatDelay);
      }
      return this.totalTime(value, suppressEvents);
    };

    p.repeat = function(value) {
      if (!arguments.length) {
        return this._repeat;
      }
      this._repeat = value;
      return this._uncache(true);
    };

    p.repeatDelay = function(value) {
      if (!arguments.length) {
        return this._repeatDelay;
      }
      this._repeatDelay = value;
      return this._uncache(true);
    };

    p.yoyo = function(value) {
      if (!arguments.length) {
        return this._yoyo;
      }
      this._yoyo = value;
      return this;
    };

    p.currentLabel = function(value) {
      if (!arguments.length) {
        return this.getLabelBefore(this._time + 0.00000001);
      }
      return this.seek(value, true);
    };

    return TimelineMax;

  }, true);
  




  
  
  
  
  
  
  
/*
 * ----------------------------------------------------------------
 * BezierPlugin
 * ----------------------------------------------------------------
 */
  (function() {

    var _RAD2DEG = 180 / Math.PI,
      _r1 = [],
      _r2 = [],
      _r3 = [],
      _corProps = {},
      _globals = _gsScope._gsDefine.globals,
      Segment = function(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.da = d - a;
        this.ca = c - a;
        this.ba = b - a;
      },
      _correlate = ",x,y,z,left,top,right,bottom,marginTop,marginLeft,marginRight,marginBottom,paddingLeft,paddingTop,paddingRight,paddingBottom,backgroundPosition,backgroundPosition_y,",
      cubicToQuadratic = function(a, b, c, d) {
        var q1 = {a:a},
          q2 = {},
          q3 = {},
          q4 = {c:d},
          mab = (a + b) / 2,
          mbc = (b + c) / 2,
          mcd = (c + d) / 2,
          mabc = (mab + mbc) / 2,
          mbcd = (mbc + mcd) / 2,
          m8 = (mbcd - mabc) / 8;
        q1.b = mab + (a - mab) / 4;
        q2.b = mabc + m8;
        q1.c = q2.a = (q1.b + q2.b) / 2;
        q2.c = q3.a = (mabc + mbcd) / 2;
        q3.b = mbcd - m8;
        q4.b = mcd + (d - mcd) / 4;
        q3.c = q4.a = (q3.b + q4.b) / 2;
        return [q1, q2, q3, q4];
      },
      _calculateControlPoints = function(a, curviness, quad, basic, correlate) {
        var l = a.length - 1,
          ii = 0,
          cp1 = a[0].a,
          i, p1, p2, p3, seg, m1, m2, mm, cp2, qb, r1, r2, tl;
        for (i = 0; i < l; i++) {
          seg = a[ii];
          p1 = seg.a;
          p2 = seg.d;
          p3 = a[ii+1].d;

          if (correlate) {
            r1 = _r1[i];
            r2 = _r2[i];
            tl = ((r2 + r1) * curviness * 0.25) / (basic ? 0.5 : _r3[i] || 0.5);
            m1 = p2 - (p2 - p1) * (basic ? curviness * 0.5 : (r1 !== 0 ? tl / r1 : 0));
            m2 = p2 + (p3 - p2) * (basic ? curviness * 0.5 : (r2 !== 0 ? tl / r2 : 0));
            mm = p2 - (m1 + (((m2 - m1) * ((r1 * 3 / (r1 + r2)) + 0.5) / 4) || 0));
          } else {
            m1 = p2 - (p2 - p1) * curviness * 0.5;
            m2 = p2 + (p3 - p2) * curviness * 0.5;
            mm = p2 - (m1 + m2) / 2;
          }
          m1 += mm;
          m2 += mm;

          seg.c = cp2 = m1;
          if (i !== 0) {
            seg.b = cp1;
          } else {
            seg.b = cp1 = seg.a + (seg.c - seg.a) * 0.6; //instead of placing b on a exactly, we move it inline with c so that if the user specifies an ease like Back.easeIn or Elastic.easeIn which goes BEYOND the beginning, it will do so smoothly.
          }

          seg.da = p2 - p1;
          seg.ca = cp2 - p1;
          seg.ba = cp1 - p1;

          if (quad) {
            qb = cubicToQuadratic(p1, cp1, cp2, p2);
            a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
            ii += 4;
          } else {
            ii++;
          }

          cp1 = m2;
        }
        seg = a[ii];
        seg.b = cp1;
        seg.c = cp1 + (seg.d - cp1) * 0.4; //instead of placing c on d exactly, we move it inline with b so that if the user specifies an ease like Back.easeOut or Elastic.easeOut which goes BEYOND the end, it will do so smoothly.
        seg.da = seg.d - seg.a;
        seg.ca = seg.c - seg.a;
        seg.ba = cp1 - seg.a;
        if (quad) {
          qb = cubicToQuadratic(seg.a, cp1, seg.c, seg.d);
          a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
        }
      },
      _parseAnchors = function(values, p, correlate, prepend) {
        var a = [],
          l, i, p1, p2, p3, tmp;
        if (prepend) {
          values = [prepend].concat(values);
          i = values.length;
          while (--i > -1) {
            if (typeof( (tmp = values[i][p]) ) === "string") if (tmp.charAt(1) === "=") {
              values[i][p] = prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)); //accommodate relative values. Do it inline instead of breaking it out into a function for speed reasons
            }
          }
        }
        l = values.length - 2;
        if (l < 0) {
          a[0] = new Segment(values[0][p], 0, 0, values[(l < -1) ? 0 : 1][p]);
          return a;
        }
        for (i = 0; i < l; i++) {
          p1 = values[i][p];
          p2 = values[i+1][p];
          a[i] = new Segment(p1, 0, 0, p2);
          if (correlate) {
            p3 = values[i+2][p];
            _r1[i] = (_r1[i] || 0) + (p2 - p1) * (p2 - p1);
            _r2[i] = (_r2[i] || 0) + (p3 - p2) * (p3 - p2);
          }
        }
        a[i] = new Segment(values[i][p], 0, 0, values[i+1][p]);
        return a;
      },
      bezierThrough = function(values, curviness, quadratic, basic, correlate, prepend) {
        var obj = {},
          props = [],
          first = prepend || values[0],
          i, p, a, j, r, l, seamless, last;
        correlate = (typeof(correlate) === "string") ? ","+correlate+"," : _correlate;
        if (curviness == null) {
          curviness = 1;
        }
        for (p in values[0]) {
          props.push(p);
        }
        //check to see if the last and first values are identical (well, within 0.05). If so, make seamless by appending the second element to the very end of the values array and the 2nd-to-last element to the very beginning (we'll remove those segments later)
        if (values.length > 1) {
          last = values[values.length - 1];
          seamless = true;
          i = props.length;
          while (--i > -1) {
            p = props[i];
            if (Math.abs(first[p] - last[p]) > 0.05) { //build in a tolerance of +/-0.05 to accommodate rounding errors. For example, if you set an object's position to 4.945, Flash will make it 4.9
              seamless = false;
              break;
            }
          }
          if (seamless) {
            values = values.concat(); //duplicate the array to avoid contaminating the original which the user may be reusing for other tweens
            if (prepend) {
              values.unshift(prepend);
            }
            values.push(values[1]);
            prepend = values[values.length - 3];
          }
        }
        _r1.length = _r2.length = _r3.length = 0;
        i = props.length;
        while (--i > -1) {
          p = props[i];
          _corProps[p] = (correlate.indexOf(","+p+",") !== -1);
          obj[p] = _parseAnchors(values, p, _corProps[p], prepend);
        }
        i = _r1.length;
        while (--i > -1) {
          _r1[i] = Math.sqrt(_r1[i]);
          _r2[i] = Math.sqrt(_r2[i]);
        }
        if (!basic) {
          i = props.length;
          while (--i > -1) {
            if (_corProps[p]) {
              a = obj[props[i]];
              l = a.length - 1;
              for (j = 0; j < l; j++) {
                r = a[j+1].da / _r2[j] + a[j].da / _r1[j];
                _r3[j] = (_r3[j] || 0) + r * r;
              }
            }
          }
          i = _r3.length;
          while (--i > -1) {
            _r3[i] = Math.sqrt(_r3[i]);
          }
        }
        i = props.length;
        j = quadratic ? 4 : 1;
        while (--i > -1) {
          p = props[i];
          a = obj[p];
          _calculateControlPoints(a, curviness, quadratic, basic, _corProps[p]); //this method requires that _parseAnchors() and _setSegmentRatios() ran first so that _r1, _r2, and _r3 values are populated for all properties
          if (seamless) {
            a.splice(0, j);
            a.splice(a.length - j, j);
          }
        }
        return obj;
      },
      _parseBezierData = function(values, type, prepend) {
        type = type || "soft";
        var obj = {},
          inc = (type === "cubic") ? 3 : 2,
          soft = (type === "soft"),
          props = [],
          a, b, c, d, cur, i, j, l, p, cnt, tmp;
        if (soft && prepend) {
          values = [prepend].concat(values);
        }
        if (values == null || values.length < inc + 1) { throw "invalid Bezier data"; }
        for (p in values[0]) {
          props.push(p);
        }
        i = props.length;
        while (--i > -1) {
          p = props[i];
          obj[p] = cur = [];
          cnt = 0;
          l = values.length;
          for (j = 0; j < l; j++) {
            a = (prepend == null) ? values[j][p] : (typeof( (tmp = values[j][p]) ) === "string" && tmp.charAt(1) === "=") ? prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)) : Number(tmp);
            if (soft) if (j > 1) if (j < l - 1) {
              cur[cnt++] = (a + cur[cnt-2]) / 2;
            }
            cur[cnt++] = a;
          }
          l = cnt - inc + 1;
          cnt = 0;
          for (j = 0; j < l; j += inc) {
            a = cur[j];
            b = cur[j+1];
            c = cur[j+2];
            d = (inc === 2) ? 0 : cur[j+3];
            cur[cnt++] = tmp = (inc === 3) ? new Segment(a, b, c, d) : new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
          }
          cur.length = cnt;
        }
        return obj;
      },
      _addCubicLengths = function(a, steps, resolution) {
        var inc = 1 / resolution,
          j = a.length,
          d, d1, s, da, ca, ba, p, i, inv, bez, index;
        while (--j > -1) {
          bez = a[j];
          s = bez.a;
          da = bez.d - s;
          ca = bez.c - s;
          ba = bez.b - s;
          d = d1 = 0;
          for (i = 1; i <= resolution; i++) {
            p = inc * i;
            inv = 1 - p;
            d = d1 - (d1 = (p * p * da + 3 * inv * (p * ca + inv * ba)) * p);
            index = j * resolution + i - 1;
            steps[index] = (steps[index] || 0) + d * d;
          }
        }
      },
      _parseLengthData = function(obj, resolution) {
        resolution = resolution >> 0 || 6;
        var a = [],
          lengths = [],
          d = 0,
          total = 0,
          threshold = resolution - 1,
          segments = [],
          curLS = [], //current length segments array
          p, i, l, index;
        for (p in obj) {
          _addCubicLengths(obj[p], a, resolution);
        }
        l = a.length;
        for (i = 0; i < l; i++) {
          d += Math.sqrt(a[i]);
          index = i % resolution;
          curLS[index] = d;
          if (index === threshold) {
            total += d;
            index = (i / resolution) >> 0;
            segments[index] = curLS;
            lengths[index] = total;
            d = 0;
            curLS = [];
          }
        }
        return {length:total, lengths:lengths, segments:segments};
      },



      BezierPlugin = _gsScope._gsDefine.plugin({
          propName: "bezier",
          priority: -1,
          version: "1.3.4",
          API: 2,
          global:true,

          //gets called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
          init: function(target, vars, tween) {
            this._target = target;
            if (vars instanceof Array) {
              vars = {values:vars};
            }
            this._func = {};
            this._round = {};
            this._props = [];
            this._timeRes = (vars.timeResolution == null) ? 6 : parseInt(vars.timeResolution, 10);
            var values = vars.values || [],
              first = {},
              second = values[0],
              autoRotate = vars.autoRotate || tween.vars.orientToBezier,
              p, isFunc, i, j, prepend;

            this._autoRotate = autoRotate ? (autoRotate instanceof Array) ? autoRotate : [["x","y","rotation",((autoRotate === true) ? 0 : Number(autoRotate) || 0)]] : null;
            for (p in second) {
              this._props.push(p);
            }

            i = this._props.length;
            while (--i > -1) {
              p = this._props[i];

              this._overwriteProps.push(p);
              isFunc = this._func[p] = (typeof(target[p]) === "function");
              first[p] = (!isFunc) ? parseFloat(target[p]) : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]();
              if (!prepend) if (first[p] !== values[0][p]) {
                prepend = first;
              }
            }
            this._beziers = (vars.type !== "cubic" && vars.type !== "quadratic" && vars.type !== "soft") ? bezierThrough(values, isNaN(vars.curviness) ? 1 : vars.curviness, false, (vars.type === "thruBasic"), vars.correlate, prepend) : _parseBezierData(values, vars.type, first);
            this._segCount = this._beziers[p].length;

            if (this._timeRes) {
              var ld = _parseLengthData(this._beziers, this._timeRes);
              this._length = ld.length;
              this._lengths = ld.lengths;
              this._segments = ld.segments;
              this._l1 = this._li = this._s1 = this._si = 0;
              this._l2 = this._lengths[0];
              this._curSeg = this._segments[0];
              this._s2 = this._curSeg[0];
              this._prec = 1 / this._curSeg.length;
            }

            if ((autoRotate = this._autoRotate)) {
              this._initialRotations = [];
              if (!(autoRotate[0] instanceof Array)) {
                this._autoRotate = autoRotate = [autoRotate];
              }
              i = autoRotate.length;
              while (--i > -1) {
                for (j = 0; j < 3; j++) {
                  p = autoRotate[i][j];
                  this._func[p] = (typeof(target[p]) === "function") ? target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ] : false;
                }
                p = autoRotate[i][2];
                this._initialRotations[i] = this._func[p] ? this._func[p].call(this._target) : this._target[p];
              }
            }
            this._startRatio = tween.vars.runBackwards ? 1 : 0; //we determine the starting ratio when the tween inits which is always 0 unless the tween has runBackwards:true (indicating it's a from() tween) in which case it's 1.
            return true;
          },

          //called each time the values should be updated, and the ratio gets passed as the only parameter (typically it's a value between 0 and 1, but it can exceed those when using an ease like Elastic.easeOut or Back.easeOut, etc.)
          set: function(v) {
            var segments = this._segCount,
              func = this._func,
              target = this._target,
              notStart = (v !== this._startRatio),
              curIndex, inv, i, p, b, t, val, l, lengths, curSeg;
            if (!this._timeRes) {
              curIndex = (v < 0) ? 0 : (v >= 1) ? segments - 1 : (segments * v) >> 0;
              t = (v - (curIndex * (1 / segments))) * segments;
            } else {
              lengths = this._lengths;
              curSeg = this._curSeg;
              v *= this._length;
              i = this._li;
              //find the appropriate segment (if the currently cached one isn't correct)
              if (v > this._l2 && i < segments - 1) {
                l = segments - 1;
                while (i < l && (this._l2 = lengths[++i]) <= v) { }
                this._l1 = lengths[i-1];
                this._li = i;
                this._curSeg = curSeg = this._segments[i];
                this._s2 = curSeg[(this._s1 = this._si = 0)];
              } else if (v < this._l1 && i > 0) {
                while (i > 0 && (this._l1 = lengths[--i]) >= v) { }
                if (i === 0 && v < this._l1) {
                  this._l1 = 0;
                } else {
                  i++;
                }
                this._l2 = lengths[i];
                this._li = i;
                this._curSeg = curSeg = this._segments[i];
                this._s1 = curSeg[(this._si = curSeg.length - 1) - 1] || 0;
                this._s2 = curSeg[this._si];
              }
              curIndex = i;
              //now find the appropriate sub-segment (we split it into the number of pieces that was defined by "precision" and measured each one)
              v -= this._l1;
              i = this._si;
              if (v > this._s2 && i < curSeg.length - 1) {
                l = curSeg.length - 1;
                while (i < l && (this._s2 = curSeg[++i]) <= v) {  }
                this._s1 = curSeg[i-1];
                this._si = i;
              } else if (v < this._s1 && i > 0) {
                while (i > 0 && (this._s1 = curSeg[--i]) >= v) {  }
                if (i === 0 && v < this._s1) {
                  this._s1 = 0;
                } else {
                  i++;
                }
                this._s2 = curSeg[i];
                this._si = i;
              }
              t = (i + (v - this._s1) / (this._s2 - this._s1)) * this._prec;
            }
            inv = 1 - t;

            i = this._props.length;
            while (--i > -1) {
              p = this._props[i];
              b = this._beziers[p][curIndex];
              val = (t * t * b.da + 3 * inv * (t * b.ca + inv * b.ba)) * t + b.a;
              if (this._round[p]) {
                val = Math.round(val);
              }
              if (func[p]) {
                target[p](val);
              } else {
                target[p] = val;
              }
            }

            if (this._autoRotate) {
              var ar = this._autoRotate,
                b2, x1, y1, x2, y2, add, conv;
              i = ar.length;
              while (--i > -1) {
                p = ar[i][2];
                add = ar[i][3] || 0;
                conv = (ar[i][4] === true) ? 1 : _RAD2DEG;
                b = this._beziers[ar[i][0]];
                b2 = this._beziers[ar[i][1]];

                if (b && b2) { //in case one of the properties got overwritten.
                  b = b[curIndex];
                  b2 = b2[curIndex];

                  x1 = b.a + (b.b - b.a) * t;
                  x2 = b.b + (b.c - b.b) * t;
                  x1 += (x2 - x1) * t;
                  x2 += ((b.c + (b.d - b.c) * t) - x2) * t;

                  y1 = b2.a + (b2.b - b2.a) * t;
                  y2 = b2.b + (b2.c - b2.b) * t;
                  y1 += (y2 - y1) * t;
                  y2 += ((b2.c + (b2.d - b2.c) * t) - y2) * t;

                  val = notStart ? Math.atan2(y2 - y1, x2 - x1) * conv + add : this._initialRotations[i];

                  if (func[p]) {
                    target[p](val);
                  } else {
                    target[p] = val;
                  }
                }
              }
            }
          }
      }),
      p = BezierPlugin.prototype;


    BezierPlugin.bezierThrough = bezierThrough;
    BezierPlugin.cubicToQuadratic = cubicToQuadratic;
    BezierPlugin._autoCSS = true; //indicates that this plugin can be inserted into the "css" object using the autoCSS feature of TweenLite
    BezierPlugin.quadraticToCubic = function(a, b, c) {
      return new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
    };

    BezierPlugin._cssRegister = function() {
      var CSSPlugin = _globals.CSSPlugin;
      if (!CSSPlugin) {
        return;
      }
      var _internals = CSSPlugin._internals,
        _parseToProxy = _internals._parseToProxy,
        _setPluginRatio = _internals._setPluginRatio,
        CSSPropTween = _internals.CSSPropTween;
      _internals._registerComplexSpecialProp("bezier", {parser:function(t, e, prop, cssp, pt, plugin) {
        if (e instanceof Array) {
          e = {values:e};
        }
        plugin = new BezierPlugin();
        var values = e.values,
          l = values.length - 1,
          pluginValues = [],
          v = {},
          i, p, data;
        if (l < 0) {
          return pt;
        }
        for (i = 0; i <= l; i++) {
          data = _parseToProxy(t, values[i], cssp, pt, plugin, (l !== i));
          pluginValues[i] = data.end;
        }
        for (p in e) {
          v[p] = e[p]; //duplicate the vars object because we need to alter some things which would cause problems if the user plans to reuse the same vars object for another tween.
        }
        v.values = pluginValues;
        pt = new CSSPropTween(t, "bezier", 0, 0, data.pt, 2);
        pt.data = data;
        pt.plugin = plugin;
        pt.setRatio = _setPluginRatio;
        if (v.autoRotate === 0) {
          v.autoRotate = true;
        }
        if (v.autoRotate && !(v.autoRotate instanceof Array)) {
          i = (v.autoRotate === true) ? 0 : Number(v.autoRotate);
          v.autoRotate = (data.end.left != null) ? [["left","top","rotation",i,false]] : (data.end.x != null) ? [["x","y","rotation",i,false]] : false;
        }
        if (v.autoRotate) {
          if (!cssp._transform) {
            cssp._enableTransforms(false);
          }
          data.autoRotate = cssp._target._gsTransform;
        }
        plugin._onInitTween(data.proxy, v, cssp._tween);
        return pt;
      }});
    };

    p._roundProps = function(lookup, value) {
      var op = this._overwriteProps,
        i = op.length;
      while (--i > -1) {
        if (lookup[op[i]] || lookup.bezier || lookup.bezierThrough) {
          this._round[op[i]] = value;
        }
      }
    };

    p._kill = function(lookup) {
      var a = this._props,
        p, i;
      for (p in this._beziers) {
        if (p in lookup) {
          delete this._beziers[p];
          delete this._func[p];
          i = a.length;
          while (--i > -1) {
            if (a[i] === p) {
              a.splice(i, 1);
            }
          }
        }
      }
      return this._super._kill.call(this, lookup);
    };

  }());






  
  
  
  
  
  
  
  
/*
 * ----------------------------------------------------------------
 * CSSPlugin
 * ----------------------------------------------------------------
 */
  _gsScope._gsDefine("plugins.CSSPlugin", ["plugins.TweenPlugin","TweenLite"], function(TweenPlugin, TweenLite) {

    /** @constructor **/
    var CSSPlugin = function() {
        TweenPlugin.call(this, "css");
        this._overwriteProps.length = 0;
        this.setRatio = CSSPlugin.prototype.setRatio; //speed optimization (avoid prototype lookup on this "hot" method)
      },
      _globals = _gsScope._gsDefine.globals,
      _hasPriority, //turns true whenever a CSSPropTween instance is created that has a priority other than 0. This helps us discern whether or not we should spend the time organizing the linked list or not after a CSSPlugin's _onInitTween() method is called.
      _suffixMap, //we set this in _onInitTween() each time as a way to have a persistent variable we can use in other methods like _parse() without having to pass it around as a parameter and we keep _parse() decoupled from a particular CSSPlugin instance
      _cs, //computed style (we store this in a shared variable to conserve memory and make minification tighter
      _overwriteProps, //alias to the currently instantiating CSSPlugin's _overwriteProps array. We use this closure in order to avoid having to pass a reference around from method to method and aid in minification.
      _specialProps = {},
      p = CSSPlugin.prototype = new TweenPlugin("css");

    p.constructor = CSSPlugin;
    CSSPlugin.version = "1.18.2";
    CSSPlugin.API = 2;
    CSSPlugin.defaultTransformPerspective = 0;
    CSSPlugin.defaultSkewType = "compensated";
    CSSPlugin.defaultSmoothOrigin = true;
    p = "px"; //we'll reuse the "p" variable to keep file size down
    CSSPlugin.suffixMap = {top:p, right:p, bottom:p, left:p, width:p, height:p, fontSize:p, padding:p, margin:p, perspective:p, lineHeight:""};


    var _numExp = /(?:\d|\-\d|\.\d|\-\.\d)+/g,
      _relNumExp = /(?:\d|\-\d|\.\d|\-\.\d|\+=\d|\-=\d|\+=.\d|\-=\.\d)+/g,
      _valuesExp = /(?:\+=|\-=|\-|\b)[\d\-\.]+[a-zA-Z0-9]*(?:%|\b)/gi, //finds all the values that begin with numbers or += or -= and then a number. Includes suffixes. We use this to split complex values apart like "1px 5px 20px rgb(255,102,51)"
      _NaNExp = /(?![+-]?\d*\.?\d+|[+-]|e[+-]\d+)[^0-9]/g, //also allows scientific notation and doesn't kill the leading -/+ in -= and +=
      _suffixExp = /(?:\d|\-|\+|=|#|\.)*/g,
      _opacityExp = /opacity *= *([^)]*)/i,
      _opacityValExp = /opacity:([^;]*)/i,
      _alphaFilterExp = /alpha\(opacity *=.+?\)/i,
      _rgbhslExp = /^(rgb|hsl)/,
      _capsExp = /([A-Z])/g,
      _camelExp = /-([a-z])/gi,
      _urlExp = /(^(?:url\(\"|url\())|(?:(\"\))$|\)$)/gi, //for pulling out urls from url(...) or url("...") strings (some browsers wrap urls in quotes, some don't when reporting things like backgroundImage)
      _camelFunc = function(s, g) { return g.toUpperCase(); },
      _horizExp = /(?:Left|Right|Width)/i,
      _ieGetMatrixExp = /(M11|M12|M21|M22)=[\d\-\.e]+/gi,
      _ieSetMatrixExp = /progid\:DXImageTransform\.Microsoft\.Matrix\(.+?\)/i,
      _commasOutsideParenExp = /,(?=[^\)]*(?:\(|$))/gi, //finds any commas that are not within parenthesis
      _DEG2RAD = Math.PI / 180,
      _RAD2DEG = 180 / Math.PI,
      _forcePT = {},
      _doc = document,
      _createElement = function(type) {
        return _doc.createElementNS ? _doc.createElementNS("http://www.w3.org/1999/xhtml", type) : _doc.createElement(type);
      },
      _tempDiv = _createElement("div"),
      _tempImg = _createElement("img"),
      _internals = CSSPlugin._internals = {_specialProps:_specialProps}, //provides a hook to a few internal methods that we need to access from inside other plugins
      _agent = navigator.userAgent,
      _autoRound,
      _reqSafariFix, //we won't apply the Safari transform fix until we actually come across a tween that affects a transform property (to maintain best performance).

      _isSafari,
      _isFirefox, //Firefox has a bug that causes 3D transformed elements to randomly disappear unless a repaint is forced after each update on each element.
      _isSafariLT6, //Safari (and Android 4 which uses a flavor of Safari) has a bug that prevents changes to "top" and "left" properties from rendering properly if changed on the same frame as a transform UNLESS we set the element's WebkitBackfaceVisibility to hidden (weird, I know). Doing this for Android 3 and earlier seems to actually cause other problems, though (fun!)
      _ieVers,
      _supportsOpacity = (function() { //we set _isSafari, _ieVers, _isFirefox, and _supportsOpacity all in one function here to reduce file size slightly, especially in the minified version.
        var i = _agent.indexOf("Android"),
          a = _createElement("a");
        _isSafari = (_agent.indexOf("Safari") !== -1 && _agent.indexOf("Chrome") === -1 && (i === -1 || Number(_agent.substr(i+8, 1)) > 3));
        _isSafariLT6 = (_isSafari && (Number(_agent.substr(_agent.indexOf("Version/")+8, 1)) < 6));
        _isFirefox = (_agent.indexOf("Firefox") !== -1);
        if ((/MSIE ([0-9]{1,}[\.0-9]{0,})/).exec(_agent) || (/Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/).exec(_agent)) {
          _ieVers = parseFloat( RegExp.$1 );
        }
        if (!a) {
          return false;
        }
        a.style.cssText = "top:1px;opacity:.55;";
        return /^0.55/.test(a.style.opacity);
      }()),
      _getIEOpacity = function(v) {
        return (_opacityExp.test( ((typeof(v) === "string") ? v : (v.currentStyle ? v.currentStyle.filter : v.style.filter) || "") ) ? ( parseFloat( RegExp.$1 ) / 100 ) : 1);
      },
      _log = function(s) {//for logging messages, but in a way that won't throw errors in old versions of IE.
        if (window.console) {
          console.log(s);
        }
      },

      _prefixCSS = "", //the non-camelCase vendor prefix like "-o-", "-moz-", "-ms-", or "-webkit-"
      _prefix = "", //camelCase vendor prefix like "O", "ms", "Webkit", or "Moz".

      // @private feed in a camelCase property name like "transform" and it will check to see if it is valid as-is or if it needs a vendor prefix. It returns the corrected camelCase property name (i.e. "WebkitTransform" or "MozTransform" or "transform" or null if no such property is found, like if the browser is IE8 or before, "transform" won't be found at all)
      _checkPropPrefix = function(p, e) {
        e = e || _tempDiv;
        var s = e.style,
          a, i;
        if (s[p] !== undefined) {
          return p;
        }
        p = p.charAt(0).toUpperCase() + p.substr(1);
        a = ["O","Moz","ms","Ms","Webkit"];
        i = 5;
        while (--i > -1 && s[a[i]+p] === undefined) { }
        if (i >= 0) {
          _prefix = (i === 3) ? "ms" : a[i];
          _prefixCSS = "-" + _prefix.toLowerCase() + "-";
          return _prefix + p;
        }
        return null;
      },

      _getComputedStyle = _doc.defaultView ? _doc.defaultView.getComputedStyle : function() {},

      /**
       * @private Returns the css style for a particular property of an element. For example, to get whatever the current "left" css value for an element with an ID of "myElement", you could do:
       * var currentLeft = CSSPlugin.getStyle( document.getElementById("myElement"), "left");
       *
       * @param {!Object} t Target element whose style property you want to query
       * @param {!string} p Property name (like "left" or "top" or "marginTop", etc.)
       * @param {Object=} cs Computed style object. This just provides a way to speed processing if you're going to get several properties on the same element in quick succession - you can reuse the result of the getComputedStyle() call.
       * @param {boolean=} calc If true, the value will not be read directly from the element's "style" property (if it exists there), but instead the getComputedStyle() result will be used. This can be useful when you want to ensure that the browser itself is interpreting the value.
       * @param {string=} dflt Default value that should be returned in the place of null, "none", "auto" or "auto auto".
       * @return {?string} The current property value
       */
      _getStyle = CSSPlugin.getStyle = function(t, p, cs, calc, dflt) {
        var rv;
        if (!_supportsOpacity) if (p === "opacity") { //several versions of IE don't use the standard "opacity" property - they use things like filter:alpha(opacity=50), so we parse that here.
          return _getIEOpacity(t);
        }
        if (!calc && t.style[p]) {
          rv = t.style[p];
        } else if ((cs = cs || _getComputedStyle(t))) {
          rv = cs[p] || cs.getPropertyValue(p) || cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
        } else if (t.currentStyle) {
          rv = t.currentStyle[p];
        }
        return (dflt != null && (!rv || rv === "none" || rv === "auto" || rv === "auto auto")) ? dflt : rv;
      },

      /**
       * @private Pass the target element, the property name, the numeric value, and the suffix (like "%", "em", "px", etc.) and it will spit back the equivalent pixel number.
       * @param {!Object} t Target element
       * @param {!string} p Property name (like "left", "top", "marginLeft", etc.)
       * @param {!number} v Value
       * @param {string=} sfx Suffix (like "px" or "%" or "em")
       * @param {boolean=} recurse If true, the call is a recursive one. In some browsers (like IE7/8), occasionally the value isn't accurately reported initially, but if we run the function again it will take effect.
       * @return {number} value in pixels
       */
      _convertToPixels = _internals.convertToPixels = function(t, p, v, sfx, recurse) {
        if (sfx === "px" || !sfx) { return v; }
        if (sfx === "auto" || !v) { return 0; }
        var horiz = _horizExp.test(p),
          node = t,
          style = _tempDiv.style,
          neg = (v < 0),
          pix, cache, time;
        if (neg) {
          v = -v;
        }
        if (sfx === "%" && p.indexOf("border") !== -1) {
          pix = (v / 100) * (horiz ? t.clientWidth : t.clientHeight);
        } else {
          style.cssText = "border:0 solid red;position:" + _getStyle(t, "position") + ";line-height:0;";
          if (sfx === "%" || !node.appendChild || sfx.charAt(0) === "v" || sfx === "rem") {
            node = t.parentNode || _doc.body;
            cache = node._gsCache;
            time = TweenLite.ticker.frame;
            if (cache && horiz && cache.time === time) { //performance optimization: we record the width of elements along with the ticker frame so that we can quickly get it again on the same tick (seems relatively safe to assume it wouldn't change on the same tick)
              return cache.width * v / 100;
            }
            style[(horiz ? "width" : "height")] = v + sfx;
          } else {
            style[(horiz ? "borderLeftWidth" : "borderTopWidth")] = v + sfx;
          }
          node.appendChild(_tempDiv);
          pix = parseFloat(_tempDiv[(horiz ? "offsetWidth" : "offsetHeight")]);
          node.removeChild(_tempDiv);
          if (horiz && sfx === "%" && CSSPlugin.cacheWidths !== false) {
            cache = node._gsCache = node._gsCache || {};
            cache.time = time;
            cache.width = pix / v * 100;
          }
          if (pix === 0 && !recurse) {
            pix = _convertToPixels(t, p, v, sfx, true);
          }
        }
        return neg ? -pix : pix;
      },
      _calculateOffset = _internals.calculateOffset = function(t, p, cs) { //for figuring out "top" or "left" in px when it's "auto". We need to factor in margin with the offsetLeft/offsetTop
        if (_getStyle(t, "position", cs) !== "absolute") { return 0; }
        var dim = ((p === "left") ? "Left" : "Top"),
          v = _getStyle(t, "margin" + dim, cs);
        return t["offset" + dim] - (_convertToPixels(t, p, parseFloat(v), v.replace(_suffixExp, "")) || 0);
      },

      // @private returns at object containing ALL of the style properties in camelCase and their associated values.
      _getAllStyles = function(t, cs) {
        var s = {},
          i, tr, p;
        if ((cs = cs || _getComputedStyle(t, null))) {
          if ((i = cs.length)) {
            while (--i > -1) {
              p = cs[i];
              if (p.indexOf("-transform") === -1 || _transformPropCSS === p) { //Some webkit browsers duplicate transform values, one non-prefixed and one prefixed ("transform" and "WebkitTransform"), so we must weed out the extra one here.
                s[p.replace(_camelExp, _camelFunc)] = cs.getPropertyValue(p);
              }
            }
          } else { //some browsers behave differently - cs.length is always 0, so we must do a for...in loop.
            for (i in cs) {
              if (i.indexOf("Transform") === -1 || _transformProp === i) { //Some webkit browsers duplicate transform values, one non-prefixed and one prefixed ("transform" and "WebkitTransform"), so we must weed out the extra one here.
                s[i] = cs[i];
              }
            }
          }
        } else if ((cs = t.currentStyle || t.style)) {
          for (i in cs) {
            if (typeof(i) === "string" && s[i] === undefined) {
              s[i.replace(_camelExp, _camelFunc)] = cs[i];
            }
          }
        }
        if (!_supportsOpacity) {
          s.opacity = _getIEOpacity(t);
        }
        tr = _getTransform(t, cs, false);
        s.rotation = tr.rotation;
        s.skewX = tr.skewX;
        s.scaleX = tr.scaleX;
        s.scaleY = tr.scaleY;
        s.x = tr.x;
        s.y = tr.y;
        if (_supports3D) {
          s.z = tr.z;
          s.rotationX = tr.rotationX;
          s.rotationY = tr.rotationY;
          s.scaleZ = tr.scaleZ;
        }
        if (s.filters) {
          delete s.filters;
        }
        return s;
      },

      // @private analyzes two style objects (as returned by _getAllStyles()) and only looks for differences between them that contain tweenable values (like a number or color). It returns an object with a "difs" property which refers to an object containing only those isolated properties and values for tweening, and a "firstMPT" property which refers to the first MiniPropTween instance in a linked list that recorded all the starting values of the different properties so that we can revert to them at the end or beginning of the tween - we don't want the cascading to get messed up. The forceLookup parameter is an optional generic object with properties that should be forced into the results - this is necessary for className tweens that are overwriting others because imagine a scenario where a rollover/rollout adds/removes a class and the user swipes the mouse over the target SUPER fast, thus nothing actually changed yet and the subsequent comparison of the properties would indicate they match (especially when px rounding is taken into consideration), thus no tweening is necessary even though it SHOULD tween and remove those properties after the tween (otherwise the inline styles will contaminate things). See the className SpecialProp code for details.
      _cssDif = function(t, s1, s2, vars, forceLookup) {
        var difs = {},
          style = t.style,
          val, p, mpt;
        for (p in s2) {
          if (p !== "cssText") if (p !== "length") if (isNaN(p)) if (s1[p] !== (val = s2[p]) || (forceLookup && forceLookup[p])) if (p.indexOf("Origin") === -1) if (typeof(val) === "number" || typeof(val) === "string") {
            difs[p] = (val === "auto" && (p === "left" || p === "top")) ? _calculateOffset(t, p) : ((val === "" || val === "auto" || val === "none") && typeof(s1[p]) === "string" && s1[p].replace(_NaNExp, "") !== "") ? 0 : val; //if the ending value is defaulting ("" or "auto"), we check the starting value and if it can be parsed into a number (a string which could have a suffix too, like 700px), then we swap in 0 for "" or "auto" so that things actually tween.
            if (style[p] !== undefined) { //for className tweens, we must remember which properties already existed inline - the ones that didn't should be removed when the tween isn't in progress because they were only introduced to facilitate the transition between classes.
              mpt = new MiniPropTween(style, p, style[p], mpt);
            }
          }
        }
        if (vars) {
          for (p in vars) { //copy properties (except className)
            if (p !== "className") {
              difs[p] = vars[p];
            }
          }
        }
        return {difs:difs, firstMPT:mpt};
      },
      _dimensions = {width:["Left","Right"], height:["Top","Bottom"]},
      _margins = ["marginLeft","marginRight","marginTop","marginBottom"],

      /**
       * @private Gets the width or height of an element
       * @param {!Object} t Target element
       * @param {!string} p Property name ("width" or "height")
       * @param {Object=} cs Computed style object (if one exists). Just a speed optimization.
       * @return {number} Dimension (in pixels)
       */
      _getDimension = function(t, p, cs) {
        var v = parseFloat((p === "width") ? t.offsetWidth : t.offsetHeight),
          a = _dimensions[p],
          i = a.length;
        cs = cs || _getComputedStyle(t, null);
        while (--i > -1) {
          v -= parseFloat( _getStyle(t, "padding" + a[i], cs, true) ) || 0;
          v -= parseFloat( _getStyle(t, "border" + a[i] + "Width", cs, true) ) || 0;
        }
        return v;
      },

      // @private Parses position-related complex strings like "top left" or "50px 10px" or "70% 20%", etc. which are used for things like transformOrigin or backgroundPosition. Optionally decorates a supplied object (recObj) with the following properties: "ox" (offsetX), "oy" (offsetY), "oxp" (if true, "ox" is a percentage not a pixel value), and "oxy" (if true, "oy" is a percentage not a pixel value)
      _parsePosition = function(v, recObj) {
        if (v === "contain" || v === "auto" || v === "auto auto") {
          return v + " ";
        }
        if (v == null || v === "") { //note: Firefox uses "auto auto" as default whereas Chrome uses "auto".
          v = "0 0";
        }
        var a = v.split(" "),
          x = (v.indexOf("left") !== -1) ? "0%" : (v.indexOf("right") !== -1) ? "100%" : a[0],
          y = (v.indexOf("top") !== -1) ? "0%" : (v.indexOf("bottom") !== -1) ? "100%" : a[1];
        if (y == null) {
          y = (x === "center") ? "50%" : "0";
        } else if (y === "center") {
          y = "50%";
        }
        if (x === "center" || (isNaN(parseFloat(x)) && (x + "").indexOf("=") === -1)) { //remember, the user could flip-flop the values and say "bottom center" or "center bottom", etc. "center" is ambiguous because it could be used to describe horizontal or vertical, hence the isNaN(). If there's an "=" sign in the value, it's relative.
          x = "50%";
        }
        v = x + " " + y + ((a.length > 2) ? " " + a[2] : "");
        if (recObj) {
          recObj.oxp = (x.indexOf("%") !== -1);
          recObj.oyp = (y.indexOf("%") !== -1);
          recObj.oxr = (x.charAt(1) === "=");
          recObj.oyr = (y.charAt(1) === "=");
          recObj.ox = parseFloat(x.replace(_NaNExp, ""));
          recObj.oy = parseFloat(y.replace(_NaNExp, ""));
          recObj.v = v;
        }
        return recObj || v;
      },

      /**
       * @private Takes an ending value (typically a string, but can be a number) and a starting value and returns the change between the two, looking for relative value indicators like += and -= and it also ignores suffixes (but make sure the ending value starts with a number or +=/-= and that the starting value is a NUMBER!)
       * @param {(number|string)} e End value which is typically a string, but could be a number
       * @param {(number|string)} b Beginning value which is typically a string but could be a number
       * @return {number} Amount of change between the beginning and ending values (relative values that have a "+=" or "-=" are recognized)
       */
      _parseChange = function(e, b) {
        return (typeof(e) === "string" && e.charAt(1) === "=") ? parseInt(e.charAt(0) + "1", 10) * parseFloat(e.substr(2)) : parseFloat(e) - parseFloat(b);
      },

      /**
       * @private Takes a value and a default number, checks if the value is relative, null, or numeric and spits back a normalized number accordingly. Primarily used in the _parseTransform() function.
       * @param {Object} v Value to be parsed
       * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
       * @return {number} Parsed value
       */
      _parseVal = function(v, d) {
        return (v == null) ? d : (typeof(v) === "string" && v.charAt(1) === "=") ? parseInt(v.charAt(0) + "1", 10) * parseFloat(v.substr(2)) + d : parseFloat(v);
      },

      /**
       * @private Translates strings like "40deg" or "40" or 40rad" or "+=40deg" or "270_short" or "-90_cw" or "+=45_ccw" to a numeric radian angle. Of course a starting/default value must be fed in too so that relative values can be calculated properly.
       * @param {Object} v Value to be parsed
       * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
       * @param {string=} p property name for directionalEnd (optional - only used when the parsed value is directional ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation). Property name would be "rotation", "rotationX", or "rotationY"
       * @param {Object=} directionalEnd An object that will store the raw end values for directional angles ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation.
       * @return {number} parsed angle in radians
       */
      _parseAngle = function(v, d, p, directionalEnd) {
        var min = 0.000001,
          cap, split, dif, result, isRelative;
        if (v == null) {
          result = d;
        } else if (typeof(v) === "number") {
          result = v;
        } else {
          cap = 360;
          split = v.split("_");
          isRelative = (v.charAt(1) === "=");
          dif = (isRelative ? parseInt(v.charAt(0) + "1", 10) * parseFloat(split[0].substr(2)) : parseFloat(split[0])) * ((v.indexOf("rad") === -1) ? 1 : _RAD2DEG) - (isRelative ? 0 : d);
          if (split.length) {
            if (directionalEnd) {
              directionalEnd[p] = d + dif;
            }
            if (v.indexOf("short") !== -1) {
              dif = dif % cap;
              if (dif !== dif % (cap / 2)) {
                dif = (dif < 0) ? dif + cap : dif - cap;
              }
            }
            if (v.indexOf("_cw") !== -1 && dif < 0) {
              dif = ((dif + cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
            } else if (v.indexOf("ccw") !== -1 && dif > 0) {
              dif = ((dif - cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
            }
          }
          result = d + dif;
        }
        if (result < min && result > -min) {
          result = 0;
        }
        return result;
      },

      _colorLookup = {aqua:[0,255,255],
        lime:[0,255,0],
        silver:[192,192,192],
        black:[0,0,0],
        maroon:[128,0,0],
        teal:[0,128,128],
        blue:[0,0,255],
        navy:[0,0,128],
        white:[255,255,255],
        fuchsia:[255,0,255],
        olive:[128,128,0],
        yellow:[255,255,0],
        orange:[255,165,0],
        gray:[128,128,128],
        purple:[128,0,128],
        green:[0,128,0],
        red:[255,0,0],
        pink:[255,192,203],
        cyan:[0,255,255],
        transparent:[255,255,255,0]},

      _hue = function(h, m1, m2) {
        h = (h < 0) ? h + 1 : (h > 1) ? h - 1 : h;
        return ((((h * 6 < 1) ? m1 + (m2 - m1) * h * 6 : (h < 0.5) ? m2 : (h * 3 < 2) ? m1 + (m2 - m1) * (2 / 3 - h) * 6 : m1) * 255) + 0.5) | 0;
      },

      /**
       * @private Parses a color (like #9F0, #FF9900, rgb(255,51,153) or hsl(108, 50%, 10%)) into an array with 3 elements for red, green, and blue or if toHSL parameter is true, it will populate the array with hue, saturation, and lightness values. If a relative value is found in an hsl() or hsla() string, it will preserve those relative prefixes and all the values in the array will be strings instead of numbers (in all other cases it will be populated with numbers).
       * @param {(string|number)} v The value the should be parsed which could be a string like #9F0 or rgb(255,102,51) or rgba(255,0,0,0.5) or it could be a number like 0xFF00CC or even a named color like red, blue, purple, etc.
       * @param {(boolean)} toHSL If true, an hsl() or hsla() value will be returned instead of rgb() or rgba()
       * @return {Array.<number>} An array containing red, green, and blue (and optionally alpha) in that order, or if the toHSL parameter was true, the array will contain hue, saturation and lightness (and optionally alpha) in that order. Always numbers unless there's a relative prefix found in an hsl() or hsla() string and toHSL is true.
       */
      _parseColor = CSSPlugin.parseColor = function(v, toHSL) {
        var a, r, g, b, h, s, l, max, min, d, wasHSL;
        if (!v) {
          a = _colorLookup.black;
        } else if (typeof(v) === "number") {
          a = [v >> 16, (v >> 8) & 255, v & 255];
        } else {
          if (v.charAt(v.length - 1) === ",") { //sometimes a trailing comma is included and we should chop it off (typically from a comma-delimited list of values like a textShadow:"2px 2px 2px blue, 5px 5px 5px rgb(255,0,0)" - in this example "blue," has a trailing comma. We could strip it out inside parseComplex() but we'd need to do it to the beginning and ending values plus it wouldn't provide protection from other potential scenarios like if the user passes in a similar value.
            v = v.substr(0, v.length - 1);
          }
          if (_colorLookup[v]) {
            a = _colorLookup[v];
          } else if (v.charAt(0) === "#") {
            if (v.length === 4) { //for shorthand like #9F0
              r = v.charAt(1);
              g = v.charAt(2);
              b = v.charAt(3);
              v = "#" + r + r + g + g + b + b;
            }
            v = parseInt(v.substr(1), 16);
            a = [v >> 16, (v >> 8) & 255, v & 255];
          } else if (v.substr(0, 3) === "hsl") {
            a = wasHSL = v.match(_numExp);
            if (!toHSL) {
              h = (Number(a[0]) % 360) / 360;
              s = Number(a[1]) / 100;
              l = Number(a[2]) / 100;
              g = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
              r = l * 2 - g;
              if (a.length > 3) {
                a[3] = Number(v[3]);
              }
              a[0] = _hue(h + 1 / 3, r, g);
              a[1] = _hue(h, r, g);
              a[2] = _hue(h - 1 / 3, r, g);
            } else if (v.indexOf("=") !== -1) { //if relative values are found, just return the raw strings with the relative prefixes in place.
              return v.match(_relNumExp);
            }
          } else {
            a = v.match(_numExp) || _colorLookup.transparent;
          }
          a[0] = Number(a[0]);
          a[1] = Number(a[1]);
          a[2] = Number(a[2]);
          if (a.length > 3) {
            a[3] = Number(a[3]);
          }
        }
        if (toHSL && !wasHSL) {
          r = a[0] / 255;
          g = a[1] / 255;
          b = a[2] / 255;
          max = Math.max(r, g, b);
          min = Math.min(r, g, b);
          l = (max + min) / 2;
          if (max === min) {
            h = s = 0;
          } else {
            d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            h = (max === r) ? (g - b) / d + (g < b ? 6 : 0) : (max === g) ? (b - r) / d + 2 : (r - g) / d + 4;
            h *= 60;
          }
          a[0] = (h + 0.5) | 0;
          a[1] = (s * 100 + 0.5) | 0;
          a[2] = (l * 100 + 0.5) | 0;
        }
        return a;
      },
      _formatColors = function(s, toHSL) {
        var colors = s.match(_colorExp) || [],
          charIndex = 0,
          parsed = colors.length ? "" : s,
          i, color, temp;
        for (i = 0; i < colors.length; i++) {
          color = colors[i];
          temp = s.substr(charIndex, s.indexOf(color, charIndex)-charIndex);
          charIndex += temp.length + color.length;
          color = _parseColor(color, toHSL);
          if (color.length === 3) {
            color.push(1);
          }
          parsed += temp + (toHSL ? "hsla(" + color[0] + "," + color[1] + "%," + color[2] + "%," + color[3] : "rgba(" + color.join(",")) + ")";
        }
        return parsed;
      },
      _colorExp = "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3}){1,2}\\b"; //we'll dynamically build this Regular Expression to conserve file size. After building it, it will be able to find rgb(), rgba(), # (hexadecimal), and named color values like red, blue, purple, etc.

    for (p in _colorLookup) {
      _colorExp += "|" + p + "\\b";
    }
    _colorExp = new RegExp(_colorExp+")", "gi");

    CSSPlugin.colorStringFilter = function(a) {
      var combined = a[0] + a[1],
        toHSL;
      _colorExp.lastIndex = 0;
      if (_colorExp.test(combined)) {
        toHSL = (combined.indexOf("hsl(") !== -1 || combined.indexOf("hsla(") !== -1);
        a[0] = _formatColors(a[0], toHSL);
        a[1] = _formatColors(a[1], toHSL);
      }
    };

    if (!TweenLite.defaultStringFilter) {
      TweenLite.defaultStringFilter = CSSPlugin.colorStringFilter;
    }

    /**
     * @private Returns a formatter function that handles taking a string (or number in some cases) and returning a consistently formatted one in terms of delimiters, quantity of values, etc. For example, we may get boxShadow values defined as "0px red" or "0px 0px 10px rgb(255,0,0)" or "0px 0px 20px 20px #F00" and we need to ensure that what we get back is described with 4 numbers and a color. This allows us to feed it into the _parseComplex() method and split the values up appropriately. The neat thing about this _getFormatter() function is that the dflt defines a pattern as well as a default, so for example, _getFormatter("0px 0px 0px 0px #777", true) not only sets the default as 0px for all distances and #777 for the color, but also sets the pattern such that 4 numbers and a color will always get returned.
     * @param {!string} dflt The default value and pattern to follow. So "0px 0px 0px 0px #777" will ensure that 4 numbers and a color will always get returned.
     * @param {boolean=} clr If true, the values should be searched for color-related data. For example, boxShadow values typically contain a color whereas borderRadius don't.
     * @param {boolean=} collapsible If true, the value is a top/left/right/bottom style one that acts like margin or padding, where if only one value is received, it's used for all 4; if 2 are received, the first is duplicated for 3rd (bottom) and the 2nd is duplicated for the 4th spot (left), etc.
     * @return {Function} formatter function
     */
    var _getFormatter = function(dflt, clr, collapsible, multi) {
        if (dflt == null) {
          return function(v) {return v;};
        }
        var dColor = clr ? (dflt.match(_colorExp) || [""])[0] : "",
          dVals = dflt.split(dColor).join("").match(_valuesExp) || [],
          pfx = dflt.substr(0, dflt.indexOf(dVals[0])),
          sfx = (dflt.charAt(dflt.length - 1) === ")") ? ")" : "",
          delim = (dflt.indexOf(" ") !== -1) ? " " : ",",
          numVals = dVals.length,
          dSfx = (numVals > 0) ? dVals[0].replace(_numExp, "") : "",
          formatter;
        if (!numVals) {
          return function(v) {return v;};
        }
        if (clr) {
          formatter = function(v) {
            var color, vals, i, a;
            if (typeof(v) === "number") {
              v += dSfx;
            } else if (multi && _commasOutsideParenExp.test(v)) {
              a = v.replace(_commasOutsideParenExp, "|").split("|");
              for (i = 0; i < a.length; i++) {
                a[i] = formatter(a[i]);
              }
              return a.join(",");
            }
            color = (v.match(_colorExp) || [dColor])[0];
            vals = v.split(color).join("").match(_valuesExp) || [];
            i = vals.length;
            if (numVals > i--) {
              while (++i < numVals) {
                vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
              }
            }
            return pfx + vals.join(delim) + delim + color + sfx + (v.indexOf("inset") !== -1 ? " inset" : "");
          };
          return formatter;

        }
        formatter = function(v) {
          var vals, a, i;
          if (typeof(v) === "number") {
            v += dSfx;
          } else if (multi && _commasOutsideParenExp.test(v)) {
            a = v.replace(_commasOutsideParenExp, "|").split("|");
            for (i = 0; i < a.length; i++) {
              a[i] = formatter(a[i]);
            }
            return a.join(",");
          }
          vals = v.match(_valuesExp) || [];
          i = vals.length;
          if (numVals > i--) {
            while (++i < numVals) {
              vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
            }
          }
          return pfx + vals.join(delim) + sfx;
        };
        return formatter;
      },

      /**
       * @private returns a formatter function that's used for edge-related values like marginTop, marginLeft, paddingBottom, paddingRight, etc. Just pass a comma-delimited list of property names related to the edges.
       * @param {!string} props a comma-delimited list of property names in order from top to left, like "marginTop,marginRight,marginBottom,marginLeft"
       * @return {Function} a formatter function
       */
      _getEdgeParser = function(props) {
        props = props.split(",");
        return function(t, e, p, cssp, pt, plugin, vars) {
          var a = (e + "").split(" "),
            i;
          vars = {};
          for (i = 0; i < 4; i++) {
            vars[props[i]] = a[i] = a[i] || a[(((i - 1) / 2) >> 0)];
          }
          return cssp.parse(t, vars, pt, plugin);
        };
      },

      // @private used when other plugins must tween values first, like BezierPlugin or ThrowPropsPlugin, etc. That plugin's setRatio() gets called first so that the values are updated, and then we loop through the MiniPropTweens  which handle copying the values into their appropriate slots so that they can then be applied correctly in the main CSSPlugin setRatio() method. Remember, we typically create a proxy object that has a bunch of uniquely-named properties that we feed to the sub-plugin and it does its magic normally, and then we must interpret those values and apply them to the css because often numbers must get combined/concatenated, suffixes added, etc. to work with css, like boxShadow could have 4 values plus a color.
      _setPluginRatio = _internals._setPluginRatio = function(v) {
        this.plugin.setRatio(v);
        var d = this.data,
          proxy = d.proxy,
          mpt = d.firstMPT,
          min = 0.000001,
          val, pt, i, str, p;
        while (mpt) {
          val = proxy[mpt.v];
          if (mpt.r) {
            val = Math.round(val);
          } else if (val < min && val > -min) {
            val = 0;
          }
          mpt.t[mpt.p] = val;
          mpt = mpt._next;
        }
        if (d.autoRotate) {
          d.autoRotate.rotation = proxy.rotation;
        }
        //at the end, we must set the CSSPropTween's "e" (end) value dynamically here because that's what is used in the final setRatio() method. Same for "b" at the beginning.
        if (v === 1 || v === 0) {
          mpt = d.firstMPT;
          p = (v === 1) ? "e" : "b";
          while (mpt) {
            pt = mpt.t;
            if (!pt.type) {
              pt[p] = pt.s + pt.xs0;
            } else if (pt.type === 1) {
              str = pt.xs0 + pt.s + pt.xs1;
              for (i = 1; i < pt.l; i++) {
                str += pt["xn"+i] + pt["xs"+(i+1)];
              }
              pt[p] = str;
            }
            mpt = mpt._next;
          }
        }
      },

      /**
       * @private @constructor Used by a few SpecialProps to hold important values for proxies. For example, _parseToProxy() creates a MiniPropTween instance for each property that must get tweened on the proxy, and we record the original property name as well as the unique one we create for the proxy, plus whether or not the value needs to be rounded plus the original value.
       * @param {!Object} t target object whose property we're tweening (often a CSSPropTween)
       * @param {!string} p property name
       * @param {(number|string|object)} v value
       * @param {MiniPropTween=} next next MiniPropTween in the linked list
       * @param {boolean=} r if true, the tweened value should be rounded to the nearest integer
       */
      MiniPropTween = function(t, p, v, next, r) {
        this.t = t;
        this.p = p;
        this.v = v;
        this.r = r;
        if (next) {
          next._prev = this;
          this._next = next;
        }
      },

      /**
       * @private Most other plugins (like BezierPlugin and ThrowPropsPlugin and others) can only tween numeric values, but CSSPlugin must accommodate special values that have a bunch of extra data (like a suffix or strings between numeric values, etc.). For example, boxShadow has values like "10px 10px 20px 30px rgb(255,0,0)" which would utterly confuse other plugins. This method allows us to split that data apart and grab only the numeric data and attach it to uniquely-named properties of a generic proxy object ({}) so that we can feed that to virtually any plugin to have the numbers tweened. However, we must also keep track of which properties from the proxy go with which CSSPropTween values and instances. So we create a linked list of MiniPropTweens. Each one records a target (the original CSSPropTween), property (like "s" or "xn1" or "xn2") that we're tweening and the unique property name that was used for the proxy (like "boxShadow_xn1" and "boxShadow_xn2") and whether or not they need to be rounded. That way, in the _setPluginRatio() method we can simply copy the values over from the proxy to the CSSPropTween instance(s). Then, when the main CSSPlugin setRatio() method runs and applies the CSSPropTween values accordingly, they're updated nicely. So the external plugin tweens the numbers, _setPluginRatio() copies them over, and setRatio() acts normally, applying css-specific values to the element.
       * This method returns an object that has the following properties:
       *  - proxy: a generic object containing the starting values for all the properties that will be tweened by the external plugin.  This is what we feed to the external _onInitTween() as the target
       *  - end: a generic object containing the ending values for all the properties that will be tweened by the external plugin. This is what we feed to the external plugin's _onInitTween() as the destination values
       *  - firstMPT: the first MiniPropTween in the linked list
       *  - pt: the first CSSPropTween in the linked list that was created when parsing. If shallow is true, this linked list will NOT attach to the one passed into the _parseToProxy() as the "pt" (4th) parameter.
       * @param {!Object} t target object to be tweened
       * @param {!(Object|string)} vars the object containing the information about the tweening values (typically the end/destination values) that should be parsed
       * @param {!CSSPlugin} cssp The CSSPlugin instance
       * @param {CSSPropTween=} pt the next CSSPropTween in the linked list
       * @param {TweenPlugin=} plugin the external TweenPlugin instance that will be handling tweening the numeric values
       * @param {boolean=} shallow if true, the resulting linked list from the parse will NOT be attached to the CSSPropTween that was passed in as the "pt" (4th) parameter.
       * @return An object containing the following properties: proxy, end, firstMPT, and pt (see above for descriptions)
       */
      _parseToProxy = _internals._parseToProxy = function(t, vars, cssp, pt, plugin, shallow) {
        var bpt = pt,
          start = {},
          end = {},
          transform = cssp._transform,
          oldForce = _forcePT,
          i, p, xp, mpt, firstPT;
        cssp._transform = null;
        _forcePT = vars;
        pt = firstPT = cssp.parse(t, vars, pt, plugin);
        _forcePT = oldForce;
        //break off from the linked list so the new ones are isolated.
        if (shallow) {
          cssp._transform = transform;
          if (bpt) {
            bpt._prev = null;
            if (bpt._prev) {
              bpt._prev._next = null;
            }
          }
        }
        while (pt && pt !== bpt) {
          if (pt.type <= 1) {
            p = pt.p;
            end[p] = pt.s + pt.c;
            start[p] = pt.s;
            if (!shallow) {
              mpt = new MiniPropTween(pt, "s", p, mpt, pt.r);
              pt.c = 0;
            }
            if (pt.type === 1) {
              i = pt.l;
              while (--i > 0) {
                xp = "xn" + i;
                p = pt.p + "_" + xp;
                end[p] = pt.data[xp];
                start[p] = pt[xp];
                if (!shallow) {
                  mpt = new MiniPropTween(pt, xp, p, mpt, pt.rxp[xp]);
                }
              }
            }
          }
          pt = pt._next;
        }
        return {proxy:start, end:end, firstMPT:mpt, pt:firstPT};
      },



      /**
       * @constructor Each property that is tweened has at least one CSSPropTween associated with it. These instances store important information like the target, property, starting value, amount of change, etc. They can also optionally have a number of "extra" strings and numeric values named xs1, xn1, xs2, xn2, xs3, xn3, etc. where "s" indicates string and "n" indicates number. These can be pieced together in a complex-value tween (type:1) that has alternating types of data like a string, number, string, number, etc. For example, boxShadow could be "5px 5px 8px rgb(102, 102, 51)". In that value, there are 6 numbers that may need to tween and then pieced back together into a string again with spaces, suffixes, etc. xs0 is special in that it stores the suffix for standard (type:0) tweens, -OR- the first string (prefix) in a complex-value (type:1) CSSPropTween -OR- it can be the non-tweening value in a type:-1 CSSPropTween. We do this to conserve memory.
       * CSSPropTweens have the following optional properties as well (not defined through the constructor):
       *  - l: Length in terms of the number of extra properties that the CSSPropTween has (default: 0). For example, for a boxShadow we may need to tween 5 numbers in which case l would be 5; Keep in mind that the start/end values for the first number that's tweened are always stored in the s and c properties to conserve memory. All additional values thereafter are stored in xn1, xn2, etc.
       *  - xfirst: The first instance of any sub-CSSPropTweens that are tweening properties of this instance. For example, we may split up a boxShadow tween so that there's a main CSSPropTween of type:1 that has various xs* and xn* values associated with the h-shadow, v-shadow, blur, color, etc. Then we spawn a CSSPropTween for each of those that has a higher priority and runs BEFORE the main CSSPropTween so that the values are all set by the time it needs to re-assemble them. The xfirst gives us an easy way to identify the first one in that chain which typically ends at the main one (because they're all prepende to the linked list)
       *  - plugin: The TweenPlugin instance that will handle the tweening of any complex values. For example, sometimes we don't want to use normal subtweens (like xfirst refers to) to tween the values - we might want ThrowPropsPlugin or BezierPlugin some other plugin to do the actual tweening, so we create a plugin instance and store a reference here. We need this reference so that if we get a request to round values or disable a tween, we can pass along that request.
       *  - data: Arbitrary data that needs to be stored with the CSSPropTween. Typically if we're going to have a plugin handle the tweening of a complex-value tween, we create a generic object that stores the END values that we're tweening to and the CSSPropTween's xs1, xs2, etc. have the starting values. We store that object as data. That way, we can simply pass that object to the plugin and use the CSSPropTween as the target.
       *  - setRatio: Only used for type:2 tweens that require custom functionality. In this case, we call the CSSPropTween's setRatio() method and pass the ratio each time the tween updates. This isn't quite as efficient as doing things directly in the CSSPlugin's setRatio() method, but it's very convenient and flexible.
       * @param {!Object} t Target object whose property will be tweened. Often a DOM element, but not always. It could be anything.
       * @param {string} p Property to tween (name). For example, to tween element.width, p would be "width".
       * @param {number} s Starting numeric value
       * @param {number} c Change in numeric value over the course of the entire tween. For example, if element.width starts at 5 and should end at 100, c would be 95.
       * @param {CSSPropTween=} next The next CSSPropTween in the linked list. If one is defined, we will define its _prev as the new instance, and the new instance's _next will be pointed at it.
       * @param {number=} type The type of CSSPropTween where -1 = a non-tweening value, 0 = a standard simple tween, 1 = a complex value (like one that has multiple numbers in a comma- or space-delimited string like border:"1px solid red"), and 2 = one that uses a custom setRatio function that does all of the work of applying the values on each update.
       * @param {string=} n Name of the property that should be used for overwriting purposes which is typically the same as p but not always. For example, we may need to create a subtween for the 2nd part of a "clip:rect(...)" tween in which case "p" might be xs1 but "n" is still "clip"
       * @param {boolean=} r If true, the value(s) should be rounded
       * @param {number=} pr Priority in the linked list order. Higher priority CSSPropTweens will be updated before lower priority ones. The default priority is 0.
       * @param {string=} b Beginning value. We store this to ensure that it is EXACTLY what it was when the tween began without any risk of interpretation issues.
       * @param {string=} e Ending value. We store this to ensure that it is EXACTLY what the user defined at the end of the tween without any risk of interpretation issues.
       */
      CSSPropTween = _internals.CSSPropTween = function(t, p, s, c, next, type, n, r, pr, b, e) {
        this.t = t; //target
        this.p = p; //property
        this.s = s; //starting value
        this.c = c; //change value
        this.n = n || p; //name that this CSSPropTween should be associated to (usually the same as p, but not always - n is what overwriting looks at)
        if (!(t instanceof CSSPropTween)) {
          _overwriteProps.push(this.n);
        }
        this.r = r; //round (boolean)
        this.type = type || 0; //0 = normal tween, -1 = non-tweening (in which case xs0 will be applied to the target's property, like tp.t[tp.p] = tp.xs0), 1 = complex-value SpecialProp, 2 = custom setRatio() that does all the work
        if (pr) {
          this.pr = pr;
          _hasPriority = true;
        }
        this.b = (b === undefined) ? s : b;
        this.e = (e === undefined) ? s + c : e;
        if (next) {
          this._next = next;
          next._prev = this;
        }
      },

      _addNonTweeningNumericPT = function(target, prop, start, end, next, overwriteProp) { //cleans up some code redundancies and helps minification. Just a fast way to add a NUMERIC non-tweening CSSPropTween
        var pt = new CSSPropTween(target, prop, start, end - start, next, -1, overwriteProp);
        pt.b = start;
        pt.e = pt.xs0 = end;
        return pt;
      },

      /**
       * Takes a target, the beginning value and ending value (as strings) and parses them into a CSSPropTween (possibly with child CSSPropTweens) that accommodates multiple numbers, colors, comma-delimited values, etc. For example:
       * sp.parseComplex(element, "boxShadow", "5px 10px 20px rgb(255,102,51)", "0px 0px 0px red", true, "0px 0px 0px rgb(0,0,0,0)", pt);
       * It will walk through the beginning and ending values (which should be in the same format with the same number and type of values) and figure out which parts are numbers, what strings separate the numeric/tweenable values, and then create the CSSPropTweens accordingly. If a plugin is defined, no child CSSPropTweens will be created. Instead, the ending values will be stored in the "data" property of the returned CSSPropTween like: {s:-5, xn1:-10, xn2:-20, xn3:255, xn4:0, xn5:0} so that it can be fed to any other plugin and it'll be plain numeric tweens but the recomposition of the complex value will be handled inside CSSPlugin's setRatio().
       * If a setRatio is defined, the type of the CSSPropTween will be set to 2 and recomposition of the values will be the responsibility of that method.
       *
       * @param {!Object} t Target whose property will be tweened
       * @param {!string} p Property that will be tweened (its name, like "left" or "backgroundColor" or "boxShadow")
       * @param {string} b Beginning value
       * @param {string} e Ending value
       * @param {boolean} clrs If true, the value could contain a color value like "rgb(255,0,0)" or "#F00" or "red". The default is false, so no colors will be recognized (a performance optimization)
       * @param {(string|number|Object)} dflt The default beginning value that should be used if no valid beginning value is defined or if the number of values inside the complex beginning and ending values don't match
       * @param {?CSSPropTween} pt CSSPropTween instance that is the current head of the linked list (we'll prepend to this).
       * @param {number=} pr Priority in the linked list order. Higher priority properties will be updated before lower priority ones. The default priority is 0.
       * @param {TweenPlugin=} plugin If a plugin should handle the tweening of extra properties, pass the plugin instance here. If one is defined, then NO subtweens will be created for any extra properties (the properties will be created - just not additional CSSPropTween instances to tween them) because the plugin is expected to do so. However, the end values WILL be populated in the "data" property, like {s:100, xn1:50, xn2:300}
       * @param {function(number)=} setRatio If values should be set in a custom function instead of being pieced together in a type:1 (complex-value) CSSPropTween, define that custom function here.
       * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parseComplex() call.
       */
      _parseComplex = CSSPlugin.parseComplex = function(t, p, b, e, clrs, dflt, pt, pr, plugin, setRatio) {
        //DEBUG: _log("parseComplex: "+p+", b: "+b+", e: "+e);
        b = b || dflt || "";
        pt = new CSSPropTween(t, p, 0, 0, pt, (setRatio ? 2 : 1), null, false, pr, b, e);
        e += ""; //ensures it's a string
        var ba = b.split(", ").join(",").split(" "), //beginning array
          ea = e.split(", ").join(",").split(" "), //ending array
          l = ba.length,
          autoRound = (_autoRound !== false),
          i, xi, ni, bv, ev, bnums, enums, bn, hasAlpha, temp, cv, str, useHSL;
        if (e.indexOf(",") !== -1 || b.indexOf(",") !== -1) {
          ba = ba.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
          ea = ea.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
          l = ba.length;
        }
        if (l !== ea.length) {
          //DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
          ba = (dflt || "").split(" ");
          l = ba.length;
        }
        pt.plugin = plugin;
        pt.setRatio = setRatio;
        _colorExp.lastIndex = 0;
        for (i = 0; i < l; i++) {
          bv = ba[i];
          ev = ea[i];
          bn = parseFloat(bv);
          //if the value begins with a number (most common). It's fine if it has a suffix like px
          if (bn || bn === 0) {
            pt.appendXtra("", bn, _parseChange(ev, bn), ev.replace(_relNumExp, ""), (autoRound && ev.indexOf("px") !== -1), true);

          //if the value is a color
          } else if (clrs && _colorExp.test(bv)) {
            str = ev.charAt(ev.length - 1) === "," ? ")," : ")"; //if there's a comma at the end, retain it.
            useHSL = (ev.indexOf("hsl") !== -1 && _supportsOpacity);
            bv = _parseColor(bv, useHSL);
            ev = _parseColor(ev, useHSL);
            hasAlpha = (bv.length + ev.length > 6);
            if (hasAlpha && !_supportsOpacity && ev[3] === 0) { //older versions of IE don't support rgba(), so if the destination alpha is 0, just use "transparent" for the end color
              pt["xs" + pt.l] += pt.l ? " transparent" : "transparent";
              pt.e = pt.e.split(ea[i]).join("transparent");
            } else {
              if (!_supportsOpacity) { //old versions of IE don't support rgba().
                hasAlpha = false;
              }
              if (useHSL) {
                pt.appendXtra((hasAlpha ? "hsla(" : "hsl("), bv[0], _parseChange(ev[0], bv[0]), ",", false, true)
                  .appendXtra("", bv[1], _parseChange(ev[1], bv[1]), "%,", false)
                  .appendXtra("", bv[2], _parseChange(ev[2], bv[2]), (hasAlpha ? "%," : "%" + str), false);
              } else {
                pt.appendXtra((hasAlpha ? "rgba(" : "rgb("), bv[0], ev[0] - bv[0], ",", true, true)
                  .appendXtra("", bv[1], ev[1] - bv[1], ",", true)
                  .appendXtra("", bv[2], ev[2] - bv[2], (hasAlpha ? "," : str), true);
              }

              if (hasAlpha) {
                bv = (bv.length < 4) ? 1 : bv[3];
                pt.appendXtra("", bv, ((ev.length < 4) ? 1 : ev[3]) - bv, str, false);
              }
            }
            _colorExp.lastIndex = 0; //otherwise the test() on the RegExp could move the lastIndex and taint future results.

          } else {
            bnums = bv.match(_numExp); //gets each group of numbers in the beginning value string and drops them into an array

            //if no number is found, treat it as a non-tweening value and just append the string to the current xs.
            if (!bnums) {
              pt["xs" + pt.l] += pt.l ? " " + ev : ev;

            //loop through all the numbers that are found and construct the extra values on the pt.
            } else {
              enums = ev.match(_relNumExp); //get each group of numbers in the end value string and drop them into an array. We allow relative values too, like +=50 or -=.5
              if (!enums || enums.length !== bnums.length) {
                //DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
                return pt;
              }
              ni = 0;
              for (xi = 0; xi < bnums.length; xi++) {
                cv = bnums[xi];
                temp = bv.indexOf(cv, ni);
                pt.appendXtra(bv.substr(ni, temp - ni), Number(cv), _parseChange(enums[xi], cv), "", (autoRound && bv.substr(temp + cv.length, 2) === "px"), (xi === 0));
                ni = temp + cv.length;
              }
              pt["xs" + pt.l] += bv.substr(ni);
            }
          }
        }
        //if there are relative values ("+=" or "-=" prefix), we need to adjust the ending value to eliminate the prefixes and combine the values properly.
        if (e.indexOf("=") !== -1) if (pt.data) {
          str = pt.xs0 + pt.data.s;
          for (i = 1; i < pt.l; i++) {
            str += pt["xs" + i] + pt.data["xn" + i];
          }
          pt.e = str + pt["xs" + i];
        }
        if (!pt.l) {
          pt.type = -1;
          pt.xs0 = pt.e;
        }
        return pt.xfirst || pt;
      },
      i = 9;


    p = CSSPropTween.prototype;
    p.l = p.pr = 0; //length (number of extra properties like xn1, xn2, xn3, etc.
    while (--i > 0) {
      p["xn" + i] = 0;
      p["xs" + i] = "";
    }
    p.xs0 = "";
    p._next = p._prev = p.xfirst = p.data = p.plugin = p.setRatio = p.rxp = null;


    /**
     * Appends and extra tweening value to a CSSPropTween and automatically manages any prefix and suffix strings. The first extra value is stored in the s and c of the main CSSPropTween instance, but thereafter any extras are stored in the xn1, xn2, xn3, etc. The prefixes and suffixes are stored in the xs0, xs1, xs2, etc. properties. For example, if I walk through a clip value like "rect(10px, 5px, 0px, 20px)", the values would be stored like this:
     * xs0:"rect(", s:10, xs1:"px, ", xn1:5, xs2:"px, ", xn2:0, xs3:"px, ", xn3:20, xn4:"px)"
     * And they'd all get joined together when the CSSPlugin renders (in the setRatio() method).
     * @param {string=} pfx Prefix (if any)
     * @param {!number} s Starting value
     * @param {!number} c Change in numeric value over the course of the entire tween. For example, if the start is 5 and the end is 100, the change would be 95.
     * @param {string=} sfx Suffix (if any)
     * @param {boolean=} r Round (if true).
     * @param {boolean=} pad If true, this extra value should be separated by the previous one by a space. If there is no previous extra and pad is true, it will automatically drop the space.
     * @return {CSSPropTween} returns itself so that multiple methods can be chained together.
     */
    p.appendXtra = function(pfx, s, c, sfx, r, pad) {
      var pt = this,
        l = pt.l;
      pt["xs" + l] += (pad && l) ? " " + pfx : pfx || "";
      if (!c) if (l !== 0 && !pt.plugin) { //typically we'll combine non-changing values right into the xs to optimize performance, but we don't combine them when there's a plugin that will be tweening the values because it may depend on the values being split apart, like for a bezier, if a value doesn't change between the first and second iteration but then it does on the 3rd, we'll run into trouble because there's no xn slot for that value!
        pt["xs" + l] += s + (sfx || "");
        return pt;
      }
      pt.l++;
      pt.type = pt.setRatio ? 2 : 1;
      pt["xs" + pt.l] = sfx || "";
      if (l > 0) {
        pt.data["xn" + l] = s + c;
        pt.rxp["xn" + l] = r; //round extra property (we need to tap into this in the _parseToProxy() method)
        pt["xn" + l] = s;
        if (!pt.plugin) {
          pt.xfirst = new CSSPropTween(pt, "xn" + l, s, c, pt.xfirst || pt, 0, pt.n, r, pt.pr);
          pt.xfirst.xs0 = 0; //just to ensure that the property stays numeric which helps modern browsers speed up processing. Remember, in the setRatio() method, we do pt.t[pt.p] = val + pt.xs0 so if pt.xs0 is "" (the default), it'll cast the end value as a string. When a property is a number sometimes and a string sometimes, it prevents the compiler from locking in the data type, slowing things down slightly.
        }
        return pt;
      }
      pt.data = {s:s + c};
      pt.rxp = {};
      pt.s = s;
      pt.c = c;
      pt.r = r;
      return pt;
    };

    /**
     * @constructor A SpecialProp is basically a css property that needs to be treated in a non-standard way, like if it may contain a complex value like boxShadow:"5px 10px 15px rgb(255, 102, 51)" or if it is associated with another plugin like ThrowPropsPlugin or BezierPlugin. Every SpecialProp is associated with a particular property name like "boxShadow" or "throwProps" or "bezier" and it will intercept those values in the vars object that's passed to the CSSPlugin and handle them accordingly.
     * @param {!string} p Property name (like "boxShadow" or "throwProps")
     * @param {Object=} options An object containing any of the following configuration options:
     *                      - defaultValue: the default value
     *                      - parser: A function that should be called when the associated property name is found in the vars. This function should return a CSSPropTween instance and it should ensure that it is properly inserted into the linked list. It will receive 4 paramters: 1) The target, 2) The value defined in the vars, 3) The CSSPlugin instance (whose _firstPT should be used for the linked list), and 4) A computed style object if one was calculated (this is a speed optimization that allows retrieval of starting values quicker)
     *                      - formatter: a function that formats any value received for this special property (for example, boxShadow could take "5px 5px red" and format it to "5px 5px 0px 0px red" so that both the beginning and ending values have a common order and quantity of values.)
     *                      - prefix: if true, we'll determine whether or not this property requires a vendor prefix (like Webkit or Moz or ms or O)
     *                      - color: set this to true if the value for this SpecialProp may contain color-related values like rgb(), rgba(), etc.
     *                      - priority: priority in the linked list order. Higher priority SpecialProps will be updated before lower priority ones. The default priority is 0.
     *                      - multi: if true, the formatter should accommodate a comma-delimited list of values, like boxShadow could have multiple boxShadows listed out.
     *                      - collapsible: if true, the formatter should treat the value like it's a top/right/bottom/left value that could be collapsed, like "5px" would apply to all, "5px, 10px" would use 5px for top/bottom and 10px for right/left, etc.
     *                      - keyword: a special keyword that can [optionally] be found inside the value (like "inset" for boxShadow). This allows us to validate beginning/ending values to make sure they match (if the keyword is found in one, it'll be added to the other for consistency by default).
     */
    var SpecialProp = function(p, options) {
        options = options || {};
        this.p = options.prefix ? _checkPropPrefix(p) || p : p;
        _specialProps[p] = _specialProps[this.p] = this;
        this.format = options.formatter || _getFormatter(options.defaultValue, options.color, options.collapsible, options.multi);
        if (options.parser) {
          this.parse = options.parser;
        }
        this.clrs = options.color;
        this.multi = options.multi;
        this.keyword = options.keyword;
        this.dflt = options.defaultValue;
        this.pr = options.priority || 0;
      },

      //shortcut for creating a new SpecialProp that can accept multiple properties as a comma-delimited list (helps minification). dflt can be an array for multiple values (we don't do a comma-delimited list because the default value may contain commas, like rect(0px,0px,0px,0px)). We attach this method to the SpecialProp class/object instead of using a private _createSpecialProp() method so that we can tap into it externally if necessary, like from another plugin.
      _registerComplexSpecialProp = _internals._registerComplexSpecialProp = function(p, options, defaults) {
        if (typeof(options) !== "object") {
          options = {parser:defaults}; //to make backwards compatible with older versions of BezierPlugin and ThrowPropsPlugin
        }
        var a = p.split(","),
          d = options.defaultValue,
          i, temp;
        defaults = defaults || [d];
        for (i = 0; i < a.length; i++) {
          options.prefix = (i === 0 && options.prefix);
          options.defaultValue = defaults[i] || d;
          temp = new SpecialProp(a[i], options);
        }
      },

      //creates a placeholder special prop for a plugin so that the property gets caught the first time a tween of it is attempted, and at that time it makes the plugin register itself, thus taking over for all future tweens of that property. This allows us to not mandate that things load in a particular order and it also allows us to log() an error that informs the user when they attempt to tween an external plugin-related property without loading its .js file.
      _registerPluginProp = function(p) {
        if (!_specialProps[p]) {
          var pluginName = p.charAt(0).toUpperCase() + p.substr(1) + "Plugin";
          _registerComplexSpecialProp(p, {parser:function(t, e, p, cssp, pt, plugin, vars) {
            var pluginClass = _globals.com.greensock.plugins[pluginName];
            if (!pluginClass) {
              _log("Error: " + pluginName + " js file not loaded.");
              return pt;
            }
            pluginClass._cssRegister();
            return _specialProps[p].parse(t, e, p, cssp, pt, plugin, vars);
          }});
        }
      };


    p = SpecialProp.prototype;

    /**
     * Alias for _parseComplex() that automatically plugs in certain values for this SpecialProp, like its property name, whether or not colors should be sensed, the default value, and priority. It also looks for any keyword that the SpecialProp defines (like "inset" for boxShadow) and ensures that the beginning and ending values have the same number of values for SpecialProps where multi is true (like boxShadow and textShadow can have a comma-delimited list)
     * @param {!Object} t target element
     * @param {(string|number|object)} b beginning value
     * @param {(string|number|object)} e ending (destination) value
     * @param {CSSPropTween=} pt next CSSPropTween in the linked list
     * @param {TweenPlugin=} plugin If another plugin will be tweening the complex value, that TweenPlugin instance goes here.
     * @param {function=} setRatio If a custom setRatio() method should be used to handle this complex value, that goes here.
     * @return {CSSPropTween=} First CSSPropTween in the linked list
     */
    p.parseComplex = function(t, b, e, pt, plugin, setRatio) {
      var kwd = this.keyword,
        i, ba, ea, l, bi, ei;
      //if this SpecialProp's value can contain a comma-delimited list of values (like boxShadow or textShadow), we must parse them in a special way, and look for a keyword (like "inset" for boxShadow) and ensure that the beginning and ending BOTH have it if the end defines it as such. We also must ensure that there are an equal number of values specified (we can't tween 1 boxShadow to 3 for example)
      if (this.multi) if (_commasOutsideParenExp.test(e) || _commasOutsideParenExp.test(b)) {
        ba = b.replace(_commasOutsideParenExp, "|").split("|");
        ea = e.replace(_commasOutsideParenExp, "|").split("|");
      } else if (kwd) {
        ba = [b];
        ea = [e];
      }
      if (ea) {
        l = (ea.length > ba.length) ? ea.length : ba.length;
        for (i = 0; i < l; i++) {
          b = ba[i] = ba[i] || this.dflt;
          e = ea[i] = ea[i] || this.dflt;
          if (kwd) {
            bi = b.indexOf(kwd);
            ei = e.indexOf(kwd);
            if (bi !== ei) {
              if (ei === -1) { //if the keyword isn't in the end value, remove it from the beginning one.
                ba[i] = ba[i].split(kwd).join("");
              } else if (bi === -1) { //if the keyword isn't in the beginning, add it.
                ba[i] += " " + kwd;
              }
            }
          }
        }
        b = ba.join(", ");
        e = ea.join(", ");
      }
      return _parseComplex(t, this.p, b, e, this.clrs, this.dflt, pt, this.pr, plugin, setRatio);
    };

    /**
     * Accepts a target and end value and spits back a CSSPropTween that has been inserted into the CSSPlugin's linked list and conforms with all the conventions we use internally, like type:-1, 0, 1, or 2, setting up any extra property tweens, priority, etc. For example, if we have a boxShadow SpecialProp and call:
     * this._firstPT = sp.parse(element, "5px 10px 20px rgb(2550,102,51)", "boxShadow", this);
     * It should figure out the starting value of the element's boxShadow, compare it to the provided end value and create all the necessary CSSPropTweens of the appropriate types to tween the boxShadow. The CSSPropTween that gets spit back should already be inserted into the linked list (the 4th parameter is the current head, so prepend to that).
     * @param {!Object} t Target object whose property is being tweened
     * @param {Object} e End value as provided in the vars object (typically a string, but not always - like a throwProps would be an object).
     * @param {!string} p Property name
     * @param {!CSSPlugin} cssp The CSSPlugin instance that should be associated with this tween.
     * @param {?CSSPropTween} pt The CSSPropTween that is the current head of the linked list (we'll prepend to it)
     * @param {TweenPlugin=} plugin If a plugin will be used to tween the parsed value, this is the plugin instance.
     * @param {Object=} vars Original vars object that contains the data for parsing.
     * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parse() call.
     */
    p.parse = function(t, e, p, cssp, pt, plugin, vars) {
      return this.parseComplex(t.style, this.format(_getStyle(t, this.p, _cs, false, this.dflt)), this.format(e), pt, plugin);
    };

    /**
     * Registers a special property that should be intercepted from any "css" objects defined in tweens. This allows you to handle them however you want without CSSPlugin doing it for you. The 2nd parameter should be a function that accepts 3 parameters:
     *  1) Target object whose property should be tweened (typically a DOM element)
     *  2) The end/destination value (could be a string, number, object, or whatever you want)
     *  3) The tween instance (you probably don't need to worry about this, but it can be useful for looking up information like the duration)
     *
     * Then, your function should return a function which will be called each time the tween gets rendered, passing a numeric "ratio" parameter to your function that indicates the change factor (usually between 0 and 1). For example:
     *
     * CSSPlugin.registerSpecialProp("myCustomProp", function(target, value, tween) {
     *      var start = target.style.width;
     *      return function(ratio) {
     *              target.style.width = (start + value * ratio) + "px";
     *              console.log("set width to " + target.style.width);
     *          }
     * }, 0);
     *
     * Then, when I do this tween, it will trigger my special property:
     *
     * TweenLite.to(element, 1, {css:{myCustomProp:100}});
     *
     * In the example, of course, we're just changing the width, but you can do anything you want.
     *
     * @param {!string} name Property name (or comma-delimited list of property names) that should be intercepted and handled by your function. For example, if I define "myCustomProp", then it would handle that portion of the following tween: TweenLite.to(element, 1, {css:{myCustomProp:100}})
     * @param {!function(Object, Object, Object, string):function(number)} onInitTween The function that will be called when a tween of this special property is performed. The function will receive 4 parameters: 1) Target object that should be tweened, 2) Value that was passed to the tween, 3) The tween instance itself (rarely used), and 4) The property name that's being tweened. Your function should return a function that should be called on every update of the tween. That function will receive a single parameter that is a "change factor" value (typically between 0 and 1) indicating the amount of change as a ratio. You can use this to determine how to set the values appropriately in your function.
     * @param {number=} priority Priority that helps the engine determine the order in which to set the properties (default: 0). Higher priority properties will be updated before lower priority ones.
     */
    CSSPlugin.registerSpecialProp = function(name, onInitTween, priority) {
      _registerComplexSpecialProp(name, {parser:function(t, e, p, cssp, pt, plugin, vars) {
        var rv = new CSSPropTween(t, p, 0, 0, pt, 2, p, false, priority);
        rv.plugin = plugin;
        rv.setRatio = onInitTween(t, e, cssp._tween, p);
        return rv;
      }, priority:priority});
    };






    //transform-related methods and properties
    CSSPlugin.useSVGTransformAttr = _isSafari || _isFirefox; //Safari and Firefox both have some rendering bugs when applying CSS transforms to SVG elements, so default to using the "transform" attribute instead (users can override this).
    var _transformProps = ("scaleX,scaleY,scaleZ,x,y,z,skewX,skewY,rotation,rotationX,rotationY,perspective,xPercent,yPercent").split(","),
      _transformProp = _checkPropPrefix("transform"), //the Javascript (camelCase) transform property, like msTransform, WebkitTransform, MozTransform, or OTransform.
      _transformPropCSS = _prefixCSS + "transform",
      _transformOriginProp = _checkPropPrefix("transformOrigin"),
      _supports3D = (_checkPropPrefix("perspective") !== null),
      Transform = _internals.Transform = function() {
        this.perspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0;
        this.force3D = (CSSPlugin.defaultForce3D === false || !_supports3D) ? false : CSSPlugin.defaultForce3D || "auto";
      },
      _SVGElement = window.SVGElement,
      _useSVGTransformAttr,
      //Some browsers (like Firefox and IE) don't honor transform-origin properly in SVG elements, so we need to manually adjust the matrix accordingly. We feature detect here rather than always doing the conversion for certain browsers because they may fix the problem at some point in the future.

      _createSVG = function(type, container, attributes) {
        var element = _doc.createElementNS("http://www.w3.org/2000/svg", type),
          reg = /([a-z])([A-Z])/g,
          p;
        for (p in attributes) {
          element.setAttributeNS(null, p.replace(reg, "$1-$2").toLowerCase(), attributes[p]);
        }
        container.appendChild(element);
        return element;
      },
      _docElement = _doc.documentElement,
      _forceSVGTransformAttr = (function() {
        //IE and Android stock don't support CSS transforms on SVG elements, so we must write them to the "transform" attribute. We populate this variable in the _parseTransform() method, and only if/when we come across an SVG element
        var force = _ieVers || (/Android/i.test(_agent) && !window.chrome),
          svg, rect, width;
        if (_doc.createElementNS && !force) { //IE8 and earlier doesn't support SVG anyway
          svg = _createSVG("svg", _docElement);
          rect = _createSVG("rect", svg, {width:100, height:50, x:100});
          width = rect.getBoundingClientRect().width;
          rect.style[_transformOriginProp] = "50% 50%";
          rect.style[_transformProp] = "scaleX(0.5)";
          force = (width === rect.getBoundingClientRect().width && !(_isFirefox && _supports3D)); //note: Firefox fails the test even though it does support CSS transforms in 3D. Since we can't push 3D stuff into the transform attribute, we force Firefox to pass the test here (as long as it does truly support 3D).
          _docElement.removeChild(svg);
        }
        return force;
      })(),
      _parseSVGOrigin = function(e, local, decoratee, absolute, smoothOrigin) {
        var tm = e._gsTransform,
          m = _getMatrix(e, true),
          v, x, y, xOrigin, yOrigin, a, b, c, d, tx, ty, determinant, xOriginOld, yOriginOld;
        if (tm) {
          xOriginOld = tm.xOrigin; //record the original values before we alter them.
          yOriginOld = tm.yOrigin;
        }
        if (!absolute || (v = absolute.split(" ")).length < 2) {
          b = e.getBBox();
          local = _parsePosition(local).split(" ");
          v = [(local[0].indexOf("%") !== -1 ? parseFloat(local[0]) / 100 * b.width : parseFloat(local[0])) + b.x,
             (local[1].indexOf("%") !== -1 ? parseFloat(local[1]) / 100 * b.height : parseFloat(local[1])) + b.y];
        }
        decoratee.xOrigin = xOrigin = parseFloat(v[0]);
        decoratee.yOrigin = yOrigin = parseFloat(v[1]);
        if (absolute && m !== _identity2DMatrix) { //if svgOrigin is being set, we must invert the matrix and determine where the absolute point is, factoring in the current transforms. Otherwise, the svgOrigin would be based on the element's non-transformed position on the canvas.
          a = m[0];
          b = m[1];
          c = m[2];
          d = m[3];
          tx = m[4];
          ty = m[5];
          determinant = (a * d - b * c);
          x = xOrigin * (d / determinant) + yOrigin * (-c / determinant) + ((c * ty - d * tx) / determinant);
          y = xOrigin * (-b / determinant) + yOrigin * (a / determinant) - ((a * ty - b * tx) / determinant);
          xOrigin = decoratee.xOrigin = v[0] = x;
          yOrigin = decoratee.yOrigin = v[1] = y;
        }
        if (tm) { //avoid jump when transformOrigin is changed - adjust the x/y values accordingly
          if (smoothOrigin || (smoothOrigin !== false && CSSPlugin.defaultSmoothOrigin !== false)) {
            x = xOrigin - xOriginOld;
            y = yOrigin - yOriginOld;
            //originally, we simply adjusted the x and y values, but that would cause problems if, for example, you created a rotational tween part-way through an x/y tween. Managing the offset in a separate variable gives us ultimate flexibility.
            //tm.x -= x - (x * m[0] + y * m[2]);
            //tm.y -= y - (x * m[1] + y * m[3]);
            tm.xOffset += (x * m[0] + y * m[2]) - x;
            tm.yOffset += (x * m[1] + y * m[3]) - y;
          } else {
            tm.xOffset = tm.yOffset = 0;
          }
        }
        e.setAttribute("data-svg-origin", v.join(" "));
      },
      _isSVG = function(e) {
        return !!(_SVGElement && typeof(e.getBBox) === "function" && e.getCTM && (!e.parentNode || (e.parentNode.getBBox && e.parentNode.getCTM)));
      },
      _identity2DMatrix = [1,0,0,1,0,0],
      _getMatrix = function(e, force2D) {
        var tm = e._gsTransform || new Transform(),
          rnd = 100000,
          isDefault, s, m, n, dec;
        if (_transformProp) {
          s = _getStyle(e, _transformPropCSS, null, true);
        } else if (e.currentStyle) {
          //for older versions of IE, we need to interpret the filter portion that is in the format: progid:DXImageTransform.Microsoft.Matrix(M11=6.123233995736766e-17, M12=-1, M21=1, M22=6.123233995736766e-17, sizingMethod='auto expand') Notice that we need to swap b and c compared to a normal matrix.
          s = e.currentStyle.filter.match(_ieGetMatrixExp);
          s = (s && s.length === 4) ? [s[0].substr(4), Number(s[2].substr(4)), Number(s[1].substr(4)), s[3].substr(4), (tm.x || 0), (tm.y || 0)].join(",") : "";
        }
        isDefault = (!s || s === "none" || s === "matrix(1, 0, 0, 1, 0, 0)");
        if (tm.svg || (e.getBBox && _isSVG(e))) {
          if (isDefault && (e.style[_transformProp] + "").indexOf("matrix") !== -1) { //some browsers (like Chrome 40) don't correctly report transforms that are applied inline on an SVG element (they don't get included in the computed style), so we double-check here and accept matrix values
            s = e.style[_transformProp];
            isDefault = 0;
          }
          m = e.getAttribute("transform");
          if (isDefault && m) {
            if (m.indexOf("matrix") !== -1) { //just in case there's a "transform" value specified as an attribute instead of CSS style. Accept either a matrix() or simple translate() value though.
              s = m;
              isDefault = 0;
            } else if (m.indexOf("translate") !== -1) {
              s = "matrix(1,0,0,1," + m.match(/(?:\-|\b)[\d\-\.e]+\b/gi).join(",") + ")";
              isDefault = 0;
            }
          }
        }
        if (isDefault) {
          return _identity2DMatrix;
        }
        //split the matrix values out into an array (m for matrix)
        m = (s || "").match(/(?:\-|\b)[\d\-\.e]+\b/gi) || [];
        i = m.length;
        while (--i > -1) {
          n = Number(m[i]);
          m[i] = (dec = n - (n |= 0)) ? ((dec * rnd + (dec < 0 ? -0.5 : 0.5)) | 0) / rnd + n : n; //convert strings to Numbers and round to 5 decimal places to avoid issues with tiny numbers. Roughly 20x faster than Number.toFixed(). We also must make sure to round before dividing so that values like 0.9999999999 become 1 to avoid glitches in browser rendering and interpretation of flipped/rotated 3D matrices. And don't just multiply the number by rnd, floor it, and then divide by rnd because the bitwise operations max out at a 32-bit signed integer, thus it could get clipped at a relatively low value (like 22,000.00000 for example).
        }
        return (force2D && m.length > 6) ? [m[0], m[1], m[4], m[5], m[12], m[13]] : m;
      },

      /**
       * Parses the transform values for an element, returning an object with x, y, z, scaleX, scaleY, scaleZ, rotation, rotationX, rotationY, skewX, and skewY properties. Note: by default (for performance reasons), all skewing is combined into skewX and rotation but skewY still has a place in the transform object so that we can record how much of the skew is attributed to skewX vs skewY. Remember, a skewY of 10 looks the same as a rotation of 10 and skewX of -10.
       * @param {!Object} t target element
       * @param {Object=} cs computed style object (optional)
       * @param {boolean=} rec if true, the transform values will be recorded to the target element's _gsTransform object, like target._gsTransform = {x:0, y:0, z:0, scaleX:1...}
       * @param {boolean=} parse if true, we'll ignore any _gsTransform values that already exist on the element, and force a reparsing of the css (calculated style)
       * @return {object} object containing all of the transform properties/values like {x:0, y:0, z:0, scaleX:1...}
       */
      _getTransform = _internals.getTransform = function(t, cs, rec, parse) {
        if (t._gsTransform && rec && !parse) {
          return t._gsTransform; //if the element already has a _gsTransform, use that. Note: some browsers don't accurately return the calculated style for the transform (particularly for SVG), so it's almost always safest to just use the values we've already applied rather than re-parsing things.
        }
        var tm = rec ? t._gsTransform || new Transform() : new Transform(),
          invX = (tm.scaleX < 0), //in order to interpret things properly, we need to know if the user applied a negative scaleX previously so that we can adjust the rotation and skewX accordingly. Otherwise, if we always interpret a flipped matrix as affecting scaleY and the user only wants to tween the scaleX on multiple sequential tweens, it would keep the negative scaleY without that being the user's intent.
          min = 0.00002,
          rnd = 100000,
          zOrigin = _supports3D ? parseFloat(_getStyle(t, _transformOriginProp, cs, false, "0 0 0").split(" ")[2]) || tm.zOrigin  || 0 : 0,
          defaultTransformPerspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0,
          m, i, scaleX, scaleY, rotation, skewX;

        tm.svg = !!(t.getBBox && _isSVG(t));
        if (tm.svg) {
          _parseSVGOrigin(t, _getStyle(t, _transformOriginProp, _cs, false, "50% 50%") + "", tm, t.getAttribute("data-svg-origin"));
          _useSVGTransformAttr = CSSPlugin.useSVGTransformAttr || _forceSVGTransformAttr;
        }
        m = _getMatrix(t);
        if (m !== _identity2DMatrix) {

          if (m.length === 16) {
            //we'll only look at these position-related 6 variables first because if x/y/z all match, it's relatively safe to assume we don't need to re-parse everything which risks losing important rotational information (like rotationX:180 plus rotationY:180 would look the same as rotation:180 - there's no way to know for sure which direction was taken based solely on the matrix3d() values)
            var a11 = m[0], a21 = m[1], a31 = m[2], a41 = m[3],
              a12 = m[4], a22 = m[5], a32 = m[6], a42 = m[7],
              a13 = m[8], a23 = m[9], a33 = m[10],
              a14 = m[12], a24 = m[13], a34 = m[14],
              a43 = m[11],
              angle = Math.atan2(a32, a33),
              t1, t2, t3, t4, cos, sin;

            //we manually compensate for non-zero z component of transformOrigin to work around bugs in Safari
            if (tm.zOrigin) {
              a34 = -tm.zOrigin;
              a14 = a13*a34-m[12];
              a24 = a23*a34-m[13];
              a34 = a33*a34+tm.zOrigin-m[14];
            }
            tm.rotationX = angle * _RAD2DEG;
            //rotationX
            if (angle) {
              cos = Math.cos(-angle);
              sin = Math.sin(-angle);
              t1 = a12*cos+a13*sin;
              t2 = a22*cos+a23*sin;
              t3 = a32*cos+a33*sin;
              a13 = a12*-sin+a13*cos;
              a23 = a22*-sin+a23*cos;
              a33 = a32*-sin+a33*cos;
              a43 = a42*-sin+a43*cos;
              a12 = t1;
              a22 = t2;
              a32 = t3;
            }
            //rotationY
            angle = Math.atan2(-a31, a33);
            tm.rotationY = angle * _RAD2DEG;
            if (angle) {
              cos = Math.cos(-angle);
              sin = Math.sin(-angle);
              t1 = a11*cos-a13*sin;
              t2 = a21*cos-a23*sin;
              t3 = a31*cos-a33*sin;
              a23 = a21*sin+a23*cos;
              a33 = a31*sin+a33*cos;
              a43 = a41*sin+a43*cos;
              a11 = t1;
              a21 = t2;
              a31 = t3;
            }
            //rotationZ
            angle = Math.atan2(a21, a11);
            tm.rotation = angle * _RAD2DEG;
            if (angle) {
              cos = Math.cos(-angle);
              sin = Math.sin(-angle);
              a11 = a11*cos+a12*sin;
              t2 = a21*cos+a22*sin;
              a22 = a21*-sin+a22*cos;
              a32 = a31*-sin+a32*cos;
              a21 = t2;
            }

            if (tm.rotationX && Math.abs(tm.rotationX) + Math.abs(tm.rotation) > 359.9) { //when rotationY is set, it will often be parsed as 180 degrees different than it should be, and rotationX and rotation both being 180 (it looks the same), so we adjust for that here.
              tm.rotationX = tm.rotation = 0;
              tm.rotationY = 180 - tm.rotationY;
            }

            tm.scaleX = ((Math.sqrt(a11 * a11 + a21 * a21) * rnd + 0.5) | 0) / rnd;
            tm.scaleY = ((Math.sqrt(a22 * a22 + a23 * a23) * rnd + 0.5) | 0) / rnd;
            tm.scaleZ = ((Math.sqrt(a32 * a32 + a33 * a33) * rnd + 0.5) | 0) / rnd;
            tm.skewX = 0;
            tm.perspective = a43 ? 1 / ((a43 < 0) ? -a43 : a43) : 0;
            tm.x = a14;
            tm.y = a24;
            tm.z = a34;
            if (tm.svg) {
              tm.x -= tm.xOrigin - (tm.xOrigin * a11 - tm.yOrigin * a12);
              tm.y -= tm.yOrigin - (tm.yOrigin * a21 - tm.xOrigin * a22);
            }

          } else if ((!_supports3D || parse || !m.length || tm.x !== m[4] || tm.y !== m[5] || (!tm.rotationX && !tm.rotationY)) && !(tm.x !== undefined && _getStyle(t, "display", cs) === "none")) { //sometimes a 6-element matrix is returned even when we performed 3D transforms, like if rotationX and rotationY are 180. In cases like this, we still need to honor the 3D transforms. If we just rely on the 2D info, it could affect how the data is interpreted, like scaleY might get set to -1 or rotation could get offset by 180 degrees. For example, do a TweenLite.to(element, 1, {css:{rotationX:180, rotationY:180}}) and then later, TweenLite.to(element, 1, {css:{rotationX:0}}) and without this conditional logic in place, it'd jump to a state of being unrotated when the 2nd tween starts. Then again, we need to honor the fact that the user COULD alter the transforms outside of CSSPlugin, like by manually applying new css, so we try to sense that by looking at x and y because if those changed, we know the changes were made outside CSSPlugin and we force a reinterpretation of the matrix values. Also, in Webkit browsers, if the element's "display" is "none", its calculated style value will always return empty, so if we've already recorded the values in the _gsTransform object, we'll just rely on those.
            var k = (m.length >= 6),
              a = k ? m[0] : 1,
              b = m[1] || 0,
              c = m[2] || 0,
              d = k ? m[3] : 1;
            tm.x = m[4] || 0;
            tm.y = m[5] || 0;
            scaleX = Math.sqrt(a * a + b * b);
            scaleY = Math.sqrt(d * d + c * c);
            rotation = (a || b) ? Math.atan2(b, a) * _RAD2DEG : tm.rotation || 0; //note: if scaleX is 0, we cannot accurately measure rotation. Same for skewX with a scaleY of 0. Therefore, we default to the previously recorded value (or zero if that doesn't exist).
            skewX = (c || d) ? Math.atan2(c, d) * _RAD2DEG + rotation : tm.skewX || 0;
            if (Math.abs(skewX) > 90 && Math.abs(skewX) < 270) {
              if (invX) {
                scaleX *= -1;
                skewX += (rotation <= 0) ? 180 : -180;
                rotation += (rotation <= 0) ? 180 : -180;
              } else {
                scaleY *= -1;
                skewX += (skewX <= 0) ? 180 : -180;
              }
            }
            tm.scaleX = scaleX;
            tm.scaleY = scaleY;
            tm.rotation = rotation;
            tm.skewX = skewX;
            if (_supports3D) {
              tm.rotationX = tm.rotationY = tm.z = 0;
              tm.perspective = defaultTransformPerspective;
              tm.scaleZ = 1;
            }
            if (tm.svg) {
              tm.x -= tm.xOrigin - (tm.xOrigin * a + tm.yOrigin * c);
              tm.y -= tm.yOrigin - (tm.xOrigin * b + tm.yOrigin * d);
            }
          }
          tm.zOrigin = zOrigin;
          //some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 0 in these cases. The conditional logic here is faster than calling Math.abs(). Also, browsers tend to render a SLIGHTLY rotated object in a fuzzy way, so we need to snap to exactly 0 when appropriate.
          for (i in tm) {
            if (tm[i] < min) if (tm[i] > -min) {
              tm[i] = 0;
            }
          }
        }
        //DEBUG: _log("parsed rotation of " + t.getAttribute("id")+": "+(tm.rotationX)+", "+(tm.rotationY)+", "+(tm.rotation)+", scale: "+tm.scaleX+", "+tm.scaleY+", "+tm.scaleZ+", position: "+tm.x+", "+tm.y+", "+tm.z+", perspective: "+tm.perspective+ ", origin: "+ tm.xOrigin+ ","+ tm.yOrigin);
        if (rec) {
          t._gsTransform = tm; //record to the object's _gsTransform which we use so that tweens can control individual properties independently (we need all the properties to accurately recompose the matrix in the setRatio() method)
          if (tm.svg) { //if we're supposed to apply transforms to the SVG element's "transform" attribute, make sure there aren't any CSS transforms applied or they'll override the attribute ones. Also clear the transform attribute if we're using CSS, just to be clean.
            if (_useSVGTransformAttr && t.style[_transformProp]) {
              TweenLite.delayedCall(0.001, function(){ //if we apply this right away (before anything has rendered), we risk there being no transforms for a brief moment and it also interferes with adjusting the transformOrigin in a tween with immediateRender:true (it'd try reading the matrix and it wouldn't have the appropriate data in place because we just removed it).
                _removeProp(t.style, _transformProp);
              });
            } else if (!_useSVGTransformAttr && t.getAttribute("transform")) {
              TweenLite.delayedCall(0.001, function(){
                t.removeAttribute("transform");
              });
            }
          }
        }
        return tm;
      },

      //for setting 2D transforms in IE6, IE7, and IE8 (must use a "filter" to emulate the behavior of modern day browser transforms)
      _setIETransformRatio = function(v) {
        var t = this.data, //refers to the element's _gsTransform object
          ang = -t.rotation * _DEG2RAD,
          skew = ang + t.skewX * _DEG2RAD,
          rnd = 100000,
          a = ((Math.cos(ang) * t.scaleX * rnd) | 0) / rnd,
          b = ((Math.sin(ang) * t.scaleX * rnd) | 0) / rnd,
          c = ((Math.sin(skew) * -t.scaleY * rnd) | 0) / rnd,
          d = ((Math.cos(skew) * t.scaleY * rnd) | 0) / rnd,
          style = this.t.style,
          cs = this.t.currentStyle,
          filters, val;
        if (!cs) {
          return;
        }
        val = b; //just for swapping the variables an inverting them (reused "val" to avoid creating another variable in memory). IE's filter matrix uses a non-standard matrix configuration (angle goes the opposite way, and b and c are reversed and inverted)
        b = -c;
        c = -val;
        filters = cs.filter;
        style.filter = ""; //remove filters so that we can accurately measure offsetWidth/offsetHeight
        var w = this.t.offsetWidth,
          h = this.t.offsetHeight,
          clip = (cs.position !== "absolute"),
          m = "progid:DXImageTransform.Microsoft.Matrix(M11=" + a + ", M12=" + b + ", M21=" + c + ", M22=" + d,
          ox = t.x + (w * t.xPercent / 100),
          oy = t.y + (h * t.yPercent / 100),
          dx, dy;

        //if transformOrigin is being used, adjust the offset x and y
        if (t.ox != null) {
          dx = ((t.oxp) ? w * t.ox * 0.01 : t.ox) - w / 2;
          dy = ((t.oyp) ? h * t.oy * 0.01 : t.oy) - h / 2;
          ox += dx - (dx * a + dy * b);
          oy += dy - (dx * c + dy * d);
        }

        if (!clip) {
          m += ", sizingMethod='auto expand')";
        } else {
          dx = (w / 2);
          dy = (h / 2);
          //translate to ensure that transformations occur around the correct origin (default is center).
          m += ", Dx=" + (dx - (dx * a + dy * b) + ox) + ", Dy=" + (dy - (dx * c + dy * d) + oy) + ")";
        }
        if (filters.indexOf("DXImageTransform.Microsoft.Matrix(") !== -1) {
          style.filter = filters.replace(_ieSetMatrixExp, m);
        } else {
          style.filter = m + " " + filters; //we must always put the transform/matrix FIRST (before alpha(opacity=xx)) to avoid an IE bug that slices part of the object when rotation is applied with alpha.
        }

        //at the end or beginning of the tween, if the matrix is normal (1, 0, 0, 1) and opacity is 100 (or doesn't exist), remove the filter to improve browser performance.
        if (v === 0 || v === 1) if (a === 1) if (b === 0) if (c === 0) if (d === 1) if (!clip || m.indexOf("Dx=0, Dy=0") !== -1) if (!_opacityExp.test(filters) || parseFloat(RegExp.$1) === 100) if (filters.indexOf("gradient(" && filters.indexOf("Alpha")) === -1) {
          style.removeAttribute("filter");
        }

        //we must set the margins AFTER applying the filter in order to avoid some bugs in IE8 that could (in rare scenarios) cause them to be ignored intermittently (vibration).
        if (!clip) {
          var mult = (_ieVers < 8) ? 1 : -1, //in Internet Explorer 7 and before, the box model is broken, causing the browser to treat the width/height of the actual rotated filtered image as the width/height of the box itself, but Microsoft corrected that in IE8. We must use a negative offset in IE8 on the right/bottom
            marg, prop, dif;
          dx = t.ieOffsetX || 0;
          dy = t.ieOffsetY || 0;
          t.ieOffsetX = Math.round((w - ((a < 0 ? -a : a) * w + (b < 0 ? -b : b) * h)) / 2 + ox);
          t.ieOffsetY = Math.round((h - ((d < 0 ? -d : d) * h + (c < 0 ? -c : c) * w)) / 2 + oy);
          for (i = 0; i < 4; i++) {
            prop = _margins[i];
            marg = cs[prop];
            //we need to get the current margin in case it is being tweened separately (we want to respect that tween's changes)
            val = (marg.indexOf("px") !== -1) ? parseFloat(marg) : _convertToPixels(this.t, prop, parseFloat(marg), marg.replace(_suffixExp, "")) || 0;
            if (val !== t[prop]) {
              dif = (i < 2) ? -t.ieOffsetX : -t.ieOffsetY; //if another tween is controlling a margin, we cannot only apply the difference in the ieOffsets, so we essentially zero-out the dx and dy here in that case. We record the margin(s) later so that we can keep comparing them, making this code very flexible.
            } else {
              dif = (i < 2) ? dx - t.ieOffsetX : dy - t.ieOffsetY;
            }
            style[prop] = (t[prop] = Math.round( val - dif * ((i === 0 || i === 2) ? 1 : mult) )) + "px";
          }
        }
      },

      /* translates a super small decimal to a string WITHOUT scientific notation
      _safeDecimal = function(n) {
        var s = (n < 0 ? -n : n) + "",
          a = s.split("e-");
        return (n < 0 ? "-0." : "0.") + new Array(parseInt(a[1], 10) || 0).join("0") + a[0].split(".").join("");
      },
      */

      _setTransformRatio = _internals.set3DTransformRatio = _internals.setTransformRatio = function(v) {
        var t = this.data, //refers to the element's _gsTransform object
          style = this.t.style,
          angle = t.rotation,
          rotationX = t.rotationX,
          rotationY = t.rotationY,
          sx = t.scaleX,
          sy = t.scaleY,
          sz = t.scaleZ,
          x = t.x,
          y = t.y,
          z = t.z,
          isSVG = t.svg,
          perspective = t.perspective,
          force3D = t.force3D,
          a11, a12, a13, a21, a22, a23, a31, a32, a33, a41, a42, a43,
          zOrigin, min, cos, sin, t1, t2, transform, comma, zero, skew, rnd;
        //check to see if we should render as 2D (and SVGs must use 2D when _useSVGTransformAttr is true)
        if (((((v === 1 || v === 0) && force3D === "auto" && (this.tween._totalTime === this.tween._totalDuration || !this.tween._totalTime)) || !force3D) && !z && !perspective && !rotationY && !rotationX && sz === 1) || (_useSVGTransformAttr && isSVG) || !_supports3D) { //on the final render (which could be 0 for a from tween), if there are no 3D aspects, render in 2D to free up memory and improve performance especially on mobile devices. Check the tween's totalTime/totalDuration too in order to make sure it doesn't happen between repeats if it's a repeating tween.

          //2D
          if (angle || t.skewX || isSVG) {
            angle *= _DEG2RAD;
            skew = t.skewX * _DEG2RAD;
            rnd = 100000;
            a11 = Math.cos(angle) * sx;
            a21 = Math.sin(angle) * sx;
            a12 = Math.sin(angle - skew) * -sy;
            a22 = Math.cos(angle - skew) * sy;
            if (skew && t.skewType === "simple") { //by default, we compensate skewing on the other axis to make it look more natural, but you can set the skewType to "simple" to use the uncompensated skewing that CSS does
              t1 = Math.tan(skew);
              t1 = Math.sqrt(1 + t1 * t1);
              a12 *= t1;
              a22 *= t1;
              if (t.skewY) {
                a11 *= t1;
                a21 *= t1;
              }
            }
            if (isSVG) {
              x += t.xOrigin - (t.xOrigin * a11 + t.yOrigin * a12) + t.xOffset;
              y += t.yOrigin - (t.xOrigin * a21 + t.yOrigin * a22) + t.yOffset;
              if (_useSVGTransformAttr && (t.xPercent || t.yPercent)) { //The SVG spec doesn't support percentage-based translation in the "transform" attribute, so we merge it into the matrix to simulate it.
                min = this.t.getBBox();
                x += t.xPercent * 0.01 * min.width;
                y += t.yPercent * 0.01 * min.height;
              }
              min = 0.000001;
              if (x < min) if (x > -min) {
                x = 0;
              }
              if (y < min) if (y > -min) {
                y = 0;
              }
            }
            transform = (((a11 * rnd) | 0) / rnd) + "," + (((a21 * rnd) | 0) / rnd) + "," + (((a12 * rnd) | 0) / rnd) + "," + (((a22 * rnd) | 0) / rnd) + "," + x + "," + y + ")";
            if (isSVG && _useSVGTransformAttr) {
              this.t.setAttribute("transform", "matrix(" + transform);
            } else {
              //some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 5 decimal places.
              style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + transform;
            }
          } else {
            style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + sx + ",0,0," + sy + "," + x + "," + y + ")";
          }
          return;

        }
        if (_isFirefox) { //Firefox has a bug (at least in v25) that causes it to render the transparent part of 32-bit PNG images as black when displayed inside an iframe and the 3D scale is very small and doesn't change sufficiently enough between renders (like if you use a Power4.easeInOut to scale from 0 to 1 where the beginning values only change a tiny amount to begin the tween before accelerating). In this case, we force the scale to be 0.00002 instead which is visually the same but works around the Firefox issue.
          min = 0.0001;
          if (sx < min && sx > -min) {
            sx = sz = 0.00002;
          }
          if (sy < min && sy > -min) {
            sy = sz = 0.00002;
          }
          if (perspective && !t.z && !t.rotationX && !t.rotationY) { //Firefox has a bug that causes elements to have an odd super-thin, broken/dotted black border on elements that have a perspective set but aren't utilizing 3D space (no rotationX, rotationY, or z).
            perspective = 0;
          }
        }
        if (angle || t.skewX) {
          angle *= _DEG2RAD;
          cos = a11 = Math.cos(angle);
          sin = a21 = Math.sin(angle);
          if (t.skewX) {
            angle -= t.skewX * _DEG2RAD;
            cos = Math.cos(angle);
            sin = Math.sin(angle);
            if (t.skewType === "simple") { //by default, we compensate skewing on the other axis to make it look more natural, but you can set the skewType to "simple" to use the uncompensated skewing that CSS does
              t1 = Math.tan(t.skewX * _DEG2RAD);
              t1 = Math.sqrt(1 + t1 * t1);
              cos *= t1;
              sin *= t1;
              if (t.skewY) {
                a11 *= t1;
                a21 *= t1;
              }
            }
          }
          a12 = -sin;
          a22 = cos;

        } else if (!rotationY && !rotationX && sz === 1 && !perspective && !isSVG) { //if we're only translating and/or 2D scaling, this is faster...
          style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) translate3d(" : "translate3d(") + x + "px," + y + "px," + z +"px)" + ((sx !== 1 || sy !== 1) ? " scale(" + sx + "," + sy + ")" : "");
          return;
        } else {
          a11 = a22 = 1;
          a12 = a21 = 0;
        }
        // KEY  INDEX   AFFECTS
        // a11  0       rotation, rotationY, scaleX
        // a21  1       rotation, rotationY, scaleX
        // a31  2       rotationY, scaleX
        // a41  3       rotationY, scaleX
        // a12  4       rotation, skewX, rotationX, scaleY
        // a22  5       rotation, skewX, rotationX, scaleY
        // a32  6       rotationX, scaleY
        // a42  7       rotationX, scaleY
        // a13  8       rotationY, rotationX, scaleZ
        // a23  9       rotationY, rotationX, scaleZ
        // a33  10      rotationY, rotationX, scaleZ
        // a43  11      rotationY, rotationX, perspective, scaleZ
        // a14  12      x, zOrigin, svgOrigin
        // a24  13      y, zOrigin, svgOrigin
        // a34  14      z, zOrigin
        // a44  15
        // rotation: Math.atan2(a21, a11)
        // rotationY: Math.atan2(a13, a33) (or Math.atan2(a13, a11))
        // rotationX: Math.atan2(a32, a33)
        a33 = 1;
        a13 = a23 = a31 = a32 = a41 = a42 = 0;
        a43 = (perspective) ? -1 / perspective : 0;
        zOrigin = t.zOrigin;
        min = 0.000001; //threshold below which browsers use scientific notation which won't work.
        comma = ",";
        zero = "0";
        angle = rotationY * _DEG2RAD;
        if (angle) {
          cos = Math.cos(angle);
          sin = Math.sin(angle);
          a31 = -sin;
          a41 = a43*-sin;
          a13 = a11*sin;
          a23 = a21*sin;
          a33 = cos;
          a43 *= cos;
          a11 *= cos;
          a21 *= cos;
        }
        angle = rotationX * _DEG2RAD;
        if (angle) {
          cos = Math.cos(angle);
          sin = Math.sin(angle);
          t1 = a12*cos+a13*sin;
          t2 = a22*cos+a23*sin;
          a32 = a33*sin;
          a42 = a43*sin;
          a13 = a12*-sin+a13*cos;
          a23 = a22*-sin+a23*cos;
          a33 = a33*cos;
          a43 = a43*cos;
          a12 = t1;
          a22 = t2;
        }
        if (sz !== 1) {
          a13*=sz;
          a23*=sz;
          a33*=sz;
          a43*=sz;
        }
        if (sy !== 1) {
          a12*=sy;
          a22*=sy;
          a32*=sy;
          a42*=sy;
        }
        if (sx !== 1) {
          a11*=sx;
          a21*=sx;
          a31*=sx;
          a41*=sx;
        }

        if (zOrigin || isSVG) {
          if (zOrigin) {
            x += a13*-zOrigin;
            y += a23*-zOrigin;
            z += a33*-zOrigin+zOrigin;
          }
          if (isSVG) { //due to bugs in some browsers, we need to manage the transform-origin of SVG manually
            x += t.xOrigin - (t.xOrigin * a11 + t.yOrigin * a12) + t.xOffset;
            y += t.yOrigin - (t.xOrigin * a21 + t.yOrigin * a22) + t.yOffset;
          }
          if (x < min && x > -min) {
            x = zero;
          }
          if (y < min && y > -min) {
            y = zero;
          }
          if (z < min && z > -min) {
            z = 0; //don't use string because we calculate perspective later and need the number.
          }
        }

        //optimized way of concatenating all the values into a string. If we do it all in one shot, it's slower because of the way browsers have to create temp strings and the way it affects memory. If we do it piece-by-piece with +=, it's a bit slower too. We found that doing it in these sized chunks works best overall:
        transform = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix3d(" : "matrix3d(");
        transform += ((a11 < min && a11 > -min) ? zero : a11) + comma + ((a21 < min && a21 > -min) ? zero : a21) + comma + ((a31 < min && a31 > -min) ? zero : a31);
        transform += comma + ((a41 < min && a41 > -min) ? zero : a41) + comma + ((a12 < min && a12 > -min) ? zero : a12) + comma + ((a22 < min && a22 > -min) ? zero : a22);
        if (rotationX || rotationY || sz !== 1) { //performance optimization (often there's no rotationX or rotationY, so we can skip these calculations)
          transform += comma + ((a32 < min && a32 > -min) ? zero : a32) + comma + ((a42 < min && a42 > -min) ? zero : a42) + comma + ((a13 < min && a13 > -min) ? zero : a13);
          transform += comma + ((a23 < min && a23 > -min) ? zero : a23) + comma + ((a33 < min && a33 > -min) ? zero : a33) + comma + ((a43 < min && a43 > -min) ? zero : a43) + comma;
        } else {
          transform += ",0,0,0,0,1,0,";
        }
        transform += x + comma + y + comma + z + comma + (perspective ? (1 + (-z / perspective)) : 1) + ")";

        style[_transformProp] = transform;
      };

    p = Transform.prototype;
    p.x = p.y = p.z = p.skewX = p.skewY = p.rotation = p.rotationX = p.rotationY = p.zOrigin = p.xPercent = p.yPercent = p.xOffset = p.yOffset = 0;
    p.scaleX = p.scaleY = p.scaleZ = 1;

    _registerComplexSpecialProp("transform,scale,scaleX,scaleY,scaleZ,x,y,z,rotation,rotationX,rotationY,rotationZ,skewX,skewY,shortRotation,shortRotationX,shortRotationY,shortRotationZ,transformOrigin,svgOrigin,transformPerspective,directionalRotation,parseTransform,force3D,skewType,xPercent,yPercent,smoothOrigin", {parser:function(t, e, p, cssp, pt, plugin, vars) {
      if (cssp._lastParsedTransform === vars) { return pt; } //only need to parse the transform once, and only if the browser supports it.
      cssp._lastParsedTransform = vars;
      var originalGSTransform = t._gsTransform,
        style = t.style,
        min = 0.000001,
        i = _transformProps.length,
        v = vars,
        endRotations = {},
        transformOriginString = "transformOrigin",
        m1, m2, skewY, copy, orig, has3D, hasChange, dr, x, y;
      if (vars.display) { //if the user is setting display during this tween, it may not be instantiated yet but we must force it here in order to get accurate readings. If display is "none", some browsers refuse to report the transform properties correctly.
        copy = _getStyle(t, "display");
        style.display = "block";
        m1 = _getTransform(t, _cs, true, vars.parseTransform);
        style.display = copy;
      } else {
        m1 = _getTransform(t, _cs, true, vars.parseTransform);
      }
      cssp._transform = m1;
      if (typeof(v.transform) === "string" && _transformProp) { //for values like transform:"rotate(60deg) scale(0.5, 0.8)"
        copy = _tempDiv.style; //don't use the original target because it might be SVG in which case some browsers don't report computed style correctly.
        copy[_transformProp] = v.transform;
        copy.display = "block"; //if display is "none", the browser often refuses to report the transform properties correctly.
        copy.position = "absolute";
        _doc.body.appendChild(_tempDiv);
        m2 = _getTransform(_tempDiv, null, false);
        _doc.body.removeChild(_tempDiv);
        if (!m2.perspective) {
          m2.perspective = m1.perspective; //tweening to no perspective gives very unintuitive results - just keep the same perspective in that case.
        }
        if (v.xPercent != null) {
          m2.xPercent = _parseVal(v.xPercent, m1.xPercent);
        }
        if (v.yPercent != null) {
          m2.yPercent = _parseVal(v.yPercent, m1.yPercent);
        }
      } else if (typeof(v) === "object") { //for values like scaleX, scaleY, rotation, x, y, skewX, and skewY or transform:{...} (object)
        m2 = {scaleX:_parseVal((v.scaleX != null) ? v.scaleX : v.scale, m1.scaleX),
          scaleY:_parseVal((v.scaleY != null) ? v.scaleY : v.scale, m1.scaleY),
          scaleZ:_parseVal(v.scaleZ, m1.scaleZ),
          x:_parseVal(v.x, m1.x),
          y:_parseVal(v.y, m1.y),
          z:_parseVal(v.z, m1.z),
          xPercent:_parseVal(v.xPercent, m1.xPercent),
          yPercent:_parseVal(v.yPercent, m1.yPercent),
          perspective:_parseVal(v.transformPerspective, m1.perspective)};
        dr = v.directionalRotation;
        if (dr != null) {
          if (typeof(dr) === "object") {
            for (copy in dr) {
              v[copy] = dr[copy];
            }
          } else {
            v.rotation = dr;
          }
        }
        if (typeof(v.x) === "string" && v.x.indexOf("%") !== -1) {
          m2.x = 0;
          m2.xPercent = _parseVal(v.x, m1.xPercent);
        }
        if (typeof(v.y) === "string" && v.y.indexOf("%") !== -1) {
          m2.y = 0;
          m2.yPercent = _parseVal(v.y, m1.yPercent);
        }

        m2.rotation = _parseAngle(("rotation" in v) ? v.rotation : ("shortRotation" in v) ? v.shortRotation + "_short" : ("rotationZ" in v) ? v.rotationZ : m1.rotation, m1.rotation, "rotation", endRotations);
        if (_supports3D) {
          m2.rotationX = _parseAngle(("rotationX" in v) ? v.rotationX : ("shortRotationX" in v) ? v.shortRotationX + "_short" : m1.rotationX || 0, m1.rotationX, "rotationX", endRotations);
          m2.rotationY = _parseAngle(("rotationY" in v) ? v.rotationY : ("shortRotationY" in v) ? v.shortRotationY + "_short" : m1.rotationY || 0, m1.rotationY, "rotationY", endRotations);
        }
        m2.skewX = (v.skewX == null) ? m1.skewX : _parseAngle(v.skewX, m1.skewX);

        //note: for performance reasons, we combine all skewing into the skewX and rotation values, ignoring skewY but we must still record it so that we can discern how much of the overall skew is attributed to skewX vs. skewY. Otherwise, if the skewY would always act relative (tween skewY to 10deg, for example, multiple times and if we always combine things into skewX, we can't remember that skewY was 10 from last time). Remember, a skewY of 10 degrees looks the same as a rotation of 10 degrees plus a skewX of -10 degrees.
        m2.skewY = (v.skewY == null) ? m1.skewY : _parseAngle(v.skewY, m1.skewY);
        if ((skewY = m2.skewY - m1.skewY)) {
          m2.skewX += skewY;
          m2.rotation += skewY;
        }
      }
      if (_supports3D && v.force3D != null) {
        m1.force3D = v.force3D;
        hasChange = true;
      }

      m1.skewType = v.skewType || m1.skewType || CSSPlugin.defaultSkewType;

      has3D = (m1.force3D || m1.z || m1.rotationX || m1.rotationY || m2.z || m2.rotationX || m2.rotationY || m2.perspective);
      if (!has3D && v.scale != null) {
        m2.scaleZ = 1; //no need to tween scaleZ.
      }

      while (--i > -1) {
        p = _transformProps[i];
        orig = m2[p] - m1[p];
        if (orig > min || orig < -min || v[p] != null || _forcePT[p] != null) {
          hasChange = true;
          pt = new CSSPropTween(m1, p, m1[p], orig, pt);
          if (p in endRotations) {
            pt.e = endRotations[p]; //directional rotations typically have compensated values during the tween, but we need to make sure they end at exactly what the user requested
          }
          pt.xs0 = 0; //ensures the value stays numeric in setRatio()
          pt.plugin = plugin;
          cssp._overwriteProps.push(pt.n);
        }
      }

      orig = v.transformOrigin;
      if (m1.svg && (orig || v.svgOrigin)) {
        x = m1.xOffset; //when we change the origin, in order to prevent things from jumping we adjust the x/y so we must record those here so that we can create PropTweens for them and flip them at the same time as the origin
        y = m1.yOffset;
        _parseSVGOrigin(t, _parsePosition(orig), m2, v.svgOrigin, v.smoothOrigin);
        pt = _addNonTweeningNumericPT(m1, "xOrigin", (originalGSTransform ? m1 : m2).xOrigin, m2.xOrigin, pt, transformOriginString); //note: if there wasn't a transformOrigin defined yet, just start with the destination one; it's wasteful otherwise, and it causes problems with fromTo() tweens. For example, TweenLite.to("#wheel", 3, {rotation:180, transformOrigin:"50% 50%", delay:1}); TweenLite.fromTo("#wheel", 3, {scale:0.5, transformOrigin:"50% 50%"}, {scale:1, delay:2}); would cause a jump when the from values revert at the beginning of the 2nd tween.
        pt = _addNonTweeningNumericPT(m1, "yOrigin", (originalGSTransform ? m1 : m2).yOrigin, m2.yOrigin, pt, transformOriginString);
        if (x !== m1.xOffset || y !== m1.yOffset) {
          pt = _addNonTweeningNumericPT(m1, "xOffset", (originalGSTransform ? x : m1.xOffset), m1.xOffset, pt, transformOriginString);
          pt = _addNonTweeningNumericPT(m1, "yOffset", (originalGSTransform ? y : m1.yOffset), m1.yOffset, pt, transformOriginString);
        }
        orig = _useSVGTransformAttr ? null : "0px 0px"; //certain browsers (like firefox) completely botch transform-origin, so we must remove it to prevent it from contaminating transforms. We manage it ourselves with xOrigin and yOrigin
      }
      if (orig || (_supports3D && has3D && m1.zOrigin)) { //if anything 3D is happening and there's a transformOrigin with a z component that's non-zero, we must ensure that the transformOrigin's z-component is set to 0 so that we can manually do those calculations to get around Safari bugs. Even if the user didn't specifically define a "transformOrigin" in this particular tween (maybe they did it via css directly).
        if (_transformProp) {
          hasChange = true;
          p = _transformOriginProp;
          orig = (orig || _getStyle(t, p, _cs, false, "50% 50%")) + ""; //cast as string to avoid errors
          pt = new CSSPropTween(style, p, 0, 0, pt, -1, transformOriginString);
          pt.b = style[p];
          pt.plugin = plugin;
          if (_supports3D) {
            copy = m1.zOrigin;
            orig = orig.split(" ");
            m1.zOrigin = ((orig.length > 2 && !(copy !== 0 && orig[2] === "0px")) ? parseFloat(orig[2]) : copy) || 0; //Safari doesn't handle the z part of transformOrigin correctly, so we'll manually handle it in the _set3DTransformRatio() method.
            pt.xs0 = pt.e = orig[0] + " " + (orig[1] || "50%") + " 0px"; //we must define a z value of 0px specifically otherwise iOS 5 Safari will stick with the old one (if one was defined)!
            pt = new CSSPropTween(m1, "zOrigin", 0, 0, pt, -1, pt.n); //we must create a CSSPropTween for the _gsTransform.zOrigin so that it gets reset properly at the beginning if the tween runs backward (as opposed to just setting m1.zOrigin here)
            pt.b = copy;
            pt.xs0 = pt.e = m1.zOrigin;
          } else {
            pt.xs0 = pt.e = orig;
          }

          //for older versions of IE (6-8), we need to manually calculate things inside the setRatio() function. We record origin x and y (ox and oy) and whether or not the values are percentages (oxp and oyp).
        } else {
          _parsePosition(orig + "", m1);
        }
      }
      if (hasChange) {
        cssp._transformType = (!(m1.svg && _useSVGTransformAttr) && (has3D || this._transformType === 3)) ? 3 : 2; //quicker than calling cssp._enableTransforms();
      }
      return pt;
    }, prefix:true});

    _registerComplexSpecialProp("boxShadow", {defaultValue:"0px 0px 0px 0px #999", prefix:true, color:true, multi:true, keyword:"inset"});

    _registerComplexSpecialProp("borderRadius", {defaultValue:"0px", parser:function(t, e, p, cssp, pt, plugin) {
      e = this.format(e);
      var props = ["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],
        style = t.style,
        ea1, i, es2, bs2, bs, es, bn, en, w, h, esfx, bsfx, rel, hn, vn, em;
      w = parseFloat(t.offsetWidth);
      h = parseFloat(t.offsetHeight);
      ea1 = e.split(" ");
      for (i = 0; i < props.length; i++) { //if we're dealing with percentages, we must convert things separately for the horizontal and vertical axis!
        if (this.p.indexOf("border")) { //older browsers used a prefix
          props[i] = _checkPropPrefix(props[i]);
        }
        bs = bs2 = _getStyle(t, props[i], _cs, false, "0px");
        if (bs.indexOf(" ") !== -1) {
          bs2 = bs.split(" ");
          bs = bs2[0];
          bs2 = bs2[1];
        }
        es = es2 = ea1[i];
        bn = parseFloat(bs);
        bsfx = bs.substr((bn + "").length);
        rel = (es.charAt(1) === "=");
        if (rel) {
          en = parseInt(es.charAt(0)+"1", 10);
          es = es.substr(2);
          en *= parseFloat(es);
          esfx = es.substr((en + "").length - (en < 0 ? 1 : 0)) || "";
        } else {
          en = parseFloat(es);
          esfx = es.substr((en + "").length);
        }
        if (esfx === "") {
          esfx = _suffixMap[p] || bsfx;
        }
        if (esfx !== bsfx) {
          hn = _convertToPixels(t, "borderLeft", bn, bsfx); //horizontal number (we use a bogus "borderLeft" property just because the _convertToPixels() method searches for the keywords "Left", "Right", "Top", and "Bottom" to determine of it's a horizontal or vertical property, and we need "border" in the name so that it knows it should measure relative to the element itself, not its parent.
          vn = _convertToPixels(t, "borderTop", bn, bsfx); //vertical number
          if (esfx === "%") {
            bs = (hn / w * 100) + "%";
            bs2 = (vn / h * 100) + "%";
          } else if (esfx === "em") {
            em = _convertToPixels(t, "borderLeft", 1, "em");
            bs = (hn / em) + "em";
            bs2 = (vn / em) + "em";
          } else {
            bs = hn + "px";
            bs2 = vn + "px";
          }
          if (rel) {
            es = (parseFloat(bs) + en) + esfx;
            es2 = (parseFloat(bs2) + en) + esfx;
          }
        }
        pt = _parseComplex(style, props[i], bs + " " + bs2, es + " " + es2, false, "0px", pt);
      }
      return pt;
    }, prefix:true, formatter:_getFormatter("0px 0px 0px 0px", false, true)});
    _registerComplexSpecialProp("backgroundPosition", {defaultValue:"0 0", parser:function(t, e, p, cssp, pt, plugin) {
      var bp = "background-position",
        cs = (_cs || _getComputedStyle(t, null)),
        bs = this.format( ((cs) ? _ieVers ? cs.getPropertyValue(bp + "-x") + " " + cs.getPropertyValue(bp + "-y") : cs.getPropertyValue(bp) : t.currentStyle.backgroundPositionX + " " + t.currentStyle.backgroundPositionY) || "0 0"), //Internet Explorer doesn't report background-position correctly - we must query background-position-x and background-position-y and combine them (even in IE10). Before IE9, we must do the same with the currentStyle object and use camelCase
        es = this.format(e),
        ba, ea, i, pct, overlap, src;
      if ((bs.indexOf("%") !== -1) !== (es.indexOf("%") !== -1)) {
        src = _getStyle(t, "backgroundImage").replace(_urlExp, "");
        if (src && src !== "none") {
          ba = bs.split(" ");
          ea = es.split(" ");
          _tempImg.setAttribute("src", src); //set the temp IMG's src to the background-image so that we can measure its width/height
          i = 2;
          while (--i > -1) {
            bs = ba[i];
            pct = (bs.indexOf("%") !== -1);
            if (pct !== (ea[i].indexOf("%") !== -1)) {
              overlap = (i === 0) ? t.offsetWidth - _tempImg.width : t.offsetHeight - _tempImg.height;
              ba[i] = pct ? (parseFloat(bs) / 100 * overlap) + "px" : (parseFloat(bs) / overlap * 100) + "%";
            }
          }
          bs = ba.join(" ");
        }
      }
      return this.parseComplex(t.style, bs, es, pt, plugin);
    }, formatter:_parsePosition});
    _registerComplexSpecialProp("backgroundSize", {defaultValue:"0 0", formatter:_parsePosition});
    _registerComplexSpecialProp("perspective", {defaultValue:"0px", prefix:true});
    _registerComplexSpecialProp("perspectiveOrigin", {defaultValue:"50% 50%", prefix:true});
    _registerComplexSpecialProp("transformStyle", {prefix:true});
    _registerComplexSpecialProp("backfaceVisibility", {prefix:true});
    _registerComplexSpecialProp("userSelect", {prefix:true});
    _registerComplexSpecialProp("margin", {parser:_getEdgeParser("marginTop,marginRight,marginBottom,marginLeft")});
    _registerComplexSpecialProp("padding", {parser:_getEdgeParser("paddingTop,paddingRight,paddingBottom,paddingLeft")});
    _registerComplexSpecialProp("clip", {defaultValue:"rect(0px,0px,0px,0px)", parser:function(t, e, p, cssp, pt, plugin){
      var b, cs, delim;
      if (_ieVers < 9) { //IE8 and earlier don't report a "clip" value in the currentStyle - instead, the values are split apart into clipTop, clipRight, clipBottom, and clipLeft. Also, in IE7 and earlier, the values inside rect() are space-delimited, not comma-delimited.
        cs = t.currentStyle;
        delim = _ieVers < 8 ? " " : ",";
        b = "rect(" + cs.clipTop + delim + cs.clipRight + delim + cs.clipBottom + delim + cs.clipLeft + ")";
        e = this.format(e).split(",").join(delim);
      } else {
        b = this.format(_getStyle(t, this.p, _cs, false, this.dflt));
        e = this.format(e);
      }
      return this.parseComplex(t.style, b, e, pt, plugin);
    }});
    _registerComplexSpecialProp("textShadow", {defaultValue:"0px 0px 0px #999", color:true, multi:true});
    _registerComplexSpecialProp("autoRound,strictUnits", {parser:function(t, e, p, cssp, pt) {return pt;}}); //just so that we can ignore these properties (not tween them)
    _registerComplexSpecialProp("border", {defaultValue:"0px solid #000", parser:function(t, e, p, cssp, pt, plugin) {
        return this.parseComplex(t.style, this.format(_getStyle(t, "borderTopWidth", _cs, false, "0px") + " " + _getStyle(t, "borderTopStyle", _cs, false, "solid") + " " + _getStyle(t, "borderTopColor", _cs, false, "#000")), this.format(e), pt, plugin);
      }, color:true, formatter:function(v) {
        var a = v.split(" ");
        return a[0] + " " + (a[1] || "solid") + " " + (v.match(_colorExp) || ["#000"])[0];
      }});
    _registerComplexSpecialProp("borderWidth", {parser:_getEdgeParser("borderTopWidth,borderRightWidth,borderBottomWidth,borderLeftWidth")}); //Firefox doesn't pick up on borderWidth set in style sheets (only inline).
    _registerComplexSpecialProp("float,cssFloat,styleFloat", {parser:function(t, e, p, cssp, pt, plugin) {
      var s = t.style,
        prop = ("cssFloat" in s) ? "cssFloat" : "styleFloat";
      return new CSSPropTween(s, prop, 0, 0, pt, -1, p, false, 0, s[prop], e);
    }});

    //opacity-related
    var _setIEOpacityRatio = function(v) {
        var t = this.t, //refers to the element's style property
          filters = t.filter || _getStyle(this.data, "filter") || "",
          val = (this.s + this.c * v) | 0,
          skip;
        if (val === 100) { //for older versions of IE that need to use a filter to apply opacity, we should remove the filter if opacity hits 1 in order to improve performance, but make sure there isn't a transform (matrix) or gradient in the filters.
          if (filters.indexOf("atrix(") === -1 && filters.indexOf("radient(") === -1 && filters.indexOf("oader(") === -1) {
            t.removeAttribute("filter");
            skip = (!_getStyle(this.data, "filter")); //if a class is applied that has an alpha filter, it will take effect (we don't want that), so re-apply our alpha filter in that case. We must first remove it and then check.
          } else {
            t.filter = filters.replace(_alphaFilterExp, "");
            skip = true;
          }
        }
        if (!skip) {
          if (this.xn1) {
            t.filter = filters = filters || ("alpha(opacity=" + val + ")"); //works around bug in IE7/8 that prevents changes to "visibility" from being applied properly if the filter is changed to a different alpha on the same frame.
          }
          if (filters.indexOf("pacity") === -1) { //only used if browser doesn't support the standard opacity style property (IE 7 and 8). We omit the "O" to avoid case-sensitivity issues
            if (val !== 0 || !this.xn1) { //bugs in IE7/8 won't render the filter properly if opacity is ADDED on the same frame/render as "visibility" changes (this.xn1 is 1 if this tween is an "autoAlpha" tween)
              t.filter = filters + " alpha(opacity=" + val + ")"; //we round the value because otherwise, bugs in IE7/8 can prevent "visibility" changes from being applied properly.
            }
          } else {
            t.filter = filters.replace(_opacityExp, "opacity=" + val);
          }
        }
      };
    _registerComplexSpecialProp("opacity,alpha,autoAlpha", {defaultValue:"1", parser:function(t, e, p, cssp, pt, plugin) {
      var b = parseFloat(_getStyle(t, "opacity", _cs, false, "1")),
        style = t.style,
        isAutoAlpha = (p === "autoAlpha");
      if (typeof(e) === "string" && e.charAt(1) === "=") {
        e = ((e.charAt(0) === "-") ? -1 : 1) * parseFloat(e.substr(2)) + b;
      }
      if (isAutoAlpha && b === 1 && _getStyle(t, "visibility", _cs) === "hidden" && e !== 0) { //if visibility is initially set to "hidden", we should interpret that as intent to make opacity 0 (a convenience)
        b = 0;
      }
      if (_supportsOpacity) {
        pt = new CSSPropTween(style, "opacity", b, e - b, pt);
      } else {
        pt = new CSSPropTween(style, "opacity", b * 100, (e - b) * 100, pt);
        pt.xn1 = isAutoAlpha ? 1 : 0; //we need to record whether or not this is an autoAlpha so that in the setRatio(), we know to duplicate the setting of the alpha in order to work around a bug in IE7 and IE8 that prevents changes to "visibility" from taking effect if the filter is changed to a different alpha(opacity) at the same time. Setting it to the SAME value first, then the new value works around the IE7/8 bug.
        style.zoom = 1; //helps correct an IE issue.
        pt.type = 2;
        pt.b = "alpha(opacity=" + pt.s + ")";
        pt.e = "alpha(opacity=" + (pt.s + pt.c) + ")";
        pt.data = t;
        pt.plugin = plugin;
        pt.setRatio = _setIEOpacityRatio;
      }
      if (isAutoAlpha) { //we have to create the "visibility" PropTween after the opacity one in the linked list so that they run in the order that works properly in IE8 and earlier
        pt = new CSSPropTween(style, "visibility", 0, 0, pt, -1, null, false, 0, ((b !== 0) ? "inherit" : "hidden"), ((e === 0) ? "hidden" : "inherit"));
        pt.xs0 = "inherit";
        cssp._overwriteProps.push(pt.n);
        cssp._overwriteProps.push(p);
      }
      return pt;
    }});


    var _removeProp = function(s, p) {
        if (p) {
          if (s.removeProperty) {
            if (p.substr(0,2) === "ms" || p.substr(0,6) === "webkit") { //Microsoft and some Webkit browsers don't conform to the standard of capitalizing the first prefix character, so we adjust so that when we prefix the caps with a dash, it's correct (otherwise it'd be "ms-transform" instead of "-ms-transform" for IE9, for example)
              p = "-" + p;
            }
            s.removeProperty(p.replace(_capsExp, "-$1").toLowerCase());
          } else { //note: old versions of IE use "removeAttribute()" instead of "removeProperty()"
            s.removeAttribute(p);
          }
        }
      },
      _setClassNameRatio = function(v) {
        this.t._gsClassPT = this;
        if (v === 1 || v === 0) {
          this.t.setAttribute("class", (v === 0) ? this.b : this.e);
          var mpt = this.data, //first MiniPropTween
            s = this.t.style;
          while (mpt) {
            if (!mpt.v) {
              _removeProp(s, mpt.p);
            } else {
              s[mpt.p] = mpt.v;
            }
            mpt = mpt._next;
          }
          if (v === 1 && this.t._gsClassPT === this) {
            this.t._gsClassPT = null;
          }
        } else if (this.t.getAttribute("class") !== this.e) {
          this.t.setAttribute("class", this.e);
        }
      };
    _registerComplexSpecialProp("className", {parser:function(t, e, p, cssp, pt, plugin, vars) {
      var b = t.getAttribute("class") || "", //don't use t.className because it doesn't work consistently on SVG elements; getAttribute("class") and setAttribute("class", value") is more reliable.
        cssText = t.style.cssText,
        difData, bs, cnpt, cnptLookup, mpt;
      pt = cssp._classNamePT = new CSSPropTween(t, p, 0, 0, pt, 2);
      pt.setRatio = _setClassNameRatio;
      pt.pr = -11;
      _hasPriority = true;
      pt.b = b;
      bs = _getAllStyles(t, _cs);
      //if there's a className tween already operating on the target, force it to its end so that the necessary inline styles are removed and the class name is applied before we determine the end state (we don't want inline styles interfering that were there just for class-specific values)
      cnpt = t._gsClassPT;
      if (cnpt) {
        cnptLookup = {};
        mpt = cnpt.data; //first MiniPropTween which stores the inline styles - we need to force these so that the inline styles don't contaminate things. Otherwise, there's a small chance that a tween could start and the inline values match the destination values and they never get cleaned.
        while (mpt) {
          cnptLookup[mpt.p] = 1;
          mpt = mpt._next;
        }
        cnpt.setRatio(1);
      }
      t._gsClassPT = pt;
      pt.e = (e.charAt(1) !== "=") ? e : b.replace(new RegExp("\\s*\\b" + e.substr(2) + "\\b"), "") + ((e.charAt(0) === "+") ? " " + e.substr(2) : "");
      t.setAttribute("class", pt.e);
      difData = _cssDif(t, bs, _getAllStyles(t), vars, cnptLookup);
      t.setAttribute("class", b);
      pt.data = difData.firstMPT;
      t.style.cssText = cssText; //we recorded cssText before we swapped classes and ran _getAllStyles() because in cases when a className tween is overwritten, we remove all the related tweening properties from that class change (otherwise class-specific stuff can't override properties we've directly set on the target's style object due to specificity).
      pt = pt.xfirst = cssp.parse(t, difData.difs, pt, plugin); //we record the CSSPropTween as the xfirst so that we can handle overwriting propertly (if "className" gets overwritten, we must kill all the properties associated with the className part of the tween, so we can loop through from xfirst to the pt itself)
      return pt;
    }});


    var _setClearPropsRatio = function(v) {
      if (v === 1 || v === 0) if (this.data._totalTime === this.data._totalDuration && this.data.data !== "isFromStart") { //this.data refers to the tween. Only clear at the END of the tween (remember, from() tweens make the ratio go from 1 to 0, so we can't just check that and if the tween is the zero-duration one that's created internally to render the starting values in a from() tween, ignore that because otherwise, for example, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in).
        var s = this.t.style,
          transformParse = _specialProps.transform.parse,
          a, p, i, clearTransform, transform;
        if (this.e === "all") {
          s.cssText = "";
          clearTransform = true;
        } else {
          a = this.e.split(" ").join("").split(",");
          i = a.length;
          while (--i > -1) {
            p = a[i];
            if (_specialProps[p]) {
              if (_specialProps[p].parse === transformParse) {
                clearTransform = true;
              } else {
                p = (p === "transformOrigin") ? _transformOriginProp : _specialProps[p].p; //ensures that special properties use the proper browser-specific property name, like "scaleX" might be "-webkit-transform" or "boxShadow" might be "-moz-box-shadow"
              }
            }
            _removeProp(s, p);
          }
        }
        if (clearTransform) {
          _removeProp(s, _transformProp);
          transform = this.t._gsTransform;
          if (transform) {
            if (transform.svg) {
              this.t.removeAttribute("data-svg-origin");
              this.t.removeAttribute("transform");
            }
            delete this.t._gsTransform;
          }
        }

      }
    };
    _registerComplexSpecialProp("clearProps", {parser:function(t, e, p, cssp, pt) {
      pt = new CSSPropTween(t, p, 0, 0, pt, 2);
      pt.setRatio = _setClearPropsRatio;
      pt.e = e;
      pt.pr = -10;
      pt.data = cssp._tween;
      _hasPriority = true;
      return pt;
    }});

    p = "bezier,throwProps,physicsProps,physics2D".split(",");
    i = p.length;
    while (i--) {
      _registerPluginProp(p[i]);
    }








    p = CSSPlugin.prototype;
    p._firstPT = p._lastParsedTransform = p._transform = null;

    //gets called when the tween renders for the first time. This kicks everything off, recording start/end values, etc.
    p._onInitTween = function(target, vars, tween) {
      if (!target.nodeType) { //css is only for dom elements
        return false;
      }
      this._target = target;
      this._tween = tween;
      this._vars = vars;
      _autoRound = vars.autoRound;
      _hasPriority = false;
      _suffixMap = vars.suffixMap || CSSPlugin.suffixMap;
      _cs = _getComputedStyle(target, "");
      _overwriteProps = this._overwriteProps;
      var style = target.style,
        v, pt, pt2, first, last, next, zIndex, tpt, threeD;
      if (_reqSafariFix) if (style.zIndex === "") {
        v = _getStyle(target, "zIndex", _cs);
        if (v === "auto" || v === "") {
          //corrects a bug in [non-Android] Safari that prevents it from repainting elements in their new positions if they don't have a zIndex set. We also can't just apply this inside _parseTransform() because anything that's moved in any way (like using "left" or "top" instead of transforms like "x" and "y") can be affected, so it is best to ensure that anything that's tweening has a z-index. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly. Plus zIndex is less memory-intensive.
          this._addLazySet(style, "zIndex", 0);
        }
      }

      if (typeof(vars) === "string") {
        first = style.cssText;
        v = _getAllStyles(target, _cs);
        style.cssText = first + ";" + vars;
        v = _cssDif(target, v, _getAllStyles(target)).difs;
        if (!_supportsOpacity && _opacityValExp.test(vars)) {
          v.opacity = parseFloat( RegExp.$1 );
        }
        vars = v;
        style.cssText = first;
      }

      if (vars.className) { //className tweens will combine any differences they find in the css with the vars that are passed in, so {className:"myClass", scale:0.5, left:20} would work.
        this._firstPT = pt = _specialProps.className.parse(target, vars.className, "className", this, null, null, vars);
      } else {
        this._firstPT = pt = this.parse(target, vars, null);
      }

      if (this._transformType) {
        threeD = (this._transformType === 3);
        if (!_transformProp) {
          style.zoom = 1; //helps correct an IE issue.
        } else if (_isSafari) {
          _reqSafariFix = true;
          //if zIndex isn't set, iOS Safari doesn't repaint things correctly sometimes (seemingly at random).
          if (style.zIndex === "") {
            zIndex = _getStyle(target, "zIndex", _cs);
            if (zIndex === "auto" || zIndex === "") {
              this._addLazySet(style, "zIndex", 0);
            }
          }
          //Setting WebkitBackfaceVisibility corrects 3 bugs:
          // 1) [non-Android] Safari skips rendering changes to "top" and "left" that are made on the same frame/render as a transform update.
          // 2) iOS Safari sometimes neglects to repaint elements in their new positions. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly.
          // 3) Safari sometimes displayed odd artifacts when tweening the transform (or WebkitTransform) property, like ghosts of the edges of the element remained. Definitely a browser bug.
          //Note: we allow the user to override the auto-setting by defining WebkitBackfaceVisibility in the vars of the tween.
          if (_isSafariLT6) {
            this._addLazySet(style, "WebkitBackfaceVisibility", this._vars.WebkitBackfaceVisibility || (threeD ? "visible" : "hidden"));
          }
        }
        pt2 = pt;
        while (pt2 && pt2._next) {
          pt2 = pt2._next;
        }
        tpt = new CSSPropTween(target, "transform", 0, 0, null, 2);
        this._linkCSSP(tpt, null, pt2);
        tpt.setRatio = _transformProp ? _setTransformRatio : _setIETransformRatio;
        tpt.data = this._transform || _getTransform(target, _cs, true);
        tpt.tween = tween;
        tpt.pr = -1; //ensures that the transforms get applied after the components are updated.
        _overwriteProps.pop(); //we don't want to force the overwrite of all "transform" tweens of the target - we only care about individual transform properties like scaleX, rotation, etc. The CSSPropTween constructor automatically adds the property to _overwriteProps which is why we need to pop() here.
      }

      if (_hasPriority) {
        //reorders the linked list in order of pr (priority)
        while (pt) {
          next = pt._next;
          pt2 = first;
          while (pt2 && pt2.pr > pt.pr) {
            pt2 = pt2._next;
          }
          if ((pt._prev = pt2 ? pt2._prev : last)) {
            pt._prev._next = pt;
          } else {
            first = pt;
          }
          if ((pt._next = pt2)) {
            pt2._prev = pt;
          } else {
            last = pt;
          }
          pt = next;
        }
        this._firstPT = first;
      }
      return true;
    };


    p.parse = function(target, vars, pt, plugin) {
      var style = target.style,
        p, sp, bn, en, bs, es, bsfx, esfx, isStr, rel;
      for (p in vars) {
        es = vars[p]; //ending value string
        sp = _specialProps[p]; //SpecialProp lookup.
        if (sp) {
          pt = sp.parse(target, es, p, this, pt, plugin, vars);

        } else {
          bs = _getStyle(target, p, _cs) + "";
          isStr = (typeof(es) === "string");
          if (p === "color" || p === "fill" || p === "stroke" || p.indexOf("Color") !== -1 || (isStr && _rgbhslExp.test(es))) { //Opera uses background: to define color sometimes in addition to backgroundColor:
            if (!isStr) {
              es = _parseColor(es);
              es = ((es.length > 3) ? "rgba(" : "rgb(") + es.join(",") + ")";
            }
            pt = _parseComplex(style, p, bs, es, true, "transparent", pt, 0, plugin);

          } else if (isStr && (es.indexOf(" ") !== -1 || es.indexOf(",") !== -1)) {
            pt = _parseComplex(style, p, bs, es, true, null, pt, 0, plugin);

          } else {
            bn = parseFloat(bs);
            bsfx = (bn || bn === 0) ? bs.substr((bn + "").length) : ""; //remember, bs could be non-numeric like "normal" for fontWeight, so we should default to a blank suffix in that case.

            if (bs === "" || bs === "auto") {
              if (p === "width" || p === "height") {
                bn = _getDimension(target, p, _cs);
                bsfx = "px";
              } else if (p === "left" || p === "top") {
                bn = _calculateOffset(target, p, _cs);
                bsfx = "px";
              } else {
                bn = (p !== "opacity") ? 0 : 1;
                bsfx = "";
              }
            }

            rel = (isStr && es.charAt(1) === "=");
            if (rel) {
              en = parseInt(es.charAt(0) + "1", 10);
              es = es.substr(2);
              en *= parseFloat(es);
              esfx = es.replace(_suffixExp, "");
            } else {
              en = parseFloat(es);
              esfx = isStr ? es.replace(_suffixExp, "") : "";
            }

            if (esfx === "") {
              esfx = (p in _suffixMap) ? _suffixMap[p] : bsfx; //populate the end suffix, prioritizing the map, then if none is found, use the beginning suffix.
            }

            es = (en || en === 0) ? (rel ? en + bn : en) + esfx : vars[p]; //ensures that any += or -= prefixes are taken care of. Record the end value before normalizing the suffix because we always want to end the tween on exactly what they intended even if it doesn't match the beginning value's suffix.

            //if the beginning/ending suffixes don't match, normalize them...
            if (bsfx !== esfx) if (esfx !== "") if (en || en === 0) if (bn) { //note: if the beginning value (bn) is 0, we don't need to convert units!
              bn = _convertToPixels(target, p, bn, bsfx);
              if (esfx === "%") {
                bn /= _convertToPixels(target, p, 100, "%") / 100;
                if (vars.strictUnits !== true) { //some browsers report only "px" values instead of allowing "%" with getComputedStyle(), so we assume that if we're tweening to a %, we should start there too unless strictUnits:true is defined. This approach is particularly useful for responsive designs that use from() tweens.
                  bs = bn + "%";
                }

              } else if (esfx === "em" || esfx === "rem" || esfx === "vw" || esfx === "vh") {
                bn /= _convertToPixels(target, p, 1, esfx);

              //otherwise convert to pixels.
              } else if (esfx !== "px") {
                en = _convertToPixels(target, p, en, esfx);
                esfx = "px"; //we don't use bsfx after this, so we don't need to set it to px too.
              }
              if (rel) if (en || en === 0) {
                es = (en + bn) + esfx; //the changes we made affect relative calculations, so adjust the end value here.
              }
            }

            if (rel) {
              en += bn;
            }

            if ((bn || bn === 0) && (en || en === 0)) { //faster than isNaN(). Also, previously we required en !== bn but that doesn't really gain much performance and it prevents _parseToProxy() from working properly if beginning and ending values match but need to get tweened by an external plugin anyway. For example, a bezier tween where the target starts at left:0 and has these points: [{left:50},{left:0}] wouldn't work properly because when parsing the last point, it'd match the first (current) one and a non-tweening CSSPropTween would be recorded when we actually need a normal tween (type:0) so that things get updated during the tween properly.
              pt = new CSSPropTween(style, p, bn, en - bn, pt, 0, p, (_autoRound !== false && (esfx === "px" || p === "zIndex")), 0, bs, es);
              pt.xs0 = esfx;
              //DEBUG: _log("tween "+p+" from "+pt.b+" ("+bn+esfx+") to "+pt.e+" with suffix: "+pt.xs0);
            } else if (style[p] === undefined || !es && (es + "" === "NaN" || es == null)) {
              _log("invalid " + p + " tween value: " + vars[p]);
            } else {
              pt = new CSSPropTween(style, p, en || bn || 0, 0, pt, -1, p, false, 0, bs, es);
              pt.xs0 = (es === "none" && (p === "display" || p.indexOf("Style") !== -1)) ? bs : es; //intermediate value should typically be set immediately (end value) except for "display" or things like borderTopStyle, borderBottomStyle, etc. which should use the beginning value during the tween.
              //DEBUG: _log("non-tweening value "+p+": "+pt.xs0);
            }
          }
        }
        if (plugin) if (pt && !pt.plugin) {
          pt.plugin = plugin;
        }
      }
      return pt;
    };


    //gets called every time the tween updates, passing the new ratio (typically a value between 0 and 1, but not always (for example, if an Elastic.easeOut is used, the value can jump above 1 mid-tween). It will always start and 0 and end at 1.
    p.setRatio = function(v) {
      var pt = this._firstPT,
        min = 0.000001,
        val, str, i;
      //at the end of the tween, we set the values to exactly what we received in order to make sure non-tweening values (like "position" or "float" or whatever) are set and so that if the beginning/ending suffixes (units) didn't match and we normalized to px, the value that the user passed in is used here. We check to see if the tween is at its beginning in case it's a from() tween in which case the ratio will actually go from 1 to 0 over the course of the tween (backwards).
      if (v === 1 && (this._tween._time === this._tween._duration || this._tween._time === 0)) {
        while (pt) {
          if (pt.type !== 2) {
            if (pt.r && pt.type !== -1) {
              val = Math.round(pt.s + pt.c);
              if (!pt.type) {
                pt.t[pt.p] = val + pt.xs0;
              } else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
                i = pt.l;
                str = pt.xs0 + val + pt.xs1;
                for (i = 1; i < pt.l; i++) {
                  str += pt["xn"+i] + pt["xs"+(i+1)];
                }
                pt.t[pt.p] = str;
              }
            } else {
              pt.t[pt.p] = pt.e;
            }
          } else {
            pt.setRatio(v);
          }
          pt = pt._next;
        }

      } else if (v || !(this._tween._time === this._tween._duration || this._tween._time === 0) || this._tween._rawPrevTime === -0.000001) {
        while (pt) {
          val = pt.c * v + pt.s;
          if (pt.r) {
            val = Math.round(val);
          } else if (val < min) if (val > -min) {
            val = 0;
          }
          if (!pt.type) {
            pt.t[pt.p] = val + pt.xs0;
          } else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
            i = pt.l;
            if (i === 2) {
              pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2;
            } else if (i === 3) {
              pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3;
            } else if (i === 4) {
              pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4;
            } else if (i === 5) {
              pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4 + pt.xn4 + pt.xs5;
            } else {
              str = pt.xs0 + val + pt.xs1;
              for (i = 1; i < pt.l; i++) {
                str += pt["xn"+i] + pt["xs"+(i+1)];
              }
              pt.t[pt.p] = str;
            }

          } else if (pt.type === -1) { //non-tweening value
            pt.t[pt.p] = pt.xs0;

          } else if (pt.setRatio) { //custom setRatio() for things like SpecialProps, external plugins, etc.
            pt.setRatio(v);
          }
          pt = pt._next;
        }

      //if the tween is reversed all the way back to the beginning, we need to restore the original values which may have different units (like % instead of px or em or whatever).
      } else {
        while (pt) {
          if (pt.type !== 2) {
            pt.t[pt.p] = pt.b;
          } else {
            pt.setRatio(v);
          }
          pt = pt._next;
        }
      }
    };

    /**
     * @private
     * Forces rendering of the target's transforms (rotation, scale, etc.) whenever the CSSPlugin's setRatio() is called.
     * Basically, this tells the CSSPlugin to create a CSSPropTween (type 2) after instantiation that runs last in the linked
     * list and calls the appropriate (3D or 2D) rendering function. We separate this into its own method so that we can call
     * it from other plugins like BezierPlugin if, for example, it needs to apply an autoRotation and this CSSPlugin
     * doesn't have any transform-related properties of its own. You can call this method as many times as you
     * want and it won't create duplicate CSSPropTweens.
     *
     * @param {boolean} threeD if true, it should apply 3D tweens (otherwise, just 2D ones are fine and typically faster)
     */
    p._enableTransforms = function(threeD) {
      this._transform = this._transform || _getTransform(this._target, _cs, true); //ensures that the element has a _gsTransform property with the appropriate values.
      this._transformType = (!(this._transform.svg && _useSVGTransformAttr) && (threeD || this._transformType === 3)) ? 3 : 2;
    };

    var lazySet = function(v) {
      this.t[this.p] = this.e;
      this.data._linkCSSP(this, this._next, null, true); //we purposefully keep this._next even though it'd make sense to null it, but this is a performance optimization, as this happens during the while (pt) {} loop in setRatio() at the bottom of which it sets pt = pt._next, so if we null it, the linked list will be broken in that loop.
    };
    /** @private Gives us a way to set a value on the first render (and only the first render). **/
    p._addLazySet = function(t, p, v) {
      var pt = this._firstPT = new CSSPropTween(t, p, 0, 0, this._firstPT, 2);
      pt.e = v;
      pt.setRatio = lazySet;
      pt.data = this;
    };

    /** @private **/
    p._linkCSSP = function(pt, next, prev, remove) {
      if (pt) {
        if (next) {
          next._prev = pt;
        }
        if (pt._next) {
          pt._next._prev = pt._prev;
        }
        if (pt._prev) {
          pt._prev._next = pt._next;
        } else if (this._firstPT === pt) {
          this._firstPT = pt._next;
          remove = true; //just to prevent resetting this._firstPT 5 lines down in case pt._next is null. (optimized for speed)
        }
        if (prev) {
          prev._next = pt;
        } else if (!remove && this._firstPT === null) {
          this._firstPT = pt;
        }
        pt._next = next;
        pt._prev = prev;
      }
      return pt;
    };

    //we need to make sure that if alpha or autoAlpha is killed, opacity is too. And autoAlpha affects the "visibility" property.
    p._kill = function(lookup) {
      var copy = lookup,
        pt, p, xfirst;
      if (lookup.autoAlpha || lookup.alpha) {
        copy = {};
        for (p in lookup) { //copy the lookup so that we're not changing the original which may be passed elsewhere.
          copy[p] = lookup[p];
        }
        copy.opacity = 1;
        if (copy.autoAlpha) {
          copy.visibility = 1;
        }
      }
      if (lookup.className && (pt = this._classNamePT)) { //for className tweens, we need to kill any associated CSSPropTweens too; a linked list starts at the className's "xfirst".
        xfirst = pt.xfirst;
        if (xfirst && xfirst._prev) {
          this._linkCSSP(xfirst._prev, pt._next, xfirst._prev._prev); //break off the prev
        } else if (xfirst === this._firstPT) {
          this._firstPT = pt._next;
        }
        if (pt._next) {
          this._linkCSSP(pt._next, pt._next._next, xfirst._prev);
        }
        this._classNamePT = null;
      }
      return TweenPlugin.prototype._kill.call(this, copy);
    };



    //used by cascadeTo() for gathering all the style properties of each child element into an array for comparison.
    var _getChildStyles = function(e, props, targets) {
        var children, i, child, type;
        if (e.slice) {
          i = e.length;
          while (--i > -1) {
            _getChildStyles(e[i], props, targets);
          }
          return;
        }
        children = e.childNodes;
        i = children.length;
        while (--i > -1) {
          child = children[i];
          type = child.type;
          if (child.style) {
            props.push(_getAllStyles(child));
            if (targets) {
              targets.push(child);
            }
          }
          if ((type === 1 || type === 9 || type === 11) && child.childNodes.length) {
            _getChildStyles(child, props, targets);
          }
        }
      };

    /**
     * Typically only useful for className tweens that may affect child elements, this method creates a TweenLite
     * and then compares the style properties of all the target's child elements at the tween's start and end, and
     * if any are different, it also creates tweens for those and returns an array containing ALL of the resulting
     * tweens (so that you can easily add() them to a TimelineLite, for example). The reason this functionality is
     * wrapped into a separate static method of CSSPlugin instead of being integrated into all regular className tweens
     * is because it creates entirely new tweens that may have completely different targets than the original tween,
     * so if they were all lumped into the original tween instance, it would be inconsistent with the rest of the API
     * and it would create other problems. For example:
     *  - If I create a tween of elementA, that tween instance may suddenly change its target to include 50 other elements (unintuitive if I specifically defined the target I wanted)
     *  - We can't just create new independent tweens because otherwise, what happens if the original/parent tween is reversed or pause or dropped into a TimelineLite for tight control? You'd expect that tween's behavior to affect all the others.
     *  - Analyzing every style property of every child before and after the tween is an expensive operation when there are many children, so this behavior shouldn't be imposed on all className tweens by default, especially since it's probably rare that this extra functionality is needed.
     *
     * @param {Object} target object to be tweened
     * @param {number} Duration in seconds (or frames for frames-based tweens)
     * @param {Object} Object containing the end values, like {className:"newClass", ease:Linear.easeNone}
     * @return {Array} An array of TweenLite instances
     */
    CSSPlugin.cascadeTo = function(target, duration, vars) {
      var tween = TweenLite.to(target, duration, vars),
        results = [tween],
        b = [],
        e = [],
        targets = [],
        _reservedProps = TweenLite._internals.reservedProps,
        i, difs, p, from;
      target = tween._targets || tween.target;
      _getChildStyles(target, b, targets);
      tween.render(duration, true, true);
      _getChildStyles(target, e);
      tween.render(0, true, true);
      tween._enabled(true);
      i = targets.length;
      while (--i > -1) {
        difs = _cssDif(targets[i], b[i], e[i]);
        if (difs.firstMPT) {
          difs = difs.difs;
          for (p in vars) {
            if (_reservedProps[p]) {
              difs[p] = vars[p];
            }
          }
          from = {};
          for (p in difs) {
            from[p] = b[i][p];
          }
          results.push(TweenLite.fromTo(targets[i], duration, from, difs));
        }
      }
      return results;
    };

    TweenPlugin.activate([CSSPlugin]);
    return CSSPlugin;

  }, true);

  
  
  
  
  
  
  
  
  
  
/*
 * ----------------------------------------------------------------
 * RoundPropsPlugin
 * ----------------------------------------------------------------
 */
  (function() {

    var RoundPropsPlugin = _gsScope._gsDefine.plugin({
        propName: "roundProps",
        version: "1.5",
        priority: -1,
        API: 2,

        //called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
        init: function(target, value, tween) {
          this._tween = tween;
          return true;
        }

      }),
      _roundLinkedList = function(node) {
        while (node) {
          if (!node.f && !node.blob) {
            node.r = 1;
          }
          node = node._next;
        }
      },
      p = RoundPropsPlugin.prototype;

    p._onInitAllProps = function() {
      var tween = this._tween,
        rp = (tween.vars.roundProps.join) ? tween.vars.roundProps : tween.vars.roundProps.split(","),
        i = rp.length,
        lookup = {},
        rpt = tween._propLookup.roundProps,
        prop, pt, next;
      while (--i > -1) {
        lookup[rp[i]] = 1;
      }
      i = rp.length;
      while (--i > -1) {
        prop = rp[i];
        pt = tween._firstPT;
        while (pt) {
          next = pt._next; //record here, because it may get removed
          if (pt.pg) {
            pt.t._roundProps(lookup, true);
          } else if (pt.n === prop) {
            if (pt.f === 2 && pt.t) { //a blob (text containing multiple numeric values)
              _roundLinkedList(pt.t._firstPT);
            } else {
              this._add(pt.t, prop, pt.s, pt.c);
              //remove from linked list
              if (next) {
                next._prev = pt._prev;
              }
              if (pt._prev) {
                pt._prev._next = next;
              } else if (tween._firstPT === pt) {
                tween._firstPT = next;
              }
              pt._next = pt._prev = null;
              tween._propLookup[prop] = rpt;
            }
          }
          pt = next;
        }
      }
      return false;
    };

    p._add = function(target, p, s, c) {
      this._addTween(target, p, s, s + c, p, true);
      this._overwriteProps.push(p);
    };

  }());










/*
 * ----------------------------------------------------------------
 * AttrPlugin
 * ----------------------------------------------------------------
 */

  (function() {

    _gsScope._gsDefine.plugin({
      propName: "attr",
      API: 2,
      version: "0.5.0",

      //called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
      init: function(target, value, tween) {
        var p;
        if (typeof(target.setAttribute) !== "function") {
          return false;
        }
        for (p in value) {
          this._addTween(target, "setAttribute", target.getAttribute(p) + "", value[p] + "", p, false, p);
          this._overwriteProps.push(p);
        }
        return true;
      }

    });

  }());










/*
 * ----------------------------------------------------------------
 * DirectionalRotationPlugin
 * ----------------------------------------------------------------
 */
  _gsScope._gsDefine.plugin({
    propName: "directionalRotation",
    version: "0.2.1",
    API: 2,

    //called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
    init: function(target, value, tween) {
      if (typeof(value) !== "object") {
        value = {rotation:value};
      }
      this.finals = {};
      var cap = (value.useRadians === true) ? Math.PI * 2 : 360,
        min = 0.000001,
        p, v, start, end, dif, split;
      for (p in value) {
        if (p !== "useRadians") {
          split = (value[p] + "").split("_");
          v = split[0];
          start = parseFloat( (typeof(target[p]) !== "function") ? target[p] : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]() );
          end = this.finals[p] = (typeof(v) === "string" && v.charAt(1) === "=") ? start + parseInt(v.charAt(0) + "1", 10) * Number(v.substr(2)) : Number(v) || 0;
          dif = end - start;
          if (split.length) {
            v = split.join("_");
            if (v.indexOf("short") !== -1) {
              dif = dif % cap;
              if (dif !== dif % (cap / 2)) {
                dif = (dif < 0) ? dif + cap : dif - cap;
              }
            }
            if (v.indexOf("_cw") !== -1 && dif < 0) {
              dif = ((dif + cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
            } else if (v.indexOf("ccw") !== -1 && dif > 0) {
              dif = ((dif - cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
            }
          }
          if (dif > min || dif < -min) {
            this._addTween(target, p, start, start + dif, p);
            this._overwriteProps.push(p);
          }
        }
      }
      return true;
    },

    //called each time the values should be updated, and the ratio gets passed as the only parameter (typically it's a value between 0 and 1, but it can exceed those when using an ease like Elastic.easeOut or Back.easeOut, etc.)
    set: function(ratio) {
      var pt;
      if (ratio !== 1) {
        this._super.setRatio.call(this, ratio);
      } else {
        pt = this._firstPT;
        while (pt) {
          if (pt.f) {
            pt.t[pt.p](this.finals[pt.p]);
          } else {
            pt.t[pt.p] = this.finals[pt.p];
          }
          pt = pt._next;
        }
      }
    }

  })._autoCSS = true;







  
  
  
  
/*
 * ----------------------------------------------------------------
 * EasePack
 * ----------------------------------------------------------------
 */
  _gsScope._gsDefine("easing.Back", ["easing.Ease"], function(Ease) {
    
    var w = (_gsScope.GreenSockGlobals || _gsScope),
      gs = w.com.greensock,
      _2PI = Math.PI * 2,
      _HALF_PI = Math.PI / 2,
      _class = gs._class,
      _create = function(n, f) {
        var C = _class("easing." + n, function(){}, true),
          p = C.prototype = new Ease();
        p.constructor = C;
        p.getRatio = f;
        return C;
      },
      _easeReg = Ease.register || function(){}, //put an empty function in place just as a safety measure in case someone loads an OLD version of TweenLite.js where Ease.register doesn't exist.
      _wrap = function(name, EaseOut, EaseIn, EaseInOut, aliases) {
        var C = _class("easing."+name, {
          easeOut:new EaseOut(),
          easeIn:new EaseIn(),
          easeInOut:new EaseInOut()
        }, true);
        _easeReg(C, name);
        return C;
      },
      EasePoint = function(time, value, next) {
        this.t = time;
        this.v = value;
        if (next) {
          this.next = next;
          next.prev = this;
          this.c = next.v - value;
          this.gap = next.t - time;
        }
      },

      //Back
      _createBack = function(n, f) {
        var C = _class("easing." + n, function(overshoot) {
            this._p1 = (overshoot || overshoot === 0) ? overshoot : 1.70158;
            this._p2 = this._p1 * 1.525;
          }, true),
          p = C.prototype = new Ease();
        p.constructor = C;
        p.getRatio = f;
        p.config = function(overshoot) {
          return new C(overshoot);
        };
        return C;
      },

      Back = _wrap("Back",
        _createBack("BackOut", function(p) {
          return ((p = p - 1) * p * ((this._p1 + 1) * p + this._p1) + 1);
        }),
        _createBack("BackIn", function(p) {
          return p * p * ((this._p1 + 1) * p - this._p1);
        }),
        _createBack("BackInOut", function(p) {
          return ((p *= 2) < 1) ? 0.5 * p * p * ((this._p2 + 1) * p - this._p2) : 0.5 * ((p -= 2) * p * ((this._p2 + 1) * p + this._p2) + 2);
        })
      ),


      //SlowMo
      SlowMo = _class("easing.SlowMo", function(linearRatio, power, yoyoMode) {
        power = (power || power === 0) ? power : 0.7;
        if (linearRatio == null) {
          linearRatio = 0.7;
        } else if (linearRatio > 1) {
          linearRatio = 1;
        }
        this._p = (linearRatio !== 1) ? power : 0;
        this._p1 = (1 - linearRatio) / 2;
        this._p2 = linearRatio;
        this._p3 = this._p1 + this._p2;
        this._calcEnd = (yoyoMode === true);
      }, true),
      p = SlowMo.prototype = new Ease(),
      SteppedEase, RoughEase, _createElastic;

    p.constructor = SlowMo;
    p.getRatio = function(p) {
      var r = p + (0.5 - p) * this._p;
      if (p < this._p1) {
        return this._calcEnd ? 1 - ((p = 1 - (p / this._p1)) * p) : r - ((p = 1 - (p / this._p1)) * p * p * p * r);
      } else if (p > this._p3) {
        return this._calcEnd ? 1 - (p = (p - this._p3) / this._p1) * p : r + ((p - r) * (p = (p - this._p3) / this._p1) * p * p * p);
      }
      return this._calcEnd ? 1 : r;
    };
    SlowMo.ease = new SlowMo(0.7, 0.7);

    p.config = SlowMo.config = function(linearRatio, power, yoyoMode) {
      return new SlowMo(linearRatio, power, yoyoMode);
    };


    //SteppedEase
    SteppedEase = _class("easing.SteppedEase", function(steps) {
        steps = steps || 1;
        this._p1 = 1 / steps;
        this._p2 = steps + 1;
      }, true);
    p = SteppedEase.prototype = new Ease();
    p.constructor = SteppedEase;
    p.getRatio = function(p) {
      if (p < 0) {
        p = 0;
      } else if (p >= 1) {
        p = 0.999999999;
      }
      return ((this._p2 * p) >> 0) * this._p1;
    };
    p.config = SteppedEase.config = function(steps) {
      return new SteppedEase(steps);
    };


    //RoughEase
    RoughEase = _class("easing.RoughEase", function(vars) {
      vars = vars || {};
      var taper = vars.taper || "none",
        a = [],
        cnt = 0,
        points = (vars.points || 20) | 0,
        i = points,
        randomize = (vars.randomize !== false),
        clamp = (vars.clamp === true),
        template = (vars.template instanceof Ease) ? vars.template : null,
        strength = (typeof(vars.strength) === "number") ? vars.strength * 0.4 : 0.4,
        x, y, bump, invX, obj, pnt;
      while (--i > -1) {
        x = randomize ? Math.random() : (1 / points) * i;
        y = template ? template.getRatio(x) : x;
        if (taper === "none") {
          bump = strength;
        } else if (taper === "out") {
          invX = 1 - x;
          bump = invX * invX * strength;
        } else if (taper === "in") {
          bump = x * x * strength;
        } else if (x < 0.5) {  //"both" (start)
          invX = x * 2;
          bump = invX * invX * 0.5 * strength;
        } else {        //"both" (end)
          invX = (1 - x) * 2;
          bump = invX * invX * 0.5 * strength;
        }
        if (randomize) {
          y += (Math.random() * bump) - (bump * 0.5);
        } else if (i % 2) {
          y += bump * 0.5;
        } else {
          y -= bump * 0.5;
        }
        if (clamp) {
          if (y > 1) {
            y = 1;
          } else if (y < 0) {
            y = 0;
          }
        }
        a[cnt++] = {x:x, y:y};
      }
      a.sort(function(a, b) {
        return a.x - b.x;
      });

      pnt = new EasePoint(1, 1, null);
      i = points;
      while (--i > -1) {
        obj = a[i];
        pnt = new EasePoint(obj.x, obj.y, pnt);
      }

      this._prev = new EasePoint(0, 0, (pnt.t !== 0) ? pnt : pnt.next);
    }, true);
    p = RoughEase.prototype = new Ease();
    p.constructor = RoughEase;
    p.getRatio = function(p) {
      var pnt = this._prev;
      if (p > pnt.t) {
        while (pnt.next && p >= pnt.t) {
          pnt = pnt.next;
        }
        pnt = pnt.prev;
      } else {
        while (pnt.prev && p <= pnt.t) {
          pnt = pnt.prev;
        }
      }
      this._prev = pnt;
      return (pnt.v + ((p - pnt.t) / pnt.gap) * pnt.c);
    };
    p.config = function(vars) {
      return new RoughEase(vars);
    };
    RoughEase.ease = new RoughEase();


    //Bounce
    _wrap("Bounce",
      _create("BounceOut", function(p) {
        if (p < 1 / 2.75) {
          return 7.5625 * p * p;
        } else if (p < 2 / 2.75) {
          return 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
        } else if (p < 2.5 / 2.75) {
          return 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
        }
        return 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
      }),
      _create("BounceIn", function(p) {
        if ((p = 1 - p) < 1 / 2.75) {
          return 1 - (7.5625 * p * p);
        } else if (p < 2 / 2.75) {
          return 1 - (7.5625 * (p -= 1.5 / 2.75) * p + 0.75);
        } else if (p < 2.5 / 2.75) {
          return 1 - (7.5625 * (p -= 2.25 / 2.75) * p + 0.9375);
        }
        return 1 - (7.5625 * (p -= 2.625 / 2.75) * p + 0.984375);
      }),
      _create("BounceInOut", function(p) {
        var invert = (p < 0.5);
        if (invert) {
          p = 1 - (p * 2);
        } else {
          p = (p * 2) - 1;
        }
        if (p < 1 / 2.75) {
          p = 7.5625 * p * p;
        } else if (p < 2 / 2.75) {
          p = 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
        } else if (p < 2.5 / 2.75) {
          p = 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
        } else {
          p = 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
        }
        return invert ? (1 - p) * 0.5 : p * 0.5 + 0.5;
      })
    );


    //CIRC
    _wrap("Circ",
      _create("CircOut", function(p) {
        return Math.sqrt(1 - (p = p - 1) * p);
      }),
      _create("CircIn", function(p) {
        return -(Math.sqrt(1 - (p * p)) - 1);
      }),
      _create("CircInOut", function(p) {
        return ((p*=2) < 1) ? -0.5 * (Math.sqrt(1 - p * p) - 1) : 0.5 * (Math.sqrt(1 - (p -= 2) * p) + 1);
      })
    );


    //Elastic
    _createElastic = function(n, f, def) {
      var C = _class("easing." + n, function(amplitude, period) {
          this._p1 = (amplitude >= 1) ? amplitude : 1; //note: if amplitude is < 1, we simply adjust the period for a more natural feel. Otherwise the math doesn't work right and the curve starts at 1.
          this._p2 = (period || def) / (amplitude < 1 ? amplitude : 1);
          this._p3 = this._p2 / _2PI * (Math.asin(1 / this._p1) || 0);
          this._p2 = _2PI / this._p2; //precalculate to optimize
        }, true),
        p = C.prototype = new Ease();
      p.constructor = C;
      p.getRatio = f;
      p.config = function(amplitude, period) {
        return new C(amplitude, period);
      };
      return C;
    };
    _wrap("Elastic",
      _createElastic("ElasticOut", function(p) {
        return this._p1 * Math.pow(2, -10 * p) * Math.sin( (p - this._p3) * this._p2 ) + 1;
      }, 0.3),
      _createElastic("ElasticIn", function(p) {
        return -(this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * this._p2 ));
      }, 0.3),
      _createElastic("ElasticInOut", function(p) {
        return ((p *= 2) < 1) ? -0.5 * (this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * this._p2)) : this._p1 * Math.pow(2, -10 *(p -= 1)) * Math.sin( (p - this._p3) * this._p2 ) * 0.5 + 1;
      }, 0.45)
    );


    //Expo
    _wrap("Expo",
      _create("ExpoOut", function(p) {
        return 1 - Math.pow(2, -10 * p);
      }),
      _create("ExpoIn", function(p) {
        return Math.pow(2, 10 * (p - 1)) - 0.001;
      }),
      _create("ExpoInOut", function(p) {
        return ((p *= 2) < 1) ? 0.5 * Math.pow(2, 10 * (p - 1)) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));
      })
    );


    //Sine
    _wrap("Sine",
      _create("SineOut", function(p) {
        return Math.sin(p * _HALF_PI);
      }),
      _create("SineIn", function(p) {
        return -Math.cos(p * _HALF_PI) + 1;
      }),
      _create("SineInOut", function(p) {
        return -0.5 * (Math.cos(Math.PI * p) - 1);
      })
    );

    _class("easing.EaseLookup", {
        find:function(s) {
          return Ease.map[s];
        }
      }, true);

    //register the non-standard eases
    _easeReg(w.SlowMo, "SlowMo", "ease,");
    _easeReg(RoughEase, "RoughEase", "ease,");
    _easeReg(SteppedEase, "SteppedEase", "ease,");

    return Back;
    
  }, true);


});

if (_gsScope._gsDefine) { _gsScope._gsQueue.pop()(); } //necessary in case TweenLite was already loaded separately.











/*
 * ----------------------------------------------------------------
 * Base classes like TweenLite, SimpleTimeline, Ease, Ticker, etc.
 * ----------------------------------------------------------------
 */
(function(window, moduleName) {

    "use strict";
    var _globals = window.GreenSockGlobals = window.GreenSockGlobals || window;
    if (_globals.TweenLite) {
      return; //in case the core set of classes is already loaded, don't instantiate twice.
    }
    var _namespace = function(ns) {
        var a = ns.split("."),
          p = _globals, i;
        for (i = 0; i < a.length; i++) {
          p[a[i]] = p = p[a[i]] || {};
        }
        return p;
      },
      gs = _namespace("com.greensock"),
      _tinyNum = 0.0000000001,
      _slice = function(a) { //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
        var b = [],
          l = a.length,
          i;
        for (i = 0; i !== l; b.push(a[i++])) {}
        return b;
      },
      _emptyFunc = function() {},
      _isArray = (function() { //works around issues in iframe environments where the Array global isn't shared, thus if the object originates in a different window/iframe, "(obj instanceof Array)" will evaluate false. We added some speed optimizations to avoid Object.prototype.toString.call() unless it's absolutely necessary because it's VERY slow (like 20x slower)
        var toString = Object.prototype.toString,
          array = toString.call([]);
        return function(obj) {
          return obj != null && (obj instanceof Array || (typeof(obj) === "object" && !!obj.push && toString.call(obj) === array));
        };
      }()),
      a, i, p, _ticker, _tickerActive,
      _defLookup = {},

      /**
       * @constructor
       * Defines a GreenSock class, optionally with an array of dependencies that must be instantiated first and passed into the definition.
       * This allows users to load GreenSock JS files in any order even if they have interdependencies (like CSSPlugin extends TweenPlugin which is
       * inside TweenLite.js, but if CSSPlugin is loaded first, it should wait to run its code until TweenLite.js loads and instantiates TweenPlugin
       * and then pass TweenPlugin to CSSPlugin's definition). This is all done automatically and internally.
       *
       * Every definition will be added to a "com.greensock" global object (typically window, but if a window.GreenSockGlobals object is found,
       * it will go there as of v1.7). For example, TweenLite will be found at window.com.greensock.TweenLite and since it's a global class that should be available anywhere,
       * it is ALSO referenced at window.TweenLite. However some classes aren't considered global, like the base com.greensock.core.Animation class, so
       * those will only be at the package like window.com.greensock.core.Animation. Again, if you define a GreenSockGlobals object on the window, everything
       * gets tucked neatly inside there instead of on the window directly. This allows you to do advanced things like load multiple versions of GreenSock
       * files and put them into distinct objects (imagine a banner ad uses a newer version but the main site uses an older one). In that case, you could
       * sandbox the banner one like:
       *
       * <script>
       *     var gs = window.GreenSockGlobals = {}; //the newer version we're about to load could now be referenced in a "gs" object, like gs.TweenLite.to(...). Use whatever alias you want as long as it's unique, "gs" or "banner" or whatever.
       * </script>
       * <script src="js/greensock/v1.7/TweenMax.js"></script>
       * <script>
       *     window.GreenSockGlobals = window._gsQueue = window._gsDefine = null; //reset it back to null (along with the special _gsQueue variable) so that the next load of TweenMax affects the window and we can reference things directly like TweenLite.to(...)
       * </script>
       * <script src="js/greensock/v1.6/TweenMax.js"></script>
       * <script>
       *     gs.TweenLite.to(...); //would use v1.7
       *     TweenLite.to(...); //would use v1.6
       * </script>
       *
       * @param {!string} ns The namespace of the class definition, leaving off "com.greensock." as that's assumed. For example, "TweenLite" or "plugins.CSSPlugin" or "easing.Back".
       * @param {!Array.<string>} dependencies An array of dependencies (described as their namespaces minus "com.greensock." prefix). For example ["TweenLite","plugins.TweenPlugin","core.Animation"]
       * @param {!function():Object} func The function that should be called and passed the resolved dependencies which will return the actual class for this definition.
       * @param {boolean=} global If true, the class will be added to the global scope (typically window unless you define a window.GreenSockGlobals object)
       */
      Definition = function(ns, dependencies, func, global) {
        this.sc = (_defLookup[ns]) ? _defLookup[ns].sc : []; //subclasses
        _defLookup[ns] = this;
        this.gsClass = null;
        this.func = func;
        var _classes = [];
        this.check = function(init) {
          var i = dependencies.length,
            missing = i,
            cur, a, n, cl, hasModule;
          while (--i > -1) {
            if ((cur = _defLookup[dependencies[i]] || new Definition(dependencies[i], [])).gsClass) {
              _classes[i] = cur.gsClass;
              missing--;
            } else if (init) {
              cur.sc.push(this);
            }
          }
          if (missing === 0 && func) {
            a = ("com.greensock." + ns).split(".");
            n = a.pop();
            cl = _namespace(a.join("."))[n] = this.gsClass = func.apply(func, _classes);

            //exports to multiple environments
            if (global) {
              _globals[n] = cl; //provides a way to avoid global namespace pollution. By default, the main classes like TweenLite, Power1, Strong, etc. are added to window unless a GreenSockGlobals is defined. So if you want to have things added to a custom object instead, just do something like window.GreenSockGlobals = {} before loading any GreenSock files. You can even set up an alias like window.GreenSockGlobals = windows.gs = {} so that you can access everything like gs.TweenLite. Also remember that ALL classes are added to the window.com.greensock object (in their respective packages, like com.greensock.easing.Power1, com.greensock.TweenLite, etc.)
              hasModule = (typeof(module) !== "undefined" && module.exports);
              if (!hasModule && typeof(define) === "function" && define.amd){ //AMD
                define((window.GreenSockAMDPath ? window.GreenSockAMDPath + "/" : "") + ns.split(".").pop(), [], function() { return cl; });
              } else if (ns === moduleName && hasModule){ //node
                module.exports = cl;
              }
            }
            for (i = 0; i < this.sc.length; i++) {
              this.sc[i].check();
            }
          }
        };
        this.check(true);
      },

      //used to create Definition instances (which basically registers a class that has dependencies).
      _gsDefine = window._gsDefine = function(ns, dependencies, func, global) {
        return new Definition(ns, dependencies, func, global);
      },

      //a quick way to create a class that doesn't have any dependencies. Returns the class, but first registers it in the GreenSock namespace so that other classes can grab it (other classes might be dependent on the class).
      _class = gs._class = function(ns, func, global) {
        func = func || function() {};
        _gsDefine(ns, [], function(){ return func; }, global);
        return func;
      };

    _gsDefine.globals = _globals;



/*
 * ----------------------------------------------------------------
 * Ease
 * ----------------------------------------------------------------
 */
    var _baseParams = [0, 0, 1, 1],
      _blankArray = [],
      Ease = _class("easing.Ease", function(func, extraParams, type, power) {
        this._func = func;
        this._type = type || 0;
        this._power = power || 0;
        this._params = extraParams ? _baseParams.concat(extraParams) : _baseParams;
      }, true),
      _easeMap = Ease.map = {},
      _easeReg = Ease.register = function(ease, names, types, create) {
        var na = names.split(","),
          i = na.length,
          ta = (types || "easeIn,easeOut,easeInOut").split(","),
          e, name, j, type;
        while (--i > -1) {
          name = na[i];
          e = create ? _class("easing."+name, null, true) : gs.easing[name] || {};
          j = ta.length;
          while (--j > -1) {
            type = ta[j];
            _easeMap[name + "." + type] = _easeMap[type + name] = e[type] = ease.getRatio ? ease : ease[type] || new ease();
          }
        }
      };

    p = Ease.prototype;
    p._calcEnd = false;
    p.getRatio = function(p) {
      if (this._func) {
        this._params[0] = p;
        return this._func.apply(null, this._params);
      }
      var t = this._type,
        pw = this._power,
        r = (t === 1) ? 1 - p : (t === 2) ? p : (p < 0.5) ? p * 2 : (1 - p) * 2;
      if (pw === 1) {
        r *= r;
      } else if (pw === 2) {
        r *= r * r;
      } else if (pw === 3) {
        r *= r * r * r;
      } else if (pw === 4) {
        r *= r * r * r * r;
      }
      return (t === 1) ? 1 - r : (t === 2) ? r : (p < 0.5) ? r / 2 : 1 - (r / 2);
    };

    //create all the standard eases like Linear, Quad, Cubic, Quart, Quint, Strong, Power0, Power1, Power2, Power3, and Power4 (each with easeIn, easeOut, and easeInOut)
    a = ["Linear","Quad","Cubic","Quart","Quint,Strong"];
    i = a.length;
    while (--i > -1) {
      p = a[i]+",Power"+i;
      _easeReg(new Ease(null,null,1,i), p, "easeOut", true);
      _easeReg(new Ease(null,null,2,i), p, "easeIn" + ((i === 0) ? ",easeNone" : ""));
      _easeReg(new Ease(null,null,3,i), p, "easeInOut");
    }
    _easeMap.linear = gs.easing.Linear.easeIn;
    _easeMap.swing = gs.easing.Quad.easeInOut; //for jQuery folks


/*
 * ----------------------------------------------------------------
 * EventDispatcher
 * ----------------------------------------------------------------
 */
    var EventDispatcher = _class("events.EventDispatcher", function(target) {
      this._listeners = {};
      this._eventTarget = target || this;
    });
    p = EventDispatcher.prototype;

    p.addEventListener = function(type, callback, scope, useParam, priority) {
      priority = priority || 0;
      var list = this._listeners[type],
        index = 0,
        listener, i;
      if (list == null) {
        this._listeners[type] = list = [];
      }
      i = list.length;
      while (--i > -1) {
        listener = list[i];
        if (listener.c === callback && listener.s === scope) {
          list.splice(i, 1);
        } else if (index === 0 && listener.pr < priority) {
          index = i + 1;
        }
      }
      list.splice(index, 0, {c:callback, s:scope, up:useParam, pr:priority});
      if (this === _ticker && !_tickerActive) {
        _ticker.wake();
      }
    };

    p.removeEventListener = function(type, callback) {
      var list = this._listeners[type], i;
      if (list) {
        i = list.length;
        while (--i > -1) {
          if (list[i].c === callback) {
            list.splice(i, 1);
            return;
          }
        }
      }
    };

    p.dispatchEvent = function(type) {
      var list = this._listeners[type],
        i, t, listener;
      if (list) {
        i = list.length;
        t = this._eventTarget;
        while (--i > -1) {
          listener = list[i];
          if (listener) {
            if (listener.up) {
              listener.c.call(listener.s || t, {type:type, target:t});
            } else {
              listener.c.call(listener.s || t);
            }
          }
        }
      }
    };


/*
 * ----------------------------------------------------------------
 * Ticker
 * ----------------------------------------------------------------
 */
    var _reqAnimFrame = window.requestAnimationFrame,
      _cancelAnimFrame = window.cancelAnimationFrame,
      _getTime = Date.now || function() {return new Date().getTime();},
      _lastUpdate = _getTime();

    //now try to determine the requestAnimationFrame and cancelAnimationFrame functions and if none are found, we'll use a setTimeout()/clearTimeout() polyfill.
    a = ["ms","moz","webkit","o"];
    i = a.length;
    while (--i > -1 && !_reqAnimFrame) {
      _reqAnimFrame = window[a[i] + "RequestAnimationFrame"];
      _cancelAnimFrame = window[a[i] + "CancelAnimationFrame"] || window[a[i] + "CancelRequestAnimationFrame"];
    }

    _class("Ticker", function(fps, useRAF) {
      var _self = this,
        _startTime = _getTime(),
        _useRAF = (useRAF !== false && _reqAnimFrame) ? "auto" : false,
        _lagThreshold = 500,
        _adjustedLag = 33,
        _tickWord = "tick", //helps reduce gc burden
        _fps, _req, _id, _gap, _nextTime,
        _tick = function(manual) {
          var elapsed = _getTime() - _lastUpdate,
            overlap, dispatch;
          if (elapsed > _lagThreshold) {
            _startTime += elapsed - _adjustedLag;
          }
          _lastUpdate += elapsed;
          _self.time = (_lastUpdate - _startTime) / 1000;
          overlap = _self.time - _nextTime;
          if (!_fps || overlap > 0 || manual === true) {
            _self.frame++;
            _nextTime += overlap + (overlap >= _gap ? 0.004 : _gap - overlap);
            dispatch = true;
          }
          if (manual !== true) { //make sure the request is made before we dispatch the "tick" event so that timing is maintained. Otherwise, if processing the "tick" requires a bunch of time (like 15ms) and we're using a setTimeout() that's based on 16.7ms, it'd technically take 31.7ms between frames otherwise.
            _id = _req(_tick);
          }
          if (dispatch) {
            _self.dispatchEvent(_tickWord);
          }
        };

      EventDispatcher.call(_self);
      _self.time = _self.frame = 0;
      _self.tick = function() {
        _tick(true);
      };

      _self.lagSmoothing = function(threshold, adjustedLag) {
        _lagThreshold = threshold || (1 / _tinyNum); //zero should be interpreted as basically unlimited
        _adjustedLag = Math.min(adjustedLag, _lagThreshold, 0);
      };

      _self.sleep = function() {
        if (_id == null) {
          return;
        }
        if (!_useRAF || !_cancelAnimFrame) {
          clearTimeout(_id);
        } else {
          _cancelAnimFrame(_id);
        }
        _req = _emptyFunc;
        _id = null;
        if (_self === _ticker) {
          _tickerActive = false;
        }
      };

      _self.wake = function(seamless) {
        if (_id !== null) {
          _self.sleep();
        } else if (seamless) {
          _startTime += -_lastUpdate + (_lastUpdate = _getTime());
        } else if (_self.frame > 10) { //don't trigger lagSmoothing if we're just waking up, and make sure that at least 10 frames have elapsed because of the iOS bug that we work around below with the 1.5-second setTimout().
          _lastUpdate = _getTime() - _lagThreshold + 5;
        }
        _req = (_fps === 0) ? _emptyFunc : (!_useRAF || !_reqAnimFrame) ? function(f) { return setTimeout(f, ((_nextTime - _self.time) * 1000 + 1) | 0); } : _reqAnimFrame;
        if (_self === _ticker) {
          _tickerActive = true;
        }
        _tick(2);
      };

      _self.fps = function(value) {
        if (!arguments.length) {
          return _fps;
        }
        _fps = value;
        _gap = 1 / (_fps || 60);
        _nextTime = this.time + _gap;
        _self.wake();
      };

      _self.useRAF = function(value) {
        if (!arguments.length) {
          return _useRAF;
        }
        _self.sleep();
        _useRAF = value;
        _self.fps(_fps);
      };
      _self.fps(fps);

      //a bug in iOS 6 Safari occasionally prevents the requestAnimationFrame from working initially, so we use a 1.5-second timeout that automatically falls back to setTimeout() if it senses this condition.
      setTimeout(function() {
        if (_useRAF === "auto" && _self.frame < 5 && document.visibilityState !== "hidden") {
          _self.useRAF(false);
        }
      }, 1500);
    });

    p = gs.Ticker.prototype = new gs.events.EventDispatcher();
    p.constructor = gs.Ticker;


/*
 * ----------------------------------------------------------------
 * Animation
 * ----------------------------------------------------------------
 */
    var Animation = _class("core.Animation", function(duration, vars) {
        this.vars = vars = vars || {};
        this._duration = this._totalDuration = duration || 0;
        this._delay = Number(vars.delay) || 0;
        this._timeScale = 1;
        this._active = (vars.immediateRender === true);
        this.data = vars.data;
        this._reversed = (vars.reversed === true);

        if (!_rootTimeline) {
          return;
        }
        if (!_tickerActive) { //some browsers (like iOS 6 Safari) shut down JavaScript execution when the tab is disabled and they [occasionally] neglect to start up requestAnimationFrame again when returning - this code ensures that the engine starts up again properly.
          _ticker.wake();
        }

        var tl = this.vars.useFrames ? _rootFramesTimeline : _rootTimeline;
        tl.add(this, tl._time);

        if (this.vars.paused) {
          this.paused(true);
        }
      });

    _ticker = Animation.ticker = new gs.Ticker();
    p = Animation.prototype;
    p._dirty = p._gc = p._initted = p._paused = false;
    p._totalTime = p._time = 0;
    p._rawPrevTime = -1;
    p._next = p._last = p._onUpdate = p._timeline = p.timeline = null;
    p._paused = false;


    //some browsers (like iOS) occasionally drop the requestAnimationFrame event when the user switches to a different tab and then comes back again, so we use a 2-second setTimeout() to sense if/when that condition occurs and then wake() the ticker.
    var _checkTimeout = function() {
        if (_tickerActive && _getTime() - _lastUpdate > 2000) {
          _ticker.wake();
        }
        setTimeout(_checkTimeout, 2000);
      };
    _checkTimeout();


    p.play = function(from, suppressEvents) {
      if (from != null) {
        this.seek(from, suppressEvents);
      }
      return this.reversed(false).paused(false);
    };

    p.pause = function(atTime, suppressEvents) {
      if (atTime != null) {
        this.seek(atTime, suppressEvents);
      }
      return this.paused(true);
    };

    p.resume = function(from, suppressEvents) {
      if (from != null) {
        this.seek(from, suppressEvents);
      }
      return this.paused(false);
    };

    p.seek = function(time, suppressEvents) {
      return this.totalTime(Number(time), suppressEvents !== false);
    };

    p.restart = function(includeDelay, suppressEvents) {
      return this.reversed(false).paused(false).totalTime(includeDelay ? -this._delay : 0, (suppressEvents !== false), true);
    };

    p.reverse = function(from, suppressEvents) {
      if (from != null) {
        this.seek((from || this.totalDuration()), suppressEvents);
      }
      return this.reversed(true).paused(false);
    };

    p.render = function(time, suppressEvents, force) {
      //stub - we override this method in subclasses.
    };

    p.invalidate = function() {
      this._time = this._totalTime = 0;
      this._initted = this._gc = false;
      this._rawPrevTime = -1;
      if (this._gc || !this.timeline) {
        this._enabled(true);
      }
      return this;
    };

    p.isActive = function() {
      var tl = this._timeline, //the 2 root timelines won't have a _timeline; they're always active.
        startTime = this._startTime,
        rawTime;
      return (!tl || (!this._gc && !this._paused && tl.isActive() && (rawTime = tl.rawTime()) >= startTime && rawTime < startTime + this.totalDuration() / this._timeScale));
    };

    p._enabled = function (enabled, ignoreTimeline) {
      if (!_tickerActive) {
        _ticker.wake();
      }
      this._gc = !enabled;
      this._active = this.isActive();
      if (ignoreTimeline !== true) {
        if (enabled && !this.timeline) {
          this._timeline.add(this, this._startTime - this._delay);
        } else if (!enabled && this.timeline) {
          this._timeline._remove(this, true);
        }
      }
      return false;
    };


    p._kill = function(vars, target) {
      return this._enabled(false, false);
    };

    p.kill = function(vars, target) {
      this._kill(vars, target);
      return this;
    };

    p._uncache = function(includeSelf) {
      var tween = includeSelf ? this : this.timeline;
      while (tween) {
        tween._dirty = true;
        tween = tween.timeline;
      }
      return this;
    };

    p._swapSelfInParams = function(params) {
      var i = params.length,
        copy = params.concat();
      while (--i > -1) {
        if (params[i] === "{self}") {
          copy[i] = this;
        }
      }
      return copy;
    };

    p._callback = function(type) {
      var v = this.vars;
      v[type].apply(v[type + "Scope"] || v.callbackScope || this, v[type + "Params"] || _blankArray);
    };

//----Animation getters/setters --------------------------------------------------------

    p.eventCallback = function(type, callback, params, scope) {
      if ((type || "").substr(0,2) === "on") {
        var v = this.vars;
        if (arguments.length === 1) {
          return v[type];
        }
        if (callback == null) {
          delete v[type];
        } else {
          v[type] = callback;
          v[type + "Params"] = (_isArray(params) && params.join("").indexOf("{self}") !== -1) ? this._swapSelfInParams(params) : params;
          v[type + "Scope"] = scope;
        }
        if (type === "onUpdate") {
          this._onUpdate = callback;
        }
      }
      return this;
    };

    p.delay = function(value) {
      if (!arguments.length) {
        return this._delay;
      }
      if (this._timeline.smoothChildTiming) {
        this.startTime( this._startTime + value - this._delay );
      }
      this._delay = value;
      return this;
    };

    p.duration = function(value) {
      if (!arguments.length) {
        this._dirty = false;
        return this._duration;
      }
      this._duration = this._totalDuration = value;
      this._uncache(true); //true in case it's a TweenMax or TimelineMax that has a repeat - we'll need to refresh the totalDuration.
      if (this._timeline.smoothChildTiming) if (this._time > 0) if (this._time < this._duration) if (value !== 0) {
        this.totalTime(this._totalTime * (value / this._duration), true);
      }
      return this;
    };

    p.totalDuration = function(value) {
      this._dirty = false;
      return (!arguments.length) ? this._totalDuration : this.duration(value);
    };

    p.time = function(value, suppressEvents) {
      if (!arguments.length) {
        return this._time;
      }
      if (this._dirty) {
        this.totalDuration();
      }
      return this.totalTime((value > this._duration) ? this._duration : value, suppressEvents);
    };

    p.totalTime = function(time, suppressEvents, uncapped) {
      if (!_tickerActive) {
        _ticker.wake();
      }
      if (!arguments.length) {
        return this._totalTime;
      }
      if (this._timeline) {
        if (time < 0 && !uncapped) {
          time += this.totalDuration();
        }
        if (this._timeline.smoothChildTiming) {
          if (this._dirty) {
            this.totalDuration();
          }
          var totalDuration = this._totalDuration,
            tl = this._timeline;
          if (time > totalDuration && !uncapped) {
            time = totalDuration;
          }
          this._startTime = (this._paused ? this._pauseTime : tl._time) - ((!this._reversed ? time : totalDuration - time) / this._timeScale);
          if (!tl._dirty) { //for performance improvement. If the parent's cache is already dirty, it already took care of marking the ancestors as dirty too, so skip the function call here.
            this._uncache(false);
          }
          //in case any of the ancestor timelines had completed but should now be enabled, we should reset their totalTime() which will also ensure that they're lined up properly and enabled. Skip for animations that are on the root (wasteful). Example: a TimelineLite.exportRoot() is performed when there's a paused tween on the root, the export will not complete until that tween is unpaused, but imagine a child gets restarted later, after all [unpaused] tweens have completed. The startTime of that child would get pushed out, but one of the ancestors may have completed.
          if (tl._timeline) {
            while (tl._timeline) {
              if (tl._timeline._time !== (tl._startTime + tl._totalTime) / tl._timeScale) {
                tl.totalTime(tl._totalTime, true);
              }
              tl = tl._timeline;
            }
          }
        }
        if (this._gc) {
          this._enabled(true, false);
        }
        if (this._totalTime !== time || this._duration === 0) {
          if (_lazyTweens.length) {
            _lazyRender();
          }
          this.render(time, suppressEvents, false);
          if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when someone calls seek() or time() or progress(), they expect an immediate render.
            _lazyRender();
          }
        }
      }
      return this;
    };

    p.progress = p.totalProgress = function(value, suppressEvents) {
      var duration = this.duration();
      return (!arguments.length) ? (duration ? this._time / duration : this.ratio) : this.totalTime(duration * value, suppressEvents);
    };

    p.startTime = function(value) {
      if (!arguments.length) {
        return this._startTime;
      }
      if (value !== this._startTime) {
        this._startTime = value;
        if (this.timeline) if (this.timeline._sortChildren) {
          this.timeline.add(this, value - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
        }
      }
      return this;
    };

    p.endTime = function(includeRepeats) {
      return this._startTime + ((includeRepeats != false) ? this.totalDuration() : this.duration()) / this._timeScale;
    };

    p.timeScale = function(value) {
      if (!arguments.length) {
        return this._timeScale;
      }
      value = value || _tinyNum; //can't allow zero because it'll throw the math off
      if (this._timeline && this._timeline.smoothChildTiming) {
        var pauseTime = this._pauseTime,
          t = (pauseTime || pauseTime === 0) ? pauseTime : this._timeline.totalTime();
        this._startTime = t - ((t - this._startTime) * this._timeScale / value);
      }
      this._timeScale = value;
      return this._uncache(false);
    };

    p.reversed = function(value) {
      if (!arguments.length) {
        return this._reversed;
      }
      if (value != this._reversed) {
        this._reversed = value;
        this.totalTime(((this._timeline && !this._timeline.smoothChildTiming) ? this.totalDuration() - this._totalTime : this._totalTime), true);
      }
      return this;
    };

    p.paused = function(value) {
      if (!arguments.length) {
        return this._paused;
      }
      var tl = this._timeline,
        raw, elapsed;
      if (value != this._paused) if (tl) {
        if (!_tickerActive && !value) {
          _ticker.wake();
        }
        raw = tl.rawTime();
        elapsed = raw - this._pauseTime;
        if (!value && tl.smoothChildTiming) {
          this._startTime += elapsed;
          this._uncache(false);
        }
        this._pauseTime = value ? raw : null;
        this._paused = value;
        this._active = this.isActive();
        if (!value && elapsed !== 0 && this._initted && this.duration()) {
          raw = tl.smoothChildTiming ? this._totalTime : (raw - this._startTime) / this._timeScale;
          this.render(raw, (raw === this._totalTime), true); //in case the target's properties changed via some other tween or manual update by the user, we should force a render.
        }
      }
      if (this._gc && !value) {
        this._enabled(true, false);
      }
      return this;
    };


/*
 * ----------------------------------------------------------------
 * SimpleTimeline
 * ----------------------------------------------------------------
 */
    var SimpleTimeline = _class("core.SimpleTimeline", function(vars) {
      Animation.call(this, 0, vars);
      this.autoRemoveChildren = this.smoothChildTiming = true;
    });

    p = SimpleTimeline.prototype = new Animation();
    p.constructor = SimpleTimeline;
    p.kill()._gc = false;
    p._first = p._last = p._recent = null;
    p._sortChildren = false;

    p.add = p.insert = function(child, position, align, stagger) {
      var prevTween, st;
      child._startTime = Number(position || 0) + child._delay;
      if (child._paused) if (this !== child._timeline) { //we only adjust the _pauseTime if it wasn't in this timeline already. Remember, sometimes a tween will be inserted again into the same timeline when its startTime is changed so that the tweens in the TimelineLite/Max are re-ordered properly in the linked list (so everything renders in the proper order).
        child._pauseTime = child._startTime + ((this.rawTime() - child._startTime) / child._timeScale);
      }
      if (child.timeline) {
        child.timeline._remove(child, true); //removes from existing timeline so that it can be properly added to this one.
      }
      child.timeline = child._timeline = this;
      if (child._gc) {
        child._enabled(true, true);
      }
      prevTween = this._last;
      if (this._sortChildren) {
        st = child._startTime;
        while (prevTween && prevTween._startTime > st) {
          prevTween = prevTween._prev;
        }
      }
      if (prevTween) {
        child._next = prevTween._next;
        prevTween._next = child;
      } else {
        child._next = this._first;
        this._first = child;
      }
      if (child._next) {
        child._next._prev = child;
      } else {
        this._last = child;
      }
      child._prev = prevTween;
      this._recent = child;
      if (this._timeline) {
        this._uncache(true);
      }
      return this;
    };

    p._remove = function(tween, skipDisable) {
      if (tween.timeline === this) {
        if (!skipDisable) {
          tween._enabled(false, true);
        }

        if (tween._prev) {
          tween._prev._next = tween._next;
        } else if (this._first === tween) {
          this._first = tween._next;
        }
        if (tween._next) {
          tween._next._prev = tween._prev;
        } else if (this._last === tween) {
          this._last = tween._prev;
        }
        tween._next = tween._prev = tween.timeline = null;
        if (tween === this._recent) {
          this._recent = this._last;
        }

        if (this._timeline) {
          this._uncache(true);
        }
      }
      return this;
    };

    p.render = function(time, suppressEvents, force) {
      var tween = this._first,
        next;
      this._totalTime = this._time = this._rawPrevTime = time;
      while (tween) {
        next = tween._next; //record it here because the value could change after rendering...
        if (tween._active || (time >= tween._startTime && !tween._paused)) {
          if (!tween._reversed) {
            tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
          } else {
            tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
          }
        }
        tween = next;
      }
    };

    p.rawTime = function() {
      if (!_tickerActive) {
        _ticker.wake();
      }
      return this._totalTime;
    };

/*
 * ----------------------------------------------------------------
 * TweenLite
 * ----------------------------------------------------------------
 */
    var TweenLite = _class("TweenLite", function(target, duration, vars) {
        Animation.call(this, duration, vars);
        this.render = TweenLite.prototype.render; //speed optimization (avoid prototype lookup on this "hot" method)

        if (target == null) {
          throw "Cannot tween a null target.";
        }

        this.target = target = (typeof(target) !== "string") ? target : TweenLite.selector(target) || target;

        var isSelector = (target.jquery || (target.length && target !== window && target[0] && (target[0] === window || (target[0].nodeType && target[0].style && !target.nodeType)))),
          overwrite = this.vars.overwrite,
          i, targ, targets;

        this._overwrite = overwrite = (overwrite == null) ? _overwriteLookup[TweenLite.defaultOverwrite] : (typeof(overwrite) === "number") ? overwrite >> 0 : _overwriteLookup[overwrite];

        if ((isSelector || target instanceof Array || (target.push && _isArray(target))) && typeof(target[0]) !== "number") {
          this._targets = targets = _slice(target);  //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
          this._propLookup = [];
          this._siblings = [];
          for (i = 0; i < targets.length; i++) {
            targ = targets[i];
            if (!targ) {
              targets.splice(i--, 1);
              continue;
            } else if (typeof(targ) === "string") {
              targ = targets[i--] = TweenLite.selector(targ); //in case it's an array of strings
              if (typeof(targ) === "string") {
                targets.splice(i+1, 1); //to avoid an endless loop (can't imagine why the selector would return a string, but just in case)
              }
              continue;
            } else if (targ.length && targ !== window && targ[0] && (targ[0] === window || (targ[0].nodeType && targ[0].style && !targ.nodeType))) { //in case the user is passing in an array of selector objects (like jQuery objects), we need to check one more level and pull things out if necessary. Also note that <select> elements pass all the criteria regarding length and the first child having style, so we must also check to ensure the target isn't an HTML node itself.
              targets.splice(i--, 1);
              this._targets = targets = targets.concat(_slice(targ));
              continue;
            }
            this._siblings[i] = _register(targ, this, false);
            if (overwrite === 1) if (this._siblings[i].length > 1) {
              _applyOverwrite(targ, this, null, 1, this._siblings[i]);
            }
          }

        } else {
          this._propLookup = {};
          this._siblings = _register(target, this, false);
          if (overwrite === 1) if (this._siblings.length > 1) {
            _applyOverwrite(target, this, null, 1, this._siblings);
          }
        }
        if (this.vars.immediateRender || (duration === 0 && this._delay === 0 && this.vars.immediateRender !== false)) {
          this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
          this.render(-this._delay);
        }
      }, true),
      _isSelector = function(v) {
        return (v && v.length && v !== window && v[0] && (v[0] === window || (v[0].nodeType && v[0].style && !v.nodeType))); //we cannot check "nodeType" if the target is window from within an iframe, otherwise it will trigger a security error in some browsers like Firefox.
      },
      _autoCSS = function(vars, target) {
        var css = {},
          p;
        for (p in vars) {
          if (!_reservedProps[p] && (!(p in target) || p === "transform" || p === "x" || p === "y" || p === "width" || p === "height" || p === "className" || p === "border") && (!_plugins[p] || (_plugins[p] && _plugins[p]._autoCSS))) { //note: <img> elements contain read-only "x" and "y" properties. We should also prioritize editing css width/height rather than the element's properties.
            css[p] = vars[p];
            delete vars[p];
          }
        }
        vars.css = css;
      };

    p = TweenLite.prototype = new Animation();
    p.constructor = TweenLite;
    p.kill()._gc = false;

//----TweenLite defaults, overwrite management, and root updates ----------------------------------------------------

    p.ratio = 0;
    p._firstPT = p._targets = p._overwrittenProps = p._startAt = null;
    p._notifyPluginsOfEnabled = p._lazy = false;

    TweenLite.version = "1.18.2";
    TweenLite.defaultEase = p._ease = new Ease(null, null, 1, 1);
    TweenLite.defaultOverwrite = "auto";
    TweenLite.ticker = _ticker;
    TweenLite.autoSleep = 120;
    TweenLite.lagSmoothing = function(threshold, adjustedLag) {
      _ticker.lagSmoothing(threshold, adjustedLag);
    };

    TweenLite.selector = window.$ || window.jQuery || function(e) {
      var selector = window.$ || window.jQuery;
      if (selector) {
        TweenLite.selector = selector;
        return selector(e);
      }
      return (typeof(document) === "undefined") ? e : (document.querySelectorAll ? document.querySelectorAll(e) : document.getElementById((e.charAt(0) === "#") ? e.substr(1) : e));
    };

    var _lazyTweens = [],
      _lazyLookup = {},
      _numbersExp = /(?:(-|-=|\+=)?\d*\.?\d*(?:e[\-+]?\d+)?)[0-9]/ig,
      //_nonNumbersExp = /(?:([\-+](?!(\d|=)))|[^\d\-+=e]|(e(?![\-+][\d])))+/ig,
      _setRatio = function(v) {
        var pt = this._firstPT,
          min = 0.000001,
          val;
        while (pt) {
          val = !pt.blob ? pt.c * v + pt.s : v ? this.join("") : this.start;
          if (pt.r) {
            val = Math.round(val);
          } else if (val < min) if (val > -min) { //prevents issues with converting very small numbers to strings in the browser
            val = 0;
          }
          if (!pt.f) {
            pt.t[pt.p] = val;
          } else if (pt.fp) {
            pt.t[pt.p](pt.fp, val);
          } else {
            pt.t[pt.p](val);
          }
          pt = pt._next;
        }
      },
      //compares two strings (start/end), finds the numbers that are different and spits back an array representing the whole value but with the changing values isolated as elements. For example, "rgb(0,0,0)" and "rgb(100,50,0)" would become ["rgb(", 0, ",", 50, ",0)"]. Notice it merges the parts that are identical (performance optimization). The array also has a linked list of PropTweens attached starting with _firstPT that contain the tweening data (t, p, s, c, f, etc.). It also stores the starting value as a "start" property so that we can revert to it if/when necessary, like when a tween rewinds fully. If the quantity of numbers differs between the start and end, it will always prioritize the end value(s). The pt parameter is optional - it's for a PropTween that will be appended to the end of the linked list and is typically for actually setting the value after all of the elements have been updated (with array.join("")).
      _blobDif = function(start, end, filter, pt) {
        var a = [start, end],
          charIndex = 0,
          s = "",
          color = 0,
          startNums, endNums, num, i, l, nonNumbers, currentNum;
        a.start = start;
        if (filter) {
          filter(a); //pass an array with the starting and ending values and let the filter do whatever it needs to the values.
          start = a[0];
          end = a[1];
        }
        a.length = 0;
        startNums = start.match(_numbersExp) || [];
        endNums = end.match(_numbersExp) || [];
        if (pt) {
          pt._next = null;
          pt.blob = 1;
          a._firstPT = pt; //apply last in the linked list (which means inserting it first)
        }
        l = endNums.length;
        for (i = 0; i < l; i++) {
          currentNum = endNums[i];
          nonNumbers = end.substr(charIndex, end.indexOf(currentNum, charIndex)-charIndex);
          s += (nonNumbers || !i) ? nonNumbers : ","; //note: SVG spec allows omission of comma/space when a negative sign is wedged between two numbers, like 2.5-5.3 instead of 2.5,-5.3 but when tweening, the negative value may switch to positive, so we insert the comma just in case.
          charIndex += nonNumbers.length;
          if (color) { //sense rgba() values and round them.
            color = (color + 1) % 5;
          } else if (nonNumbers.substr(-5) === "rgba(") {
            color = 1;
          }
          if (currentNum === startNums[i] || startNums.length <= i) {
            s += currentNum;
          } else {
            if (s) {
              a.push(s);
              s = "";
            }
            num = parseFloat(startNums[i]);
            a.push(num);
            a._firstPT = {_next: a._firstPT, t:a, p: a.length-1, s:num, c:((currentNum.charAt(1) === "=") ? parseInt(currentNum.charAt(0) + "1", 10) * parseFloat(currentNum.substr(2)) : (parseFloat(currentNum) - num)) || 0, f:0, r:(color && color < 4)};
            //note: we don't set _prev because we'll never need to remove individual PropTweens from this list.
          }
          charIndex += currentNum.length;
        }
        s += end.substr(charIndex);
        if (s) {
          a.push(s);
        }
        a.setRatio = _setRatio;
        return a;
      },
      //note: "funcParam" is only necessary for function-based getters/setters that require an extra parameter like getAttribute("width") and setAttribute("width", value). In this example, funcParam would be "width". Used by AttrPlugin for example.
      _addPropTween = function(target, prop, start, end, overwriteProp, round, funcParam, stringFilter) {
        var s = (start === "get") ? target[prop] : start,
          type = typeof(target[prop]),
          isRelative = (typeof(end) === "string" && end.charAt(1) === "="),
          pt = {t:target, p:prop, s:s, f:(type === "function"), pg:0, n:overwriteProp || prop, r:round, pr:0, c:isRelative ? parseInt(end.charAt(0) + "1", 10) * parseFloat(end.substr(2)) : (parseFloat(end) - s) || 0},
          blob, getterName;
        if (type !== "number") {
          if (type === "function" && start === "get") {
            getterName = ((prop.indexOf("set") || typeof(target["get" + prop.substr(3)]) !== "function") ? prop : "get" + prop.substr(3));
            pt.s = s = funcParam ? target[getterName](funcParam) : target[getterName]();
          }
          if (typeof(s) === "string" && (funcParam || isNaN(s))) {
            //a blob (string that has multiple numbers in it)
            pt.fp = funcParam;
            blob = _blobDif(s, end, stringFilter || TweenLite.defaultStringFilter, pt);
            pt = {t:blob, p:"setRatio", s:0, c:1, f:2, pg:0, n:overwriteProp || prop, pr:0}; //"2" indicates it's a Blob property tween. Needed for RoundPropsPlugin for example.
          } else if (!isRelative) {
            pt.s = parseFloat(s);
            pt.c = (parseFloat(end) - pt.s) || 0;
          }
        }
        if (pt.c) { //only add it to the linked list if there's a change.
          if ((pt._next = this._firstPT)) {
            pt._next._prev = pt;
          }
          this._firstPT = pt;
          return pt;
        }
      },
      _internals = TweenLite._internals = {isArray:_isArray, isSelector:_isSelector, lazyTweens:_lazyTweens, blobDif:_blobDif}, //gives us a way to expose certain private values to other GreenSock classes without contaminating tha main TweenLite object.
      _plugins = TweenLite._plugins = {},
      _tweenLookup = _internals.tweenLookup = {},
      _tweenLookupNum = 0,
      _reservedProps = _internals.reservedProps = {ease:1, delay:1, overwrite:1, onComplete:1, onCompleteParams:1, onCompleteScope:1, useFrames:1, runBackwards:1, startAt:1, onUpdate:1, onUpdateParams:1, onUpdateScope:1, onStart:1, onStartParams:1, onStartScope:1, onReverseComplete:1, onReverseCompleteParams:1, onReverseCompleteScope:1, onRepeat:1, onRepeatParams:1, onRepeatScope:1, easeParams:1, yoyo:1, immediateRender:1, repeat:1, repeatDelay:1, data:1, paused:1, reversed:1, autoCSS:1, lazy:1, onOverwrite:1, callbackScope:1, stringFilter:1},
      _overwriteLookup = {none:0, all:1, auto:2, concurrent:3, allOnStart:4, preexisting:5, "true":1, "false":0},
      _rootFramesTimeline = Animation._rootFramesTimeline = new SimpleTimeline(),
      _rootTimeline = Animation._rootTimeline = new SimpleTimeline(),
      _nextGCFrame = 30,
      _lazyRender = _internals.lazyRender = function() {
        var i = _lazyTweens.length,
          tween;
        _lazyLookup = {};
        while (--i > -1) {
          tween = _lazyTweens[i];
          if (tween && tween._lazy !== false) {
            tween.render(tween._lazy[0], tween._lazy[1], true);
            tween._lazy = false;
          }
        }
        _lazyTweens.length = 0;
      };

    _rootTimeline._startTime = _ticker.time;
    _rootFramesTimeline._startTime = _ticker.frame;
    _rootTimeline._active = _rootFramesTimeline._active = true;
    setTimeout(_lazyRender, 1); //on some mobile devices, there isn't a "tick" before code runs which means any lazy renders wouldn't run before the next official "tick".

    Animation._updateRoot = TweenLite.render = function() {
        var i, a, p;
        if (_lazyTweens.length) { //if code is run outside of the requestAnimationFrame loop, there may be tweens queued AFTER the engine refreshed, so we need to ensure any pending renders occur before we refresh again.
          _lazyRender();
        }
        _rootTimeline.render((_ticker.time - _rootTimeline._startTime) * _rootTimeline._timeScale, false, false);
        _rootFramesTimeline.render((_ticker.frame - _rootFramesTimeline._startTime) * _rootFramesTimeline._timeScale, false, false);
        if (_lazyTweens.length) {
          _lazyRender();
        }
        if (_ticker.frame >= _nextGCFrame) { //dump garbage every 120 frames or whatever the user sets TweenLite.autoSleep to
          _nextGCFrame = _ticker.frame + (parseInt(TweenLite.autoSleep, 10) || 120);
          for (p in _tweenLookup) {
            a = _tweenLookup[p].tweens;
            i = a.length;
            while (--i > -1) {
              if (a[i]._gc) {
                a.splice(i, 1);
              }
            }
            if (a.length === 0) {
              delete _tweenLookup[p];
            }
          }
          //if there are no more tweens in the root timelines, or if they're all paused, make the _timer sleep to reduce load on the CPU slightly
          p = _rootTimeline._first;
          if (!p || p._paused) if (TweenLite.autoSleep && !_rootFramesTimeline._first && _ticker._listeners.tick.length === 1) {
            while (p && p._paused) {
              p = p._next;
            }
            if (!p) {
              _ticker.sleep();
            }
          }
        }
      };

    _ticker.addEventListener("tick", Animation._updateRoot);

    var _register = function(target, tween, scrub) {
        var id = target._gsTweenID, a, i;
        if (!_tweenLookup[id || (target._gsTweenID = id = "t" + (_tweenLookupNum++))]) {
          _tweenLookup[id] = {target:target, tweens:[]};
        }
        if (tween) {
          a = _tweenLookup[id].tweens;
          a[(i = a.length)] = tween;
          if (scrub) {
            while (--i > -1) {
              if (a[i] === tween) {
                a.splice(i, 1);
              }
            }
          }
        }
        return _tweenLookup[id].tweens;
      },
      _onOverwrite = function(overwrittenTween, overwritingTween, target, killedProps) {
        var func = overwrittenTween.vars.onOverwrite, r1, r2;
        if (func) {
          r1 = func(overwrittenTween, overwritingTween, target, killedProps);
        }
        func = TweenLite.onOverwrite;
        if (func) {
          r2 = func(overwrittenTween, overwritingTween, target, killedProps);
        }
        return (r1 !== false && r2 !== false);
      },
      _applyOverwrite = function(target, tween, props, mode, siblings) {
        var i, changed, curTween, l;
        if (mode === 1 || mode >= 4) {
          l = siblings.length;
          for (i = 0; i < l; i++) {
            if ((curTween = siblings[i]) !== tween) {
              if (!curTween._gc) {
                if (curTween._kill(null, target, tween)) {
                  changed = true;
                }
              }
            } else if (mode === 5) {
              break;
            }
          }
          return changed;
        }
        //NOTE: Add 0.0000000001 to overcome floating point errors that can cause the startTime to be VERY slightly off (when a tween's time() is set for example)
        var startTime = tween._startTime + _tinyNum,
          overlaps = [],
          oCount = 0,
          zeroDur = (tween._duration === 0),
          globalStart;
        i = siblings.length;
        while (--i > -1) {
          if ((curTween = siblings[i]) === tween || curTween._gc || curTween._paused) {
            //ignore
          } else if (curTween._timeline !== tween._timeline) {
            globalStart = globalStart || _checkOverlap(tween, 0, zeroDur);
            if (_checkOverlap(curTween, globalStart, zeroDur) === 0) {
              overlaps[oCount++] = curTween;
            }
          } else if (curTween._startTime <= startTime) if (curTween._startTime + curTween.totalDuration() / curTween._timeScale > startTime) if (!((zeroDur || !curTween._initted) && startTime - curTween._startTime <= 0.0000000002)) {
            overlaps[oCount++] = curTween;
          }
        }

        i = oCount;
        while (--i > -1) {
          curTween = overlaps[i];
          if (mode === 2) if (curTween._kill(props, target, tween)) {
            changed = true;
          }
          if (mode !== 2 || (!curTween._firstPT && curTween._initted)) {
            if (mode !== 2 && !_onOverwrite(curTween, tween)) {
              continue;
            }
            if (curTween._enabled(false, false)) { //if all property tweens have been overwritten, kill the tween.
              changed = true;
            }
          }
        }
        return changed;
      },
      _checkOverlap = function(tween, reference, zeroDur) {
        var tl = tween._timeline,
          ts = tl._timeScale,
          t = tween._startTime;
        while (tl._timeline) {
          t += tl._startTime;
          ts *= tl._timeScale;
          if (tl._paused) {
            return -100;
          }
          tl = tl._timeline;
        }
        t /= ts;
        return (t > reference) ? t - reference : ((zeroDur && t === reference) || (!tween._initted && t - reference < 2 * _tinyNum)) ? _tinyNum : ((t += tween.totalDuration() / tween._timeScale / ts) > reference + _tinyNum) ? 0 : t - reference - _tinyNum;
      };


//---- TweenLite instance methods -----------------------------------------------------------------------------

    p._init = function() {
      var v = this.vars,
        op = this._overwrittenProps,
        dur = this._duration,
        immediate = !!v.immediateRender,
        ease = v.ease,
        i, initPlugins, pt, p, startVars;
      if (v.startAt) {
        if (this._startAt) {
          this._startAt.render(-1, true); //if we've run a startAt previously (when the tween instantiated), we should revert it so that the values re-instantiate correctly particularly for relative tweens. Without this, a TweenLite.fromTo(obj, 1, {x:"+=100"}, {x:"-=100"}), for example, would actually jump to +=200 because the startAt would run twice, doubling the relative change.
          this._startAt.kill();
        }
        startVars = {};
        for (p in v.startAt) { //copy the properties/values into a new object to avoid collisions, like var to = {x:0}, from = {x:500}; timeline.fromTo(e, 1, from, to).fromTo(e, 1, to, from);
          startVars[p] = v.startAt[p];
        }
        startVars.overwrite = false;
        startVars.immediateRender = true;
        startVars.lazy = (immediate && v.lazy !== false);
        startVars.startAt = startVars.delay = null; //no nesting of startAt objects allowed (otherwise it could cause an infinite loop).
        this._startAt = TweenLite.to(this.target, 0, startVars);
        if (immediate) {
          if (this._time > 0) {
            this._startAt = null; //tweens that render immediately (like most from() and fromTo() tweens) shouldn't revert when their parent timeline's playhead goes backward past the startTime because the initial render could have happened anytime and it shouldn't be directly correlated to this tween's startTime. Imagine setting up a complex animation where the beginning states of various objects are rendered immediately but the tween doesn't happen for quite some time - if we revert to the starting values as soon as the playhead goes backward past the tween's startTime, it will throw things off visually. Reversion should only happen in TimelineLite/Max instances where immediateRender was false (which is the default in the convenience methods like from()).
          } else if (dur !== 0) {
            return; //we skip initialization here so that overwriting doesn't occur until the tween actually begins. Otherwise, if you create several immediateRender:true tweens of the same target/properties to drop into a TimelineLite or TimelineMax, the last one created would overwrite the first ones because they didn't get placed into the timeline yet before the first render occurs and kicks in overwriting.
          }
        }
      } else if (v.runBackwards && dur !== 0) {
        //from() tweens must be handled uniquely: their beginning values must be rendered but we don't want overwriting to occur yet (when time is still 0). Wait until the tween actually begins before doing all the routines like overwriting. At that time, we should render at the END of the tween to ensure that things initialize correctly (remember, from() tweens go backwards)
        if (this._startAt) {
          this._startAt.render(-1, true);
          this._startAt.kill();
          this._startAt = null;
        } else {
          if (this._time !== 0) { //in rare cases (like if a from() tween runs and then is invalidate()-ed), immediateRender could be true but the initial forced-render gets skipped, so there's no need to force the render in this context when the _time is greater than 0
            immediate = false;
          }
          pt = {};
          for (p in v) { //copy props into a new object and skip any reserved props, otherwise onComplete or onUpdate or onStart could fire. We should, however, permit autoCSS to go through.
            if (!_reservedProps[p] || p === "autoCSS") {
              pt[p] = v[p];
            }
          }
          pt.overwrite = 0;
          pt.data = "isFromStart"; //we tag the tween with as "isFromStart" so that if [inside a plugin] we need to only do something at the very END of a tween, we have a way of identifying this tween as merely the one that's setting the beginning values for a "from()" tween. For example, clearProps in CSSPlugin should only get applied at the very END of a tween and without this tag, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in.
          pt.lazy = (immediate && v.lazy !== false);
          pt.immediateRender = immediate; //zero-duration tweens render immediately by default, but if we're not specifically instructed to render this tween immediately, we should skip this and merely _init() to record the starting values (rendering them immediately would push them to completion which is wasteful in that case - we'd have to render(-1) immediately after)
          this._startAt = TweenLite.to(this.target, 0, pt);
          if (!immediate) {
            this._startAt._init(); //ensures that the initial values are recorded
            this._startAt._enabled(false); //no need to have the tween render on the next cycle. Disable it because we'll always manually control the renders of the _startAt tween.
            if (this.vars.immediateRender) {
              this._startAt = null;
            }
          } else if (this._time === 0) {
            return;
          }
        }
      }
      this._ease = ease = (!ease) ? TweenLite.defaultEase : (ease instanceof Ease) ? ease : (typeof(ease) === "function") ? new Ease(ease, v.easeParams) : _easeMap[ease] || TweenLite.defaultEase;
      if (v.easeParams instanceof Array && ease.config) {
        this._ease = ease.config.apply(ease, v.easeParams);
      }
      this._easeType = this._ease._type;
      this._easePower = this._ease._power;
      this._firstPT = null;

      if (this._targets) {
        i = this._targets.length;
        while (--i > -1) {
          if ( this._initProps( this._targets[i], (this._propLookup[i] = {}), this._siblings[i], (op ? op[i] : null)) ) {
            initPlugins = true;
          }
        }
      } else {
        initPlugins = this._initProps(this.target, this._propLookup, this._siblings, op);
      }

      if (initPlugins) {
        TweenLite._onPluginEvent("_onInitAllProps", this); //reorders the array in order of priority. Uses a static TweenPlugin method in order to minimize file size in TweenLite
      }
      if (op) if (!this._firstPT) if (typeof(this.target) !== "function") { //if all tweening properties have been overwritten, kill the tween. If the target is a function, it's probably a delayedCall so let it live.
        this._enabled(false, false);
      }
      if (v.runBackwards) {
        pt = this._firstPT;
        while (pt) {
          pt.s += pt.c;
          pt.c = -pt.c;
          pt = pt._next;
        }
      }
      this._onUpdate = v.onUpdate;
      this._initted = true;
    };

    p._initProps = function(target, propLookup, siblings, overwrittenProps) {
      var p, i, initPlugins, plugin, pt, v;
      if (target == null) {
        return false;
      }

      if (_lazyLookup[target._gsTweenID]) {
        _lazyRender(); //if other tweens of the same target have recently initted but haven't rendered yet, we've got to force the render so that the starting values are correct (imagine populating a timeline with a bunch of sequential tweens and then jumping to the end)
      }

      if (!this.vars.css) if (target.style) if (target !== window && target.nodeType) if (_plugins.css) if (this.vars.autoCSS !== false) { //it's so common to use TweenLite/Max to animate the css of DOM elements, we assume that if the target is a DOM element, that's what is intended (a convenience so that users don't have to wrap things in css:{}, although we still recommend it for a slight performance boost and better specificity). Note: we cannot check "nodeType" on the window inside an iframe.
        _autoCSS(this.vars, target);
      }
      for (p in this.vars) {
        v = this.vars[p];
        if (_reservedProps[p]) {
          if (v) if ((v instanceof Array) || (v.push && _isArray(v))) if (v.join("").indexOf("{self}") !== -1) {
            this.vars[p] = v = this._swapSelfInParams(v, this);
          }

        } else if (_plugins[p] && (plugin = new _plugins[p]())._onInitTween(target, this.vars[p], this)) {

          //t - target    [object]
          //p - property    [string]
          //s - start     [number]
          //c - change    [number]
          //f - isFunction  [boolean]
          //n - name      [string]
          //pg - isPlugin   [boolean]
          //pr - priority   [number]
          this._firstPT = pt = {_next:this._firstPT, t:plugin, p:"setRatio", s:0, c:1, f:1, n:p, pg:1, pr:plugin._priority};
          i = plugin._overwriteProps.length;
          while (--i > -1) {
            propLookup[plugin._overwriteProps[i]] = this._firstPT;
          }
          if (plugin._priority || plugin._onInitAllProps) {
            initPlugins = true;
          }
          if (plugin._onDisable || plugin._onEnable) {
            this._notifyPluginsOfEnabled = true;
          }
          if (pt._next) {
            pt._next._prev = pt;
          }

        } else {
          propLookup[p] = _addPropTween.call(this, target, p, "get", v, p, 0, null, this.vars.stringFilter);
        }
      }

      if (overwrittenProps) if (this._kill(overwrittenProps, target)) { //another tween may have tried to overwrite properties of this tween before init() was called (like if two tweens start at the same time, the one created second will run first)
        return this._initProps(target, propLookup, siblings, overwrittenProps);
      }
      if (this._overwrite > 1) if (this._firstPT) if (siblings.length > 1) if (_applyOverwrite(target, this, propLookup, this._overwrite, siblings)) {
        this._kill(propLookup, target);
        return this._initProps(target, propLookup, siblings, overwrittenProps);
      }
      if (this._firstPT) if ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration)) { //zero duration tweens don't lazy render by default; everything else does.
        _lazyLookup[target._gsTweenID] = true;
      }
      return initPlugins;
    };

    p.render = function(time, suppressEvents, force) {
      var prevTime = this._time,
        duration = this._duration,
        prevRawPrevTime = this._rawPrevTime,
        isComplete, callback, pt, rawPrevTime;
      if (time >= duration - 0.0000001) { //to work around occasional floating point math artifacts.
        this._totalTime = this._time = duration;
        this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
        if (!this._reversed ) {
          isComplete = true;
          callback = "onComplete";
          force = (force || this._timeline.autoRemoveChildren); //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
        }
        if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
          if (this._startTime === this._timeline._duration) { //if a zero-duration tween is at the VERY end of a timeline and that timeline renders at its end, it will typically add a tiny bit of cushion to the render time to prevent rounding errors from getting in the way of tweens rendering their VERY end. If we then reverse() that timeline, the zero-duration tween will trigger its onReverseComplete even though technically the playhead didn't pass over it again. It's a very specific edge case we must accommodate.
            time = 0;
          }
          if (prevRawPrevTime < 0 || (time <= 0 && time >= -0.0000001) || (prevRawPrevTime === _tinyNum && this.data !== "isPause")) if (prevRawPrevTime !== time) { //note: when this.data is "isPause", it's a callback added by addPause() on a timeline that we should not be triggered when LEAVING its exact start time. In other words, tl.addPause(1).play(1) shouldn't pause.
            force = true;
            if (prevRawPrevTime > _tinyNum) {
              callback = "onReverseComplete";
            }
          }
          this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
        }

      } else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
        this._totalTime = this._time = 0;
        this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
        if (prevTime !== 0 || (duration === 0 && prevRawPrevTime > 0)) {
          callback = "onReverseComplete";
          isComplete = this._reversed;
        }
        if (time < 0) {
          this._active = false;
          if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
            if (prevRawPrevTime >= 0 && !(prevRawPrevTime === _tinyNum && this.data === "isPause")) {
              force = true;
            }
            this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
          }
        }
        if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
          force = true;
        }
      } else {
        this._totalTime = this._time = time;

        if (this._easeType) {
          var r = time / duration, type = this._easeType, pow = this._easePower;
          if (type === 1 || (type === 3 && r >= 0.5)) {
            r = 1 - r;
          }
          if (type === 3) {
            r *= 2;
          }
          if (pow === 1) {
            r *= r;
          } else if (pow === 2) {
            r *= r * r;
          } else if (pow === 3) {
            r *= r * r * r;
          } else if (pow === 4) {
            r *= r * r * r * r;
          }

          if (type === 1) {
            this.ratio = 1 - r;
          } else if (type === 2) {
            this.ratio = r;
          } else if (time / duration < 0.5) {
            this.ratio = r / 2;
          } else {
            this.ratio = 1 - (r / 2);
          }

        } else {
          this.ratio = this._ease.getRatio(time / duration);
        }
      }

      if (this._time === prevTime && !force) {
        return;
      } else if (!this._initted) {
        this._init();
        if (!this._initted || this._gc) { //immediateRender tweens typically won't initialize until the playhead advances (_time is greater than 0) in order to ensure that overwriting occurs properly. Also, if all of the tweening properties have been overwritten (which would cause _gc to be true, as set in _init()), we shouldn't continue otherwise an onStart callback could be called for example.
          return;
        } else if (!force && this._firstPT && ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration))) {
          this._time = this._totalTime = prevTime;
          this._rawPrevTime = prevRawPrevTime;
          _lazyTweens.push(this);
          this._lazy = [time, suppressEvents];
          return;
        }
        //_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
        if (this._time && !isComplete) {
          this.ratio = this._ease.getRatio(this._time / duration);
        } else if (isComplete && this._ease._calcEnd) {
          this.ratio = this._ease.getRatio((this._time === 0) ? 0 : 1);
        }
      }
      if (this._lazy !== false) { //in case a lazy render is pending, we should flush it because the new render is occurring now (imagine a lazy tween instantiating and then immediately the user calls tween.seek(tween.duration()), skipping to the end - the end render would be forced, and then if we didn't flush the lazy render, it'd fire AFTER the seek(), rendering it at the wrong time.
        this._lazy = false;
      }
      if (!this._active) if (!this._paused && this._time !== prevTime && time >= 0) {
        this._active = true;  //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
      }
      if (prevTime === 0) {
        if (this._startAt) {
          if (time >= 0) {
            this._startAt.render(time, suppressEvents, force);
          } else if (!callback) {
            callback = "_dummyGS"; //if no callback is defined, use a dummy value just so that the condition at the end evaluates as true because _startAt should render AFTER the normal render loop when the time is negative. We could handle this in a more intuitive way, of course, but the render loop is the MOST important thing to optimize, so this technique allows us to avoid adding extra conditional logic in a high-frequency area.
          }
        }
        if (this.vars.onStart) if (this._time !== 0 || duration === 0) if (!suppressEvents) {
          this._callback("onStart");
        }
      }
      pt = this._firstPT;
      while (pt) {
        if (pt.f) {
          pt.t[pt.p](pt.c * this.ratio + pt.s);
        } else {
          pt.t[pt.p] = pt.c * this.ratio + pt.s;
        }
        pt = pt._next;
      }

      if (this._onUpdate) {
        if (time < 0) if (this._startAt && time !== -0.0001) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
          this._startAt.render(time, suppressEvents, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.
        }
        if (!suppressEvents) if (this._time !== prevTime || isComplete) {
          this._callback("onUpdate");
        }
      }
      if (callback) if (!this._gc || force) { //check _gc because there's a chance that kill() could be called in an onUpdate
        if (time < 0 && this._startAt && !this._onUpdate && time !== -0.0001) { //-0.0001 is a special value that we use when looping back to the beginning of a repeated TimelineMax, in which case we shouldn't render the _startAt values.
          this._startAt.render(time, suppressEvents, force);
        }
        if (isComplete) {
          if (this._timeline.autoRemoveChildren) {
            this._enabled(false, false);
          }
          this._active = false;
        }
        if (!suppressEvents && this.vars[callback]) {
          this._callback(callback);
        }
        if (duration === 0 && this._rawPrevTime === _tinyNum && rawPrevTime !== _tinyNum) { //the onComplete or onReverseComplete could trigger movement of the playhead and for zero-duration tweens (which must discern direction) that land directly back on their start time, we don't want to fire again on the next render. Think of several addPause()'s in a timeline that forces the playhead to a certain spot, but what if it's already paused and another tween is tweening the "time" of the timeline? Each time it moves [forward] past that spot, it would move back, and since suppressEvents is true, it'd reset _rawPrevTime to _tinyNum so that when it begins again, the callback would fire (so ultimately it could bounce back and forth during that tween). Again, this is a very uncommon scenario, but possible nonetheless.
          this._rawPrevTime = 0;
        }
      }
    };

    p._kill = function(vars, target, overwritingTween) {
      if (vars === "all") {
        vars = null;
      }
      if (vars == null) if (target == null || target === this.target) {
        this._lazy = false;
        return this._enabled(false, false);
      }
      target = (typeof(target) !== "string") ? (target || this._targets || this.target) : TweenLite.selector(target) || target;
      var simultaneousOverwrite = (overwritingTween && this._time && overwritingTween._startTime === this._startTime && this._timeline === overwritingTween._timeline),
        i, overwrittenProps, p, pt, propLookup, changed, killProps, record, killed;
      if ((_isArray(target) || _isSelector(target)) && typeof(target[0]) !== "number") {
        i = target.length;
        while (--i > -1) {
          if (this._kill(vars, target[i], overwritingTween)) {
            changed = true;
          }
        }
      } else {
        if (this._targets) {
          i = this._targets.length;
          while (--i > -1) {
            if (target === this._targets[i]) {
              propLookup = this._propLookup[i] || {};
              this._overwrittenProps = this._overwrittenProps || [];
              overwrittenProps = this._overwrittenProps[i] = vars ? this._overwrittenProps[i] || {} : "all";
              break;
            }
          }
        } else if (target !== this.target) {
          return false;
        } else {
          propLookup = this._propLookup;
          overwrittenProps = this._overwrittenProps = vars ? this._overwrittenProps || {} : "all";
        }

        if (propLookup) {
          killProps = vars || propLookup;
          record = (vars !== overwrittenProps && overwrittenProps !== "all" && vars !== propLookup && (typeof(vars) !== "object" || !vars._tempKill)); //_tempKill is a super-secret way to delete a particular tweening property but NOT have it remembered as an official overwritten property (like in BezierPlugin)
          if (overwritingTween && (TweenLite.onOverwrite || this.vars.onOverwrite)) {
            for (p in killProps) {
              if (propLookup[p]) {
                if (!killed) {
                  killed = [];
                }
                killed.push(p);
              }
            }
            if ((killed || !vars) && !_onOverwrite(this, overwritingTween, target, killed)) { //if the onOverwrite returned false, that means the user wants to override the overwriting (cancel it).
              return false;
            }
          }

          for (p in killProps) {
            if ((pt = propLookup[p])) {
              if (simultaneousOverwrite) { //if another tween overwrites this one and they both start at exactly the same time, yet this tween has already rendered once (for example, at 0.001) because it's first in the queue, we should revert the values to where they were at 0 so that the starting values aren't contaminated on the overwriting tween.
                if (pt.f) {
                  pt.t[pt.p](pt.s);
                } else {
                  pt.t[pt.p] = pt.s;
                }
                changed = true;
              }
              if (pt.pg && pt.t._kill(killProps)) {
                changed = true; //some plugins need to be notified so they can perform cleanup tasks first
              }
              if (!pt.pg || pt.t._overwriteProps.length === 0) {
                if (pt._prev) {
                  pt._prev._next = pt._next;
                } else if (pt === this._firstPT) {
                  this._firstPT = pt._next;
                }
                if (pt._next) {
                  pt._next._prev = pt._prev;
                }
                pt._next = pt._prev = null;
              }
              delete propLookup[p];
            }
            if (record) {
              overwrittenProps[p] = 1;
            }
          }
          if (!this._firstPT && this._initted) { //if all tweening properties are killed, kill the tween. Without this line, if there's a tween with multiple targets and then you killTweensOf() each target individually, the tween would technically still remain active and fire its onComplete even though there aren't any more properties tweening.
            this._enabled(false, false);
          }
        }
      }
      return changed;
    };

    p.invalidate = function() {
      if (this._notifyPluginsOfEnabled) {
        TweenLite._onPluginEvent("_onDisable", this);
      }
      this._firstPT = this._overwrittenProps = this._startAt = this._onUpdate = null;
      this._notifyPluginsOfEnabled = this._active = this._lazy = false;
      this._propLookup = (this._targets) ? {} : [];
      Animation.prototype.invalidate.call(this);
      if (this.vars.immediateRender) {
        this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
        this.render(-this._delay);
      }
      return this;
    };

    p._enabled = function(enabled, ignoreTimeline) {
      if (!_tickerActive) {
        _ticker.wake();
      }
      if (enabled && this._gc) {
        var targets = this._targets,
          i;
        if (targets) {
          i = targets.length;
          while (--i > -1) {
            this._siblings[i] = _register(targets[i], this, true);
          }
        } else {
          this._siblings = _register(this.target, this, true);
        }
      }
      Animation.prototype._enabled.call(this, enabled, ignoreTimeline);
      if (this._notifyPluginsOfEnabled) if (this._firstPT) {
        return TweenLite._onPluginEvent((enabled ? "_onEnable" : "_onDisable"), this);
      }
      return false;
    };


//----TweenLite static methods -----------------------------------------------------

    TweenLite.to = function(target, duration, vars) {
      return new TweenLite(target, duration, vars);
    };

    TweenLite.from = function(target, duration, vars) {
      vars.runBackwards = true;
      vars.immediateRender = (vars.immediateRender != false);
      return new TweenLite(target, duration, vars);
    };

    TweenLite.fromTo = function(target, duration, fromVars, toVars) {
      toVars.startAt = fromVars;
      toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
      return new TweenLite(target, duration, toVars);
    };

    TweenLite.delayedCall = function(delay, callback, params, scope, useFrames) {
      return new TweenLite(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, callbackScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, immediateRender:false, lazy:false, useFrames:useFrames, overwrite:0});
    };

    TweenLite.set = function(target, vars) {
      return new TweenLite(target, 0, vars);
    };

    TweenLite.getTweensOf = function(target, onlyActive) {
      if (target == null) { return []; }
      target = (typeof(target) !== "string") ? target : TweenLite.selector(target) || target;
      var i, a, j, t;
      if ((_isArray(target) || _isSelector(target)) && typeof(target[0]) !== "number") {
        i = target.length;
        a = [];
        while (--i > -1) {
          a = a.concat(TweenLite.getTweensOf(target[i], onlyActive));
        }
        i = a.length;
        //now get rid of any duplicates (tweens of arrays of objects could cause duplicates)
        while (--i > -1) {
          t = a[i];
          j = i;
          while (--j > -1) {
            if (t === a[j]) {
              a.splice(i, 1);
            }
          }
        }
      } else {
        a = _register(target).concat();
        i = a.length;
        while (--i > -1) {
          if (a[i]._gc || (onlyActive && !a[i].isActive())) {
            a.splice(i, 1);
          }
        }
      }
      return a;
    };

    TweenLite.killTweensOf = TweenLite.killDelayedCallsTo = function(target, onlyActive, vars) {
      if (typeof(onlyActive) === "object") {
        vars = onlyActive; //for backwards compatibility (before "onlyActive" parameter was inserted)
        onlyActive = false;
      }
      var a = TweenLite.getTweensOf(target, onlyActive),
        i = a.length;
      while (--i > -1) {
        a[i]._kill(vars, target);
      }
    };



/*
 * ----------------------------------------------------------------
 * TweenPlugin   (could easily be split out as a separate file/class, but included for ease of use (so that people don't need to include another script call before loading plugins which is easy to forget)
 * ----------------------------------------------------------------
 */
    var TweenPlugin = _class("plugins.TweenPlugin", function(props, priority) {
          this._overwriteProps = (props || "").split(",");
          this._propName = this._overwriteProps[0];
          this._priority = priority || 0;
          this._super = TweenPlugin.prototype;
        }, true);

    p = TweenPlugin.prototype;
    TweenPlugin.version = "1.18.0";
    TweenPlugin.API = 2;
    p._firstPT = null;
    p._addTween = _addPropTween;
    p.setRatio = _setRatio;

    p._kill = function(lookup) {
      var a = this._overwriteProps,
        pt = this._firstPT,
        i;
      if (lookup[this._propName] != null) {
        this._overwriteProps = [];
      } else {
        i = a.length;
        while (--i > -1) {
          if (lookup[a[i]] != null) {
            a.splice(i, 1);
          }
        }
      }
      while (pt) {
        if (lookup[pt.n] != null) {
          if (pt._next) {
            pt._next._prev = pt._prev;
          }
          if (pt._prev) {
            pt._prev._next = pt._next;
            pt._prev = null;
          } else if (this._firstPT === pt) {
            this._firstPT = pt._next;
          }
        }
        pt = pt._next;
      }
      return false;
    };

    p._roundProps = function(lookup, value) {
      var pt = this._firstPT;
      while (pt) {
        if (lookup[this._propName] || (pt.n != null && lookup[ pt.n.split(this._propName + "_").join("") ])) { //some properties that are very plugin-specific add a prefix named after the _propName plus an underscore, so we need to ignore that extra stuff here.
          pt.r = value;
        }
        pt = pt._next;
      }
    };

    TweenLite._onPluginEvent = function(type, tween) {
      var pt = tween._firstPT,
        changed, pt2, first, last, next;
      if (type === "_onInitAllProps") {
        //sorts the PropTween linked list in order of priority because some plugins need to render earlier/later than others, like MotionBlurPlugin applies its effects after all x/y/alpha tweens have rendered on each frame.
        while (pt) {
          next = pt._next;
          pt2 = first;
          while (pt2 && pt2.pr > pt.pr) {
            pt2 = pt2._next;
          }
          if ((pt._prev = pt2 ? pt2._prev : last)) {
            pt._prev._next = pt;
          } else {
            first = pt;
          }
          if ((pt._next = pt2)) {
            pt2._prev = pt;
          } else {
            last = pt;
          }
          pt = next;
        }
        pt = tween._firstPT = first;
      }
      while (pt) {
        if (pt.pg) if (typeof(pt.t[type]) === "function") if (pt.t[type]()) {
          changed = true;
        }
        pt = pt._next;
      }
      return changed;
    };

    TweenPlugin.activate = function(plugins) {
      var i = plugins.length;
      while (--i > -1) {
        if (plugins[i].API === TweenPlugin.API) {
          _plugins[(new plugins[i]())._propName] = plugins[i];
        }
      }
      return true;
    };

    //provides a more concise way to define plugins that have no dependencies besides TweenPlugin and TweenLite, wrapping common boilerplate stuff into one function (added in 1.9.0). You don't NEED to use this to define a plugin - the old way still works and can be useful in certain (rare) situations.
    _gsDefine.plugin = function(config) {
      if (!config || !config.propName || !config.init || !config.API) { throw "illegal plugin definition."; }
      var propName = config.propName,
        priority = config.priority || 0,
        overwriteProps = config.overwriteProps,
        map = {init:"_onInitTween", set:"setRatio", kill:"_kill", round:"_roundProps", initAll:"_onInitAllProps"},
        Plugin = _class("plugins." + propName.charAt(0).toUpperCase() + propName.substr(1) + "Plugin",
          function() {
            TweenPlugin.call(this, propName, priority);
            this._overwriteProps = overwriteProps || [];
          }, (config.global === true)),
        p = Plugin.prototype = new TweenPlugin(propName),
        prop;
      p.constructor = Plugin;
      Plugin.API = config.API;
      for (prop in map) {
        if (typeof(config[prop]) === "function") {
          p[map[prop]] = config[prop];
        }
      }
      Plugin.version = config.version;
      TweenPlugin.activate([Plugin]);
      return Plugin;
    };


    //now run through all the dependencies discovered and if any are missing, log that to the console as a warning. This is why it's best to have TweenLite load last - it can check all the dependencies for you.
    a = window._gsQueue;
    if (a) {
      for (i = 0; i < a.length; i++) {
        a[i]();
      }
      for (p in _defLookup) {
        if (!_defLookup[p].func) {
          window.console.log("GSAP encountered missing dependency: com.greensock." + p);
        }
      }
    }

    _tickerActive = false; //ensures that the first official animation forces a ticker.tick() to update the time when it is instantiated

})((typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window, "TweenMax");
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],5:[function(require,module,exports){
/**
 * lodash 3.1.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFlatten = require('lodash._baseflatten'),
    createWrapper = require('lodash._createwrapper'),
    functions = require('lodash.functions'),
    restParam = require('lodash.restparam');

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1;

/**
 * Binds methods of an object to the object itself, overwriting the existing
 * method. Method names may be specified as individual arguments or as arrays
 * of method names. If no method names are provided all enumerable function
 * properties, own and inherited, of `object` are bound.
 *
 * **Note:** This method does not set the `length` property of bound functions.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Object} object The object to bind and assign the bound methods to.
 * @param {...(string|string[])} [methodNames] The object method names to bind,
 *  specified as individual method names or arrays of method names.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var view = {
 *   'label': 'docs',
 *   'onClick': function() {
 *     console.log('clicked ' + this.label);
 *   }
 * };
 *
 * _.bindAll(view);
 * jQuery('#docs').on('click', view.onClick);
 * // => logs 'clicked docs' when the element is clicked
 */
var bindAll = restParam(function(object, methodNames) {
  methodNames = methodNames.length ? baseFlatten(methodNames) : functions(object);

  var index = -1,
      length = methodNames.length;

  while (++index < length) {
    var key = methodNames[index];
    object[key] = createWrapper(object[key], BIND_FLAG, object);
  }
  return object;
});

module.exports = bindAll;

},{"lodash._baseflatten":6,"lodash._createwrapper":9,"lodash.functions":11,"lodash.restparam":17}],6:[function(require,module,exports){
/**
 * lodash 3.1.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/**
 * The base implementation of `_.flatten` with added support for restricting
 * flattening and specifying the start index.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {boolean} [isDeep] Specify a deep flatten.
 * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, isDeep, isStrict, result) {
  result || (result = []);

  var index = -1,
      length = array.length;

  while (++index < length) {
    var value = array[index];
    if (isObjectLike(value) && isArrayLike(value) &&
        (isStrict || isArray(value) || isArguments(value))) {
      if (isDeep) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, isDeep, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = baseFlatten;

},{"lodash.isarguments":7,"lodash.isarray":8}],7:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value)) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object, else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array and weak map constructors,
  // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is loosely based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isArguments;

},{}],8:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],9:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var root = require('lodash._root');

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    BIND_KEY_FLAG = 2,
    CURRY_BOUND_FLAG = 4,
    CURRY_FLAG = 8,
    CURRY_RIGHT_FLAG = 16,
    PARTIAL_FLAG = 32,
    PARTIAL_RIGHT_FLAG = 64,
    ARY_FLAG = 128,
    FLIP_FLAG = 512;

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_SAFE_INTEGER = 9007199254740991,
    MAX_INTEGER = 1.7976931348623157e+308,
    NAN = 0 / 0;

/** Used as the internal argument placeholder. */
var PLACEHOLDER = '__lodash_placeholder__';

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {...*} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  var length = args.length;
  switch (length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Replaces all `placeholder` elements in `array` with an internal placeholder
 * and returns an array of their indexes.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {*} placeholder The placeholder to replace.
 * @returns {Array} Returns the new array of placeholder indexes.
 */
function replaceHolders(array, placeholder) {
  var index = -1,
      length = array.length,
      resIndex = -1,
      result = [];

  while (++index < length) {
    if (array[index] === placeholder) {
      array[index] = PLACEHOLDER;
      result[++resIndex] = index;
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(prototype) {
    if (isObject(prototype)) {
      object.prototype = prototype;
      var result = new object;
      object.prototype = undefined;
    }
    return result || {};
  };
}());

/**
 * Creates an array that is the composition of partially applied arguments,
 * placeholders, and provided arguments into a single array of arguments.
 *
 * @private
 * @param {Array|Object} args The provided arguments.
 * @param {Array} partials The arguments to prepend to those provided.
 * @param {Array} holders The `partials` placeholder indexes.
 * @returns {Array} Returns the new array of composed arguments.
 */
function composeArgs(args, partials, holders) {
  var holdersLength = holders.length,
      argsIndex = -1,
      argsLength = nativeMax(args.length - holdersLength, 0),
      leftIndex = -1,
      leftLength = partials.length,
      result = Array(leftLength + argsLength);

  while (++leftIndex < leftLength) {
    result[leftIndex] = partials[leftIndex];
  }
  while (++argsIndex < holdersLength) {
    result[holders[argsIndex]] = args[argsIndex];
  }
  while (argsLength--) {
    result[leftIndex++] = args[argsIndex++];
  }
  return result;
}

/**
 * This function is like `composeArgs` except that the arguments composition
 * is tailored for `_.partialRight`.
 *
 * @private
 * @param {Array|Object} args The provided arguments.
 * @param {Array} partials The arguments to append to those provided.
 * @param {Array} holders The `partials` placeholder indexes.
 * @returns {Array} Returns the new array of composed arguments.
 */
function composeArgsRight(args, partials, holders) {
  var holdersIndex = -1,
      holdersLength = holders.length,
      argsIndex = -1,
      argsLength = nativeMax(args.length - holdersLength, 0),
      rightIndex = -1,
      rightLength = partials.length,
      result = Array(argsLength + rightLength);

  while (++argsIndex < argsLength) {
    result[argsIndex] = args[argsIndex];
  }
  var offset = argsIndex;
  while (++rightIndex < rightLength) {
    result[offset + rightIndex] = partials[rightIndex];
  }
  while (++holdersIndex < holdersLength) {
    result[offset + holders[holdersIndex]] = args[argsIndex++];
  }
  return result;
}

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

/**
 * Creates a function that wraps `func` to invoke it with the optional `this`
 * binding of `thisArg`.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createBaseWrapper(func, bitmask, thisArg) {
  var isBind = bitmask & BIND_FLAG,
      Ctor = createCtorWrapper(func);

  function wrapper() {
    var fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;
    return fn.apply(isBind ? thisArg : this, arguments);
  }
  return wrapper;
}

/**
 * Creates a function that produces an instance of `Ctor` regardless of
 * whether it was invoked as part of a `new` expression or by `call` or `apply`.
 *
 * @private
 * @param {Function} Ctor The constructor to wrap.
 * @returns {Function} Returns the new wrapped function.
 */
function createCtorWrapper(Ctor) {
  return function() {
    // Use a `switch` statement to work with class constructors.
    // See http://ecma-international.org/ecma-262/6.0/#sec-ecmascript-function-objects-call-thisargument-argumentslist
    // for more details.
    var args = arguments;
    switch (args.length) {
      case 0: return new Ctor;
      case 1: return new Ctor(args[0]);
      case 2: return new Ctor(args[0], args[1]);
      case 3: return new Ctor(args[0], args[1], args[2]);
      case 4: return new Ctor(args[0], args[1], args[2], args[3]);
      case 5: return new Ctor(args[0], args[1], args[2], args[3], args[4]);
      case 6: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
      case 7: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    }
    var thisBinding = baseCreate(Ctor.prototype),
        result = Ctor.apply(thisBinding, args);

    // Mimic the constructor's `return` behavior.
    // See https://es5.github.io/#x13.2.2 for more details.
    return isObject(result) ? result : thisBinding;
  };
}

/**
 * Creates a function that wraps `func` to enable currying.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
 * @param {number} arity The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createCurryWrapper(func, bitmask, arity) {
  var Ctor = createCtorWrapper(func);

  function wrapper() {
    var length = arguments.length,
        index = length,
        args = Array(length),
        fn = (this && this !== root && this instanceof wrapper) ? Ctor : func,
        placeholder = wrapper.placeholder;

    while (index--) {
      args[index] = arguments[index];
    }
    var holders = (length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder)
      ? []
      : replaceHolders(args, placeholder);

    length -= holders.length;
    return length < arity
      ? createRecurryWrapper(func, bitmask, createHybridWrapper, placeholder, undefined, args, holders, undefined, undefined, arity - length)
      : apply(fn, this, args);
  }
  return wrapper;
}

/**
 * Creates a function that wraps `func` to invoke it with optional `this`
 * binding of `thisArg`, partial application, and currying.
 *
 * @private
 * @param {Function|string} func The function or method name to wrap.
 * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {Array} [partials] The arguments to prepend to those provided to the new function.
 * @param {Array} [holders] The `partials` placeholder indexes.
 * @param {Array} [partialsRight] The arguments to append to those provided to the new function.
 * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
 * @param {Array} [argPos] The argument positions of the new function.
 * @param {number} [ary] The arity cap of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
  var isAry = bitmask & ARY_FLAG,
      isBind = bitmask & BIND_FLAG,
      isBindKey = bitmask & BIND_KEY_FLAG,
      isCurry = bitmask & CURRY_FLAG,
      isCurryRight = bitmask & CURRY_RIGHT_FLAG,
      isFlip = bitmask & FLIP_FLAG,
      Ctor = isBindKey ? undefined : createCtorWrapper(func);

  function wrapper() {
    var length = arguments.length,
        index = length,
        args = Array(length);

    while (index--) {
      args[index] = arguments[index];
    }
    if (partials) {
      args = composeArgs(args, partials, holders);
    }
    if (partialsRight) {
      args = composeArgsRight(args, partialsRight, holdersRight);
    }
    if (isCurry || isCurryRight) {
      var placeholder = wrapper.placeholder,
          argsHolders = replaceHolders(args, placeholder);

      length -= argsHolders.length;
      if (length < arity) {
        return createRecurryWrapper(func, bitmask, createHybridWrapper, placeholder, thisArg, args, argsHolders, argPos, ary, arity - length);
      }
    }
    var thisBinding = isBind ? thisArg : this,
        fn = isBindKey ? thisBinding[func] : func;

    if (argPos) {
      args = reorder(args, argPos);
    } else if (isFlip && args.length > 1) {
      args.reverse();
    }
    if (isAry && ary < args.length) {
      args.length = ary;
    }
    if (this && this !== root && this instanceof wrapper) {
      fn = Ctor || createCtorWrapper(fn);
    }
    return fn.apply(thisBinding, args);
  }
  return wrapper;
}

/**
 * Creates a function that wraps `func` to invoke it with the optional `this`
 * binding of `thisArg` and the `partials` prepended to those provided to
 * the wrapper.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} partials The arguments to prepend to those provided to the new function.
 * @returns {Function} Returns the new wrapped function.
 */
function createPartialWrapper(func, bitmask, thisArg, partials) {
  var isBind = bitmask & BIND_FLAG,
      Ctor = createCtorWrapper(func);

  function wrapper() {
    var argsIndex = -1,
        argsLength = arguments.length,
        leftIndex = -1,
        leftLength = partials.length,
        args = Array(leftLength + argsLength),
        fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;

    while (++leftIndex < leftLength) {
      args[leftIndex] = partials[leftIndex];
    }
    while (argsLength--) {
      args[leftIndex++] = arguments[++argsIndex];
    }
    return apply(fn, isBind ? thisArg : this, args);
  }
  return wrapper;
}

/**
 * Creates a function that wraps `func` to continue currying.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper` for more details.
 * @param {Function} wrapFunc The function to create the `func` wrapper.
 * @param {*} placeholder The placeholder to replace.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {Array} [partials] The arguments to prepend to those provided to the new function.
 * @param {Array} [holders] The `partials` placeholder indexes.
 * @param {Array} [argPos] The argument positions of the new function.
 * @param {number} [ary] The arity cap of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createRecurryWrapper(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary, arity) {
  var isCurry = bitmask & CURRY_FLAG,
      newArgPos = argPos ? copyArray(argPos) : undefined,
      newsHolders = isCurry ? holders : undefined,
      newHoldersRight = isCurry ? undefined : holders,
      newPartials = isCurry ? partials : undefined,
      newPartialsRight = isCurry ? undefined : partials;

  bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
  bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);

  if (!(bitmask & CURRY_BOUND_FLAG)) {
    bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
  }
  var result = wrapFunc(func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, arity);

  result.placeholder = placeholder;
  return result;
}

/**
 * Creates a function that either curries or invokes `func` with optional
 * `this` binding and partially applied arguments.
 *
 * @private
 * @param {Function|string} func The function or method name to wrap.
 * @param {number} bitmask The bitmask of wrapper flags.
 *  The bitmask may be composed of the following flags:
 *     1 - `_.bind`
 *     2 - `_.bindKey`
 *     4 - `_.curry` or `_.curryRight` of a bound function
 *     8 - `_.curry`
 *    16 - `_.curryRight`
 *    32 - `_.partial`
 *    64 - `_.partialRight`
 *   128 - `_.rearg`
 *   256 - `_.ary`
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {Array} [partials] The arguments to be partially applied.
 * @param {Array} [holders] The `partials` placeholder indexes.
 * @param {Array} [argPos] The argument positions of the new function.
 * @param {number} [ary] The arity cap of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
  var isBindKey = bitmask & BIND_KEY_FLAG;
  if (!isBindKey && typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var length = partials ? partials.length : 0;
  if (!length) {
    bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
    partials = holders = undefined;
  }
  ary = ary === undefined ? ary : nativeMax(toInteger(ary), 0);
  arity = arity === undefined ? arity : toInteger(arity);
  length -= holders ? holders.length : 0;

  if (bitmask & PARTIAL_RIGHT_FLAG) {
    var partialsRight = partials,
        holdersRight = holders;

    partials = holders = undefined;
  }
  var newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];

  func = newData[0];
  bitmask = newData[1];
  thisArg = newData[2];
  partials = newData[3];
  holders = newData[4];
  arity = newData[9] = newData[9] == null
    ? (isBindKey ? 0 : func.length)
    : nativeMax(newData[9] - length, 0);

  if (!arity && bitmask & (CURRY_FLAG | CURRY_RIGHT_FLAG)) {
    bitmask &= ~(CURRY_FLAG | CURRY_RIGHT_FLAG);
  }
  if (!bitmask || bitmask == BIND_FLAG) {
    var result = createBaseWrapper(func, bitmask, thisArg);
  } else if (bitmask == CURRY_FLAG || bitmask == CURRY_RIGHT_FLAG) {
    result = createCurryWrapper(func, bitmask, arity);
  } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !holders.length) {
    result = createPartialWrapper(func, bitmask, thisArg, partials);
  } else {
    result = createHybridWrapper.apply(undefined, newData);
  }
  return result;
}

/**
 * Reorder `array` according to the specified indexes where the element at
 * the first index is assigned as the first element, the element at
 * the second index is assigned as the second element, and so on.
 *
 * @private
 * @param {Array} array The array to reorder.
 * @param {Array} indexes The arranged array indexes.
 * @returns {Array} Returns `array`.
 */
function reorder(array, indexes) {
  var arrLength = array.length,
      length = nativeMin(indexes.length, arrLength),
      oldArray = copyArray(array);

  while (length--) {
    var index = indexes[length];
    array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
  }
  return array;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array constructors, and
  // PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Converts `value` to an integer.
 *
 * **Note:** This function is loosely based on [`ToInteger`](http://www.ecma-international.org/ecma-262/6.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3');
 * // => 3
 */
function toInteger(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  var remainder = value % 1;
  return value === value ? (remainder ? value - remainder : value) : 0;
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3);
 * // => 3
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3');
 * // => 3
 */
function toNumber(value) {
  if (isObject(value)) {
    var other = isFunction(value.valueOf) ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = createWrapper;

},{"lodash._root":10}],10:[function(require,module,exports){
(function (global){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used to determine if values are of the language type `Object`. */
var objectTypes = {
  'function': true,
  'object': true
};

/** Detect free variable `exports`. */
var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType)
  ? exports
  : undefined;

/** Detect free variable `module`. */
var freeModule = (objectTypes[typeof module] && module && !module.nodeType)
  ? module
  : undefined;

/** Detect free variable `global` from Node.js. */
var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);

/** Detect free variable `self`. */
var freeSelf = checkGlobal(objectTypes[typeof self] && self);

/** Detect free variable `window`. */
var freeWindow = checkGlobal(objectTypes[typeof window] && window);

/** Detect `this` as the global object. */
var thisGlobal = checkGlobal(objectTypes[typeof this] && this);

/**
 * Used as a reference to the global object.
 *
 * The `this` value is used if it's the global object to avoid Greasemonkey's
 * restricted `window` object, otherwise the `window` object is used.
 */
var root = freeGlobal ||
  ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) ||
    freeSelf || thisGlobal || Function('return this')();

/**
 * Checks if `value` is a global object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {null|Object} Returns `value` if it's a global object, else `null`.
 */
function checkGlobal(value) {
  return (value && value.Object === Object) ? value : null;
}

module.exports = root;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],11:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFunctions = require('lodash._basefunctions'),
    keysIn = require('lodash.keysin');

/**
 * Creates an array of function property names from all enumerable properties,
 * own and inherited, of `object`.
 *
 * @static
 * @memberOf _
 * @alias methods
 * @category Object
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns the new array of property names.
 * @example
 *
 * _.functions(_);
 * // => ['all', 'any', 'bind', ...]
 */
function functions(object) {
  return baseFunctions(object, keysIn(object));
}

module.exports = functions;

},{"lodash._basefunctions":12,"lodash.keysin":14}],12:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isFunction = require('lodash.isfunction');

/**
 * The base implementation of `_.functions` which creates an array of
 * `object` function property names filtered from those provided.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Array} props The property names to filter.
 * @returns {Array} Returns the new array of filtered property names.
 */
function baseFunctions(object, props) {
  var index = -1,
      length = props.length,
      resIndex = -1,
      result = [];

  while (++index < length) {
    var key = props[index];
    if (isFunction(object[key])) {
      result[++resIndex] = key;
    }
  }
  return result;
}

module.exports = baseFunctions;

},{"lodash.isfunction":13}],13:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array constructors, and
  // PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isFunction;

},{}],14:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"lodash.isarguments":15,"lodash.isarray":16}],15:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],16:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8}],17:[function(require,module,exports){
/**
 * lodash 3.6.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],18:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var debounce = require('lodash.debounce');

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed invocations. Provide an options object to indicate
 * that `func` should be invoked on the leading and/or trailing edge of the
 * `wait` timeout. Subsequent calls to the throttled function return the
 * result of the last `func` call.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
 * on the trailing edge of the timeout only if the the throttled function is
 * invoked more than once during the `wait` timeout.
 *
 * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options] The options object.
 * @param {boolean} [options.leading=true] Specify invoking on the leading
 *  edge of the timeout.
 * @param {boolean} [options.trailing=true] Specify invoking on the trailing
 *  edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // avoid excessively updating the position while scrolling
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // invoke `renewToken` when the click event is fired, but not more than once every 5 minutes
 * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
 *   'trailing': false
 * }));
 *
 * // cancel a trailing throttled call
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (options === false) {
    leading = false;
  } else if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, { 'leading': leading, 'maxWait': +wait, 'trailing': trailing });
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = throttle;

},{"lodash.debounce":19}],19:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative');

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeNow = getNative(Date, 'now');

/**
 * Gets the number of milliseconds that have elapsed since the Unix epoch
 * (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @category Date
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => logs the number of milliseconds it took for the deferred function to be invoked
 */
var now = nativeNow || function() {
  return new Date().getTime();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed invocations. Provide an options object to indicate that `func`
 * should be invoked on the leading and/or trailing edge of the `wait` timeout.
 * Subsequent calls to the debounced function return the result of the last
 * `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
 * on the trailing edge of the timeout only if the the debounced function is
 * invoked more than once during the `wait` timeout.
 *
 * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options] The options object.
 * @param {boolean} [options.leading=false] Specify invoking on the leading
 *  edge of the timeout.
 * @param {number} [options.maxWait] The maximum time `func` is allowed to be
 *  delayed before it is invoked.
 * @param {boolean} [options.trailing=true] Specify invoking on the trailing
 *  edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // avoid costly calculations while the window size is in flux
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
 * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // ensure `batchLog` is invoked once after 1 second of debounced calls
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', _.debounce(batchLog, 250, {
 *   'maxWait': 1000
 * }));
 *
 * // cancel a debounced call
 * var todoChanges = _.debounce(batchLog, 1000);
 * Object.observe(models.todo, todoChanges);
 *
 * Object.observe(models, function(changes) {
 *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
 *     todoChanges.cancel();
 *   }
 * }, ['delete']);
 *
 * // ...at some point `models.todo` is changed
 * models.todo.completed = true;
 *
 * // ...before 1 second has passed `models.todo` is deleted
 * // which cancels the debounced `todoChanges` call
 * delete models.todo;
 */
function debounce(func, wait, options) {
  var args,
      maxTimeoutId,
      result,
      stamp,
      thisArg,
      timeoutId,
      trailingCall,
      lastCalled = 0,
      maxWait = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = wait < 0 ? 0 : (+wait || 0);
  if (options === true) {
    var leading = true;
    trailing = false;
  } else if (isObject(options)) {
    leading = !!options.leading;
    maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
    }
    lastCalled = 0;
    maxTimeoutId = timeoutId = trailingCall = undefined;
  }

  function complete(isCalled, id) {
    if (id) {
      clearTimeout(id);
    }
    maxTimeoutId = timeoutId = trailingCall = undefined;
    if (isCalled) {
      lastCalled = now();
      result = func.apply(thisArg, args);
      if (!timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
    }
  }

  function delayed() {
    var remaining = wait - (now() - stamp);
    if (remaining <= 0 || remaining > wait) {
      complete(trailingCall, maxTimeoutId);
    } else {
      timeoutId = setTimeout(delayed, remaining);
    }
  }

  function maxDelayed() {
    complete(trailing, timeoutId);
  }

  function debounced() {
    args = arguments;
    stamp = now();
    thisArg = this;
    trailingCall = trailing && (timeoutId || !leading);

    if (maxWait === false) {
      var leadingCall = leading && !timeoutId;
    } else {
      if (!maxTimeoutId && !leading) {
        lastCalled = stamp;
      }
      var remaining = maxWait - (stamp - lastCalled),
          isCalled = remaining <= 0 || remaining > maxWait;

      if (isCalled) {
        if (maxTimeoutId) {
          maxTimeoutId = clearTimeout(maxTimeoutId);
        }
        lastCalled = stamp;
        result = func.apply(thisArg, args);
      }
      else if (!maxTimeoutId) {
        maxTimeoutId = setTimeout(maxDelayed, remaining);
      }
    }
    if (isCalled && timeoutId) {
      timeoutId = clearTimeout(timeoutId);
    }
    else if (!timeoutId && wait !== maxWait) {
      timeoutId = setTimeout(delayed, wait);
    }
    if (leadingCall) {
      isCalled = true;
      result = func.apply(thisArg, args);
    }
    if (isCalled && !timeoutId && !maxTimeoutId) {
      args = thisArg = undefined;
    }
    return result;
  }
  debounced.cancel = cancel;
  return debounced;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = debounce;

},{"lodash._getnative":20}],20:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],21:[function(require,module,exports){
/*! picturefill - v3.0.2 - 2016-02-12
 * https://scottjehl.github.io/picturefill/
 * Copyright (c) 2016 https://github.com/scottjehl/picturefill/blob/master/Authors.txt; Licensed MIT
 */
/*! Gecko-Picture - v1.0
 * https://github.com/scottjehl/picturefill/tree/3.0/src/plugins/gecko-picture
 * Firefox's early picture implementation (prior to FF41) is static and does
 * not react to viewport changes. This tiny module fixes this.
 */
(function(window) {
  /*jshint eqnull:true */
  var ua = navigator.userAgent;

  if ( window.HTMLPictureElement && ((/ecko/).test(ua) && ua.match(/rv\:(\d+)/) && RegExp.$1 < 45) ) {
    addEventListener("resize", (function() {
      var timer;

      var dummySrc = document.createElement("source");

      var fixRespimg = function(img) {
        var source, sizes;
        var picture = img.parentNode;

        if (picture.nodeName.toUpperCase() === "PICTURE") {
          source = dummySrc.cloneNode();

          picture.insertBefore(source, picture.firstElementChild);
          setTimeout(function() {
            picture.removeChild(source);
          });
        } else if (!img._pfLastSize || img.offsetWidth > img._pfLastSize) {
          img._pfLastSize = img.offsetWidth;
          sizes = img.sizes;
          img.sizes += ",100vw";
          setTimeout(function() {
            img.sizes = sizes;
          });
        }
      };

      var findPictureImgs = function() {
        var i;
        var imgs = document.querySelectorAll("picture > img, img[srcset][sizes]");
        for (i = 0; i < imgs.length; i++) {
          fixRespimg(imgs[i]);
        }
      };
      var onResize = function() {
        clearTimeout(timer);
        timer = setTimeout(findPictureImgs, 99);
      };
      var mq = window.matchMedia && matchMedia("(orientation: landscape)");
      var init = function() {
        onResize();

        if (mq && mq.addListener) {
          mq.addListener(onResize);
        }
      };

      dummySrc.srcset = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

      if (/^[c|i]|d$/.test(document.readyState || "")) {
        init();
      } else {
        document.addEventListener("DOMContentLoaded", init);
      }

      return onResize;
    })());
  }
})(window);

/*! Picturefill - v3.0.2
 * http://scottjehl.github.io/picturefill
 * Copyright (c) 2015 https://github.com/scottjehl/picturefill/blob/master/Authors.txt;
 *  License: MIT
 */

(function( window, document, undefined ) {
  // Enable strict mode
  "use strict";

  // HTML shim|v it for old IE (IE9 will still need the HTML video tag workaround)
  document.createElement( "picture" );

  var warn, eminpx, alwaysCheckWDescriptor, evalId;
  // local object for method references and testing exposure
  var pf = {};
  var isSupportTestReady = false;
  var noop = function() {};
  var image = document.createElement( "img" );
  var getImgAttr = image.getAttribute;
  var setImgAttr = image.setAttribute;
  var removeImgAttr = image.removeAttribute;
  var docElem = document.documentElement;
  var types = {};
  var cfg = {
    //resource selection:
    algorithm: ""
  };
  var srcAttr = "data-pfsrc";
  var srcsetAttr = srcAttr + "set";
  // ua sniffing is done for undetectable img loading features,
  // to do some non crucial perf optimizations
  var ua = navigator.userAgent;
  var supportAbort = (/rident/).test(ua) || ((/ecko/).test(ua) && ua.match(/rv\:(\d+)/) && RegExp.$1 > 35 );
  var curSrcProp = "currentSrc";
  var regWDesc = /\s+\+?\d+(e\d+)?w/;
  var regSize = /(\([^)]+\))?\s*(.+)/;
  var setOptions = window.picturefillCFG;
  /**
   * Shortcut property for https://w3c.github.io/webappsec/specs/mixedcontent/#restricts-mixed-content ( for easy overriding in tests )
   */
  // baseStyle also used by getEmValue (i.e.: width: 1em is important)
  var baseStyle = "position:absolute;left:0;visibility:hidden;display:block;padding:0;border:none;font-size:1em;width:1em;overflow:hidden;clip:rect(0px, 0px, 0px, 0px)";
  var fsCss = "font-size:100%!important;";
  var isVwDirty = true;

  var cssCache = {};
  var sizeLengthCache = {};
  var DPR = window.devicePixelRatio;
  var units = {
    px: 1,
    "in": 96
  };
  var anchor = document.createElement( "a" );
  /**
   * alreadyRun flag used for setOptions. is it true setOptions will reevaluate
   * @type {boolean}
   */
  var alreadyRun = false;

  // Reusable, non-"g" Regexes

  // (Don't use \s, to avoid matching non-breaking space.)
  var regexLeadingSpaces = /^[ \t\n\r\u000c]+/,
      regexLeadingCommasOrSpaces = /^[, \t\n\r\u000c]+/,
      regexLeadingNotSpaces = /^[^ \t\n\r\u000c]+/,
      regexTrailingCommas = /[,]+$/,
      regexNonNegativeInteger = /^\d+$/,

      // ( Positive or negative or unsigned integers or decimals, without or without exponents.
      // Must include at least one digit.
      // According to spec tests any decimal point must be followed by a digit.
      // No leading plus sign is allowed.)
      // https://html.spec.whatwg.org/multipage/infrastructure.html#valid-floating-point-number
      regexFloatingPoint = /^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;

  var on = function(obj, evt, fn, capture) {
    if ( obj.addEventListener ) {
      obj.addEventListener(evt, fn, capture || false);
    } else if ( obj.attachEvent ) {
      obj.attachEvent( "on" + evt, fn);
    }
  };

  /**
   * simple memoize function:
   */

  var memoize = function(fn) {
    var cache = {};
    return function(input) {
      if ( !(input in cache) ) {
        cache[ input ] = fn(input);
      }
      return cache[ input ];
    };
  };

  // UTILITY FUNCTIONS

  // Manual is faster than RegEx
  // http://jsperf.com/whitespace-character/5
  function isSpace(c) {
    return (c === "\u0020" || // space
            c === "\u0009" || // horizontal tab
            c === "\u000A" || // new line
            c === "\u000C" || // form feed
            c === "\u000D");  // carriage return
  }

  /**
   * gets a mediaquery and returns a boolean or gets a css length and returns a number
   * @param css mediaqueries or css length
   * @returns {boolean|number}
   *
   * based on: https://gist.github.com/jonathantneal/db4f77009b155f083738
   */
  var evalCSS = (function() {

    var regLength = /^([\d\.]+)(em|vw|px)$/;
    var replace = function() {
      var args = arguments, index = 0, string = args[0];
      while (++index in args) {
        string = string.replace(args[index], args[++index]);
      }
      return string;
    };

    var buildStr = memoize(function(css) {

      return "return " + replace((css || "").toLowerCase(),
        // interpret `and`
        /\band\b/g, "&&",

        // interpret `,`
        /,/g, "||",

        // interpret `min-` as >=
        /min-([a-z-\s]+):/g, "e.$1>=",

        // interpret `max-` as <=
        /max-([a-z-\s]+):/g, "e.$1<=",

        //calc value
        /calc([^)]+)/g, "($1)",

        // interpret css values
        /(\d+[\.]*[\d]*)([a-z]+)/g, "($1 * e.$2)",
        //make eval less evil
        /^(?!(e.[a-z]|[0-9\.&=|><\+\-\*\(\)\/])).*/ig, ""
      ) + ";";
    });

    return function(css, length) {
      var parsedLength;
      if (!(css in cssCache)) {
        cssCache[css] = false;
        if (length && (parsedLength = css.match( regLength ))) {
          cssCache[css] = parsedLength[ 1 ] * units[parsedLength[ 2 ]];
        } else {
          /*jshint evil:true */
          try{
            cssCache[css] = new Function("e", buildStr(css))(units);
          } catch(e) {}
          /*jshint evil:false */
        }
      }
      return cssCache[css];
    };
  })();

  var setResolution = function( candidate, sizesattr ) {
    if ( candidate.w ) { // h = means height: || descriptor.type === 'h' do not handle yet...
      candidate.cWidth = pf.calcListLength( sizesattr || "100vw" );
      candidate.res = candidate.w / candidate.cWidth ;
    } else {
      candidate.res = candidate.d;
    }
    return candidate;
  };

  /**
   *
   * @param opt
   */
  var picturefill = function( opt ) {

    if (!isSupportTestReady) {return;}

    var elements, i, plen;

    var options = opt || {};

    if ( options.elements && options.elements.nodeType === 1 ) {
      if ( options.elements.nodeName.toUpperCase() === "IMG" ) {
        options.elements =  [ options.elements ];
      } else {
        options.context = options.elements;
        options.elements =  null;
      }
    }

    elements = options.elements || pf.qsa( (options.context || document), ( options.reevaluate || options.reselect ) ? pf.sel : pf.selShort );

    if ( (plen = elements.length) ) {

      pf.setupRun( options );
      alreadyRun = true;

      // Loop through all elements
      for ( i = 0; i < plen; i++ ) {
        pf.fillImg(elements[ i ], options);
      }

      pf.teardownRun( options );
    }
  };

  /**
   * outputs a warning for the developer
   * @param {message}
   * @type {Function}
   */
  warn = ( window.console && console.warn ) ?
    function( message ) {
      console.warn( message );
    } :
    noop
  ;

  if ( !(curSrcProp in image) ) {
    curSrcProp = "src";
  }

  // Add support for standard mime types.
  types[ "image/jpeg" ] = true;
  types[ "image/gif" ] = true;
  types[ "image/png" ] = true;

  function detectTypeSupport( type, typeUri ) {
    // based on Modernizr's lossless img-webp test
    // note: asynchronous
    var image = new window.Image();
    image.onerror = function() {
      types[ type ] = false;
      picturefill();
    };
    image.onload = function() {
      types[ type ] = image.width === 1;
      picturefill();
    };
    image.src = typeUri;
    return "pending";
  }

  // test svg support
  types[ "image/svg+xml" ] = document.implementation.hasFeature( "http://www.w3.org/TR/SVG11/feature#Image", "1.1" );

  /**
   * updates the internal vW property with the current viewport width in px
   */
  function updateMetrics() {

    isVwDirty = false;
    DPR = window.devicePixelRatio;
    cssCache = {};
    sizeLengthCache = {};

    pf.DPR = DPR || 1;

    units.width = Math.max(window.innerWidth || 0, docElem.clientWidth);
    units.height = Math.max(window.innerHeight || 0, docElem.clientHeight);

    units.vw = units.width / 100;
    units.vh = units.height / 100;

    evalId = [ units.height, units.width, DPR ].join("-");

    units.em = pf.getEmValue();
    units.rem = units.em;
  }

  function chooseLowRes( lowerValue, higherValue, dprValue, isCached ) {
    var bonusFactor, tooMuch, bonus, meanDensity;

    //experimental
    if (cfg.algorithm === "saveData" ){
      if ( lowerValue > 2.7 ) {
        meanDensity = dprValue + 1;
      } else {
        tooMuch = higherValue - dprValue;
        bonusFactor = Math.pow(lowerValue - 0.6, 1.5);

        bonus = tooMuch * bonusFactor;

        if (isCached) {
          bonus += 0.1 * bonusFactor;
        }

        meanDensity = lowerValue + bonus;
      }
    } else {
      meanDensity = (dprValue > 1) ?
        Math.sqrt(lowerValue * higherValue) :
        lowerValue;
    }

    return meanDensity > dprValue;
  }

  function applyBestCandidate( img ) {
    var srcSetCandidates;
    var matchingSet = pf.getSet( img );
    var evaluated = false;
    if ( matchingSet !== "pending" ) {
      evaluated = evalId;
      if ( matchingSet ) {
        srcSetCandidates = pf.setRes( matchingSet );
        pf.applySetCandidate( srcSetCandidates, img );
      }
    }
    img[ pf.ns ].evaled = evaluated;
  }

  function ascendingSort( a, b ) {
    return a.res - b.res;
  }

  function setSrcToCur( img, src, set ) {
    var candidate;
    if ( !set && src ) {
      set = img[ pf.ns ].sets;
      set = set && set[set.length - 1];
    }

    candidate = getCandidateForSrc(src, set);

    if ( candidate ) {
      src = pf.makeUrl(src);
      img[ pf.ns ].curSrc = src;
      img[ pf.ns ].curCan = candidate;

      if ( !candidate.res ) {
        setResolution( candidate, candidate.set.sizes );
      }
    }
    return candidate;
  }

  function getCandidateForSrc( src, set ) {
    var i, candidate, candidates;
    if ( src && set ) {
      candidates = pf.parseSet( set );
      src = pf.makeUrl(src);
      for ( i = 0; i < candidates.length; i++ ) {
        if ( src === pf.makeUrl(candidates[ i ].url) ) {
          candidate = candidates[ i ];
          break;
        }
      }
    }
    return candidate;
  }

  function getAllSourceElements( picture, candidates ) {
    var i, len, source, srcset;

    // SPEC mismatch intended for size and perf:
    // actually only source elements preceding the img should be used
    // also note: don't use qsa here, because IE8 sometimes doesn't like source as the key part in a selector
    var sources = picture.getElementsByTagName( "source" );

    for ( i = 0, len = sources.length; i < len; i++ ) {
      source = sources[ i ];
      source[ pf.ns ] = true;
      srcset = source.getAttribute( "srcset" );

      // if source does not have a srcset attribute, skip
      if ( srcset ) {
        candidates.push( {
          srcset: srcset,
          media: source.getAttribute( "media" ),
          type: source.getAttribute( "type" ),
          sizes: source.getAttribute( "sizes" )
        } );
      }
    }
  }

  /**
   * Srcset Parser
   * By Alex Bell |  MIT License
   *
   * @returns Array [{url: _, d: _, w: _, h:_, set:_(????)}, ...]
   *
   * Based super duper closely on the reference algorithm at:
   * https://html.spec.whatwg.org/multipage/embedded-content.html#parse-a-srcset-attribute
   */

  // 1. Let input be the value passed to this algorithm.
  // (TO-DO : Explain what "set" argument is here. Maybe choose a more
  // descriptive & more searchable name.  Since passing the "set" in really has
  // nothing to do with parsing proper, I would prefer this assignment eventually
  // go in an external fn.)
  function parseSrcset(input, set) {

    function collectCharacters(regEx) {
      var chars,
          match = regEx.exec(input.substring(pos));
      if (match) {
        chars = match[ 0 ];
        pos += chars.length;
        return chars;
      }
    }

    var inputLength = input.length,
        url,
        descriptors,
        currentDescriptor,
        state,
        c,

        // 2. Let position be a pointer into input, initially pointing at the start
        //    of the string.
        pos = 0,

        // 3. Let candidates be an initially empty source set.
        candidates = [];

    /**
    * Adds descriptor properties to a candidate, pushes to the candidates array
    * @return undefined
    */
    // (Declared outside of the while loop so that it's only created once.
    // (This fn is defined before it is used, in order to pass JSHINT.
    // Unfortunately this breaks the sequencing of the spec comments. :/ )
    function parseDescriptors() {

      // 9. Descriptor parser: Let error be no.
      var pError = false,

      // 10. Let width be absent.
      // 11. Let density be absent.
      // 12. Let future-compat-h be absent. (We're implementing it now as h)
          w, d, h, i,
          candidate = {},
          desc, lastChar, value, intVal, floatVal;

      // 13. For each descriptor in descriptors, run the appropriate set of steps
      // from the following list:
      for (i = 0 ; i < descriptors.length; i++) {
        desc = descriptors[ i ];

        lastChar = desc[ desc.length - 1 ];
        value = desc.substring(0, desc.length - 1);
        intVal = parseInt(value, 10);
        floatVal = parseFloat(value);

        // If the descriptor consists of a valid non-negative integer followed by
        // a U+0077 LATIN SMALL LETTER W character
        if (regexNonNegativeInteger.test(value) && (lastChar === "w")) {

          // If width and density are not both absent, then let error be yes.
          if (w || d) {pError = true;}

          // Apply the rules for parsing non-negative integers to the descriptor.
          // If the result is zero, let error be yes.
          // Otherwise, let width be the result.
          if (intVal === 0) {pError = true;} else {w = intVal;}

        // If the descriptor consists of a valid floating-point number followed by
        // a U+0078 LATIN SMALL LETTER X character
        } else if (regexFloatingPoint.test(value) && (lastChar === "x")) {

          // If width, density and future-compat-h are not all absent, then let error
          // be yes.
          if (w || d || h) {pError = true;}

          // Apply the rules for parsing floating-point number values to the descriptor.
          // If the result is less than zero, let error be yes. Otherwise, let density
          // be the result.
          if (floatVal < 0) {pError = true;} else {d = floatVal;}

        // If the descriptor consists of a valid non-negative integer followed by
        // a U+0068 LATIN SMALL LETTER H character
        } else if (regexNonNegativeInteger.test(value) && (lastChar === "h")) {

          // If height and density are not both absent, then let error be yes.
          if (h || d) {pError = true;}

          // Apply the rules for parsing non-negative integers to the descriptor.
          // If the result is zero, let error be yes. Otherwise, let future-compat-h
          // be the result.
          if (intVal === 0) {pError = true;} else {h = intVal;}

        // Anything else, Let error be yes.
        } else {pError = true;}
      } // (close step 13 for loop)

      // 15. If error is still no, then append a new image source to candidates whose
      // URL is url, associated with a width width if not absent and a pixel
      // density density if not absent. Otherwise, there is a parse error.
      if (!pError) {
        candidate.url = url;

        if (w) { candidate.w = w;}
        if (d) { candidate.d = d;}
        if (h) { candidate.h = h;}
        if (!h && !d && !w) {candidate.d = 1;}
        if (candidate.d === 1) {set.has1x = true;}
        candidate.set = set;

        candidates.push(candidate);
      }
    } // (close parseDescriptors fn)

    /**
    * Tokenizes descriptor properties prior to parsing
    * Returns undefined.
    * (Again, this fn is defined before it is used, in order to pass JSHINT.
    * Unfortunately this breaks the logical sequencing of the spec comments. :/ )
    */
    function tokenize() {

      // 8.1. Descriptor tokeniser: Skip whitespace
      collectCharacters(regexLeadingSpaces);

      // 8.2. Let current descriptor be the empty string.
      currentDescriptor = "";

      // 8.3. Let state be in descriptor.
      state = "in descriptor";

      while (true) {

        // 8.4. Let c be the character at position.
        c = input.charAt(pos);

        //  Do the following depending on the value of state.
        //  For the purpose of this step, "EOF" is a special character representing
        //  that position is past the end of input.

        // In descriptor
        if (state === "in descriptor") {
          // Do the following, depending on the value of c:

          // Space character
          // If current descriptor is not empty, append current descriptor to
          // descriptors and let current descriptor be the empty string.
          // Set state to after descriptor.
          if (isSpace(c)) {
            if (currentDescriptor) {
              descriptors.push(currentDescriptor);
              currentDescriptor = "";
              state = "after descriptor";
            }

          // U+002C COMMA (,)
          // Advance position to the next character in input. If current descriptor
          // is not empty, append current descriptor to descriptors. Jump to the step
          // labeled descriptor parser.
          } else if (c === ",") {
            pos += 1;
            if (currentDescriptor) {
              descriptors.push(currentDescriptor);
            }
            parseDescriptors();
            return;

          // U+0028 LEFT PARENTHESIS (()
          // Append c to current descriptor. Set state to in parens.
          } else if (c === "\u0028") {
            currentDescriptor = currentDescriptor + c;
            state = "in parens";

          // EOF
          // If current descriptor is not empty, append current descriptor to
          // descriptors. Jump to the step labeled descriptor parser.
          } else if (c === "") {
            if (currentDescriptor) {
              descriptors.push(currentDescriptor);
            }
            parseDescriptors();
            return;

          // Anything else
          // Append c to current descriptor.
          } else {
            currentDescriptor = currentDescriptor + c;
          }
        // (end "in descriptor"

        // In parens
        } else if (state === "in parens") {

          // U+0029 RIGHT PARENTHESIS ())
          // Append c to current descriptor. Set state to in descriptor.
          if (c === ")") {
            currentDescriptor = currentDescriptor + c;
            state = "in descriptor";

          // EOF
          // Append current descriptor to descriptors. Jump to the step labeled
          // descriptor parser.
          } else if (c === "") {
            descriptors.push(currentDescriptor);
            parseDescriptors();
            return;

          // Anything else
          // Append c to current descriptor.
          } else {
            currentDescriptor = currentDescriptor + c;
          }

        // After descriptor
        } else if (state === "after descriptor") {

          // Do the following, depending on the value of c:
          // Space character: Stay in this state.
          if (isSpace(c)) {

          // EOF: Jump to the step labeled descriptor parser.
          } else if (c === "") {
            parseDescriptors();
            return;

          // Anything else
          // Set state to in descriptor. Set position to the previous character in input.
          } else {
            state = "in descriptor";
            pos -= 1;

          }
        }

        // Advance position to the next character in input.
        pos += 1;

      // Repeat this step.
      } // (close while true loop)
    }

    // 4. Splitting loop: Collect a sequence of characters that are space
    //    characters or U+002C COMMA characters. If any U+002C COMMA characters
    //    were collected, that is a parse error.
    while (true) {
      collectCharacters(regexLeadingCommasOrSpaces);

      // 5. If position is past the end of input, return candidates and abort these steps.
      if (pos >= inputLength) {
        return candidates; // (we're done, this is the sole return path)
      }

      // 6. Collect a sequence of characters that are not space characters,
      //    and let that be url.
      url = collectCharacters(regexLeadingNotSpaces);

      // 7. Let descriptors be a new empty list.
      descriptors = [];

      // 8. If url ends with a U+002C COMMA character (,), follow these substeps:
      //    (1). Remove all trailing U+002C COMMA characters from url. If this removed
      //         more than one character, that is a parse error.
      if (url.slice(-1) === ",") {
        url = url.replace(regexTrailingCommas, "");
        // (Jump ahead to step 9 to skip tokenization and just push the candidate).
        parseDescriptors();

      //  Otherwise, follow these substeps:
      } else {
        tokenize();
      } // (close else of step 8)

    // 16. Return to the step labeled splitting loop.
    } // (Close of big while loop.)
  }

  /*
   * Sizes Parser
   *
   * By Alex Bell |  MIT License
   *
   * Non-strict but accurate and lightweight JS Parser for the string value <img sizes="here">
   *
   * Reference algorithm at:
   * https://html.spec.whatwg.org/multipage/embedded-content.html#parse-a-sizes-attribute
   *
   * Most comments are copied in directly from the spec
   * (except for comments in parens).
   *
   * Grammar is:
   * <source-size-list> = <source-size># [ , <source-size-value> ]? | <source-size-value>
   * <source-size> = <media-condition> <source-size-value>
   * <source-size-value> = <length>
   * http://www.w3.org/html/wg/drafts/html/master/embedded-content.html#attr-img-sizes
   *
   * E.g. "(max-width: 30em) 100vw, (max-width: 50em) 70vw, 100vw"
   * or "(min-width: 30em), calc(30vw - 15px)" or just "30vw"
   *
   * Returns the first valid <css-length> with a media condition that evaluates to true,
   * or "100vw" if all valid media conditions evaluate to false.
   *
   */

  function parseSizes(strValue) {

    // (Percentage CSS lengths are not allowed in this case, to avoid confusion:
    // https://html.spec.whatwg.org/multipage/embedded-content.html#valid-source-size-list
    // CSS allows a single optional plus or minus sign:
    // http://www.w3.org/TR/CSS2/syndata.html#numbers
    // CSS is ASCII case-insensitive:
    // http://www.w3.org/TR/CSS2/syndata.html#characters )
    // Spec allows exponential notation for <number> type:
    // http://dev.w3.org/csswg/css-values/#numbers
    var regexCssLengthWithUnits = /^(?:[+-]?[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?(?:ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmin|vmax|vw)$/i;

    // (This is a quick and lenient test. Because of optional unlimited-depth internal
    // grouping parens and strict spacing rules, this could get very complicated.)
    var regexCssCalc = /^calc\((?:[0-9a-z \.\+\-\*\/\(\)]+)\)$/i;

    var i;
    var unparsedSizesList;
    var unparsedSizesListLength;
    var unparsedSize;
    var lastComponentValue;
    var size;

    // UTILITY FUNCTIONS

    //  (Toy CSS parser. The goals here are:
    //  1) expansive test coverage without the weight of a full CSS parser.
    //  2) Avoiding regex wherever convenient.
    //  Quick tests: http://jsfiddle.net/gtntL4gr/3/
    //  Returns an array of arrays.)
    function parseComponentValues(str) {
      var chrctr;
      var component = "";
      var componentArray = [];
      var listArray = [];
      var parenDepth = 0;
      var pos = 0;
      var inComment = false;

      function pushComponent() {
        if (component) {
          componentArray.push(component);
          component = "";
        }
      }

      function pushComponentArray() {
        if (componentArray[0]) {
          listArray.push(componentArray);
          componentArray = [];
        }
      }

      // (Loop forwards from the beginning of the string.)
      while (true) {
        chrctr = str.charAt(pos);

        if (chrctr === "") { // ( End of string reached.)
          pushComponent();
          pushComponentArray();
          return listArray;
        } else if (inComment) {
          if ((chrctr === "*") && (str[pos + 1] === "/")) { // (At end of a comment.)
            inComment = false;
            pos += 2;
            pushComponent();
            continue;
          } else {
            pos += 1; // (Skip all characters inside comments.)
            continue;
          }
        } else if (isSpace(chrctr)) {
          // (If previous character in loop was also a space, or if
          // at the beginning of the string, do not add space char to
          // component.)
          if ( (str.charAt(pos - 1) && isSpace( str.charAt(pos - 1) ) ) || !component ) {
            pos += 1;
            continue;
          } else if (parenDepth === 0) {
            pushComponent();
            pos +=1;
            continue;
          } else {
            // (Replace any space character with a plain space for legibility.)
            chrctr = " ";
          }
        } else if (chrctr === "(") {
          parenDepth += 1;
        } else if (chrctr === ")") {
          parenDepth -= 1;
        } else if (chrctr === ",") {
          pushComponent();
          pushComponentArray();
          pos += 1;
          continue;
        } else if ( (chrctr === "/") && (str.charAt(pos + 1) === "*") ) {
          inComment = true;
          pos += 2;
          continue;
        }

        component = component + chrctr;
        pos += 1;
      }
    }

    function isValidNonNegativeSourceSizeValue(s) {
      if (regexCssLengthWithUnits.test(s) && (parseFloat(s) >= 0)) {return true;}
      if (regexCssCalc.test(s)) {return true;}
      // ( http://www.w3.org/TR/CSS2/syndata.html#numbers says:
      // "-0 is equivalent to 0 and is not a negative number." which means that
      // unitless zero and unitless negative zero must be accepted as special cases.)
      if ((s === "0") || (s === "-0") || (s === "+0")) {return true;}
      return false;
    }

    // When asked to parse a sizes attribute from an element, parse a
    // comma-separated list of component values from the value of the element's
    // sizes attribute (or the empty string, if the attribute is absent), and let
    // unparsed sizes list be the result.
    // http://dev.w3.org/csswg/css-syntax/#parse-comma-separated-list-of-component-values

    unparsedSizesList = parseComponentValues(strValue);
    unparsedSizesListLength = unparsedSizesList.length;

    // For each unparsed size in unparsed sizes list:
    for (i = 0; i < unparsedSizesListLength; i++) {
      unparsedSize = unparsedSizesList[i];

      // 1. Remove all consecutive <whitespace-token>s from the end of unparsed size.
      // ( parseComponentValues() already omits spaces outside of parens. )

      // If unparsed size is now empty, that is a parse error; continue to the next
      // iteration of this algorithm.
      // ( parseComponentValues() won't push an empty array. )

      // 2. If the last component value in unparsed size is a valid non-negative
      // <source-size-value>, let size be its value and remove the component value
      // from unparsed size. Any CSS function other than the calc() function is
      // invalid. Otherwise, there is a parse error; continue to the next iteration
      // of this algorithm.
      // http://dev.w3.org/csswg/css-syntax/#parse-component-value
      lastComponentValue = unparsedSize[unparsedSize.length - 1];

      if (isValidNonNegativeSourceSizeValue(lastComponentValue)) {
        size = lastComponentValue;
        unparsedSize.pop();
      } else {
        continue;
      }

      // 3. Remove all consecutive <whitespace-token>s from the end of unparsed
      // size. If unparsed size is now empty, return size and exit this algorithm.
      // If this was not the last item in unparsed sizes list, that is a parse error.
      if (unparsedSize.length === 0) {
        return size;
      }

      // 4. Parse the remaining component values in unparsed size as a
      // <media-condition>. If it does not parse correctly, or it does parse
      // correctly but the <media-condition> evaluates to false, continue to the
      // next iteration of this algorithm.
      // (Parsing all possible compound media conditions in JS is heavy, complicated,
      // and the payoff is unclear. Is there ever an situation where the
      // media condition parses incorrectly but still somehow evaluates to true?
      // Can we just rely on the browser/polyfill to do it?)
      unparsedSize = unparsedSize.join(" ");
      if (!(pf.matchesMedia( unparsedSize ) ) ) {
        continue;
      }

      // 5. Return size and exit this algorithm.
      return size;
    }

    // If the above algorithm exhausts unparsed sizes list without returning a
    // size value, return 100vw.
    return "100vw";
  }

  // namespace
  pf.ns = ("pf" + new Date().getTime()).substr(0, 9);

  // srcset support test
  pf.supSrcset = "srcset" in image;
  pf.supSizes = "sizes" in image;
  pf.supPicture = !!window.HTMLPictureElement;

  // UC browser does claim to support srcset and picture, but not sizes,
  // this extended test reveals the browser does support nothing
  if (pf.supSrcset && pf.supPicture && !pf.supSizes) {
    (function(image2) {
      image.srcset = "data:,a";
      image2.src = "data:,a";
      pf.supSrcset = image.complete === image2.complete;
      pf.supPicture = pf.supSrcset && pf.supPicture;
    })(document.createElement("img"));
  }

  // Safari9 has basic support for sizes, but does't expose the `sizes` idl attribute
  if (pf.supSrcset && !pf.supSizes) {

    (function() {
      var width2 = "data:image/gif;base64,R0lGODlhAgABAPAAAP///wAAACH5BAAAAAAALAAAAAACAAEAAAICBAoAOw==";
      var width1 = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      var img = document.createElement("img");
      var test = function() {
        var width = img.width;

        if (width === 2) {
          pf.supSizes = true;
        }

        alwaysCheckWDescriptor = pf.supSrcset && !pf.supSizes;

        isSupportTestReady = true;
        // force async
        setTimeout(picturefill);
      };

      img.onload = test;
      img.onerror = test;
      img.setAttribute("sizes", "9px");

      img.srcset = width1 + " 1w," + width2 + " 9w";
      img.src = width1;
    })();

  } else {
    isSupportTestReady = true;
  }

  // using pf.qsa instead of dom traversing does scale much better,
  // especially on sites mixing responsive and non-responsive images
  pf.selShort = "picture>img,img[srcset]";
  pf.sel = pf.selShort;
  pf.cfg = cfg;

  /**
   * Shortcut property for `devicePixelRatio` ( for easy overriding in tests )
   */
  pf.DPR = (DPR  || 1 );
  pf.u = units;

  // container of supported mime types that one might need to qualify before using
  pf.types =  types;

  pf.setSize = noop;

  /**
   * Gets a string and returns the absolute URL
   * @param src
   * @returns {String} absolute URL
   */

  pf.makeUrl = memoize(function(src) {
    anchor.href = src;
    return anchor.href;
  });

  /**
   * Gets a DOM element or document and a selctor and returns the found matches
   * Can be extended with jQuery/Sizzle for IE7 support
   * @param context
   * @param sel
   * @returns {NodeList|Array}
   */
  pf.qsa = function(context, sel) {
    return ( "querySelector" in context ) ? context.querySelectorAll(sel) : [];
  };

  /**
   * Shortcut method for matchMedia ( for easy overriding in tests )
   * wether native or pf.mMQ is used will be decided lazy on first call
   * @returns {boolean}
   */
  pf.matchesMedia = function() {
    if ( window.matchMedia && (matchMedia( "(min-width: 0.1em)" ) || {}).matches ) {
      pf.matchesMedia = function( media ) {
        return !media || ( matchMedia( media ).matches );
      };
    } else {
      pf.matchesMedia = pf.mMQ;
    }

    return pf.matchesMedia.apply( this, arguments );
  };

  /**
   * A simplified matchMedia implementation for IE8 and IE9
   * handles only min-width/max-width with px or em values
   * @param media
   * @returns {boolean}
   */
  pf.mMQ = function( media ) {
    return media ? evalCSS(media) : true;
  };

  /**
   * Returns the calculated length in css pixel from the given sourceSizeValue
   * http://dev.w3.org/csswg/css-values-3/#length-value
   * intended Spec mismatches:
   * * Does not check for invalid use of CSS functions
   * * Does handle a computed length of 0 the same as a negative and therefore invalid value
   * @param sourceSizeValue
   * @returns {Number}
   */
  pf.calcLength = function( sourceSizeValue ) {

    var value = evalCSS(sourceSizeValue, true) || false;
    if (value < 0) {
      value = false;
    }

    return value;
  };

  /**
   * Takes a type string and checks if its supported
   */

  pf.supportsType = function( type ) {
    return ( type ) ? types[ type ] : true;
  };

  /**
   * Parses a sourceSize into mediaCondition (media) and sourceSizeValue (length)
   * @param sourceSizeStr
   * @returns {*}
   */
  pf.parseSize = memoize(function( sourceSizeStr ) {
    var match = ( sourceSizeStr || "" ).match(regSize);
    return {
      media: match && match[1],
      length: match && match[2]
    };
  });

  pf.parseSet = function( set ) {
    if ( !set.cands ) {
      set.cands = parseSrcset(set.srcset, set);
    }
    return set.cands;
  };

  /**
   * returns 1em in css px for html/body default size
   * function taken from respondjs
   * @returns {*|number}
   */
  pf.getEmValue = function() {
    var body;
    if ( !eminpx && (body = document.body) ) {
      var div = document.createElement( "div" ),
        originalHTMLCSS = docElem.style.cssText,
        originalBodyCSS = body.style.cssText;

      div.style.cssText = baseStyle;

      // 1em in a media query is the value of the default font size of the browser
      // reset docElem and body to ensure the correct value is returned
      docElem.style.cssText = fsCss;
      body.style.cssText = fsCss;

      body.appendChild( div );
      eminpx = div.offsetWidth;
      body.removeChild( div );

      //also update eminpx before returning
      eminpx = parseFloat( eminpx, 10 );

      // restore the original values
      docElem.style.cssText = originalHTMLCSS;
      body.style.cssText = originalBodyCSS;

    }
    return eminpx || 16;
  };

  /**
   * Takes a string of sizes and returns the width in pixels as a number
   */
  pf.calcListLength = function( sourceSizeListStr ) {
    // Split up source size list, ie ( max-width: 30em ) 100%, ( max-width: 50em ) 50%, 33%
    //
    //                           or (min-width:30em) calc(30% - 15px)
    if ( !(sourceSizeListStr in sizeLengthCache) || cfg.uT ) {
      var winningLength = pf.calcLength( parseSizes( sourceSizeListStr ) );

      sizeLengthCache[ sourceSizeListStr ] = !winningLength ? units.width : winningLength;
    }

    return sizeLengthCache[ sourceSizeListStr ];
  };

  /**
   * Takes a candidate object with a srcset property in the form of url/
   * ex. "images/pic-medium.png 1x, images/pic-medium-2x.png 2x" or
   *     "images/pic-medium.png 400w, images/pic-medium-2x.png 800w" or
   *     "images/pic-small.png"
   * Get an array of image candidates in the form of
   *      {url: "/foo/bar.png", resolution: 1}
   * where resolution is http://dev.w3.org/csswg/css-values-3/#resolution-value
   * If sizes is specified, res is calculated
   */
  pf.setRes = function( set ) {
    var candidates;
    if ( set ) {

      candidates = pf.parseSet( set );

      for ( var i = 0, len = candidates.length; i < len; i++ ) {
        setResolution( candidates[ i ], set.sizes );
      }
    }
    return candidates;
  };

  pf.setRes.res = setResolution;

  pf.applySetCandidate = function( candidates, img ) {
    if ( !candidates.length ) {return;}
    var candidate,
      i,
      j,
      length,
      bestCandidate,
      curSrc,
      curCan,
      candidateSrc,
      abortCurSrc;

    var imageData = img[ pf.ns ];
    var dpr = pf.DPR;

    curSrc = imageData.curSrc || img[curSrcProp];

    curCan = imageData.curCan || setSrcToCur(img, curSrc, candidates[0].set);

    // if we have a current source, we might either become lazy or give this source some advantage
    if ( curCan && curCan.set === candidates[ 0 ].set ) {

      // if browser can abort image request and the image has a higher pixel density than needed
      // and this image isn't downloaded yet, we skip next part and try to save bandwidth
      abortCurSrc = (supportAbort && !img.complete && curCan.res - 0.1 > dpr);

      if ( !abortCurSrc ) {
        curCan.cached = true;

        // if current candidate is "best", "better" or "okay",
        // set it to bestCandidate
        if ( curCan.res >= dpr ) {
          bestCandidate = curCan;
        }
      }
    }

    if ( !bestCandidate ) {

      candidates.sort( ascendingSort );

      length = candidates.length;
      bestCandidate = candidates[ length - 1 ];

      for ( i = 0; i < length; i++ ) {
        candidate = candidates[ i ];
        if ( candidate.res >= dpr ) {
          j = i - 1;

          // we have found the perfect candidate,
          // but let's improve this a little bit with some assumptions ;-)
          if (candidates[ j ] &&
            (abortCurSrc || curSrc !== pf.makeUrl( candidate.url )) &&
            chooseLowRes(candidates[ j ].res, candidate.res, dpr, candidates[ j ].cached)) {

            bestCandidate = candidates[ j ];

          } else {
            bestCandidate = candidate;
          }
          break;
        }
      }
    }

    if ( bestCandidate ) {

      candidateSrc = pf.makeUrl( bestCandidate.url );

      imageData.curSrc = candidateSrc;
      imageData.curCan = bestCandidate;

      if ( candidateSrc !== curSrc ) {
        pf.setSrc( img, bestCandidate );
      }
      pf.setSize( img );
    }
  };

  pf.setSrc = function( img, bestCandidate ) {
    var origWidth;
    img.src = bestCandidate.url;

    // although this is a specific Safari issue, we don't want to take too much different code paths
    if ( bestCandidate.set.type === "image/svg+xml" ) {
      origWidth = img.style.width;
      img.style.width = (img.offsetWidth + 1) + "px";

      // next line only should trigger a repaint
      // if... is only done to trick dead code removal
      if ( img.offsetWidth + 1 ) {
        img.style.width = origWidth;
      }
    }
  };

  pf.getSet = function( img ) {
    var i, set, supportsType;
    var match = false;
    var sets = img [ pf.ns ].sets;

    for ( i = 0; i < sets.length && !match; i++ ) {
      set = sets[i];

      if ( !set.srcset || !pf.matchesMedia( set.media ) || !(supportsType = pf.supportsType( set.type )) ) {
        continue;
      }

      if ( supportsType === "pending" ) {
        set = supportsType;
      }

      match = set;
      break;
    }

    return match;
  };

  pf.parseSets = function( element, parent, options ) {
    var srcsetAttribute, imageSet, isWDescripor, srcsetParsed;

    var hasPicture = parent && parent.nodeName.toUpperCase() === "PICTURE";
    var imageData = element[ pf.ns ];

    if ( imageData.src === undefined || options.src ) {
      imageData.src = getImgAttr.call( element, "src" );
      if ( imageData.src ) {
        setImgAttr.call( element, srcAttr, imageData.src );
      } else {
        removeImgAttr.call( element, srcAttr );
      }
    }

    if ( imageData.srcset === undefined || options.srcset || !pf.supSrcset || element.srcset ) {
      srcsetAttribute = getImgAttr.call( element, "srcset" );
      imageData.srcset = srcsetAttribute;
      srcsetParsed = true;
    }

    imageData.sets = [];

    if ( hasPicture ) {
      imageData.pic = true;
      getAllSourceElements( parent, imageData.sets );
    }

    if ( imageData.srcset ) {
      imageSet = {
        srcset: imageData.srcset,
        sizes: getImgAttr.call( element, "sizes" )
      };

      imageData.sets.push( imageSet );

      isWDescripor = (alwaysCheckWDescriptor || imageData.src) && regWDesc.test(imageData.srcset || "");

      // add normal src as candidate, if source has no w descriptor
      if ( !isWDescripor && imageData.src && !getCandidateForSrc(imageData.src, imageSet) && !imageSet.has1x ) {
        imageSet.srcset += ", " + imageData.src;
        imageSet.cands.push({
          url: imageData.src,
          d: 1,
          set: imageSet
        });
      }

    } else if ( imageData.src ) {
      imageData.sets.push( {
        srcset: imageData.src,
        sizes: null
      } );
    }

    imageData.curCan = null;
    imageData.curSrc = undefined;

    // if img has picture or the srcset was removed or has a srcset and does not support srcset at all
    // or has a w descriptor (and does not support sizes) set support to false to evaluate
    imageData.supported = !( hasPicture || ( imageSet && !pf.supSrcset ) || (isWDescripor && !pf.supSizes) );

    if ( srcsetParsed && pf.supSrcset && !imageData.supported ) {
      if ( srcsetAttribute ) {
        setImgAttr.call( element, srcsetAttr, srcsetAttribute );
        element.srcset = "";
      } else {
        removeImgAttr.call( element, srcsetAttr );
      }
    }

    if (imageData.supported && !imageData.srcset && ((!imageData.src && element.src) ||  element.src !== pf.makeUrl(imageData.src))) {
      if (imageData.src === null) {
        element.removeAttribute("src");
      } else {
        element.src = imageData.src;
      }
    }

    imageData.parsed = true;
  };

  pf.fillImg = function(element, options) {
    var imageData;
    var extreme = options.reselect || options.reevaluate;

    // expando for caching data on the img
    if ( !element[ pf.ns ] ) {
      element[ pf.ns ] = {};
    }

    imageData = element[ pf.ns ];

    // if the element has already been evaluated, skip it
    // unless `options.reevaluate` is set to true ( this, for example,
    // is set to true when running `picturefill` on `resize` ).
    if ( !extreme && imageData.evaled === evalId ) {
      return;
    }

    if ( !imageData.parsed || options.reevaluate ) {
      pf.parseSets( element, element.parentNode, options );
    }

    if ( !imageData.supported ) {
      applyBestCandidate( element );
    } else {
      imageData.evaled = evalId;
    }
  };

  pf.setupRun = function() {
    if ( !alreadyRun || isVwDirty || (DPR !== window.devicePixelRatio) ) {
      updateMetrics();
    }
  };

  // If picture is supported, well, that's awesome.
  if ( pf.supPicture ) {
    picturefill = noop;
    pf.fillImg = noop;
  } else {

     // Set up picture polyfill by polling the document
    (function() {
      var isDomReady;
      var regReady = window.attachEvent ? /d$|^c/ : /d$|^c|^i/;

      var run = function() {
        var readyState = document.readyState || "";

        timerId = setTimeout(run, readyState === "loading" ? 200 :  999);
        if ( document.body ) {
          pf.fillImgs();
          isDomReady = isDomReady || regReady.test(readyState);
          if ( isDomReady ) {
            clearTimeout( timerId );
          }

        }
      };

      var timerId = setTimeout(run, document.body ? 9 : 99);

      // Also attach picturefill on resize and readystatechange
      // http://modernjavascript.blogspot.com/2013/08/building-better-debounce.html
      var debounce = function(func, wait) {
        var timeout, timestamp;
        var later = function() {
          var last = (new Date()) - timestamp;

          if (last < wait) {
            timeout = setTimeout(later, wait - last);
          } else {
            timeout = null;
            func();
          }
        };

        return function() {
          timestamp = new Date();

          if (!timeout) {
            timeout = setTimeout(later, wait);
          }
        };
      };
      var lastClientWidth = docElem.clientHeight;
      var onResize = function() {
        isVwDirty = Math.max(window.innerWidth || 0, docElem.clientWidth) !== units.width || docElem.clientHeight !== lastClientWidth;
        lastClientWidth = docElem.clientHeight;
        if ( isVwDirty ) {
          pf.fillImgs();
        }
      };

      on( window, "resize", debounce(onResize, 99 ) );
      on( document, "readystatechange", run );
    })();
  }

  pf.picturefill = picturefill;
  //use this internally for easy monkey patching/performance testing
  pf.fillImgs = picturefill;
  pf.teardownRun = noop;

  /* expose methods for testing */
  picturefill._ = pf;

  window.picturefillCFG = {
    pf: pf,
    push: function(args) {
      var name = args.shift();
      if (typeof pf[name] === "function") {
        pf[name].apply(pf, args);
      } else {
        cfg[name] = args[0];
        if (alreadyRun) {
          pf.fillImgs( { reselect: true } );
        }
      }
    }
  };

  while (setOptions && setOptions.length) {
    window.picturefillCFG.push(setOptions.shift());
  }

  /* expose picturefill */
  window.picturefill = picturefill;

  /* expose picturefill */
  if ( typeof module === "object" && typeof module.exports === "object" ) {
    // CommonJS, just export
    module.exports = picturefill;
  } else if ( typeof define === "function" && define.amd ) {
    // AMD support
    define( "picturefill", function() { return picturefill; } );
  }

  // IE8 evals this sync, so it must be the last thing we do
  if ( !pf.supPicture ) {
    types[ "image/webp" ] = detectTypeSupport("image/webp", "data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAABBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA==" );
  }

} )( window, document );

},{}],22:[function(require,module,exports){
/**
 * requestAnimationFrame version: "0.0.17" Copyright (c) 2011-2012, Cyril Agosta ( cyril.agosta.dev@gmail.com) All Rights Reserved.
 * Available via the MIT license.
 * see: http://github.com/cagosta/requestAnimationFrame for details
 *
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 * requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 * MIT license
 *
 */


( function( global ) {


    ( function() {


        if ( global.requestAnimationFrame ) {

            return;

        }

        if ( global.webkitRequestAnimationFrame ) { // Chrome <= 23, Safari <= 6.1, Blackberry 10

            global.requestAnimationFrame = global[ 'webkitRequestAnimationFrame' ];
            global.cancelAnimationFrame = global[ 'webkitCancelAnimationFrame' ] || global[ 'webkitCancelRequestAnimationFrame' ];

        }

        // IE <= 9, Android <= 4.3, very old/rare browsers

        var lastTime = 0;

        global.requestAnimationFrame = function( callback ) {

            var currTime = new Date().getTime();

            var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );

            var id = global.setTimeout( function() {

                callback( currTime + timeToCall );

            }, timeToCall );

            lastTime = currTime + timeToCall;

            return id; // return the id for cancellation capabilities

        };

        global.cancelAnimationFrame = function( id ) {

            clearTimeout( id );

        };

    } )();

    if ( typeof define === 'function' ) {

        define( function() {

            return global.requestAnimationFrame;

        } );

    }

} )( window );
},{}],23:[function(require,module,exports){
!function(root, factory) {
    "function" == typeof define && define.amd ? // AMD. Register as an anonymous module unless amdModuleId is set
    define([], function() {
        return root.svg4everybody = factory();
    }) : "object" == typeof exports ? module.exports = factory() : root.svg4everybody = factory();
}(this, function() {
    /*! svg4everybody v2.0.3 | github.com/jonathantneal/svg4everybody */
    function embed(svg, target) {
        // if the target exists
        if (target) {
            // create a document fragment to hold the contents of the target
            var fragment = document.createDocumentFragment(), viewBox = !svg.getAttribute("viewBox") && target.getAttribute("viewBox");
            // conditionally set the viewBox on the svg
            viewBox && svg.setAttribute("viewBox", viewBox);
            // copy the contents of the clone into the fragment
            for (// clone the target
            var clone = target.cloneNode(!0); clone.childNodes.length; ) {
                fragment.appendChild(clone.firstChild);
            }
            // append the fragment into the svg
            svg.appendChild(fragment);
        }
    }
    function loadreadystatechange(xhr) {
        // listen to changes in the request
        xhr.onreadystatechange = function() {
            // if the request is ready
            if (4 === xhr.readyState) {
                // get the cached html document
                var cachedDocument = xhr._cachedDocument;
                // ensure the cached html document based on the xhr response
                cachedDocument || (cachedDocument = xhr._cachedDocument = document.implementation.createHTMLDocument(""), 
                cachedDocument.body.innerHTML = xhr.responseText, xhr._cachedTarget = {}), // clear the xhr embeds list and embed each item
                xhr._embeds.splice(0).map(function(item) {
                    // get the cached target
                    var target = xhr._cachedTarget[item.id];
                    // ensure the cached target
                    target || (target = xhr._cachedTarget[item.id] = cachedDocument.getElementById(item.id)), 
                    // embed the target into the svg
                    embed(item.svg, target);
                });
            }
        }, // test the ready state change immediately
        xhr.onreadystatechange();
    }
    function svg4everybody(rawopts) {
        function oninterval() {
            // while the index exists in the live <use> collection
            for (// get the cached <use> index
            var index = 0; index < uses.length; ) {
                // get the current <use>
                var use = uses[index], svg = use.parentNode;
                if (svg && /svg/i.test(svg.nodeName)) {
                    var src = use.getAttribute("xlink:href");
                    if (polyfill && (!opts.validate || opts.validate(src, svg, use))) {
                        // remove the <use> element
                        svg.removeChild(use);
                        // parse the src and get the url and id
                        var srcSplit = src.split("#"), url = srcSplit.shift(), id = srcSplit.join("#");
                        // if the link is external
                        if (url.length) {
                            // get the cached xhr request
                            var xhr = requests[url];
                            // ensure the xhr request exists
                            xhr || (xhr = requests[url] = new XMLHttpRequest(), xhr.open("GET", url), xhr.send(), 
                            xhr._embeds = []), // add the svg and id as an item to the xhr embeds list
                            xhr._embeds.push({
                                svg: svg,
                                id: id
                            }), // prepare the xhr ready state change event
                            loadreadystatechange(xhr);
                        } else {
                            // embed the local id into the svg
                            embed(svg, document.getElementById(id));
                        }
                    }
                } else {
                    // increase the index when the previous value was not "valid"
                    ++index;
                }
            }
            // continue the interval
            requestAnimationFrame(oninterval, 67);
        }
        var polyfill, opts = Object(rawopts), newerIEUA = /\bTrident\/[567]\b|\bMSIE (?:9|10)\.0\b/, webkitUA = /\bAppleWebKit\/(\d+)\b/, olderEdgeUA = /\bEdge\/12\.(\d+)\b/;
        polyfill = "polyfill" in opts ? opts.polyfill : newerIEUA.test(navigator.userAgent) || (navigator.userAgent.match(olderEdgeUA) || [])[1] < 10547 || (navigator.userAgent.match(webkitUA) || [])[1] < 537;
        // create xhr requests object
        var requests = {}, requestAnimationFrame = window.requestAnimationFrame || setTimeout, uses = document.getElementsByTagName("use");
        // conditionally start the interval if the polyfill is active
        polyfill && oninterval();
    }
    return svg4everybody;
});
},{}],24:[function(require,module,exports){
'use strict';

var _nav = require('./modules/nav/nav');

var _nav2 = _interopRequireDefault(_nav);

var _carousel = require('./modules/carousel/carousel');

var _carousel2 = _interopRequireDefault(_carousel);

var _miniCarousel = require('./modules/mini-carousel/mini-carousel');

var _miniCarousel2 = _interopRequireDefault(_miniCarousel);

var _recentlyViewed = require('./modules/recently-viewed/recently-viewed');

var _recentlyViewed2 = _interopRequireDefault(_recentlyViewed);

var _subtleScroll = require('./modules/subtle-scroll/subtle-scroll');

var _subtleScroll2 = _interopRequireDefault(_subtleScroll);

var _scrollingOverride = require('./modules/scrolling-override/scrolling-override');

var _scrollingOverride2 = _interopRequireDefault(_scrollingOverride);

var _pngSequence = require('./modules/png-sequence/png-sequence');

var _pngSequence2 = _interopRequireDefault(_pngSequence);

var _productCard = require('./modules/product-cards/product-card');

var _productCard2 = _interopRequireDefault(_productCard);

var _productFinder = require('./modules/product-finder/product-finder');

var _productFinder2 = _interopRequireDefault(_productFinder);

var _selector = require('./modules/selector/selector');

var _selector2 = _interopRequireDefault(_selector);

require('console-polyfill');

var _svg4everybody = require('svg4everybody');

var _svg4everybody2 = _interopRequireDefault(_svg4everybody);

require('picturefill');

require('requestanimationframe');

require('gsap');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _svg4everybody2.default)();

// need hover state to be triggered on Touch device's click
document.addEventListener("touchstart", function () {}, true);

var touchClass = 'ontouchstart' in document.documentElement ? 'touch-device' : 'no-touch';
document.body.classList.add(touchClass);

// wait for load event
window.addEventListener('load', function () {
  // instantiate mini carousels for mini carousel prototype
  var miniCarousels = [];
  var miniCarouselEls = document.querySelectorAll('.mini-carousel-prototype .mini-carousel');
  for (var i = 0; i < miniCarouselEls.length; i++) {
    miniCarousels.push(new _miniCarousel2.default(miniCarouselEls[i]));
  }

  // instantiate carousels for recentlyViewed
  var recentlyViewed = [];
  var recentlyViewedEls = document.querySelectorAll('.recently-viewed .viewed-carousel');
  for (var i = 0; i < recentlyViewedEls.length; i++) {
    recentlyViewed.push(new _recentlyViewed2.default(recentlyViewedEls[i]));
  }

  // instantiate carousels for carousel prototype
  var carousels = [];
  var carouselEls = document.querySelectorAll('.carousel');
  for (var i = 0; i < carouselEls.length; i++) {
    carousels.push(new _carousel2.default(carouselEls[i]));
  }

  // init product cards
  var productCards = [];
  var productCardEls = document.querySelectorAll('.product-card-prototype .product-card');
  for (var i = 0; i < productCardEls.length; i++) {
    productCards.push(new _productCard2.default(productCardEls[i]));
  }

  /**
   * Declare an "app" to hold our modules.
   * @type {Object}
   */
  var app = {
    nav: new _nav2.default(document.querySelector('.nav')),
    carousels: carousels,
    miniCarousels: miniCarousels,
    subtleScroll: new _subtleScroll2.default(),
    ScrollingOverride: new _scrollingOverride2.default(document.querySelector('.scrolling')),
    pngSequence: new _pngSequence2.default(document.querySelector('.png-sequence')),
    productCards: productCards,
    productFinder: new _productFinder2.default(document.querySelector('.product-finder')),
    productSelector: new _selector2.default(document.querySelector('.selector'))
  };
});

},{"./modules/carousel/carousel":29,"./modules/mini-carousel/mini-carousel":30,"./modules/nav/nav":34,"./modules/png-sequence/png-sequence":35,"./modules/product-cards/product-card":36,"./modules/product-finder/product-finder":38,"./modules/recently-viewed/recently-viewed":39,"./modules/scrolling-override/scrolling-override":40,"./modules/selector/selector":46,"./modules/subtle-scroll/subtle-scroll":48,"console-polyfill":2,"gsap":3,"picturefill":21,"requestanimationframe":22,"svg4everybody":23}],25:[function(require,module,exports){
'use strict';

var EventEmitter = require('events');
var inherits = require('inherits');
var throttle = require('lodash.throttle');
var bindAll = require('lodash.bindall');

/**
 * This module can be required if you want to know what current break point
 * we are in. You could also subscribe to changes in current breakpoint.
 */
var Breakpoints = function Breakpoints() {
  EventEmitter.prototype._maxListeners = 100;
  EventEmitter.call(this);
  bindAll(this, 'determineBreakpoint');
  this.determineBreakpoint({ silent: true });
  window.addEventListener('resize', throttle(this.determineBreakpoint, 200));
};

// inherit event emitter.
inherits(Breakpoints, EventEmitter);

Breakpoints.prototype.minWidths = {
  sm: 0,
  md: 755,
  lg: 1280
};

/**
 * Loops the breakpoints and sets the current one of this object.
 */
Breakpoints.prototype.determineBreakpoint = function (options) {
  var vw = document.body.clientWidth;
  var breakPointNames = Object.keys(this.minWidths);
  var foundBreakpoint;
  for (var i = breakPointNames.length - 1; i >= 0; i--) {
    foundBreakpoint = breakPointNames[i];
    if (vw >= this.minWidths[foundBreakpoint]) {
      if (this.current !== foundBreakpoint) {
        var oldBreakpoint = this.current;
        this.current = foundBreakpoint;

        if (!options || options && !options.silent) {
          this.emit('change', foundBreakpoint, oldBreakpoint);
        }
      }

      break;
    }
  }
};

module.exports = new Breakpoints();

},{"events":1,"inherits":4,"lodash.bindall":5,"lodash.throttle":18}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var breakpoints = require('../../layout/breakpoints');

var THROTTLE = 10;
var ANIMATION_TIME = .4;

var Accordion = function (_EventEmitter) {
  _inherits(Accordion, _EventEmitter);

  function Accordion(el) {
    _classCallCheck(this, Accordion);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Accordion).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.slider = _this.el.querySelector('.accordion-slider');

    // add click listener to each accordion toggle button
    // not the most performant way but doesn't matter for the sake of this prototype
    Array.prototype.slice.call(_this.el.querySelectorAll('.button-toggle')).forEach(function (buttonToggle) {
      buttonToggle.addEventListener('click', function (evt) {
        return _this.onClickToggle(evt);
      });
    });

    window.addEventListener('resize', (0, _lodash2.default)(function () {
      return _this.onResize();
    }, THROTTLE));
    return _this;
  }

  _createClass(Accordion, [{
    key: 'onClickToggle',
    value: function onClickToggle(evt) {
      var _this2 = this;

      var openAccordions = this.el.querySelectorAll('.accordion-item.active');
      var selectedAccordionContent = evt.currentTarget.parentNode.querySelector('.accordion-content');

      // if we clicked an open accordion, close it by animating maxHeight
      if (evt.currentTarget.parentNode.classList.contains('active')) {
        evt.currentTarget.parentNode.classList.remove('active');
        TweenLite.to(selectedAccordionContent, ANIMATION_TIME, { maxHeight: 0 });

        this.hideSlider();

        this.emit('accordion:closed');
      } else {
        var maxHeight = parseInt(window.getComputedStyle(selectedAccordionContent.querySelector('.filters-content-wrapper')).height);

        // if we're in mobile layout or there are no open accordions, animate using maxHeight
        if (breakpoints.current === 'sm' || openAccordions.length === 0) {
          // close any open accordions
          Array.prototype.slice.call(openAccordions).forEach(function (accordionItem) {
            accordionItem.classList.remove('active');
            TweenLite.to(accordionItem.querySelector('.accordion-content'), ANIMATION_TIME, { maxHeight: 0 });
          });

          // open selected accordion
          selectedAccordionContent.style.opacity = 1;
          TweenLite.to(selectedAccordionContent, ANIMATION_TIME, { maxHeight: maxHeight });

          // else use fade animation for newly selected accordion
        } else {
            // set up selected accordion styles for animation
            selectedAccordionContent.style.opacity = 0;
            selectedAccordionContent.style.zIndex = '100';
            selectedAccordionContent.style.maxHeight = maxHeight + 'px';

            // remove active classes from open accordions
            Array.prototype.slice.call(openAccordions).forEach(function (accordionItem) {
              accordionItem.classList.remove('active');
            });

            // fade in selected accordion
            TweenLite.to(selectedAccordionContent, ANIMATION_TIME, { opacity: 1, onComplete: function onComplete() {
                // close any open accordions
                Array.prototype.slice.call(openAccordions).forEach(function (accordionItem) {
                  var accordionItemContent = accordionItem.querySelector('.accordion-content');
                  accordionItemContent.style.maxHeight = '0';
                  accordionItemContent.style.zIndex = '0';
                });

                // reset z index of selected accordion
                selectedAccordionContent.style.zIndex = '0';
              } });
          }

        evt.currentTarget.parentNode.classList.add('active');

        // adjust slider position
        this.setSliderPosition(this.el.querySelector('.accordion-item.active .name-container'));

        // add active class to slider after timeout so that the transition css property of the active state doesn't apply
        setTimeout(function () {
          _this2.showSlider();
        }, 0);

        // emit event
        this.emit('accordion:opened');
      }

      evt.preventDefault();
    }
  }, {
    key: 'onResize',
    value: function onResize() {
      this.setSliderPosition(this.el.querySelector('.accordion-item.active .name-container'));

      // if the accordion is open, adjust the content max height
      var activeItem = this.el.querySelector('.accordion-item.active');
      if (activeItem) {
        var selectedAccordionContent = activeItem.querySelector('.accordion-content');
        var maxHeight = parseInt(window.getComputedStyle(selectedAccordionContent.querySelector('.filters-content-wrapper')).height);
        selectedAccordionContent.style.maxHeight = maxHeight + 'px';
      }
    }
  }, {
    key: 'close',
    value: function close() {
      var activeItem = this.el.querySelector('.accordion-item.active');
      if (activeItem) {
        activeItem.classList.remove('active');
        TweenLite.to(activeItem.querySelector('.accordion-content'), ANIMATION_TIME, { maxHeight: 0 });

        this.hideSlider();

        // emit event
        this.emit('accordion:closed');
      }
    }
  }, {
    key: 'showSlider',
    value: function showSlider() {
      this.slider.classList.add('active');
    }
  }, {
    key: 'hideSlider',
    value: function hideSlider() {
      this.slider.classList.remove('active');
    }
  }, {
    key: 'setSliderPosition',
    value: function setSliderPosition(nameContainer) {
      if (nameContainer) {
        var accordionWidth = parseInt(window.getComputedStyle(this.el).width);
        var bodyWidth = parseInt(window.getComputedStyle(document.body).width);
        var marginLeft = Math.max((bodyWidth - accordionWidth) / 2, 0);
        var nameContainerWidth = nameContainer.getBoundingClientRect().width;
        var nameContainerLeft = nameContainer.getBoundingClientRect().left;
        var sliderWidth = this.slider.getBoundingClientRect().width;
        var sliderLeft = nameContainerLeft - marginLeft + (nameContainerWidth - sliderWidth) / 2;

        this.slider.style.left = sliderLeft + 'px';
      }
    }
  }]);

  return Accordion;
}(_events.EventEmitter);

;

exports.default = Accordion;

},{"../../layout/breakpoints":25,"events":1,"lodash.throttle":18}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var breakpoints = require('../../layout/breakpoints');

var SCROLL_THROTTLE = 20;
var RESIZE_THROTTLE = 20;
var SCROLL_TIME = .5;
var SCROLL_THRESHOLD = 50; // distance user must scroll before nav automatically closes

var AnchorNav = function (_EventEmitter) {
  _inherits(AnchorNav, _EventEmitter);

  function AnchorNav(el) {
    _classCallCheck(this, AnchorNav);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AnchorNav).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.isActive = false;
    _this.isSticky = false;
    _this.slider = _this.el.querySelector('.anchor-slider');
    _this.originalY;
    _this.productDetail = document.querySelector('.product-detail');
    _this.toggle = _this.el.querySelector('.anchor-nav-toggle');
    _this.toggleAnchor = _this.el.querySelector('.anchor-nav-toggle a');
    _this.cta = _this.el.querySelector('.anchor-nav-cta');
    _this.mainNav = document.querySelector('.nav');
    _this.bodyContainer = document.querySelector('.body-container');
    _this.mainNavHeight = _this.mainNav.getBoundingClientRect().height;
    _this.sections = [];
    _this.anchorLinks = Array.prototype.slice.call(_this.el.querySelectorAll('.anchor-link'));
    _this.throttledOnScroll = (0, _lodash2.default)(function (evt) {
      return _this.onScroll(evt);
    }, SCROLL_THROTTLE);
    _this.scrollPositionStart = 0; // body scrollTop at the time the menu was opened

    // keep array of sections linked to by anchors
    _this.anchorLinks.forEach(function (anchorLink) {
      _this.sections.push(document.querySelector(anchorLink.getAttribute('href')));
    });

    // shorten mobile nav toggle text with ellipses
    var maxLength = 28;
    if (_this.toggleAnchor.innerHTML.length > maxLength) {
      _this.toggleAnchor.innerHTML = _this.toggleAnchor.innerHTML.substring(0, maxLength - 3) + '...';
    }

    _this.bindEvents();
    _this.checkAnchor();
    _this.updateCta(false);
    return _this;
  }

  _createClass(AnchorNav, [{
    key: 'bindEvents',
    value: function bindEvents() {
      var _this2 = this;

      // toggle open/closed
      this.toggle.addEventListener('click', function (evt) {
        return _this2.onClickToggle(evt);
      });

      // click cta
      this.el.querySelector('.anchor-nav-cta').addEventListener('click', function (evt) {
        return _this2.onClickCta(evt);
      });

      // click anchor link
      this.anchorLinks.forEach(function (anchorLink) {
        anchorLink.addEventListener('click', function (evt) {
          return _this2.onClickAnchor(evt);
        });
      });

      // scroll
      this.startScrollListener();

      // resize
      window.addEventListener('resize', (0, _lodash2.default)(function () {
        return _this2.onResize();
      }, RESIZE_THROTTLE));
    }
  }, {
    key: 'onClickToggle',
    value: function onClickToggle(evt) {
      var _this3 = this;

      if (this.isActive) {
        this.close();
      } else {
        this.open();

        if (!this.isSticky) {
          this.stopScrollListener();
          var newScrollTop = this.el.offsetTop;
          TweenLite.to(this.bodyContainer, SCROLL_TIME, { scrollTop: newScrollTop, ease: Power2.easeOut, onComplete: function onComplete() {
              // use timeout so that scroll listener doesn't fire after tween
              setTimeout(function () {
                _this3.startScrollListener();
                _this3.checkSticky();
              }, 0);
            } });
        }
      }

      evt.preventDefault();
      evt.stopPropagation();
    }
  }, {
    key: 'onClickCta',
    value: function onClickCta(evt) {
      var scrollableEl = void 0;
      var newScrollTop = void 0;

      if (breakpoints.current === 'sm') {
        scrollableEl = this.bodyContainer;

        var title = document.querySelector('.selector .details-title');
        newScrollTop = title.offsetTop + title.parentElement.offsetTop - this.mainNavHeight;
      } else {
        scrollableEl = document.body;
        newScrollTop = document.querySelector('.selector').offsetTop;
      }

      TweenLite.to(scrollableEl, SCROLL_TIME, { scrollTop: newScrollTop, ease: Power2.easeOut });

      evt.preventDefault();
      evt.stopPropagation();
    }
  }, {
    key: 'onClickAnchor',
    value: function onClickAnchor(evt) {
      var _this4 = this;

      var navHeight = this.el.getBoundingClientRect().height;
      var section = document.querySelector(evt.target.getAttribute('href'));

      if (section) {
        var scrollableEl = void 0;
        if (breakpoints.current === 'sm') {
          scrollableEl = this.bodyContainer;
        } else if (document.documentElement.scrollTop) {
          scrollableEl = document.documentElement; // used for Firefox
        } else {
            scrollableEl = document.body; // used for Chrome
          }

        var newScrollTop = section.offsetTop - navHeight;

        // if we're on mobile and scrolling up
        if (breakpoints.current === 'sm' && newScrollTop < scrollableEl.scrollTop) {
          // reduce scroll to account for main nav height
          newScrollTop -= this.mainNavHeight;
        }

        // stop listening to scroll while we animate it
        this.stopScrollListener();

        this.setSliderPosition(evt.target);

        TweenLite.to(scrollableEl, SCROLL_TIME, {
          scrollTop: newScrollTop,
          ease: Power2.easeOut,
          onComplete: function onComplete() {
            _this4.startScrollListener();
          },
          onUpdate: function onUpdate() {
            _this4.checkSticky();
          }
        });
      }

      this.close();

      evt.preventDefault();
      evt.stopPropagation();
    }
  }, {
    key: 'open',
    value: function open() {
      this.el.classList.add('active');
      this.isActive = true;

      this.scrollPositionStart = this.bodyContainer.scrollTop;
    }
  }, {
    key: 'close',
    value: function close() {
      this.el.classList.remove('active');
      this.isActive = false;
    }
  }, {
    key: 'startScrollListener',
    value: function startScrollListener() {
      this.bodyContainer.addEventListener('scroll', this.throttledOnScroll);
      window.addEventListener('scroll', this.throttledOnScroll);
    }
  }, {
    key: 'stopScrollListener',
    value: function stopScrollListener() {
      this.bodyContainer.removeEventListener('scroll', this.throttledOnScroll);
      window.removeEventListener('scroll', this.throttledOnScroll);
    }
  }, {
    key: 'onScroll',
    value: function onScroll() {
      if (breakpoints.current === 'sm' && Math.abs(this.bodyContainer.scrollTop - this.scrollPositionStart) > SCROLL_THRESHOLD) {
        this.close();
      }

      this.checkSticky();
      this.checkAnchor();
    }
  }, {
    key: 'checkSticky',
    value: function checkSticky() {
      if (!this.isSticky) {
        this.originalY = this.el.offsetTop;
      }

      var isMobile = breakpoints.current === 'sm';
      var mainNavFixed = this.mainNav.classList.contains('is-fixed');
      var scrollTop = isMobile ? this.bodyContainer.scrollTop : document.documentElement.scrollTop || document.body.scrollTop;
      var isNavFixed = mainNavFixed && isMobile;
      var navAdjustment = isNavFixed ? this.mainNavHeight : 0;
      var threshold = mainNavFixed && isMobile ? this.originalY - this.mainNavHeight : this.originalY;

      // check if we need to set sticky
      if (scrollTop >= threshold && !this.isSticky) {
        this.setSticky();
      } else if (scrollTop < this.originalY - navAdjustment && this.isSticky) {
        this.setUnsticky();
      }
    }
  }, {
    key: 'setSticky',
    value: function setSticky() {
      var _this5 = this;

      this.productDetail.classList.add('sticky');
      this.isSticky = true;

      // wait before setting .animates class so that nav doesn't animate to a Y translate if it has one
      setTimeout(function () {
        _this5.el.classList.add('animates');
      }, 0);
    }
  }, {
    key: 'setUnsticky',
    value: function setUnsticky() {
      this.productDetail.classList.remove('sticky');
      this.isSticky = false;
      this.el.classList.remove('animates');
    }
  }, {
    key: 'checkAnchor',
    value: function checkAnchor() {
      var _this6 = this;

      var scrollTop = breakpoints.current === 'sm' ? this.bodyContainer.scrollTop : document.documentElement.scrollTop || document.body.scrollTop;
      var activeAnchorLink = void 0;
      var navHeight = this.el.getBoundingClientRect().height;
      var navAdjustment = this.isSticky ? navHeight : 0;

      this.sections.forEach(function (section) {
        // if we're scrolled to or below this section
        if (scrollTop >= section.offsetTop - navAdjustment) {
          // mark the proper anchor link as active
          _this6.anchorLinks.forEach(function (anchorLink) {
            if (anchorLink.getAttribute('href').slice(1) === section.getAttribute('id')) {
              anchorLink.classList.add('active');
              activeAnchorLink = anchorLink;
            } else {
              anchorLink.classList.remove('active');
            }
          });
        }
      });

      // if we're at an anchored section
      if (activeAnchorLink !== undefined) {
        this.showSlider();
        this.setSliderPosition(activeAnchorLink);
      } else {
        this.hideSlider();
      }
    }
  }, {
    key: 'showSlider',
    value: function showSlider() {
      this.slider.classList.add('active');
    }
  }, {
    key: 'hideSlider',
    value: function hideSlider() {
      this.slider.classList.remove('active');
    }
  }, {
    key: 'setSliderPosition',
    value: function setSliderPosition(anchor) {
      if (anchor) {
        var anchorNavWidth = this.el.querySelector('.container').getBoundingClientRect().width;
        var bodyWidth = document.body.getBoundingClientRect().width;
        var marginLeft = Math.max((bodyWidth - anchorNavWidth) / 2, 0);
        var anchorWidth = anchor.getBoundingClientRect().width;
        var anchorLeft = anchor.getBoundingClientRect().left;
        var sliderWidth = this.slider.getBoundingClientRect().width;
        var sliderLeft = anchorLeft - marginLeft + (anchorWidth - sliderWidth) / 2;

        this.slider.style.left = sliderLeft + 'px';
      }
    }
  }, {
    key: 'onResize',
    value: function onResize() {
      this.setSliderPosition(this.el.querySelector('.anchor-link.active'));
    }
  }, {
    key: 'updateCta',
    value: function updateCta(active) {
      this.cta.innerHTML = active ? this.cta.getAttribute('data-label-active') : this.cta.getAttribute('data-label-inactive');
    }
  }]);

  return AnchorNav;
}(_events.EventEmitter);

exports.default = AnchorNav;

},{"../../layout/breakpoints":25,"events":1,"lodash.throttle":18}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _support = require('./../../../shared/support');

var _support2 = _interopRequireDefault(_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SWIPE_DISTANCE = 10;
var ANIMATING_CLASSNAME = 'animating';
var ACTIVE_CLASSNAME = 'is-active';
var INACTIVE_CLASSNAME = 'is-inactive-';

var CarouselItem = function CarouselItem(carousel, idx, el, isActive) {
  var _this = this;

  this.carousel = carousel;
  this.index = idx;
  this.el = el;
  this.isActive = isActive;

  this.carousel.on('active-state:changed', function (activeItem) {
    _this.activeChanged(activeItem);
  });
  this.carousel.on('active-state:changed-directly', function (activeItem) {
    _this.activeChangedDirectly(activeItem);
  });
  this.delegateEvents();

  if (this.isActive) {
    this.addActive(true);
  } else {
    this.removeActive(0);
  }

  if (!this.isTouchSupported()) {
    this.showArrows();
  }
};

CarouselItem.prototype.delegateEvents = function () {
  var _this2 = this;

  this.el.addEventListener('touchstart', function (evt) {
    _this2.handleTouchStart(evt);
  });
  this.el.addEventListener('touchmove', function (evt) {
    _this2.handleTouchMove(evt);
  });
  this.el.addEventListener('touchend', function (evt) {
    _this2.handleTouchEnd(evt);
  });
  this.el.addEventListener('touchcancel', function (evt) {
    _this2.handleTouchEnd(evt);
  });

  this.transitionEndName = _support2.default.transitionEnd();

  if (this.transitionEndName) {
    this.el.addEventListener(this.transitionEndName, function () {
      _this2.removeAnimationEvent();
    }, false);
  } else {
    this.transitionEndFallback();
  }
};

CarouselItem.prototype.handleTouchStart = function (evt) {
  this.originalTouchPosition = evt.touches[0].pageX;

  this.newTouchPosition = this.originalTouchPosition;
};

CarouselItem.prototype.handleTouchMove = function (evt) {
  if (!this.isActive) {
    return;
  }

  this.newTouchPosition = evt.touches[0].pageX;
};

CarouselItem.prototype.handleTouchEnd = function () {
  if (this.newTouchPosition < this.originalTouchPosition - SWIPE_DISTANCE) {
    this.carousel.shiftRight();
  }

  if (this.newTouchPosition > this.originalTouchPosition + SWIPE_DISTANCE) {
    this.carousel.shiftLeft();
  }

  this.originalTouchPosition = null;
  this.newTouchPosition = null;
};

CarouselItem.prototype.activeChanged = function (activeItem) {
  if (activeItem === this.index) {
    this.addActive();
  } else if (this.isActive || this.transitionEndName) {
    this.removeActive(activeItem);
  }

  if (!this.transitionEndName) {
    this.transitionEndFallback();
  }
};

CarouselItem.prototype.activeChangedDirectly = function (activeItem) {
  var _this3 = this;

  // newly active
  if (!this.isActive && activeItem === this.index) {
    this.el.classList.add(INACTIVE_CLASSNAME + 'right');
  }

  // need to trigger inactive class first
  // so send this to back of event loop
  setTimeout(function () {
    if (activeItem === _this3.index) {
      _this3.addActive();
    } else {
      _this3.removeActive(activeItem);
    }

    if (!_this3.transitionEndName) {
      _this3.transitionEndFallback();
    }
  }, 100);
};

CarouselItem.prototype.addActive = function (doNotShowAnimatingClass) {
  this.isActive = true;

  if (this.transitionEndName) {
    this.el.classList.add(ACTIVE_CLASSNAME);
    if (!doNotShowAnimatingClass) {
      this.el.classList.add(ANIMATING_CLASSNAME);
    }
    this.el.classList.remove(INACTIVE_CLASSNAME + 'left');
    this.el.classList.remove(INACTIVE_CLASSNAME + 'right');
    this.el.classList.remove(INACTIVE_CLASSNAME + 'left-two');
    this.el.classList.remove(INACTIVE_CLASSNAME + 'right-two');
  } else {
    this.animateActiveWithoutTransition();
  }
};

CarouselItem.prototype.removeActive = function (newActiveIndex) {
  this.isActive = false;
  this.removeTransitionClasses();

  switch (newActiveIndex) {
    case this.index + 1:
      if (this.transitionEndName) {
        this.el.classList.add(INACTIVE_CLASSNAME + 'left');
      } else {
        this.animateInactiveWithoutTransition('left');
      }
      break;
    case this.index + 2:
    case this.index + 3:
      if (this.transitionEndName) {
        this.el.classList.add(INACTIVE_CLASSNAME + 'left-two');
      } else {
        this.animateInactiveWithoutTransition('left');
      }
      break;
    case this.index - 1:
      if (this.transitionEndName) {
        this.el.classList.add(INACTIVE_CLASSNAME + 'right');
      } else {
        this.animateInactiveWithoutTransition('right');
      }
      break;
    case this.index - 2:
    case this.index - 3:
      if (this.transitionEndName) {
        this.el.classList.add(INACTIVE_CLASSNAME + 'right-two');
      } else {
        this.animateInactiveWithoutTransition('right');
      }
      break;
  }
};

CarouselItem.prototype.removeTransitionClasses = function () {
  this.el.classList.remove(INACTIVE_CLASSNAME + 'right');
  this.el.classList.remove(INACTIVE_CLASSNAME + 'left');
  this.el.classList.remove(INACTIVE_CLASSNAME + 'right-two');
  this.el.classList.remove(INACTIVE_CLASSNAME + 'left-two');
  this.el.classList.remove(ACTIVE_CLASSNAME);
};

CarouselItem.prototype.removeAnimationEvent = function () {
  if (this.isActive) {
    this.el.classList.remove(ANIMATING_CLASSNAME);
  }
};

CarouselItem.prototype.transitionEndFallback = function () {
  var _this4 = this;

  setTimeout(function () {
    _this4.removeAnimationEvent();
  }, 1000);
};

CarouselItem.prototype.isTouchSupported = function () {
  return 'ontouchend' in document;
};

CarouselItem.prototype.showArrows = function () {
  this.el.parentElement.classList.add('show-arrows-always');
};

CarouselItem.prototype.animateActiveWithoutTransition = function () {
  var _this5 = this;

  var timer = 0;

  if (!this.currentPosition) {
    return;
  } else {
    timer = this.currentPosition;
  }

  var interval = setInterval(function () {
    if (_this5.currentPosition === 100) {
      timer = timer - 5;
    } else {
      timer = timer + 5;
    }

    if (timer !== 0) {
      var opacity = (100 - timer) / 100;
      _this5.el.style.opacity = opacity;
      _this5.el.style.msTransform = 'translateX(' + timer + '%)';
    } else {
      clearInterval(interval);
      _this5.el.style.msTransform = 'translateX(0)';
      _this5.currentPosition = timer;
    }
  }, 50);
};

CarouselItem.prototype.animateInactiveWithoutTransition = function () {
  var _this6 = this;

  var direction = arguments.length <= 0 || arguments[0] === undefined ? 'left' : arguments[0];

  var timer = 0;

  var interval = setInterval(function () {
    timer = timer + 5;

    if (timer < 101) {
      var opacity = (100 - timer) / 100;
      _this6.el.style.opacity = opacity;
      _this6.el.style.msTransform = 'translateX(' + (direction === 'left' ? '-' + timer : timer) + '%)';
    } else {
      clearInterval(interval);
      _this6.currentPosition = direction === 'left' ? -100 : 100;
    }
  }, 50);
};

exports.default = CarouselItem;

},{"./../../../shared/support":49}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _carouselItem = require('./carousel-item/carousel-item');

var _carouselItem2 = _interopRequireDefault(_carouselItem);

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var breakpoints = require('../../layout/breakpoints');

/**
 * Handles the logic for the main navigation.
 */

var Carousel = function (_EventEmitter) {
  _inherits(Carousel, _EventEmitter);

  function Carousel(el) {
    _classCallCheck(this, Carousel);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Carousel).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.items = [];
    _this.activeItem = 0;
    _this.buttonLeft = el.querySelector('.carousel-button-left');
    _this.buttonRight = el.querySelector('.carousel-button-right');
    _this.dots = el.querySelector('.carousel-dots');

    _this.seedCarousel(el);
    _this.updateDots();
    _this.updateArrows();
    _this.delegateEvents();

    window.addEventListener('resize', (0, _lodash2.default)(function () {
      _this.updateHeight();
    }, 200));

    // need to make sure 1st slide is rendered
    setTimeout(function () {
      _this.updateHeight();
    }, 500);
    return _this;
  }

  _createClass(Carousel, [{
    key: 'seedCarousel',
    value: function seedCarousel(el) {
      var itemsInDom = el.querySelectorAll('.carousel-content');
      itemsInDom = Array.prototype.slice.call(itemsInDom, 0);

      this.items = itemsInDom.map(function (item, idx) {
        return new _carouselItem2.default(this, idx, item, idx === this.activeItem);
      }.bind(this));
    }
  }, {
    key: 'delegateEvents',
    value: function delegateEvents() {
      var _this2 = this;

      this.buttonLeft.addEventListener('click', function () {
        _this2.shiftLeft();
      });
      this.buttonRight.addEventListener('click', function () {
        _this2.shiftRight();
      });

      if (this.dots) {
        this.dots.addEventListener('click', function (evt) {
          _this2.shiftFromDot(evt);
        });
      }
    }
  }, {
    key: 'shiftLeft',
    value: function shiftLeft() {
      if (this.activeItem) {
        this.activeItem--;
        this.emitChangedState();
      }
    }
  }, {
    key: 'shiftRight',
    value: function shiftRight() {
      if (this.activeItem < this.items.length - 1) {
        this.activeItem++;
        this.emitChangedState();
      }
    }
  }, {
    key: 'shiftFromDot',
    value: function shiftFromDot(evt) {
      var newIndex = Array.prototype.indexOf.call(evt.currentTarget.querySelectorAll('li'), evt.target);

      if (newIndex > -1) {
        if (this.activeItem !== newIndex) {
          this.activeItem = newIndex;
          this.emitChangedStateDirectly();
        }
      }
    }
  }, {
    key: 'updateDots',
    value: function updateDots() {
      if (this.dots) {
        var oldActiveDot = this.dots.querySelector('.is-active');

        if (oldActiveDot) {
          oldActiveDot.classList.remove('is-active');
        }

        this.dots.children[this.activeItem].classList.add('is-active');
      }
    }
  }, {
    key: 'updateArrows',
    value: function updateArrows() {
      if (this.activeItem === 0) {
        this.buttonLeft.classList.add('is-hidden');
      } else {
        this.buttonLeft.classList.remove('is-hidden');
      }

      if (this.activeItem === this.items.length - 1) {
        this.buttonRight.classList.add('is-hidden');
      } else {
        this.buttonRight.classList.remove('is-hidden');
      }
    }
  }, {
    key: 'updateHeight',
    value: function updateHeight() {
      // determine max height
      var maxHeight = 0;
      this.items.forEach(function (item) {
        var rect = item.el.querySelector('img').getBoundingClientRect();
        maxHeight = Math.max(maxHeight, rect.height);
      });
      this.el.style.height = '1000px';
      this.el.style.maxHeight = maxHeight + 'px';

      this.items.forEach(function (item) {
        var img = item.el.querySelector('img');

        if (breakpoints.current === 'sm') {
          img.style.marginTop = '0';
          item.el.style.height = 'auto';
        } else {
          // adjust margin in desktop view so images are vertically centered
          var imgHeight = img.getBoundingClientRect().height;
          var imgMarginTop = (maxHeight - imgHeight) / 2;
          img.style.marginTop = imgMarginTop + 'px';

          // vertically center text
          item.el.style.height = '100%';
        }
      });
    }
  }, {
    key: 'emitChangedState',
    value: function emitChangedState() {
      this.updateDots();
      this.updateArrows();
      this.updateHeight();
      this.emit('active-state:changed', this.activeItem);
    }
  }, {
    key: 'emitChangedStateDirectly',
    value: function emitChangedStateDirectly() {
      this.updateDots();
      this.updateArrows();
      this.updateHeight();
      this.emit('active-state:changed-directly', this.activeItem);
    }
  }]);

  return Carousel;
}(_events.EventEmitter);

;

exports.default = Carousel;

},{"../../layout/breakpoints":25,"./carousel-item/carousel-item":28,"events":1,"lodash.throttle":18}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _carousel = require('./../carousel/carousel');

var _carousel2 = _interopRequireDefault(_carousel);

var _support = require('./../../shared/support');

var _support2 = _interopRequireDefault(_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ACTIVE_COPY_CLASSNAME = 'is-active';
var ANIMATING_CLASSNAME = 'animating';

var MiniCarousel = function (_Carousel) {
  _inherits(MiniCarousel, _Carousel);

  function MiniCarousel(el) {
    _classCallCheck(this, MiniCarousel);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MiniCarousel).call(this, el));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.itemsInDom = _this.el.querySelectorAll('.mini-carousel-copy-item');
    if (_this.itemsInDom.length > 0) {
      _this.itemsInDom[0].classList.add(ACTIVE_COPY_CLASSNAME);
    }
    _this.removeAnimationEvent();

    _this.el.addEventListener('click', function (evt) {
      _this.shiftEvent(evt);
    });
    return _this;
  }

  _createClass(MiniCarousel, [{
    key: 'updateHeight',
    value: function updateHeight() {
      return false;
    }
  }, {
    key: 'shiftEvent',
    value: function shiftEvent(evt) {
      if (document.body.clientWidth - evt.clientX < 75) {
        this.shiftRight();
      } else if (evt.clientX < 75) {
        this.shiftLeft();
      }
    }
  }, {
    key: 'removeAnimationEvent',
    value: function removeAnimationEvent() {
      var items = Array.prototype.slice.call(this.itemsInDom, 0);
      var transitionEndName = _support2.default.transitionEnd();

      items.forEach(function (item) {
        var _this2 = this;

        item.addEventListener(transitionEndName, function () {
          _this2.el.classList.remove(ANIMATING_CLASSNAME);
        }, false);
      }.bind(this));
    }
  }, {
    key: 'updateCopy',
    value: function updateCopy() {
      var items = Array.prototype.slice.call(this.itemsInDom, 0);

      this.el.classList.add(ANIMATING_CLASSNAME);

      items.forEach(function (item, idx) {
        if (this.activeItem === idx) {
          item.classList.add(ACTIVE_COPY_CLASSNAME);
        } else {
          item.classList.remove(ACTIVE_COPY_CLASSNAME);
        }
      }.bind(this));
    }
  }, {
    key: 'emitChangedState',
    value: function emitChangedState() {
      this.updateCopy();

      _get(Object.getPrototypeOf(MiniCarousel.prototype), 'emitChangedState', this).call(this);
    }
  }, {
    key: 'emitChangedStateDirectly',
    value: function emitChangedStateDirectly() {
      this.updateCopy();

      _get(Object.getPrototypeOf(MiniCarousel.prototype), 'emitChangedStateDirectly', this).call(this);
    }
  }]);

  return MiniCarousel;
}(_carousel2.default);

exports.default = MiniCarousel;

},{"./../../shared/support":49,"./../carousel/carousel":29}],31:[function(require,module,exports){
'use strict';

var bindAll = require('lodash.bindall');
var features = require('../../../templates/features');
var breakpoints = require('../../../layout/breakpoints');

/**
 * NavBar
 */
var NavBar = function NavBar(el, nav) {
  bindAll(this, 'clickedNavToggle', 'toggleNavItem', 'levelStateChanged', 'clickedSearchToggle');

  this.el = el;
  this.nav = nav;
  this.navDropToggler = this.el.querySelector('.js-nav-toggle');
  this.searchToggler = this.el.querySelector('.js-search-toggle');
  this.topLevelTogglers = Array.prototype.slice.call(this.el.querySelectorAll('.js-restart-level'));

  this.delegateEvents();
  this.nav.on('level-state:changed', this.levelStateChanged);
};

/**
 * Event delegator
 */
NavBar.prototype.delegateEvents = function () {
  this.navDropToggler.addEventListener('click', this.clickedNavToggle);
  this.searchToggler.addEventListener('click', this.clickedSearchToggle);

  for (var i = 0; i < this.topLevelTogglers.length; i++) {
    this.topLevelTogglers[i].addEventListener('click', this.toggleNavItem);
  }
};

/**
 * When the state has changed amongst the levels, we should
 * make sure the icon looks correct depending on any items is expanded or not.
 */
NavBar.prototype.levelStateChanged = function (breadcrumb) {
  if (breakpoints.current == 'sm') {
    // make sure the toggler has the correct class
    if (!!breadcrumb.length) {
      this.navDropToggler.classList.add('nav-bar-menu-toggler-open');
    } else {
      this.navDropToggler.classList.remove('nav-bar-menu-toggler-open');
    }
    return;
  }

  // Set "active" on all active level links in the nav-bar (should never be more than one, but you never know).
  for (var i = 0; i < this.topLevelTogglers.length; i++) {
    var toggler = this.topLevelTogglers[i];
    var id = toggler.attributes['data-lvl-id'];
    if (!id) {
      continue;
    }

    if (breadcrumb.indexOf(id.value) !== -1) {
      toggler.classList.add('active');
    } else {
      toggler.classList.remove('active');
    }
  }
};

/**
 * When an item was clicked grab the level of the id it is pointing
 * to and toggle that level.
 */
NavBar.prototype.toggleNavItem = function (evt) {
  evt.preventDefault();

  if (this.nav.el.classList.contains('nav-search-expanded')) {
    this.nav.toggleSearch();
  }

  var id = evt.currentTarget.attributes['data-lvl-id'];
  if (!id) {
    return;
  }
  this.nav.resetLevel(id.value);
};

/**
 * Toggle root nav level
 */
NavBar.prototype.clickedNavToggle = function (evt) {
  evt.preventDefault();

  if (this.nav.el.classList.contains('nav-search-expanded')) {
    this.nav.toggleSearch();
  }

  this.nav.toggleLevel('root');
};

NavBar.prototype.clickedSearchToggle = function (evt) {
  evt.preventDefault();

  if (this.nav.el.classList.contains('nav-expanded')) {
    this.nav.toggleLevel('root');
  }

  this.nav.toggleSearch();
};

module.exports = NavBar;

},{"../../../layout/breakpoints":25,"../../../templates/features":50,"lodash.bindall":5}],32:[function(require,module,exports){
'use strict';

var bindAll = require('lodash.bindall');
var breakpoints = require('../../../layout/breakpoints');
var features = require('../../../templates/features');

var HOVER_DELAY = 300;
var IS_ACTIVE_CLASS = 'is-active';

/**
 * Handles the logic of each level in a the navigation
 */
var NavDropLevel = function NavDropLevel(el, nav) {
  bindAll(this, 'levelStateChanged', 'wireDevice');

  this.el = el;
  this.id = this.el.attributes['data-lvl-id'].value;

  var siblings = Array.prototype.slice.call(this.el.parentNode.children);
  this.toggler = siblings.filter(function (el) {
    return el.classList.contains('js-show-children');
  })[0];
  this.wireDevice();

  breakpoints.on('change', this.wireDevice);
  nav.on('level-state:changed', this.levelStateChanged);
};

/**
 * wireDevice
 */
NavDropLevel.prototype.wireDevice = function () {
  if (this.toggler) {
    this.toggler.addEventListener('click', this.expandLevel);
  }

  // for other devices than small and we should listen to mouseover if it
  // is activated in this template,
  if (breakpoints.current != 'sm' && features.has('js-nav-mouseover')) {
    //this.toggler.addEventListener('mouseover', this.expandLevelWithDelay);
    //this.toggler.addEventListener('mouseout', this.clearTimer);
  }
};

/**
 * Event handler for when the active levels have changed in the the nav.
 */
NavDropLevel.prototype.levelStateChanged = function (breadcrumb) {

  // If level is the top most
  if (breadcrumb[breadcrumb.length - 1] === this.id) {
    this.el.classList.add('is-current');
  } else {
    this.el.classList.remove('is-current');
  }

  if (breadcrumb.indexOf(this.id) !== -1) {
    this.el.classList.add('is-active');
  } else {
    this.el.classList.remove('is-active');
  }
};

module.exports = NavDropLevel;

},{"../../../layout/breakpoints":25,"../../../templates/features":50,"lodash.bindall":5}],33:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = NavSearch;
function NavSearch(el, nav) {
  var _this = this;

  this.el = el;
  this.nav = nav;
  this.inputEl = this.el.querySelector('.nav-search-input');
  this.clearer = this.el.querySelector('.nav-search-clearer');

  this.delegateEvents();

  nav.on('search-state:changed', function () {
    _this.searchStateChanged();
  });
};

NavSearch.prototype.delegateEvents = function () {
  var _this2 = this;

  this.clearer.addEventListener('click', function () {
    _this2.nav.toggleSearch();
  });

  this.inputEl.addEventListener('keyup', function () {
    _this2.toggleResults();
  });
};

NavSearch.prototype.focusInput = function () {
  this.inputEl.focus();
};

NavSearch.prototype.toggleResults = function (evt) {
  if (this.inputEl.value && !this.resultsShown) {
    this.el.classList.add('show-results');
    this.resultsShown = true;
  } else if (!this.inputEl.value && this.resultsShown) {
    this.el.classList.remove('show-results');
    this.resultsShown = false;
  }
};

NavSearch.prototype.searchStateChanged = function () {
  this.focusInput();
};

NavSearch.prototype.clearInput = function () {
  this.inputEl.value = '';
  this.toggleResults();
};

},{}],34:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _navSearch = require('./nav-search/nav-search');

var _navSearch2 = _interopRequireDefault(_navSearch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var inherits = require('inherits');
var EventEmitter = require('events');
var bindAll = require('lodash.bindall');
var breakpoints = require('../../layout/breakpoints');
var features = require('../../templates/features');
var NavBar = require('./nav-bar/nav-bar');
var NavDropLevel = require('./nav-drop-level/nav-drop-level');


var HOVER_DELAY = 300;

/**
 * Handles the logic for the main navigation.
 */
var Nav = function Nav(el) {
  var _this2 = this;

  if (!el) {
    return;
  }
  EventEmitter.prototype._maxListeners = 100;
  EventEmitter.call(this);
  bindAll(this, 'levelStateChanged', 'breakpointChanged', 'togglerClicked', 'popLevel', 'animationEvent', 'searchAnimationEvent');

  // keep an array that keeps track of the levels in the
  // menu. This will serve as our model.
  this.breadcrumb = [];
  this.el = el;
  this.popLevelEl = el.querySelector('.js-pop-level');
  this.navDrop = el.querySelector('.nav-drop');
  this.navClose = el.querySelector('.js-nav-close');

  this.createChildControls();
  this.delegateEvents();

  // event handlers
  breakpoints.on('change', this.breakpointChanged);
  this.on('level-state:changed', this.levelStateChanged);

  document.querySelector('.body-container').addEventListener('scroll', function (evt) {
    _this2.fixNavigation(evt);
  });
};

// inherit event emitter.
inherits(Nav, EventEmitter);

/**
 * Instantiates a Nav Drop Level for each of the levels found in the DOM.
 */
Nav.prototype.createChildControls = function () {
  var _this3 = this;

  var _this = this;
  var levels = Array.prototype.slice.call(this.el.querySelectorAll('.nav-drop-level'));

  this.navBar = new NavBar(this.el.querySelector('.nav-bar'), this);
  this.navDropLevels = [];

  levels.forEach(function (level) {
    _this3.navDropLevels.push(new NavDropLevel(level, _this));
  });

  this.viewLevel = 'sm';
  this.checkAndRearrangeOrder();

  // create search bar
  this.searchBar = new _navSearch2.default(this.el.querySelector('.nav-search'), this);
};

/**
 * Event delegator.
 */
Nav.prototype.delegateEvents = function () {
  var _this4 = this;

  var _this = this;
  this.popLevelEl.addEventListener('click', this.popLevel);
  var childTogglers = Array.prototype.slice.call(this.el.querySelectorAll('.js-show-children'));
  childTogglers.forEach(function (toggler) {
    toggler.addEventListener('click', _this.togglerClicked);
  });

  this.navClose.addEventListener('click', function (evt) {
    _this4.closeNav(evt);
  });
};

/**
 * Menu toggler clicked.
 */
Nav.prototype.togglerClicked = function (evt) {
  if (breakpoints.current === 'sm') {
    var id = evt.currentTarget.attributes['data-lvl-id'];
    if (!id) {
      return;
    }
    this.toggleLevel(id.value);

    evt.preventDefault();
  }
};

Nav.prototype.closeNav = function (evt) {
  evt.preventDefault();

  this.toggleLevel('root');
};

/**
 * Event handler for level state changes.
 */
Nav.prototype.levelStateChanged = function (breadcrumb) {
  // if nav needs to open or close, i.e. we aren't just going from small to medium breakpoint with nav closed
  if (this.el.classList.contains('nav-expanded') || breadcrumb.length > 0) {
    // trigger animation class
    this.el.classList.add('nav-expanded-animated');
    this.el.addEventListener('transitionend', this.animationEvent, false);

    if (breadcrumb.length) {
      this.el.classList.add('nav-expanded');
      document.body.classList.add('nav-expanded');
    } else {
      this.el.classList.remove('nav-expanded');
      document.body.classList.remove('nav-expanded');
    }

    if (breadcrumb.length > 1) {
      this.popLevelEl.classList.add('is-visible');
    } else {
      this.popLevelEl.classList.remove('is-visible');
    }
  }
};

Nav.prototype.animationEvent = function () {
  this.el.classList.remove('nav-expanded-animated');

  this.el.removeEventListener('transitionend', this.animationEvent);
};

/**
 * Toggles the provided level, meaning that it will be removed if it
 * already exists in the breadcrumb.
 */
Nav.prototype.toggleLevel = function (levelId) {
  var index = this.breadcrumb.indexOf(levelId);

  // if the item toggled already exist, it means we are closing the level,
  // just splice out the rest of the array. If you close an item, all sub levels should also be closed
  if (index !== -1) {
    this.breadcrumb.splice(index, this.breadcrumb.length - index);
  }

  // else, we want to add it to the breadcrumb.
  else {
      this.breadcrumb.push(levelId);
    }
  this.emitChangedState();
};

/**
 * Resets the breadcrumb.
 */
Nav.prototype.resetLevel = function (id) {
  this.breadcrumb = this.breadcrumb.indexOf(id) !== -1 ? [] : ['root', id];
  this.emitChangedState();
};

/**
 * Pops one level in the breadcumb (ie. closes it).
 */
Nav.prototype.popLevel = function () {
  this.breadcrumb.pop();
  this.emitChangedState();
};

/**
 * Event-emitter for level state changes.
 */
Nav.prototype.emitChangedState = function (searchChanged) {
  if (searchChanged) {
    this.emit('search-state:changed');
  } else {
    this.emit('level-state:changed', this.breadcrumb);
  }
};

/**
 * Collapses the entire nav and starts from zero upon breakpoint changes.
 */
Nav.prototype.breakpointChanged = function (newBreakpoint, oldBreakpoint) {
  if (newBreakpoint === 'md' && oldBreakpoint === 'lg' || newBreakpoint === 'lg' && oldBreakpoint === 'md') {
    return;
  }

  this.breadcrumb = [];
  this.checkAndRearrangeOrder(newBreakpoint);
  this.emitChangedState();
};

/**
 * Toggles the search bar
 */
Nav.prototype.toggleSearch = function () {
  this.el.classList.add('nav-search-expanded-animated');
  this.el.addEventListener('transitionend', this.searchAnimationEvent, false);

  this.searchBar.clearInput();
  this.el.classList.toggle('nav-search-expanded');
  this.emitChangedState(true);

  if (!this.el.classList.contains('nav-search-expanded')) {
    this.searchBar.el.querySelector('.nav-search-input').blur();
  }
};

Nav.prototype.searchAnimationEvent = function () {
  this.el.classList.remove('nav-search-expanded-animated');

  this.el.removeEventListener('transitionend', this.searchAnimationEvent);
};

Nav.prototype.filterElementsForOrdering = function (els, mapToSearch) {
  var filteredElements = els.filter(function (el) {
    if (mapToSearch.indexOf(el.id) > -1) {
      return true;
    }
  });

  return filteredElements;
};

Nav.prototype.swapElement = function (ar, firstIndex, secondIndex) {
  var firstEl = ar[firstIndex];
  var secondEl = ar[secondIndex];

  var temp = document.createElement("div");
  ar[firstIndex].el.parentNode.parentNode.insertBefore(temp, ar[firstIndex].el.parentNode);

  ar[secondIndex].el.parentNode.parentNode.insertBefore(ar[firstIndex].el.parentNode, ar[secondIndex].el.parentNode);

  temp.parentNode.insertBefore(ar[secondIndex].el.parentNode, temp);

  temp.parentNode.removeChild(temp);

  ar[firstIndex] = secondEl;
  ar[secondIndex] = firstEl;
};

Nav.prototype.checkAndRearrangeOrder = function (bp) {
  var _this5 = this;

  var breakpoint = bp || breakpoints.current;

  if (breakpoint === this.viewLevel) {
    return;
  } else {
    this.viewLevel = breakpoint;
  }

  // TODO move this into a config
  var elMapSm = ['mobile', 'tvHomeTheater', 'homeAppliances', 'computing', 'audio', 'smartHome', 'shopAll'];
  var elMapLg = ['mobile', 'computing', 'tvHomeTheater', 'audio', 'homeAppliances', 'smartHome', 'shopAll'];

  var itemMap = void 0;

  if (breakpoint === 'lg' || breakpoint === 'md') {
    itemMap = elMapLg;
  } else {
    itemMap = elMapSm;
  }

  this.filteredElements = this.filteredElements || this.filterElementsForOrdering(this.navDropLevels, elMapSm);

  itemMap.forEach(function (el, idx) {
    if (el !== _this5.filteredElements[idx].id) {
      for (var i = idx + 1; i < itemMap.length; i++) {
        if (el === _this5.filteredElements[i].id) {
          _this5.swapElement(_this5.filteredElements, idx, i);
        }
      }
    }
  });
};

Nav.prototype.fixNavigation = function (evt) {
  this.scrollPosition = this.scrollPosition || evt.currentTarget.scrollTop;

  if (this.scrollPosition < evt.currentTarget.scrollTop) {
    this.el.classList.remove('is-fixed');
    this.scrollPosition = evt.currentTarget.scrollTop;
  } else {

    if (this.scrollPosition - 100 > evt.currentTarget.scrollTop || evt.currentTarget.scrollTop < 55) {
      this.el.classList.add('is-fixed');
      this.scrollPosition = evt.currentTarget.scrollTop;
    }
  }

  if (this.scrollPosition < 55) {
    this.el.classList.remove('is-not-away');
  } else {
    this.el.classList.add('is-not-away');
  }
};

exports.default = Nav;

},{"../../layout/breakpoints":25,"../../templates/features":50,"./nav-bar/nav-bar":31,"./nav-drop-level/nav-drop-level":32,"./nav-search/nav-search":33,"events":1,"inherits":4,"lodash.bindall":5}],35:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _support = require('./../../shared/support');

var _support2 = _interopRequireDefault(_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SLIDE_LENGTH = 25;
var FPS = 30;

var PngSequence = function PngSequence(el) {
  var _this = this;

  if (!el) {
    return;
  }

  this.el = el;
  this.slideNumber = 0;
  this.animationInterval = 1000 / 30;
  this.now;
  this.then = Date.now();
  this.delta;
  this.sequenceEl = this.el.querySelector('.png-sequence-item');
  this.isAnimating = false;

  window.addEventListener('scroll', function (evt) {
    _this.checkScrollPosition(evt);
  });

  // check if we loaded the page with the png sequence in view
  this.checkScrollPosition();
};

PngSequence.prototype.checkScrollPosition = function (evt) {
  var rect = this.sequenceEl.getBoundingClientRect();

  // el is visible
  if (rect.top > -300 && rect.top < 300) {
    if (_support2.default.keyframeAnimation() && false) {
      this.sequenceEl.classList.add('animating');
    } else {
      this.animate();
    }
    // reset sequence
  } else if (rect.top > window.innerHeight) {
      if (_support2.default.keyframeAnimation() && false) {
        this.sequenceEl.classList.remove('animating');
      } else {
        this.slideNumber = 0;
        this.sequenceEl.style.backgroundPosition = '0 0';
      }
    }
};

PngSequence.prototype.animate = function () {
  var _this2 = this;

  if (this.slideNumber < SLIDE_LENGTH) {
    requestAnimationFrame(function () {
      _this2.animate();
    });
  } else {}

  this.now = Date.now();
  this.delta = this.now - this.then;

  if (this.delta > this.animationInterval) {
    this.then = this.now - this.delta % this.animationInterval;

    if (this.slideNumber < SLIDE_LENGTH) {
      this.slideNumber++;
      var bgPositionY = 100 / SLIDE_LENGTH * this.slideNumber;
      this.sequenceEl.style.backgroundPosition = '0 ' + bgPositionY + '%';
    }
  }
};

exports.default = PngSequence;

},{"./../../shared/support":49}],36:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _miniCarousel = require('../mini-carousel/mini-carousel');

var _miniCarousel2 = _interopRequireDefault(_miniCarousel);

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RESIZE_THROTTLE = 20;

var ProductCard = function ProductCard(el) {
  var _this = this;

  if (!el) {
    return;
  }

  this.el = el;
  this.intervalId;
  this.intervalTime = 500;
  this.animatedImageContainer = this.el.querySelector('.product-images-animated');
  this.imageColorContainers = this.animatedImageContainer.querySelectorAll('.product-image-color');
  this.activeColor = this.imageColorContainers[0].getAttribute('data-color');
  this.imageColorData = {};
  this.carouselData = {};
  this.compareText = this.el.querySelector('.button-add-compare .card-cta-text').innerHTML;
  this.compareTextSelected = 'Added to Compare';
  this.wishlistText = this.el.querySelector('.button-add-wishlist .card-cta-text').innerHTML;
  this.wishlistTextSelected = 'Added to Wishlist';
  this.ctaData = {};

  this.initMobileImages();
  this.initDesktopImages();

  this.setActiveColor(this.activeColor);

  // add swatch event listeners
  Array.prototype.slice.call(this.el.querySelectorAll('.button-swatch')).forEach(function (buttonSwatch) {
    buttonSwatch.addEventListener('mouseenter', function (evt) {
      _this.onClickSwatch(evt);
    });

    buttonSwatch.addEventListener('click', function (evt) {
      _this.onClickSwatch(evt);
    });
  });

  // add cta event listeners
  Array.prototype.slice.call(this.el.querySelectorAll('.radio-cta-line a')).forEach(function (buttonCta) {
    buttonCta.addEventListener('click', function (evt) {
      return _this.onClickCta(evt);
    });
  });

  this.positionCta();

  // listen to resize
  window.addEventListener('resize', (0, _lodash2.default)(function () {
    return _this.positionCta();
  }, RESIZE_THROTTLE));
};

ProductCard.prototype.initMobileImages = function () {
  var _this2 = this;

  // instantiate carousels and put them in carouselData dict
  var carouselEls = this.el.querySelectorAll('.mini-carousel');
  Array.prototype.slice.call(carouselEls).forEach(function (carouselEl) {
    _this2.carouselData[carouselEl.getAttribute('data-color')] = {
      'carousel': new _miniCarousel2.default(carouselEl),
      'el': carouselEl
    };
  });

  // bind onCarouselStateChange to this context
  this.onCarouselStateChange = this.onCarouselStateChange.bind(this);
};

ProductCard.prototype.initDesktopImages = function () {
  var _this3 = this;

  // iterate through image color containers
  Array.prototype.slice.call(this.imageColorContainers).forEach(function (imageColorContainer) {
    // add data to imageColorData
    var imageSources = imageColorContainer.getAttribute('data-image-sources').split(',').slice(0, -1);
    _this3.imageColorData[imageColorContainer.getAttribute('data-color')] = {
      'sources': imageSources,
      'container': imageColorContainer
    };

    // set img src in each color container
    imageColorContainer.querySelector('img').setAttribute('src', imageSources[0]);
  });

  // add desktop rollover listeners
  if (document.body.classList.contains('no-touch')) {
    this.animatedImageContainer.addEventListener('mouseenter', function (evt) {
      return _this3.onMouseEnterProductImage(evt);
    });
    this.animatedImageContainer.addEventListener('mouseleave', function (evt) {
      return _this3.onMouseLeaveProductImage(evt);
    });
  }
};

ProductCard.prototype.onClickSwatch = function (evt) {
  this.setActiveColor(evt.target.getAttribute('data-color'));

  evt.preventDefault();
};

ProductCard.prototype.onClickCta = function (evt) {
  var newText = '';

  if (evt.currentTarget.classList.contains('selected')) {
    evt.currentTarget.classList.remove('selected');
    newText = evt.currentTarget.classList.contains('button-add-compare') ? this.compareText : this.wishlistText;
  } else {
    evt.currentTarget.classList.add('selected');
    newText = evt.currentTarget.classList.contains('button-add-compare') ? this.compareTextSelected : this.wishlistTextSelected;
  }

  // update button text
  evt.currentTarget.querySelector('.card-cta-text').innerHTML = newText;

  evt.preventDefault();
};

ProductCard.prototype.setActiveColor = function (color) {
  // update active classes
  if (this.el.querySelector('.button-swatch.active')) {
    this.el.querySelector('.button-swatch.active').classList.remove('active');
  }
  if (this.el.querySelector('.button-swatch[data-color="' + color + '"]')) {
    this.el.querySelector('.button-swatch[data-color="' + color + '"]').classList.add('active');
  }

  // remove mobile carousel listener
  this.carouselData[this.activeColor].carousel.removeListener('active-state:changed', this.onCarouselStateChange);

  // update active color
  this.activeColor = color;

  // remove active class from all image containers
  var miniCarousels = Array.prototype.slice.call(this.el.querySelectorAll('.mini-carousel'));
  var imageColorContainers = Array.prototype.slice.call(this.imageColorContainers);
  imageColorContainers.concat(miniCarousels).forEach(function (container) {
    container.classList.remove('active');
  });

  // set desktop active image color container
  this.imageColorData[this.activeColor].container.classList.add('active');

  // set active mobile carousel
  this.el.querySelector('.mini-carousel[data-color="' + this.activeColor + '"]').classList.add('active');

  // add listener to newly active mobile carousel
  this.carouselData[this.activeColor].carousel.on('active-state:changed', this.onCarouselStateChange);

  // update link to product detail
  Array.prototype.slice.call(this.el.querySelectorAll('a.product-link')).forEach(function (productLink) {
    productLink.setAttribute('href', 'full-funnel-pd-phone.html?color=' + color);
  });

  Array.prototype.slice.call(this.el.querySelectorAll('.pf-tv a.product-link')).forEach(function (productLink) {
    productLink.setAttribute('href', 'full-funnel-pd-tv.html');
  });
};

ProductCard.prototype.onMouseEnterProductImage = function (evt) {
  this.startAnimation();
};

ProductCard.prototype.onMouseLeaveProductImage = function (evt) {
  this.stopAnimation();
};

ProductCard.prototype.startAnimation = function () {
  var imageEl = this.imageColorData[this.activeColor].container.querySelector('img');
  var sources = this.imageColorData[this.activeColor].sources;
  var sequenceIndex = 1;

  // don't animate if only one image source
  if (sources.length <= 1) {
    return;
  }

  // update image src right away before setting interval for subsequent animation
  imageEl.setAttribute('src', sources[sequenceIndex]);

  // swap image src on an interval for the sequence effect
  this.intervalId = setInterval(function () {
    sequenceIndex = sequenceIndex == sources.length - 1 ? 0 : sequenceIndex + 1;
    imageEl.setAttribute('src', sources[sequenceIndex]);
  }, this.intervalTime);
};

ProductCard.prototype.stopAnimation = function () {
  clearInterval(this.intervalId);

  // reset image src
  var imageEl = this.imageColorData[this.activeColor].container.querySelector('img');
  var sources = this.imageColorData[this.activeColor].sources;
  imageEl.setAttribute('src', sources[0]);
};

ProductCard.prototype.onCarouselStateChange = function (index) {
  var activeCarousel = this.carouselData[this.activeColor].carousel;
  var activeIndex = activeCarousel.activeItem;

  // set other carousels to same index
  for (var obj in this.carouselData) {
    var carousel = this.carouselData[obj].carousel;

    // ignore active carousel
    if (carousel === activeCarousel) {
      continue;
    }

    // shift carousel left or right
    if (carousel.activeItem < activeIndex) {
      this.carouselData[obj].carousel.shiftRight();
    } else {
      this.carouselData[obj].carousel.shiftLeft();
    }
  }
};

ProductCard.prototype.positionCta = function () {
  var buttonContainers = this.el.querySelectorAll('.cta-line .button-container');
  Array.prototype.slice.call(buttonContainers).forEach(function (buttonContainer) {
    var button = buttonContainer.querySelector('a');
    var ctaWidth = button.getBoundingClientRect().width;

    if (button.hasAttribute('data-width')) {
      ctaWidth = button.getAttribute('data-width');
    } else if (ctaWidth > 0) {
      button.setAttribute('data-width', ctaWidth);
    }

    var marginLeft = (buttonContainer.getBoundingClientRect().width - ctaWidth) / 2;
    button.style.marginLeft = marginLeft + 'px';
  });
};

exports.default = ProductCard;

},{"../mini-carousel/mini-carousel":30,"lodash.throttle":18}],37:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

var _accordion = require('../../accordion/accordion');

var _accordion2 = _interopRequireDefault(_accordion);

var _support = require('../../../shared/support');

var _support2 = _interopRequireDefault(_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var breakpoints = require('../../../layout/breakpoints');

var SCROLL_THROTTLE = 10;
var RESIZE_THROTTLE = 10;
var HEIGHT_FILTER = 304;

/**
 * Handles the logic for product finder filter menu.
 */

var FilterMenu = function (_EventEmitter) {
  _inherits(FilterMenu, _EventEmitter);

  function FilterMenu(el) {
    _classCallCheck(this, FilterMenu);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(FilterMenu).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.filtersY = _this.el.offsetTop;
    _this.onScrollFiltersThrottled = (0, _lodash2.default)(function (evt) {
      return _this.onScrollFilters(evt);
    }, SCROLL_THROTTLE);

    // init filter accordion
    _this.accordion = new _accordion2.default(_this.el.querySelector('.accordion'));
    _this.accordion.on('accordion:opened', function () {
      return _this.onAccordionOpened();
    });
    _this.accordion.on('accordion:closed', function () {
      return _this.onAccordionClosed();
    });

    // listen to sort menu
    _this.sort = _this.el.querySelector('.sort-menu-desktop > a');
    _this.sort.addEventListener('click', function (evt) {
      return _this.onClickSort(evt);
    });
    Array.prototype.slice.call(_this.el.querySelectorAll('.sort-menu-desktop .sort-menu-dropdown a')).forEach(function (sortCta) {
      sortCta.addEventListener('click', function (evt) {
        return _this.onSort(evt);
      });
    });

    // listen to filter clicks
    _this.el.querySelector('.button-color-gold').addEventListener('click', function (evt) {
      return _this.onClickFilter(evt);
    });
    _this.el.querySelector('.button-feature-samsungpay').addEventListener('click', function (evt) {
      return _this.onClickFilter(evt);
    });

    // _this.el.querySelector('.button-feature-display01').addEventListener('click', function (evt) {
    //   return _this.onClickFilter(evt);
    // });


    // listen to scroll for filter
    window.addEventListener('scroll', _this.onScrollFiltersThrottled);

    // listen to resize
    window.addEventListener('resize', (0, _lodash2.default)(function () {
      return _this.onResize();
    }, RESIZE_THROTTLE));

    _this.adjustFilterHeight();
    return _this;
  }

  _createClass(FilterMenu, [{
    key: 'closeAll',
    value: function closeAll() {
      this.accordion.close();
    }
  }, {
    key: 'closeSort',
    value: function closeSort() {
      if (this.sort.parentNode.classList.contains('active')) {
        this.sort.parentNode.classList.remove('active');
      }
    }
  }, {
    key: 'onScrollFilters',
    value: function onScrollFilters(evt) {
      this.closeSort();

      // check if we need to set sticky
      var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop >= this.filtersY && !this.el.classList.contains('sticky') && this.isDesktop()) {
        this.setSticky();
      } else if (scrollTop < this.filtersY && this.el.classList.contains('sticky') && this.isDesktop()) {
        this.setUnsticky();
      }
    }
  }, {
    key: 'onClickSort',
    value: function onClickSort(evt) {
      this.closeAll();

      var menu = evt.currentTarget.parentNode;
      if (menu.classList.contains('active')) {
        menu.classList.remove('active');
      } else {
        menu.classList.add('active');
      }

      evt.preventDefault();
    }
  }, {
    key: 'onSort',
    value: function onSort(evt) {
      evt.preventDefault();
    }
  }, {
    key: 'onClickFilter',
    value: function onClickFilter(evt) {
      var target = evt.currentTarget;
      var newCount = '';

      if (target.href !== '') {
        // Temporal validation
        // Temporal validation, check if the user already selected feature filter
        if (target.getAttribute('data-filter-name') === 'samsung_pay' && !evt.currentTarget.classList.contains('selected')) {
          this.el.querySelector('.button-color-gold').href = '#';
        }

        // deselecting a filter
        if (evt.currentTarget.classList.contains('selected')) {
          evt.currentTarget.classList.remove('selected');
          this.emit('filter-menu:unfilter', target.getAttribute('data-filter-name'));
          // selecting a filter
        } else {
            evt.currentTarget.classList.add('selected');
            newCount = '(1)';
            this.emit('filter-menu:filter', target.getAttribute('data-filter-name'));
          }

        _support2.default.getClosest(target, '.accordion-item').querySelector('.filter-count').innerHTML = newCount;
        this.accordion.setSliderPosition();

      }

      evt.preventDefault();
    }
  }, {
    key: 'isDesktop',
    value: function isDesktop() {
      var tabButtons = this.el.querySelector('.button-tab[data-tab-id="filters"]');
      return tabButtons.offsetWidth <= 0 && tabButtons.offsetHeight <= 0;
    }
  }, {
    key: 'setSticky',
    value: function setSticky() {
      this.el.classList.add('sticky');
      this.emit('filter-menu:stick');
    }
  }, {
    key: 'setUnsticky',
    value: function setUnsticky() {
      this.el.classList.remove('sticky');
      this.emit('filter-menu:unstick');
    }
  }, {
    key: 'onAccordionOpened',
    value: function onAccordionOpened() {
      this.el.classList.add('opened');
      this.emit('filter-menu:opened');
      this.closeSort();
    }
  }, {
    key: 'onAccordionClosed',
    value: function onAccordionClosed() {
      this.el.classList.remove('opened');
      this.emit('filter-menu:closed');
    }
  }, {
    key: 'onResize',
    value: function onResize() {
      this.adjustFilterHeight();
    }
  }, {
    key: 'adjustFilterHeight',
    value: function adjustFilterHeight() {
      var descriptions = this.el.querySelectorAll('.filters-content-wrapper .description');
      descriptions = Array.prototype.slice.call(descriptions);

      if (breakpoints.current === 'sm') {
        (function () {
          // figure out max height
          var descriptionHeight = 0;
          descriptions.forEach(function (description) {
            description.style.height = 'auto';
            descriptionHeight = Math.max(descriptionHeight, description.getBoundingClientRect().height);
          });

          // set height on all descriptions
          descriptions.forEach(function (description) {
            description.style.height = descriptionHeight + 'px';
          });
        })();
      } else {
        descriptions.forEach(function (description) {
          description.style.height = 'auto';
        });
      }
    }
  }]);

  return FilterMenu;
}(_events.EventEmitter);

;

exports.default = FilterMenu;

},{"../../../layout/breakpoints":25,"../../../shared/support":49,"../../accordion/accordion":26,"events":1,"lodash.throttle":18}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _productCard = require('../product-cards/product-card');

var _productCard2 = _interopRequireDefault(_productCard);

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

var _filterMenu = require('./filter-menu/filter-menu');

var _filterMenu2 = _interopRequireDefault(_filterMenu);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ANIMATION_TIME = .4;
var CARD_STAGGER_TIME = 150;
var HEIGHT_FILTER = 304;
var LOAD_TIME = 500;
var BATCH_SIZE = 12;
var SCROLL_THROTTLE = 10;
var FILTER_SCROLL_THRESHOLD = 100; // distance user must scroll before filters automatically close
var CARD_STATES = {
  'NORMAL': 'normal',
  'EXTENDED': 'extended'
};

var ProductFinder = function ProductFinder(el) {
  var _this = this;

  if (!el) {
    return;
  }

  this.el = el;
  this.normalView = this.el.querySelector('.cards.cards-base2');
  this.extendedView = this.el.querySelector('.cards.cards-base2-extended');
  this.buttonSeeAll = this.el.querySelector('.button-see-all');
  this.onScrollCardsThrottled = (0, _lodash2.default)(function () {
    return _this.onScrollCards();
  }, SCROLL_THROTTLE);
  this.normalCards = [];
  this.extendedCards = [];
  this.productCount = document.querySelector('.product-count');
  this.onScrollFiltersThrottled = (0, _lodash2.default)(function (evt) {
    return _this.onScrollFilters(evt);
  }, SCROLL_THROTTLE);
  this.tweenProductCount = null;
  this.scrollPositionStart = 0; // body scrollTop at the time the filters were opened

  // instantiate filter menu
  this.filterMenu = new _filterMenu2.default(this.el.querySelector('.filters'));
  this.filterMenu.on('filter-menu:stick', function () {
    return _this.onFiltersStick();
  });
  this.filterMenu.on('filter-menu:unstick', function () {
    return _this.onFiltersUnstick();
  });
  this.filterMenu.on('filter-menu:filter', function (filter) {
    return _this.onFiltersFilter(filter);
  });
  this.filterMenu.on('filter-menu:unfilter', function (filter) {
    return _this.onFiltersUnfilter(filter);
  });
  this.filterMenu.on('filter-menu:opened', function () {
    return _this.onFiltersOpened();
  });
  this.filterMenu.on('filter-menu:closed', function () {
    return _this.onFiltersClosed();
  });
  this.filterMenuY = this.filterMenu.el.offsetTop;
  this.heightFilterMenu = parseInt(window.getComputedStyle(this.filterMenu.el).height);

  // instantiate cards
  Array.prototype.slice.call(this.normalView.querySelectorAll('.product-card')).forEach(function (card) {
    _this.normalCards.push(new _productCard2.default(card));
  });
  Array.prototype.slice.call(this.extendedView.querySelectorAll('.product-card')).forEach(function (card) {
    _this.extendedCards.push(new _productCard2.default(card));
  });

  // handle tab clicks
  Array.prototype.slice.call(this.el.querySelectorAll('.button-tab')).forEach(function (buttonTab) {
    // ignore sort button
    if (!buttonTab.classList.contains('button-sort')) {
      buttonTab.addEventListener('click', function (evt) {
        return _this.onClickButtonTab(evt);
      });
    }
  });

  // handle see-all cta click
  this.buttonSeeAll.addEventListener('click', function (evt) {
    return _this.onClickSeeAll(evt);
  });

  // bind scroll listener context
  this.onScrollCards = this.onScrollCards.bind(this);

  // add listener to close filter menu on scroll
  window.addEventListener('scroll', this.onScrollFiltersThrottled);

  // fake some loading time and then hide loader and show initial state of cards
  setTimeout(function () {
    _this.el.querySelector('.loader').classList.remove('active');

    setTimeout(function () {
      _this.el.querySelector('.product-count').style.opacity = 1;
    }, 300);

    _this.showState(CARD_STATES.NORMAL);
  }, LOAD_TIME * 1.5);
};

ProductFinder.prototype.onFiltersOpened = function () {
  // if we're in desktop mode and the filters aren't sticky
  if (this.isDesktop() && !this.el.classList.contains('sticky')) {
    // add top padding to simulate content pushdown
    this.tweenProductCount = TweenLite.to(this.productCount, ANIMATION_TIME, { paddingTop: HEIGHT_FILTER });
  }

  var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  this.scrollPositionStart = scrollTop;
};

ProductFinder.prototype.onFiltersClosed = function () {
  // if we're in desktop mode
  if (this.isDesktop()) {
    // reduce top padding depending on whether menu is sticky or not
    var paddingTop = this.filterMenu.el.classList.contains('sticky') ? this.heightFilterMenu : 0;
    this.tweenProductCount = TweenLite.to(this.productCount, ANIMATION_TIME, { paddingTop: paddingTop });
  }
};

ProductFinder.prototype.onFiltersStick = function (state) {
  this.el.classList.add('sticky');

  // if there's an active tween on product-count, ie the menu is in the process of closing from a scroll
  if (this.tweenProductCount && this.tweenProductCount.isActive()) {
    // animate the top padding
    this.tweenProductCount = TweenLite.to(this.productCount, ANIMATION_TIME, { paddingTop: this.heightFilterMenu });
  } else {
    // otherwise set the top padding without animation to account for the filter menu now being position:fixed
    this.productCount.style.paddingTop = this.heightFilterMenu + 'px';
  }
};

ProductFinder.prototype.onFiltersUnstick = function (state) {
  this.el.classList.remove('sticky');

  // if the filter menu is open
  if (parseInt(this.productCount.style.paddingTop) > this.heightFilterMenu) {
    // animate the top padding back to 0
    this.tweenProductCount = TweenLite.to(this.productCount, ANIMATION_TIME, { paddingTop: 0 });
  } else {
    // otherwise set top padding to 0 without animation
    this.productCount.style.paddingTop = '0';
  }
};

ProductFinder.prototype.onFiltersFilter = function (filter) {

  switch (filter) {
    case 'samsung_pay':
      // show extended state
      this.showState(CARD_STATES.EXTENDED);

      break;
    case 'gold':
      // Check if already filtered the results, this is temporal
      if (this.cardState === CARD_STATES.EXTENDED) {
        // set extended cards to gold
        this.extendedCards.forEach(function (card) {
          if (card.el.querySelector('.button-swatch[data-color="gold"]')) {
            card.setActiveColor('gold');
          }
        });
      }

      break;
      case 'tv_curved':
      // show extended state
      this.showState(CARD_STATES.EXTENDED);

      break;
      // case 'tv_flat':
      // // show extended state
      // this.showState(CARD_STATES.EXTENDED);

      // break;

  }
};

ProductFinder.prototype.onFiltersUnfilter = function (filter) {
  // show normal state
  this.showState(CARD_STATES.NORMAL);
};

ProductFinder.prototype.onScrollFilters = function () {
  var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  if (Math.abs(scrollTop - this.scrollPositionStart) > FILTER_SCROLL_THRESHOLD) {
    this.filterMenu.accordion.close();
  }
};

ProductFinder.prototype.onScrollAdjustment = function () {
  // remove this scroll listener and add original back
  window.removeEventListener('scroll', this.onScrollAdjustment);
  window.addEventListener('scroll', this.onScrollFiltersThrottled);
};

ProductFinder.prototype.isDesktop = function () {
  var tabButtons = this.el.querySelector('.button-tab[data-tab-id="filters"]');
  return tabButtons.offsetWidth <= 0 && tabButtons.offsetHeight <= 0;
};

ProductFinder.prototype.showState = function (state) {
  var _this2 = this;

  if (state !== this.cardState) {
    (function () {
      var oldView = _this2.cardState === CARD_STATES.NORMAL ? _this2.normalView : _this2.extendedView;
      var newView = _this2.cardState === CARD_STATES.NORMAL ? _this2.extendedView : _this2.normalView;
      var newCards = Array.prototype.slice.call(newView.querySelectorAll('.product-card'));

      // fade out old view
      TweenLite.to(oldView, ANIMATION_TIME, { opacity: 0, ease: Power2.easeOut, onComplete: function onComplete() {
          // swap active classes
          oldView.classList.remove('active');
          newView.classList.add('active');

          // if we're in sticky mode
          if (_this2.el.classList.contains('sticky')) {
            // the filters are in overlay mode but we want the product count and product cards to be underneath filters, so we add extra padding
            _this2.productCount.style.paddingTop = _this2.heightFilterMenu + HEIGHT_FILTER + 'px';

            // stop listening to scroll since we are setting scrollTop
            window.removeEventListener('scroll', _this2.onScrollFiltersThrottled);

            // add new scroll listener just for this scrollTop adjustment so that we don't trigger the original listener, which causes the accordion to close
            window.addEventListener('scroll', function () {
              return _this2.onScrollAdjustment();
            });

            if (document.documentElement.scrollTop) {
              document.documentElement.scrollTop = _this2.filterMenuY;
            } else {
              document.body.scrollTop = _this2.filterMenuY;
            }
          }

          // show normal view
          newView.style.opacity = 1;

          // hide all cards
          newCards.forEach(function (card) {
            card.style.display = 'none';
            card.style.opacity = 0;
          });

          // fade in first card batch
          var cardsToShow = _this2.cardState === CARD_STATES.NORMAL ? _this2.normalCards : _this2.extendedCards;
          _this2.showCards(cardsToShow, 0, BATCH_SIZE);
        } });

      // listen to scroll for load-more functionality if necessary
      if (newCards.length > BATCH_SIZE && state === CARD_STATES.NORMAL) {
        document.querySelector('.body-container').addEventListener('scroll', _this2.onScrollCardsThrottled);
        window.addEventListener('scroll', _this2.onScrollCardsThrottled);
      } else {
        document.querySelector('.body-container').removeEventListener('scroll', _this2.onScrollCardsThrottled);
        window.removeEventListener('scroll', _this2.onScrollCardsThrottled);
      }

      // hide see-all cta
      _this2.buttonSeeAll.classList.add('hide');

      _this2.cardState = state;
    })();
  }
};

// pass negative number as num to show all cards
ProductFinder.prototype.showCards = function (cardArray, startIndex, num) {
  var cards = num < 0 ? cardArray.slice(startIndex) : cardArray.slice(startIndex, startIndex + num);
  cards.forEach(function (card, i) {
    card.el.style.removeProperty('display');
    setTimeout(function () {
      card.el.style.opacity = 1;
      card.positionCta();
    }, i * CARD_STAGGER_TIME);
  });
};

ProductFinder.prototype.onScrollCards = function (evt) {
  var _this3 = this;

  var boundingRect = this.el.getBoundingClientRect();

  // when we scroll past the original set of cards, load more
  if (boundingRect.bottom + 200 < window.innerHeight) {
    // use timeout to simulate load time
    setTimeout(function () {
      // fade in next card batch
      var cards = _this3.cardState === CARD_STATES.NORMAL ? _this3.normalCards : _this3.extendedCards;
      _this3.showCards(cards, BATCH_SIZE, BATCH_SIZE);

      // show see-all cta and update its text
      var numRemaining = cards.length - BATCH_SIZE * 2;
      _this3.buttonSeeAll.innerHTML = 'See all (' + numRemaining + ')';
      _this3.buttonSeeAll.classList.remove('hide');
    }, LOAD_TIME);

    // stop listening to scroll
    document.querySelector('.body-container').removeEventListener('scroll', this.onScrollCardsThrottled);
    window.removeEventListener('scroll', this.onScrollCardsThrottled);
  }
};

ProductFinder.prototype.onClickSeeAll = function (evt) {
  var _this4 = this;

  // hide see-all cta
  this.buttonSeeAll.classList.add('hide');

  // use timeout to simulate load time
  setTimeout(function () {
    // add remaining cards
    var cards = _this4.cardState === CARD_STATES.NORMAL ? _this4.normalCards : _this4.extendedCards;
    _this4.showCards(cards, BATCH_SIZE * 2, -1);
  }, LOAD_TIME);
};

ProductFinder.prototype.onClickButtonTab = function (evt) {
  var tabContentEls = this.el.querySelectorAll('.tab-content');
  var tabButtonEls = this.el.querySelectorAll('.button-tab');
  var activatableEls = Array.prototype.slice.call(tabContentEls).concat(Array.prototype.slice.call(tabButtonEls));
  var tabContent = this.el.querySelector('#' + evt.currentTarget.getAttribute('data-tab-id'));

  // if we clicked an active tab
  if (evt.currentTarget.classList.contains('active')) {
    // close the tab we clicked
    activatableEls.forEach(function (tab) {
      tab.classList.remove('active');
    });

    // close any open accordions within the tab
    this.filterMenu.closeAll();
    // else we clicked an inactive tab
  } else {
      // close any open tab
      activatableEls.forEach(function (tab) {
        tab.classList.remove('active');
      });

      // open tab we clicked
      tabContent.classList.add('active');
      evt.currentTarget.classList.add('active');

      // scroll page
      TweenLite.to(document.querySelector('.body-container'), ANIMATION_TIME, { scrollTop: this.el.offsetTop, ease: Power2.easeOut });
    }

  evt.preventDefault();
};

exports.default = ProductFinder;

},{"../product-cards/product-card":36,"./filter-menu/filter-menu":37,"lodash.throttle":18}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _carousel = require('./../carousel/carousel');

var _carousel2 = _interopRequireDefault(_carousel);

var _support = require('./../../shared/support');

var _support2 = _interopRequireDefault(_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ACTIVE_COPY_CLASSNAME = 'is-active';
var ANIMATING_CLASSNAME = 'animating';

var RecentlyViewed = function (_Carousel) {
  _inherits(RecentlyViewed, _Carousel);

  function RecentlyViewed(el) {
    _classCallCheck(this, RecentlyViewed);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(RecentlyViewed).call(this, el));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.itemsInDom = _this.el.querySelectorAll('.viewed-carousel-copy-item');

    if (_this.itemsInDom.length > 0) {
      _this.itemsInDom[0].classList.add(ACTIVE_COPY_CLASSNAME);
    }
    _this.removeAnimationEvent();

    _this.el.addEventListener('click', function (evt) {
      _this.shiftEvent(evt);
    });
    return _this;
  }

  _createClass(RecentlyViewed, [{
    key: 'updateHeight',
    value: function updateHeight() {
      return false;
    }
  }, {
    key: 'shiftEvent',
    value: function shiftEvent(evt) {
      if (document.body.clientWidth - evt.clientX < 75) {
        this.shiftRight();
      } else if (evt.clientX < 75) {
        this.shiftLeft();
      }
    }
  }, {
    key: 'removeAnimationEvent',
    value: function removeAnimationEvent() {
      var items = Array.prototype.slice.call(this.itemsInDom, 0);
      var transitionEndName = _support2.default.transitionEnd();

      items.forEach(function (item) {
        var _this2 = this;

        item.addEventListener(transitionEndName, function () {
          _this2.el.classList.remove(ANIMATING_CLASSNAME);
        }, false);
      }.bind(this));
    }
  }, {
    key: 'updateCopy',
    value: function updateCopy() {
      var items = Array.prototype.slice.call(this.itemsInDom, 0);

      this.el.classList.add(ANIMATING_CLASSNAME);

      items.forEach(function (item, idx) {
        if (this.activeItem === idx) {
          item.classList.add(ACTIVE_COPY_CLASSNAME);
        } else {
          item.classList.remove(ACTIVE_COPY_CLASSNAME);
        }
      }.bind(this));
    }
  }, {
    key: 'emitChangedState',
    value: function emitChangedState() {
      this.updateCopy();

      _get(Object.getPrototypeOf(RecentlyViewed.prototype), 'emitChangedState', this).call(this);
    }
  }, {
    key: 'emitChangedStateDirectly',
    value: function emitChangedStateDirectly() {
      this.updateCopy();

      _get(Object.getPrototypeOf(RecentlyViewed.prototype), 'emitChangedStateDirectly', this).call(this);
    }
  }]);

  return RecentlyViewed;
}(_carousel2.default);

exports.default = RecentlyViewed;

},{"./../../shared/support":49,"./../carousel/carousel":29}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var SLIDE_LENGTH = 101;
var SPRITE_LENGTH = 25;
var PRELOAD = 6;
var SCROLL_INTERVAL = 65;
var COPY_END_SLIDE = 24;

var ScrollingOverride = function ScrollingOverride(el) {
  var _this = this;

  if (!el) {
    return;
  }

  this.el = el;
  this.scrollBox = this.el.querySelector('.scrolling-override');
  this.scrollItem = this.scrollBox.querySelector('.scrolling-override-item');
  this.imageHolder = el.querySelector('img');
  this.copyHolder = el.querySelector('.scrolling-copy');

  this.cachedImages = [];

  this.currentPosition = 1;

  if (this.imageHolder.complete) {
    setTimeout(function () {
      _this.loaded();
    }, 1000);
  } else {
    this.imageHolder.addEventListener('load', function () {
      setTimeout(function () {
        _this.loaded(_this);
      }, 1000);
    });
  }
};

ScrollingOverride.prototype.loaded = function () {
  var _this2 = this;

  this.scrollBoxRect = this.scrollBox.getBoundingClientRect();
  this.bodyRect = document.body.getBoundingClientRect();
  this.setupHeights();
  this.scrollHeight = this.scrollBox.clientHeight * SLIDE_LENGTH / SCROLL_INTERVAL;
  this.el.style.height = this.individualImageHeight * 2 + this.scrollHeight + 'px';
  this.placement = this.scrollBoxRect.top - this.bodyRect.top;

  window.addEventListener('scroll', function () {
    return _this2.scrollHandler();
  });
};

ScrollingOverride.prototype.scrollHandler = function () {
  if (!this.scrollBoxRect) {
    return;
  }

  var scrollPosition = document.body.scrollTop || document.documentElement.scrollTop;

  // at the beginning
  if (scrollPosition > this.placement) {
    // add active
    this.scrollBox.classList.add('is-active');
  } else {
    this.scrollBox.classList.remove('is-active');
  }

  // at the end
  if (scrollPosition > this.placement + this.scrollHeight + 600) {
    this.scrollBox.classList.add('is-active-bottom');
  } else {
    this.scrollBox.classList.remove('is-active-bottom');
  }

  var position = Math.round((scrollPosition - this.placement) / (this.scrollHeight / SCROLL_INTERVAL)) || 1;

  if (position > 0 && position < SLIDE_LENGTH + 1) {
    this.scrollItem.style['-ms-transform'] = 'translateY(-' + position * this.individualImageHeight + 'px)';
    this.scrollItem.style['-webkit-transform'] = 'translateY(-' + position * this.individualImageHeight + 'px)';
    this.scrollItem.style.transform = 'translateY(-' + position * this.individualImageHeight + 'px)';
  } else {
    // outside of module
    if (scrollPosition < this.scrollBoxRect.top - this.bodyRect.top + 100) {
      this.scrollItem.style['-ms-transform'] = 'translateY(0)';
      this.scrollItem.style['-webkit-transform'] = 'translateY(0)';
      this.scrollItem.style.transform = 'translateY(0)';
    } else {
      this.scrollItem.style['-ms-transform'] = 'translateY(-' + SLIDE_LENGTH * this.individualImageHeight + 'px)';
      this.scrollItem.style['-webkit-transform'] = 'translateY(-' + SLIDE_LENGTH * this.individualImageHeight + 'px)';
      this.scrollItem.style.transform = 'translateY(-' + SLIDE_LENGTH * this.individualImageHeight + 'px)';
    }
  }

  // copy
  if (position > 1) {
    this.copyHolder.classList.remove('is-inactive-top');
    this.copyHolder.classList.remove('is-inactive-bottom');
  }

  if (position > COPY_END_SLIDE) {
    this.copyHolder.classList.add('is-inactive-bottom');
  }

  if (position < 1) {
    this.copyHolder.classList.add('is-inactive-top');
  }
};

ScrollingOverride.prototype.preloadImages = function () {
  var imagesToCache = [];

  for (var i = 1; i < PRELOAD; i++) {
    this.cachedImages.push(true);
    imagesToCache.push('assets/scroll/result-sprite' + i + '.png');
  }

  this.loadImagesIntoCache(imagesToCache);
};

ScrollingOverride.prototype.loadImagesIntoCache = function (images) {
  if (!images) {
    return;
  }

  images.forEach(function (image) {
    var imageHolder = new Image();
    imageHolder.src = image;
  });
};

ScrollingOverride.prototype.setupHeights = function () {
  this.individualImageHeight = this.imageHolder.clientHeight / SPRITE_LENGTH;

  this.scrollBox.style.height = this.individualImageHeight + 'px';
};

exports.default = ScrollingOverride;

},{}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* based on https://github.com/heartcode/360-Image-Slider */

var DRAG_THROTTLE = 50;
var EASING_360 = .1;
var EASING_360_INTRO = .03;

var Selector360Image = function (_EventEmitter) {
  _inherits(Selector360Image, _EventEmitter);

  function Selector360Image(el) {
    _classCallCheck(this, Selector360Image);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Selector360Image).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    // defaults
    _this.el = el;
    _this.numLoaded = 0;
    _this.imageSources = [];
    _this.pointerStartPosX = 0;
    _this.pointerEndPosX = 0;
    _this.ticker = 0;
    _this.speedMultiplier = 10;
    _this.currentFrame = 0;
    _this.endFrame = 0;
    _this.frames = [];
    _this.easing = EASING_360_INTRO;
    _this.imageContainer = _this.el.querySelector('.selector-360-images');

    // values from data attributes
    _this.base = _this.el.getAttribute('data-base');
    _this.filename = _this.el.getAttribute('data-filename');
    _this.extension = _this.el.getAttribute('data-extension');
    _this.totalFrames = parseInt(_this.el.getAttribute('data-num-images'));

    // event handler binding
    _this.onMouseDown = _this.onMouseDown.bind(_this);
    _this.onMouseUp = _this.onMouseUp.bind(_this);
    _this.onMouseMoveThrottled = (0, _lodash2.default)(function (evt) {
      return _this.onMouseMove(evt);
    }, DRAG_THROTTLE);

    // set up image source array
    for (var i = 0; i < _this.totalFrames; i++) {
      var prefix = i < 10 ? '0' : '';
      _this.imageSources.push(_this.base + '/' + _this.filename + prefix + i + '.' + _this.extension);
    }

    // start image preload
    _this.load();
    return _this;
  }

  _createClass(Selector360Image, [{
    key: 'load',
    value: function load() {
      for (var i = 0; i < this.totalFrames; i++) {
        this.loadImage(this.imageSources[i]);
      }
    }
  }, {
    key: 'loadImage',
    value: function loadImage(src) {
      var _this2 = this;

      var image = new Image();
      image.onload = function () {
        _this2.numLoaded++;

        if (_this2.numLoaded === _this2.totalFrames) {
          _this2.onLoaded();
        }
      };
      image.onerror = function () {
        console.log('error loading image ', src);
      };
      image.src = src;
    }
  }, {
    key: 'onLoaded',
    value: function onLoaded() {
      // insert images into dom
      for (var i = 0; i < this.imageSources.length; i++) {
        var div = document.createElement('div');
        var imageClass = i === 0 ? 'current-image' : 'previous-image';
        div.innerHTML = '<img src="' + this.imageSources[i] + '" class="' + imageClass + '">';
        this.imageContainer.insertBefore(div, null);
        this.frames.push(div.querySelector('img'));
      }

      // reverse frames array so animation goes in the right direction
      this.frames.reverse();

      // hide loader and show images
      this.el.querySelector('.loader').classList.remove('active');
      this.imageContainer.style.opacity = 1;

      this.emit('selector360:loaded');
    }
  }, {
    key: 'start',
    value: function start(doIntro) {
      var _this3 = this;

      if (doIntro) {
        // start refresh timer for intro animation after initial delay
        setTimeout(function () {
          _this3.endFrame = 89;
          _this3.refresh();
          _this3.enableControls();
          _this3.emit('selector360:intro-played');
        }, 300);
      } else {
        this.enableControls();
      }
    }
  }, {
    key: 'stop',
    value: function stop() {
      this.disableControls();
      this.el.classList.remove('active');
    }
  }, {
    key: 'enableControls',
    value: function enableControls() {
      this.el.addEventListener('mousedown', this.onMouseDown);
      this.el.addEventListener('touchstart', this.onMouseDown);
      document.body.addEventListener('mouseup', this.onMouseUp);
      document.body.addEventListener('touchend', this.onMouseUp);
      this.emit('selector360:activated');
    }
  }, {
    key: 'disableControls',
    value: function disableControls() {
      this.el.removeEventListener('mousedown', this.onMouseDown);
      this.el.removeEventListener('touchstart', this.onMouseDown);
      document.body.removeEventListener('mouseup', this.onMouseUp);
      document.body.removeEventListener('touchend', this.onMouseUp);
      this.emit('selector360:deactivated');
    }
  }, {
    key: 'onMouseDown',
    value: function onMouseDown(event) {
      this.el.addEventListener('mousemove', this.onMouseMoveThrottled);
      this.el.addEventListener('touchmove', this.onMouseMoveThrottled);
      this.el.classList.add('mouse-down');

      event.preventDefault();
      this.pointerStartPosX = event.pageX;
    }
  }, {
    key: 'onMouseUp',
    value: function onMouseUp(event) {
      this.el.removeEventListener('mousemove', this.onMouseMoveThrottled);
      this.el.removeEventListener('touchmove', this.onMouseMoveThrottled);
      this.el.classList.remove('mouse-down');

      event.preventDefault();
    }

    /**
    * Tracks the pointer X position changes and calculates the endFrame for the image slider frame animation.
    */

  }, {
    key: 'onMouseMove',
    value: function onMouseMove(event) {
      event.preventDefault();

      this.pointerEndPosX = event.pageX;
      var pointerDistance = this.pointerEndPosX - this.pointerStartPosX;

      // Calculates the endFrame using the distance between the pointer X starting and ending positions and the "speedMultiplier" values
      this.endFrame = this.currentFrame + Math.ceil((this.totalFrames - 1) * this.speedMultiplier * (pointerDistance / this.el.getBoundingClientRect().width));

      // Updates the image slider frame animation
      this.refresh();

      // Stores the the pointer X position as the starting position (because we started a new tracking period)
      this.pointerStartPosX = event.pageX;
    }

    /**
    * Creates a new setInterval and stores it in the "ticker" using 60 FPS
    */

  }, {
    key: 'refresh',
    value: function refresh() {
      var _this4 = this;

      // create new ticker if necessary
      if (this.ticker === 0) {
        this.ticker = setInterval(function () {
          return _this4.render();
        }, Math.round(1000 / 60));
      }
    }
  }, {
    key: 'render',


    /**
    * Renders the image slider frame animations.
    */
    value: function render() {
      // The rendering function only runs if the currentFrame value hasn't reached the endFrame one
      if (this.currentFrame !== this.endFrame) {
        /*
          Calculates 10% of the distance between the currentFrame and the endFrame.
          By adding only 10% we get a nice smooth and eased animation.
          If the distance is a positive number, we have to ceil the value, if its a negative number, we have to floor it to make sure
          that the currentFrame value surely reaches the endFrame value and the rendering doesn't end up in an infinite loop.
        */
        var frameEasing = this.endFrame < this.currentFrame ? Math.floor((this.endFrame - this.currentFrame) * this.easing) : Math.ceil((this.endFrame - this.currentFrame) * this.easing);

        this.setFrame(this.currentFrame + frameEasing);
      } else {
        // If the rendering can stop, we stop and clear the ticker
        window.clearInterval(this.ticker);
        this.ticker = 0;

        this.emit('selector360:reached-frame', {
          frame: this.currentFrame,
          target: this
        });

        this.easing = EASING_360;
      }
    }
  }, {
    key: 'hideFrame',
    value: function hideFrame(frameIndex) {
      if (this.frames[frameIndex]) {
        this.frames[frameIndex].classList.remove('current-image');
        this.frames[frameIndex].classList.add("previous-image");
      }
    }
  }, {
    key: 'showFrame',
    value: function showFrame(frameIndex) {
      if (this.frames[frameIndex]) {
        this.frames[frameIndex].classList.add('current-image');
        this.frames[frameIndex].classList.remove("previous-image");
      }
    }
  }, {
    key: 'setFrame',
    value: function setFrame(frame) {
      this.hideFrame(this.getNormalizedFrame(this.currentFrame));
      this.currentFrame = frame;
      this.showFrame(this.getNormalizedFrame(this.currentFrame));
    }

    /**
    * Returns the currentFrame value translated to a value inside the range of (0 - totalFrames)
    */

  }, {
    key: 'getNormalizedFrame',
    value: function getNormalizedFrame(frame) {

      var c = -Math.ceil(frame % this.totalFrames);
      if (c < 0) {
        c += this.totalFrames - 1;
      }
      return c;
    }
  }]);

  return Selector360Image;
}(_events.EventEmitter);

exports.default = Selector360Image;

},{"events":1,"lodash.throttle":18}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var VIDEO_DELAY = 300;
var DRAG_THROTTLE = 50;

var Selector360Video = function (_EventEmitter) {
  _inherits(Selector360Video, _EventEmitter);

  function Selector360Video(el) {
    _classCallCheck(this, Selector360Video);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Selector360Video).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.video = _this.el.querySelector('video');
    _this.loaded = false;

    _this.onVideoEnded = _this.onVideoEnded.bind(_this);
    _this.onMouseDown = _this.onMouseDown.bind(_this);
    _this.onMouseUp = _this.onMouseUp.bind(_this);
    _this.onDragThrottled = (0, _lodash2.default)(function (evt) {
      return _this.onDrag(evt);
    }, DRAG_THROTTLE);

    _this.setUpVideo();
    return _this;
  }

  _createClass(Selector360Video, [{
    key: 'setUpVideo',
    value: function setUpVideo() {
      var _this2 = this;

      var videoSrc = this.video.getAttribute('data-src-mov');
      var xhr = new XMLHttpRequest();
      xhr.open('GET', videoSrc, true);
      xhr.responseType = 'blob';
      xhr.onload = function (evt) {
        var blob = new Blob([evt.target.response], { type: 'video/mov' });
        _this2.video.addEventListener('error', function (err) {
          console.log('err: ', err);
        });
        _this2.video.src = URL.createObjectURL(blob);
        _this2.onVideoLoaded();
      };
      xhr.onerror = function (evt) {
        console.log('error loading 360 video');
      };
      xhr.send();
    }
  }, {
    key: 'start',
    value: function start() {
      var _this3 = this;

      // start video after delay
      setTimeout(function () {
        _this3.video.addEventListener('ended', _this3.onVideoEnded);
        _this3.video.play();
      }, VIDEO_DELAY);
    }
  }, {
    key: 'stop',
    value: function stop() {
      this.video.pause();
      this.video.currentTime = 0;
      this.video.removeEventListener('ended', this.onVideoEnded);
      this.video.removeEventListener('mousedown', this.onMouseDown);
      document.body.removeEventListener('mouseup', this.onMouseUp);

      this.el.classList.remove('active');

      this.emit('selector360:deactivated');
    }
  }, {
    key: 'onVideoLoaded',
    value: function onVideoLoaded() {
      this.loaded = true;
      this.emit('selector360:loaded');
    }
  }, {
    key: 'onVideoEnded',
    value: function onVideoEnded() {
      this.video.removeEventListener('ended', this.onVideoEnded);
      this.video.currentTime = 0;

      // enable 360 controls
      this.video.addEventListener('mousedown', this.onMouseDown);
      document.body.addEventListener('mouseup', this.onMouseUp);

      this.el.classList.add('active');

      this.emit('selector360:activated');
    }
  }, {
    key: 'onMouseDown',
    value: function onMouseDown() {
      this.video.addEventListener('mousemove', this.onDragThrottled);
      this.el.classList.add('mouse-down');
    }
  }, {
    key: 'onMouseUp',
    value: function onMouseUp() {
      this.video.removeEventListener('mousemove', this.onDragThrottled);
      this.el.classList.remove('mouse-down');
    }
  }, {
    key: 'onDrag',
    value: function onDrag(evt) {
      var timeChange = evt.movementX * .05;
      var newTime = this.video.currentTime + timeChange;
      this.video.currentTime = newTime < 0 ? this.video.duration + newTime : newTime % this.video.duration;
    }
  }]);

  return Selector360Video;
}(_events.EventEmitter);

exports.default = Selector360Video;

},{"events":1,"lodash.throttle":18}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var breakpoints = require('../../../layout/breakpoints');

var ANIMATION_SPEED = 525;
var MIN_ANIMATION_TIME = .2;

var SelectorFacet = function () {
  function SelectorFacet(selector, el, data) {
    var _this = this;

    _classCallCheck(this, SelectorFacet);

    if (!el) {
      return;
    }

    this.selector = selector;

    this.el = el;
    this.labelEl = el.querySelector('.label');
    this.label = this.labelEl.innerHTML;
    this.valuesEl = el.querySelector('.values');
    this.allValuesEls = Array.prototype.slice.call(this.valuesEl.querySelectorAll('.value'), 0);
    this.editEl = el.querySelector('.edit');
    this.toggleEl = this.el.querySelector('.facet-toggle');

    this.dimension = data.dimension;
    this.isToggleable = data.isToggleable === 'false' ? false : true;
    this.currentValue = data.currentValue;
    this.available = data.available;
    this.hasValue = false;

    this.valuesAreActive = false;

    el.addEventListener('click', this.handleClicks.bind(this));

    // select initial color value
    if (!this.isToggleable) {
      this.allValuesEls.map(function (el, index) {
        if (el.getAttribute('data-value') === this.currentValue) {
          el.click();
        }
      }.bind(this));
    }

    // listen to open event of all facets
    this.selector.on('facet:activate', function (dimension) {
      // close if this isn't the newly opened facet
      if (dimension !== _this.dimension) {
        _this.setInactive();
      }
    });

    if (this.available) {
      this.el.classList.add(this.availableClass);
    }

    // set price increase/decrease note text in any values that need them
    Array.prototype.slice.call(this.el.querySelectorAll('.values .value [data-price-change]')).forEach(function (valueEl) {
      var priceChange = valueEl.getAttribute('data-price-change');
      var prefix = parseInt(priceChange) < 0 ? '-' : '+';
      priceChange = priceChange.replace('-', '');
      valueEl.innerHTML = prefix + '$' + priceChange;
    });
  }

  _createClass(SelectorFacet, [{
    key: 'handleClicks',
    value: function handleClicks(e) {
      var handleLabelClick = function () {
        if (this.available && (this.isToggleable || breakpoints.current === 'sm')) {
          if (!this.valuesAreActive) {
            this.setActive();
          } else {
            this.setInactive();
          }
        }
      }.bind(this);

      var handleValueClick = function (e) {
        var _this2 = this;

        var valueEl = e.target.classList.contains('value') ? e.target : e.target.parentNode;

        if (!valueEl.classList.contains('disabled')) {
          // show clicked value as selected
          this.allValuesEls.map(function (el, index) {
            el.classList.remove(this.selectedValueClass);
          }.bind(this));
          valueEl.classList.add(this.selectedValueClass);

          this.labelEl.textContent = valueEl.getAttribute('data-label'); // update facet label as needed
          this.el.classList.add(this.selectedFacetClass);
          this.hasValue = true;
          this.currentValue = valueEl.getAttribute('data-value');

          // if this is a value with a price increase, show price decrease on other values
          if (valueEl.querySelector('[data-price-change]')) {
            (function () {
              var priceChange = valueEl.querySelector('[data-price-change]').getAttribute('data-price-change');
              var prefix = parseInt(priceChange) < 0 ? '+' : '-';
              priceChange = priceChange.replace('-', '');

              _this2.allValuesEls.forEach(function (el) {
                if (el !== valueEl) {
                  el.querySelector('.price-change').innerHTML = prefix + '$' + priceChange;
                }
              });
            })();
          } else {
            this.allValuesEls.forEach(function (el) {
              if (!el.querySelector('[data-price-change]') && el.querySelector('span')) {
                el.querySelector('span').innerHTML = '';
              }
            });
          }

          this.selector.emit('facet:change', this);
        }
      }.bind(this);

      e.preventDefault();
      e.stopPropagation();

      // handle label click
      if (e.target.classList.contains('facet-toggle') || e.target.classList.contains('label') || e.target.classList.contains('edit')) {
        handleLabelClick();
      }

      // handle click on value
      if (e.target.classList.contains('value') || e.target.parentNode.classList.contains('value')) {
        handleValueClick(e);
      }
    }
  }, {
    key: 'setActive',
    value: function setActive() {
      this.el.classList.add(this.activeValuesClass);
      this.valuesAreActive = true;
      this.setAvailable();
      this.toggleEl.removeAttribute('title');
      if (this.isToggleable || breakpoints.current === 'sm') {
        this.selector.emit('facet:activate', this.dimension);
      }

      this.valuesEl.style.height = 'auto';
      var animationTime = this.animationTimeForDistance(parseInt(window.getComputedStyle(this.valuesEl).height));
      TweenLite.from(this.valuesEl, animationTime, { height: 0 });
    }
  }, {
    key: 'setInactive',
    value: function setInactive() {
      this.el.classList.remove(this.activeValuesClass);
      this.valuesAreActive = false;

      var animationTime = this.animationTimeForDistance(parseInt(window.getComputedStyle(this.valuesEl).height));
      TweenLite.to(this.valuesEl, animationTime, { height: 0 });
    }
  }, {
    key: 'setAvailable',
    value: function setAvailable() {
      this.el.classList.add(this.availableClass);
      this.available = true;
    }
  }, {
    key: 'setUnavailable',
    value: function setUnavailable() {
      this.el.classList.remove(this.availableClass);
      this.available = false;
    }
  }, {
    key: 'setDependencyName',
    value: function setDependencyName(name) {
      this.toggleEl.setAttribute('title', 'Please select a ' + name);
    }
  }, {
    key: 'disableValue',
    value: function disableValue(value, dependencyName) {
      var valueEl = this.el.querySelector('.value[data-value="' + value + '"]');
      valueEl.classList.add('disabled');
      valueEl.setAttribute('title', 'Not available for selected ' + dependencyName);
    }
  }, {
    key: 'enableValue',
    value: function enableValue(value) {
      var valueEl = this.el.querySelector('.value[data-value="' + value + '"]');
      valueEl.classList.remove(this.disabledClass);
      valueEl.removeAttribute('title');
    }
  }, {
    key: 'clearSelection',
    value: function clearSelection() {
      this.allValuesEls.map(function (el, index) {
        el.classList.remove(this.selectedValueClass);
      }.bind(this));

      this.labelEl.innerHTML = this.label; // reset facet label
      this.el.classList.remove(this.selectedFacetClass);
      this.hasValue = false;
      this.currentValue = null;
      this.setUnavailable();
    }
  }, {
    key: 'animationTimeForDistance',
    value: function animationTimeForDistance(distance) {
      return Math.max(distance / ANIMATION_SPEED, MIN_ANIMATION_TIME);
    }
  }]);

  return SelectorFacet;
}();

SelectorFacet.prototype.initializedFacetClass = 'initialized';
SelectorFacet.prototype.activeValuesClass = 'active'; // facet is toggled open
SelectorFacet.prototype.hideClass = 'hide';
SelectorFacet.prototype.selectedValueClass = 'selected';
SelectorFacet.prototype.availableClass = 'available'; // facet is togglable, ie the previous facet has a value selected
SelectorFacet.prototype.selectedFacetClass = 'selected'; // facet has a value selected
SelectorFacet.prototype.disabledClass = 'disabled'; // facet value can't be selected

exports.default = SelectorFacet;

},{"../../../layout/breakpoints":25}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _selector360Video = require('../selector-360/selector-360-video');

var _selector360Video2 = _interopRequireDefault(_selector360Video);

var _selector360Image = require('../selector-360/selector-360-image');

var _selector360Image2 = _interopRequireDefault(_selector360Image);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SelectorMainImage = function (_EventEmitter) {
  _inherits(SelectorMainImage, _EventEmitter);

  function SelectorMainImage(selector, index, color, el, isActive) {
    _classCallCheck(this, SelectorMainImage);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SelectorMainImage).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.index = index;
    _this.color = color;
    _this.el = el;
    _this.isActive = isActive;
    _this.selector360 = null;
    _this.selector360Label = null;
    _this.needs360Intro = true;

    selector.on('active-property:change', function (_ref) {
      var activeImageIndex = _ref.activeImageIndex;
      var activeColor = _ref.activeColor;

      _this.handleActiveChange(activeImageIndex, activeColor);
    });

    _this.setUp360();
    return _this;
  }

  _createClass(SelectorMainImage, [{
    key: 'setUp360',
    value: function setUp360() {
      var _this2 = this;

      var selector360 = this.el.querySelector('.selector-360');
      if (selector360) {
        this.selector360 = new _selector360Image2.default(selector360);
        this.selector360Label = this.el.querySelector('.selector-360-label');

        this.selector360.on('selector360:activated', function () {
          _this2.selector360Label.classList.add('active');
        });

        this.selector360.on('selector360:deactivated', function () {
          _this2.selector360Label.classList.remove('active');
        });

        this.selector360.on('selector360:intro-played', function () {
          _this2.emit('selector-main-image:intro-played');
        });

        this.selector360.on('selector360:reached-frame', function (data) {
          _this2.emit('selector-main-image:reached-frame', {
            target: _this2,
            frame: data.frame
          });
        });
      }
    }
  }, {
    key: 'handleActiveChange',
    value: function handleActiveChange(activeImageIndex, activeColor) {
      if (activeImageIndex === this.index && activeColor === this.color) {
        this.addActive();
      } else if (this.isActive) {
        this.removeActive();
      }

      // reset 360 to first frame
      if (activeImageIndex !== this.index && this.selector360) {
        this.selector360.setFrame(0);
      }
    }
  }, {
    key: 'addActive',
    value: function addActive() {
      this.el.classList.add(this.activeClass);
      this.isActive = true;

      if (this.selector360) {
        this.selector360.start(this.needs360Intro);
      }
    }
  }, {
    key: 'removeActive',
    value: function removeActive() {
      this.el.classList.remove(this.activeClass);
      this.isActive = false;

      if (this.selector360) {
        this.selector360.stop();
      }
    }
  }]);

  return SelectorMainImage;
}(_events.EventEmitter);

SelectorMainImage.prototype.activeClass = 'active';

exports.default = SelectorMainImage;

},{"../selector-360/selector-360-image":41,"../selector-360/selector-360-video":42,"events":1}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SelectorThumbnailImage = function () {
  function SelectorThumbnailImage(selector, index, el, isActive) {
    var _this = this;

    _classCallCheck(this, SelectorThumbnailImage);

    if (!el) {
      return;
    }

    this.selector = selector;
    this.index = index;
    this.img = el.querySelector('img');
    this.isActive = isActive;

    if (el.getAttribute('data-is-not-clickable') === 'false') {
      el.addEventListener('click', this.handleImageClick.bind(this));
    }

    this.selector.on('active-image:change', function (thumbnailImageIndex) {
      if (thumbnailImageIndex === _this.index) {
        _this.img.src = _this.img.getAttribute('data-src-on');
        _this.isActive = true;
      } else {
        _this.img.src = _this.img.getAttribute('data-src-off');
        _this.isActive = false;
      }
    });
  }

  _createClass(SelectorThumbnailImage, [{
    key: 'handleImageClick',
    value: function handleImageClick() {
      this.selector.emit('active-image:change', this.index);
    }
  }]);

  return SelectorThumbnailImage;
}();

SelectorThumbnailImage.prototype.activeClass = 'active';

exports.default = SelectorThumbnailImage;

},{}],46:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _selectorThumbnailImage = require('./selector-thumbnail-image/selector-thumbnail-image');

var _selectorThumbnailImage2 = _interopRequireDefault(_selectorThumbnailImage);

var _selectorMainImage = require('./selector-main-image/selector-main-image');

var _selectorMainImage2 = _interopRequireDefault(_selectorMainImage);

var _selectorFacet = require('./selector-facet/selector-facet');

var _selectorFacet2 = _interopRequireDefault(_selectorFacet);

var _anchorNav = require('../anchor-nav/anchor-nav');

var _anchorNav2 = _interopRequireDefault(_anchorNav);

var _support = require('../../shared/support');

var _support2 = _interopRequireDefault(_support);

var _carousel = require('../carousel/carousel');

var _carousel2 = _interopRequireDefault(_carousel);

var _lodash = require('lodash.throttle');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RESIZE_THROTTLE = 20;

var Selector = function (_EventEmitter) {
  _inherits(Selector, _EventEmitter);

  function Selector(el) {
    _classCallCheck(this, Selector);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Selector).call(this));

    if (!el) {
      return _possibleConstructorReturn(_this);
    }

    _this.el = el;
    _this.totalAndCtaEl = _this.el.querySelector('.total-cta');
    _this.skuEls = Array.prototype.slice.call(_this.el.querySelectorAll('[data-sku]'));
    _this.priceLabelEl = _this.totalAndCtaEl.querySelector('.label');
    _this.costEl = _this.totalAndCtaEl.querySelector('.cost');
    _this.addToCartBtn = _this.el.querySelector('.total-cta .button');
    _this.carouselData = {};
    _this.mainImages = [];
    _this.compareText = _this.el.querySelector('.button-add-compare .card-cta-text').innerHTML;
    _this.compareTextSelected = 'Added to Compare';
    _this.wishlistText = _this.el.querySelector('.button-add-wishlist .card-cta-text').innerHTML;
    _this.wishlistTextSelected = 'Added to Wishlist';
    _this.anchorNav = new _anchorNav2.default(document.querySelector('.anchor-nav'));

    // set active color to query param if it's a valid color, otherwise set to first available color
    var availableColors = Array.prototype.slice.call(_this.el.querySelectorAll('.facet.color .value'));
    availableColors = availableColors.map(function (el) {
      return el.getAttribute('data-value');
    });
    if (availableColors.length > 0) {
      var colorVar = _support2.default.getQueryVariable('color');
      _this.activeColor = colorVar && availableColors.indexOf(colorVar) >= 0 ? colorVar : availableColors[0];
    } else {
      _this.activeColor = 'black';
    }

    // defaults
    _this.activeImageIndex = 0;
    _this.facetValues = {
      'color': _this.activeColor,
      'carrier': '',
      'memory': ''
    };
    _this.areTotalAndCtaActivated = false;
    _this.hasBeenAddedToCart = false;

    _this.getThumbnailImages();
    _this.getMainImages();
    _this.getFacets();
    _this.positionCta();
    _this.bindEventHandlers();

    _this.updateMainImage();
    _this.updateThumbnails();
    _this.updateCarousel(null, _this.activeColor);
    _this.emit('active-image:change', _this.activeImageIndex);
    _this.emit('active-color:change', _this.activeColor);
    return _this;
  }

  _createClass(Selector, [{
    key: 'getThumbnailImages',
    value: function getThumbnailImages() {
      var _this2 = this;

      Array.prototype.slice.call(this.el.querySelectorAll('.thumbnail-color')).forEach(function (thumbnailColor, index) {
        if (index === _this2.activeImageIndex) {
          thumbnailColor.classList.add('active');
        }

        Array.prototype.slice.call(thumbnailColor.querySelectorAll('.thumbnail-image')).forEach(function (thumbnailImageEl, index) {
          new _selectorThumbnailImage2.default(_this2, index, thumbnailImageEl, index === _this2.activeImageIndex);
        });
      });
    }
  }, {
    key: 'getMainImages',
    value: function getMainImages() {
      var _this3 = this;

      var mainImageContainers = this.el.querySelectorAll('.main-image-color');
      mainImageContainers = Array.prototype.slice.call(mainImageContainers, 0);

      mainImageContainers.map(function (el, index) {
        var mainImageEls = el.querySelectorAll('.main-image');
        mainImageEls = Array.prototype.slice.call(mainImageEls, 0);

        this.mainImages = this.mainImages.concat(mainImageEls.map(function (el2, index2) {
          var mainImage = new _selectorMainImage2.default(this, index2, el2.getAttribute('data-color'), el2, index2 === this.activeImageIndex);
          return mainImage;
        }.bind(this)));
      }.bind(this));

      this.mainImages.forEach(function (mainImage) {
        // set property on all mainImages when one of their intros plays
        mainImage.on('selector-main-image:intro-played', function () {
          _this3.mainImages.forEach(function (image) {
            image.needs360Intro = false;
          });
        });

        // keep 360s in sync
        mainImage.on('selector-main-image:reached-frame', function (data) {
          _this3.mainImages.forEach(function (image) {
            if (image !== data.target && image.selector360) {
              image.selector360.setFrame(data.frame);
            }
          });
        });
      });

      // instantiate carousel for mobile
      var carouselEls = this.el.querySelectorAll('.carousel');
      Array.prototype.slice.call(carouselEls).forEach(function (carouselEl) {
        _this3.carouselData[carouselEl.getAttribute('data-color')] = {
          'carousel': new _carousel2.default(carouselEl),
          'el': carouselEl
        };
      });

      // bind onCarouselStateChange to this context
      this.onCarouselStateChange = this.onCarouselStateChange.bind(this);
    }
  }, {
    key: 'getFacets',
    value: function getFacets() {
      var _this4 = this;

      var facetEls = this.el.querySelectorAll('.facet');
      facetEls = Array.prototype.slice.call(facetEls, 0);
      this.facets = facetEls.map(function (el, index) {
        return new _selectorFacet2.default(this, el, {
          currentValue: this.facetValues[el.getAttribute('data-dimension')],
          dimension: el.getAttribute('data-dimension'),
          isToggleable: el.getAttribute('data-is-toggleable'),
          labelIsValue: el.getAttribute('data-label-is-value'),
          hideValueLabel: el.getAttribute('data-hide-value-label'),
          available: index <= 1
        });
      }.bind(this));

      // set dependency name for each facet to dimension name of previous facet
      this.facets.forEach(function (facet, index) {
        if (!facet.available && index !== 0) {
          facet.setDependencyName(_this4.facets[index - 1].dimension);
        }
      });

      // open first facet
      if (this.facets.length > 0) {
        this.facets[0].setActive();
      }
    }
  }, {
    key: 'bindEventHandlers',
    value: function bindEventHandlers() {
      var _this5 = this;

      this.addToCartBtn.addEventListener('click', this.addToCart.bind(this));

      this.on('active-image:change', function (thumbnailImageIndex) {
        _this5.activeImageIndex = thumbnailImageIndex;
        _this5.updateMainImage();
        _this5.updateThumbnails();
      });

      this.on('facet:change', function (facet) {
        if (facet.dimension === 'color') {
          var oldActiveColor = _this5.activeColor;
          _this5.activeColor = facet.currentValue;
          _this5.updateMainImage();
          _this5.updateThumbnails();
          _this5.updateCarousel(oldActiveColor, _this5.activeColor);
        } else {
          // close facet after small delay so we can see the selected outline change before the collapse animation
          setTimeout(function () {
            facet.setInactive();
          }, 140);
        }

        // expand next facet if it exists
        var facetIndex = _this5.facets.indexOf(facet);
        if (_this5.facets.length > facetIndex + 1) {
          var nextFacet = _this5.facets[facetIndex + 1];
          if (!nextFacet.valuesAreActive && !nextFacet.hasValue) {
            nextFacet.setActive();
          }
        }

        // handle special case: gold color doesn't support T-Mobile
        var carrierFacet = void 0;
        _this5.facets.forEach(function (facet) {
          if (facet.dimension === 'carrier') {
            carrierFacet = facet;
          }
        });

        if (carrierFacet && facet.dimension === 'color' && facet.currentValue === 'gold') {
          carrierFacet.disableValue('tmobile', 'color');

          // if T-Mobile was selected and we chose gold
          if (carrierFacet.currentValue === 'tmobile') {
            (function () {
              // clear carrier facet and any facets after it
              var carrierFacetIndex = _this5.facets.indexOf(carrierFacet);
              _this5.facets.forEach(function (facet, index) {
                if (index >= carrierFacetIndex) {
                  facet.clearSelection();
                  facet.setUnavailable();
                }
              });

              // expand carrier facet
              carrierFacet.setActive();
            })();
          }
        } else if (carrierFacet && facet.dimension === 'color' && facet.currentValue !== 'gold') {
          carrierFacet.enableValue('tmobile');
        }

        // if all facets have values, activate total and cta
        _this5.updateCta(_this5.facets.every(function (facet) {
          return facet.hasValue;
        }));

        // check for price increase based on value picked
        var extraCostValues = Array.prototype.slice.call(_this5.el.querySelectorAll('.facet .values .value.selected [data-price-change]'));
        var newCost = parseInt(_this5.costEl.getAttribute('data-base-cost'));
        extraCostValues.forEach(function (value) {
          newCost += parseInt(value.getAttribute('data-price-change'));
        });
        _this5.costEl.innerHTML = '$' + newCost + '.00';
      });

      // add cta event listeners
      Array.prototype.slice.call(this.el.querySelectorAll('.radio-cta-line a')).forEach(function (buttonCta) {
        buttonCta.addEventListener('click', function (evt) {
          return _this5.onClickCta(evt);
        });
      });

      window.addEventListener('resize', (0, _lodash2.default)(function () {
        return _this5.positionCta();
      }, RESIZE_THROTTLE));
    }
  }, {
    key: 'updateCta',
    value: function updateCta(active) {
      if (active) {
        this.totalAndCtaEl.classList.add(this.activeTotalAndCtaClass);
        this.areTotalAndCtaActivated = true;
        this.skuEls.forEach(function (skuEl) {
          return skuEl.innerHTML = skuEl.getAttribute('data-sku');
        });
        this.priceLabelEl.innerHTML = 'Total';
        this.el.classList.add(this.activeCtaClass);
      } else {
        this.totalAndCtaEl.classList.remove(this.activeTotalAndCtaClass);
        this.areTotalAndCtaActivated = false;
        this.skuEls.forEach(function (skuEl) {
          return skuEl.innerHTML = '&nbsp;';
        });
        this.priceLabelEl.innerHTML = 'From';
        this.el.classList.remove(this.activeCtaClass);
      }

      this.anchorNav.updateCta(active);
    }
  }, {
    key: 'addToCart',
    value: function addToCart() {
      if (!this.areTotalAndCtaActivated || this.hasBeenAddedToCart) {
        return;
      }

      var openCartLink = document.querySelector('.nav-bar-links-secondary .cart-open');
      var openCartIcon = openCartLink.querySelector('svg');

      // create element to show cart count in desktop view
      var cartValue = document.createElement('span');
      cartValue.classList.add('value');
      cartValue.textContent = '1';
      openCartLink.insertBefore(cartValue, openCartIcon);

      // hide closed cart and show open cart
      document.querySelector('.nav-bar-links-secondary .cart').classList.add('hide');
      openCartLink.classList.remove('hide');
      openCartLink.parentElement.classList.add('value-added');

      // increment cart count in mobile menu
      document.querySelector('.cart-count').innerHTML = '1';

      this.hasBeenAddedToCart = true;
    }
  }, {
    key: 'updateCarousel',
    value: function updateCarousel(oldActiveColor, newActiveColor) {
      // remove mobile carousel listener and active class
      var carousels = Array.prototype.slice.call(this.el.querySelectorAll('.carousel'));
      carousels.forEach(function (carousel) {
        carousel.classList.remove('active');
      });
      var oldCarousel = this.carouselData[oldActiveColor];
      if (oldCarousel) {
        oldCarousel.carousel.removeListener('active-state:changed', this.onCarouselStateChange);
      }

      // set new active mobile carousel and listen to state change
      var newCarousel = this.carouselData[newActiveColor];
      newCarousel.el.classList.add('active');
      newCarousel.carousel.on('active-state:changed', this.onCarouselStateChange);

      newCarousel.carousel.updateHeight();
    }
  }, {
    key: 'updateMainImage',
    value: function updateMainImage() {
      this.emit('active-property:change', {
        activeImageIndex: this.activeImageIndex,
        activeColor: this.activeColor
      });
    }
  }, {
    key: 'updateThumbnails',
    value: function updateThumbnails() {
      var activeThumbnails = this.el.querySelector('.thumbnail-color.active');
      if (activeThumbnails) {
        activeThumbnails.classList.remove('active');
      }

      this.el.querySelector('.thumbnail-color[data-thumbnail-color="' + this.activeColor + '"]').classList.add('active');
    }
  }, {
    key: 'onCarouselStateChange',
    value: function onCarouselStateChange(index) {
      var activeCarousel = this.carouselData[this.activeColor].carousel;
      var activeIndex = activeCarousel.activeItem;

      // set other carousels to same index
      for (var obj in this.carouselData) {
        var carousel = this.carouselData[obj].carousel;

        // ignore active carousel
        if (carousel === activeCarousel) {
          continue;
        }

        // shift carousel left or right
        if (carousel.activeItem < activeIndex) {
          this.carouselData[obj].carousel.shiftRight();
        } else {
          this.carouselData[obj].carousel.shiftLeft();
        }
      }
    }
  }, {
    key: 'onClickCta',
    value: function onClickCta(evt) {
      var newText = '';

      if (evt.currentTarget.classList.contains('selected')) {
        evt.currentTarget.classList.remove('selected');
        newText = evt.currentTarget.classList.contains('button-add-compare') ? this.compareText : this.wishlistText;
      } else {
        evt.currentTarget.classList.add('selected');
        newText = evt.currentTarget.classList.contains('button-add-compare') ? this.compareTextSelected : this.wishlistTextSelected;
      }

      // update button text
      evt.currentTarget.querySelector('.card-cta-text').innerHTML = newText;

      evt.preventDefault();
    }
  }, {
    key: 'positionCta',
    value: function positionCta() {
      var buttonContainers = this.el.querySelectorAll('.total-cta-actions .button-container');
      Array.prototype.slice.call(buttonContainers).forEach(function (buttonContainer) {
        var button = buttonContainer.querySelector('a');
        var ctaWidth = button.getBoundingClientRect().width;

        if (button.hasAttribute('data-width')) {
          ctaWidth = button.getAttribute('data-width');
        } else if (ctaWidth > 0) {
          button.setAttribute('data-width', ctaWidth);
        }

        var marginLeft = (buttonContainer.getBoundingClientRect().width - ctaWidth) / 2;
        button.style.marginLeft = marginLeft + 'px';
      });
    }
  }]);

  return Selector;
}(_events.EventEmitter);

Selector.prototype.activeCtaClass = 'cta-active';
Selector.prototype.activeTotalAndCtaClass = 'active';
Selector.prototype.disabledClass = 'disabled';

exports.default = Selector;

},{"../../shared/support":49,"../anchor-nav/anchor-nav":27,"../carousel/carousel":29,"./selector-facet/selector-facet":43,"./selector-main-image/selector-main-image":44,"./selector-thumbnail-image/selector-thumbnail-image":45,"events":1,"lodash.throttle":18}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _support = require('./../../../shared/support');

var _support2 = _interopRequireDefault(_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SubtleScrollItem = function SubtleScrollItem(el) {
  this.el = el;

  if (this.el.dataset) {
    this.className = this.el.dataset.ss;
  } else {
    this.className = this.el.getAttribute('data-ss');
  }

  this.transitionEndName = _support2.default.transitionEnd();
};

SubtleScrollItem.prototype.renderVisibility = function () {
  if (this.isElementInViewport('bottom', -.5)) {
    if (this.transitionEndName) {
      this.el.classList.add(this.className);
    } else if (!this.isVisible) {
      this.animateWithoutTransition();
    }
    this.isVisible = true;
  } else if (this.isVisible && !this.isElementInViewport()) {
    if (this.transitionEndName) {
      this.el.classList.remove(this.className);
    } else if (this.isVisible) {
      this.resetWithoutTransition();
    }
    this.isVisible = false;
  }
};

SubtleScrollItem.prototype.isElementInViewport = function () {
  var position = arguments.length <= 0 || arguments[0] === undefined ? 'top' : arguments[0];
  var delta = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

  var rect = this.el.getBoundingClientRect();

  return rect[position] >= 0 && rect[position] + (delta ? delta * rect.height : 0) <= (window.innerHeight || document.documentElement.clientHeight);
};

SubtleScrollItem.prototype.animateWithoutTransition = function () {
  var _this = this;

  var timer = 0;

  var interval = setInterval(function () {
    if (timer !== 20) {
      _this.el.style.msTransform = 'translateX(' + timer + 'px)';
      timer++;
    } else {
      clearInterval(interval);
    }
  }, 50);
};

SubtleScrollItem.prototype.resetWithoutTransition = function () {
  this.el.style.msTransform = 'translateX(0)';
};

exports.default = SubtleScrollItem;

},{"./../../../shared/support":49}],48:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _subtleScrollItem = require('./subtle-scroll-item/subtle-scroll-item');

var _subtleScrollItem2 = _interopRequireDefault(_subtleScrollItem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EVENT_DELAY = 1000;

var SubtleScroll = function SubtleScroll() {
  this.elements = Array.prototype.slice.call(document.querySelectorAll('[data-ss]'));

  if (this.elements.length) {

    this.elements = this.elements.map(function (el) {
      return new _subtleScrollItem2.default(el);
    });

    this.eventLoop();
  }
};

// Using polling right now, but may want to see if scroll event is
// more performant.
SubtleScroll.prototype.eventLoop = function () {
  var _this = this;

  setTimeout(function () {
    _this.eventLoop();
  }, EVENT_DELAY);

  this.elements.forEach(function (el) {
    el.renderVisibility();
  });
};

exports.default = SubtleScroll;

},{"./subtle-scroll-item/subtle-scroll-item":47}],49:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var Support = {
  transitionEnd: function transitionEnd() {
    var el = document.createElement('div');

    var transEndEventNames = {
      WebkitTransition: 'webkitTransitionEnd',
      MozTransition: 'transitionend',
      OTransition: 'oTransitionEnd otransitionend',
      transition: 'transitionend'
    };

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return transEndEventNames[name];
      }
    }

    return false;
  },
  /*
  checks if browser supports keyframe animations and returns true or false
  */
  keyframeAnimation: function keyframeAnimation() {
    var animation = false,
        animationstring = 'animation',
        keyframeprefix = '',
        domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
        pfx = '',
        elm = document.createElement('div');

    if (elm.style.animationName !== undefined) {
      animation = true;
    }

    if (animation === false) {
      for (var i = 0; i < domPrefixes.length; i++) {
        if (elm.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
          pfx = domPrefixes[i];
          animationstring = pfx + 'Animation';
          keyframeprefix = '-' + pfx.toLowerCase() + '-';
          animation = true;
          break;
        }
      }
    }

    return animation;
  },

  touchEnabled: function touchEnabled() {
    var hasTouch = 'ontouchstart' in window;

    return hasTouch;
  },

  getClosest: function getClosest(elem, selector) {
    var firstChar = selector.charAt(0);

    // Get closest match
    for (; elem && elem !== document; elem = elem.parentNode) {
      // If selector is a class
      if (firstChar === '.') {
        if (elem.classList.contains(selector.substr(1))) {
          return elem;
        }
      }

      // If selector is an ID
      if (firstChar === '#') {
        if (elem.id === selector.substr(1)) {
          return elem;
        }
      }

      // If selector is a data attribute
      if (firstChar === '[') {
        if (elem.hasAttribute(selector.substr(1, selector.length - 2))) {
          return elem;
        }
      }

      // If selector is a tag
      if (elem.tagName.toLowerCase() === selector) {
        return elem;
      }
    }
    return false;
  },

  getQueryVariable: function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (pair[0] == variable) {
        return pair[1];
      }
    }
    return false;
  }
};

exports.default = Support;

},{}],50:[function(require,module,exports){
'use strict';

/**
 * Simple helper prototype for finding out which features
 * the navshould support.
 */
var Features = function Features() {
  this.html = document.querySelector('html');
};

/**
 * Checks for the existance of a class in the html-element.
 */
Features.prototype.has = function () {
  var features = Array.prototype.slice(arguments);
  return features.every(function (feature) {
    return this.html.classList.contains(feature);
  });
};

module.exports = new Features();

},{}]},{},[24])


//# sourceMappingURL=entry.js.map
