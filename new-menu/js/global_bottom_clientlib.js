;(function () {
  'use strict';

  /**
   * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
   *
   * @codingstandard ftlabs-jsv2
   * @copyright The Financial Times Limited [All Rights Reserved]
   * @license MIT License (see LICENSE.txt)
   */

  /*jslint browser:true, node:true*/
  /*global define, Event, Node*/


  /**
   * Instantiate fast-clicking listeners on the specified layer.
   *
   * @constructor
   * @param {Element} layer The layer to listen on
   * @param {Object} [options={}] The options to override the defaults
   */
  function FastClick(layer, options) {
    var oldOnClick;

    options = options || {};

    /**
     * Whether a click is currently being tracked.
     *
     * @type boolean
     */
    this.trackingClick = false;


    /**
     * Timestamp for when click tracking started.
     *
     * @type number
     */
    this.trackingClickStart = 0;


    /**
     * The element being tracked for a click.
     *
     * @type EventTarget
     */
    this.targetElement = null;


    /**
     * X-coordinate of touch start event.
     *
     * @type number
     */
    this.touchStartX = 0;


    /**
     * Y-coordinate of touch start event.
     *
     * @type number
     */
    this.touchStartY = 0;


    /**
     * ID of the last touch, retrieved from Touch.identifier.
     *
     * @type number
     */
    this.lastTouchIdentifier = 0;


    /**
     * Touchmove boundary, beyond which a click will be cancelled.
     *
     * @type number
     */
    this.touchBoundary = options.touchBoundary || 10;


    /**
     * The FastClick layer.
     *
     * @type Element
     */
    this.layer = layer;

    /**
     * The minimum time between tap(touchstart and touchend) events
     *
     * @type number
     */
    this.tapDelay = options.tapDelay || 200;

    /**
     * The maximum time for a tap
     *
     * @type number
     */
    this.tapTimeout = options.tapTimeout || 700;

    if (FastClick.notNeeded(layer)) {
      return;
    }

    // Some old versions of Android don't have Function.prototype.bind
    function bind(method, context) {
      return function() { return method.apply(context, arguments); };
    }


    var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
    var context = this;
    for (var i = 0, l = methods.length; i < l; i++) {
      context[methods[i]] = bind(context[methods[i]], context);
    }

    // Set up event handlers as required
    if (deviceIsAndroid) {
      layer.addEventListener('mouseover', this.onMouse, true);
      layer.addEventListener('mousedown', this.onMouse, true);
      layer.addEventListener('mouseup', this.onMouse, true);
    }

    layer.addEventListener('click', this.onClick, true);
    layer.addEventListener('touchstart', this.onTouchStart, false);
    layer.addEventListener('touchmove', this.onTouchMove, false);
    layer.addEventListener('touchend', this.onTouchEnd, false);
    layer.addEventListener('touchcancel', this.onTouchCancel, false);

    // Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
    // which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
    // layer when they are cancelled.
    if (!Event.prototype.stopImmediatePropagation) {
      layer.removeEventListener = function(type, callback, capture) {
        var rmv = Node.prototype.removeEventListener;
        if (type === 'click') {
          rmv.call(layer, type, callback.hijacked || callback, capture);
        } else {
          rmv.call(layer, type, callback, capture);
        }
      };

      layer.addEventListener = function(type, callback, capture) {
        var adv = Node.prototype.addEventListener;
        if (type === 'click') {
          adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
            if (!event.propagationStopped) {
              callback(event);
            }
          }), capture);
        } else {
          adv.call(layer, type, callback, capture);
        }
      };
    }

    // If a handler is already declared in the element's onclick attribute, it will be fired before
    // FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
    // adding it as listener.
    if (typeof layer.onclick === 'function') {

      // Android browser on at least 3.2 requires a new reference to the function in layer.onclick
      // - the old one won't work if passed to addEventListener directly.
      oldOnClick = layer.onclick;
      layer.addEventListener('click', function(event) {
        oldOnClick(event);
      }, false);
      layer.onclick = null;
    }
  }

  /**
  * Windows Phone 8.1 fakes user agent string to look like Android and iPhone.
  *
  * @type boolean
  */
  var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

  /**
   * Android requires exceptions.
   *
   * @type boolean
   */
  var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


  /**
   * iOS requires exceptions.
   *
   * @type boolean
   */
  var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


  /**
   * iOS 4 requires an exception for select elements.
   *
   * @type boolean
   */
  var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


  /**
   * iOS 6.0-7.* requires the target element to be manually derived
   *
   * @type boolean
   */
  var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

  /**
   * BlackBerry requires exceptions.
   *
   * @type boolean
   */
  var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

  /**
   * Determine whether a given element requires a native click.
   *
   * @param {EventTarget|Element} target Target DOM element
   * @returns {boolean} Returns true if the element needs a native click
   */
  FastClick.prototype.needsClick = function(target) {
    switch (target.nodeName.toLowerCase()) {

    // Don't send a synthetic click to disabled inputs (issue #62)
    case 'button':
    case 'select':
    case 'textarea':
      if (target.disabled) {
        return true;
      }

      break;
    case 'input':

      // File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
      if ((deviceIsIOS && target.type === 'file') || target.disabled) {
        return true;
      }

      break;
    case 'label':
    case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
    case 'video':
      return true;
    }

    return (/\bneedsclick\b/).test(target.className);
  };


  /**
   * Determine whether a given element requires a call to focus to simulate click into element.
   *
   * @param {EventTarget|Element} target Target DOM element
   * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
   */
  FastClick.prototype.needsFocus = function(target) {
    switch (target.nodeName.toLowerCase()) {
    case 'textarea':
      return true;
    case 'select':
      return !deviceIsAndroid;
    case 'input':
      switch (target.type) {
      case 'button':
      case 'checkbox':
      case 'file':
      case 'image':
      case 'radio':
      case 'submit':
        return false;
      }

      // No point in attempting to focus disabled inputs
      return !target.disabled && !target.readOnly;
    default:
      return (/\bneedsfocus\b/).test(target.className);
    }
  };


  /**
   * Send a click event to the specified element.
   *
   * @param {EventTarget|Element} targetElement
   * @param {Event} event
   */
  FastClick.prototype.sendClick = function(targetElement, event) {
    var clickEvent, touch;

    // On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
    if (document.activeElement && document.activeElement !== targetElement) {
      document.activeElement.blur();
    }

    touch = event.changedTouches[0];

    // Synthesise a click event, with an extra attribute so it can be tracked
    clickEvent = document.createEvent('MouseEvents');
    clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
    clickEvent.forwardedTouchEvent = true;
    targetElement.dispatchEvent(clickEvent);
  };

  FastClick.prototype.determineEventType = function(targetElement) {

    //Issue #159: Android Chrome Select Box does not open with a synthetic click event
    if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
      return 'mousedown';
    }

    return 'click';
  };


  /**
   * @param {EventTarget|Element} targetElement
   */
  FastClick.prototype.focus = function(targetElement) {
    var length;

    // Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
    if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
      length = targetElement.value.length;
      targetElement.setSelectionRange(length, length);
    } else {
      targetElement.focus();
    }
  };


  /**
   * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
   *
   * @param {EventTarget|Element} targetElement
   */
  FastClick.prototype.updateScrollParent = function(targetElement) {
    var scrollParent, parentElement;

    scrollParent = targetElement.fastClickScrollParent;

    // Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
    // target element was moved to another parent.
    if (!scrollParent || !scrollParent.contains(targetElement)) {
      parentElement = targetElement;
      do {
        if (parentElement.scrollHeight > parentElement.offsetHeight) {
          scrollParent = parentElement;
          targetElement.fastClickScrollParent = parentElement;
          break;
        }

        parentElement = parentElement.parentElement;
      } while (parentElement);
    }

    // Always update the scroll top tracker if possible.
    if (scrollParent) {
      scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
    }
  };


  /**
   * @param {EventTarget} targetElement
   * @returns {Element|EventTarget}
   */
  FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

    // On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
    if (eventTarget.nodeType === Node.TEXT_NODE) {
      return eventTarget.parentNode;
    }

    return eventTarget;
  };


  /**
   * On touch start, record the position and scroll offset.
   *
   * @param {Event} event
   * @returns {boolean}
   */
  FastClick.prototype.onTouchStart = function(event) {
    var targetElement, touch, selection;

    // Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
    if (event.targetTouches.length > 1) {
      return true;
    }

    targetElement = this.getTargetElementFromEventTarget(event.target);
    touch = event.targetTouches[0];

    if (deviceIsIOS) {

      // Only trusted events will deselect text on iOS (issue #49)
      selection = window.getSelection();
      if (selection.rangeCount && !selection.isCollapsed) {
        return true;
      }

      if (!deviceIsIOS4) {

        // Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
        // when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
        // with the same identifier as the touch event that previously triggered the click that triggered the alert.
        // Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
        // immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
        // Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
        // which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
        // random integers, it's safe to to continue if the identifier is 0 here.
        if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
          event.preventDefault();
          return false;
        }

        this.lastTouchIdentifier = touch.identifier;

        // If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
        // 1) the user does a fling scroll on the scrollable layer
        // 2) the user stops the fling scroll with another tap
        // then the event.target of the last 'touchend' event will be the element that was under the user's finger
        // when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
        // is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
        this.updateScrollParent(targetElement);
      }
    }

    this.trackingClick = true;
    this.trackingClickStart = event.timeStamp;
    this.targetElement = targetElement;

    this.touchStartX = touch.pageX;
    this.touchStartY = touch.pageY;

    // Prevent phantom clicks on fast double-tap (issue #36)
    if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
      event.preventDefault();
    }

    return true;
  };


  /**
   * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
   *
   * @param {Event} event
   * @returns {boolean}
   */
  FastClick.prototype.touchHasMoved = function(event) {
    var touch = event.changedTouches[0], boundary = this.touchBoundary;

    if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
      return true;
    }

    return false;
  };


  /**
   * Update the last position.
   *
   * @param {Event} event
   * @returns {boolean}
   */
  FastClick.prototype.onTouchMove = function(event) {
    if (!this.trackingClick) {
      return true;
    }

    // If the touch has moved, cancel the click tracking
    if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
      this.trackingClick = false;
      this.targetElement = null;
    }

    return true;
  };


  /**
   * Attempt to find the labelled control for the given label element.
   *
   * @param {EventTarget|HTMLLabelElement} labelElement
   * @returns {Element|null}
   */
  FastClick.prototype.findControl = function(labelElement) {

    // Fast path for newer browsers supporting the HTML5 control attribute
    if (labelElement.control !== undefined) {
      return labelElement.control;
    }

    // All browsers under test that support touch events also support the HTML5 htmlFor attribute
    if (labelElement.htmlFor) {
      return document.getElementById(labelElement.htmlFor);
    }

    // If no for attribute exists, attempt to retrieve the first labellable descendant element
    // the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
    return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
  };


  /**
   * On touch end, determine whether to send a click event at once.
   *
   * @param {Event} event
   * @returns {boolean}
   */
  FastClick.prototype.onTouchEnd = function(event) {
    var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

    if (!this.trackingClick) {
      return true;
    }

    // Prevent phantom clicks on fast double-tap (issue #36)
    if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
      this.cancelNextClick = true;
      return true;
    }

    if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
      return true;
    }

    // Reset to prevent wrong click cancel on input (issue #156).
    this.cancelNextClick = false;

    this.lastClickTime = event.timeStamp;

    trackingClickStart = this.trackingClickStart;
    this.trackingClick = false;
    this.trackingClickStart = 0;

    // On some iOS devices, the targetElement supplied with the event is invalid if the layer
    // is performing a transition or scroll, and has to be re-detected manually. Note that
    // for this to function correctly, it must be called *after* the event target is checked!
    // See issue #57; also filed as rdar://13048589 .
    if (deviceIsIOSWithBadTarget) {
      touch = event.changedTouches[0];

      // In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
      targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
      targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
    }

    targetTagName = targetElement.tagName.toLowerCase();
    if (targetTagName === 'label') {
      forElement = this.findControl(targetElement);
      if (forElement) {
        this.focus(targetElement);
        if (deviceIsAndroid) {
          return false;
        }

        targetElement = forElement;
      }
    } else if (this.needsFocus(targetElement)) {

      // Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
      // Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
      if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
        this.targetElement = null;
        return false;
      }

      this.focus(targetElement);
      this.sendClick(targetElement, event);

      // Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
      // Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
      if (!deviceIsIOS || targetTagName !== 'select') {
        this.targetElement = null;
        event.preventDefault();
      }

      return false;
    }

    if (deviceIsIOS && !deviceIsIOS4) {

      // Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
      // and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
      scrollParent = targetElement.fastClickScrollParent;
      if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
        return true;
      }
    }

    // Prevent the actual click from going though - unless the target node is marked as requiring
    // real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
    if (!this.needsClick(targetElement)) {
      event.preventDefault();
      this.sendClick(targetElement, event);
    }

    return false;
  };


  /**
   * On touch cancel, stop tracking the click.
   *
   * @returns {void}
   */
  FastClick.prototype.onTouchCancel = function() {
    this.trackingClick = false;
    this.targetElement = null;
  };


  /**
   * Determine mouse events which should be permitted.
   *
   * @param {Event} event
   * @returns {boolean}
   */
  FastClick.prototype.onMouse = function(event) {

    // If a target element was never set (because a touch event was never fired) allow the event
    if (!this.targetElement) {
      return true;
    }

    if (event.forwardedTouchEvent) {
      return true;
    }

    // Programmatically generated events targeting a specific element should be permitted
    if (!event.cancelable) {
      return true;
    }

    // Derive and check the target element to see whether the mouse event needs to be permitted;
    // unless explicitly enabled, prevent non-touch click events from triggering actions,
    // to prevent ghost/doubleclicks.
    if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

      // Prevent any user-added listeners declared on FastClick element from being fired.
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      } else {

        // Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
        event.propagationStopped = true;
      }

      // Cancel the event
      event.stopPropagation();
      event.preventDefault();

      return false;
    }

    // If the mouse event is permitted, return true for the action to go through.
    return true;
  };


  /**
   * On actual clicks, determine whether this is a touch-generated click, a click action occurring
   * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
   * an actual click which should be permitted.
   *
   * @param {Event} event
   * @returns {boolean}
   */
  FastClick.prototype.onClick = function(event) {
    var permitted;

    // It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
    if (this.trackingClick) {
      this.targetElement = null;
      this.trackingClick = false;
      return true;
    }

    // Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
    if (event.target.type === 'submit' && event.detail === 0) {
      return true;
    }

    permitted = this.onMouse(event);

    // Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
    if (!permitted) {
      this.targetElement = null;
    }

    // If clicks are permitted, return true for the action to go through.
    return permitted;
  };


  /**
   * Remove all FastClick's event listeners.
   *
   * @returns {void}
   */
  FastClick.prototype.destroy = function() {
    var layer = this.layer;

    if (deviceIsAndroid) {
      layer.removeEventListener('mouseover', this.onMouse, true);
      layer.removeEventListener('mousedown', this.onMouse, true);
      layer.removeEventListener('mouseup', this.onMouse, true);
    }

    layer.removeEventListener('click', this.onClick, true);
    layer.removeEventListener('touchstart', this.onTouchStart, false);
    layer.removeEventListener('touchmove', this.onTouchMove, false);
    layer.removeEventListener('touchend', this.onTouchEnd, false);
    layer.removeEventListener('touchcancel', this.onTouchCancel, false);
  };


  /**
   * Check whether FastClick is needed.
   *
   * @param {Element} layer The layer to listen on
   */
  FastClick.notNeeded = function(layer) {
    var metaViewport;
    var chromeVersion;
    var blackberryVersion;
    var firefoxVersion;

    // Devices that don't support touch don't need FastClick
    if (typeof window.ontouchstart === 'undefined') {
      return true;
    }

    // Chrome version - zero for other browsers
    chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

    if (chromeVersion) {

      if (deviceIsAndroid) {
        metaViewport = document.querySelector('meta[name=viewport]');

        if (metaViewport) {
          // Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
          if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
            return true;
          }
          // Chrome 32 and above with width=device-width or less don't need FastClick
          if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
            return true;
          }
        }

      // Chrome desktop doesn't need FastClick (issue #15)
      } else {
        return true;
      }
    }

    if (deviceIsBlackBerry10) {
      blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

      // BlackBerry 10.3+ does not require Fastclick library.
      // https://github.com/ftlabs/fastclick/issues/251
      if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
        metaViewport = document.querySelector('meta[name=viewport]');

        if (metaViewport) {
          // user-scalable=no eliminates click delay.
          if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
            return true;
          }
          // width=device-width (or less than device-width) eliminates click delay.
          if (document.documentElement.scrollWidth <= window.outerWidth) {
            return true;
          }
        }
      }
    }

    // IE10 with -ms-touch-action: none or manipulation, which disables double-tap-to-zoom (issue #97)
    if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
      return true;
    }

    // Firefox version - zero for other browsers
    firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

    if (firefoxVersion >= 27) {
      // Firefox 27+ does not have tap delay if the content is not zoomable - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

      metaViewport = document.querySelector('meta[name=viewport]');
      if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
        return true;
      }
    }

    // IE11: prefixed -ms-touch-action is no longer supported and it's recomended to use non-prefixed version
    // http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
    if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
      return true;
    }

    return false;
  };


  /**
   * Factory method for creating a FastClick object
   *
   * @param {Element} layer The layer to listen on
   * @param {Object} [options={}] The options to override the defaults
   */
  FastClick.attach = function(layer, options) {
    return new FastClick(layer, options);
  };


  if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

    // AMD. Register as an anonymous module.
    define(function() {
      return FastClick;
    });
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = FastClick.attach;
    module.exports.FastClick = FastClick;
  } else {
    window.FastClick = FastClick;
  }
}());
/**
 * jQuery Unveil
 * A very lightweight jQuery plugin to lazy load images
 * http://luis-almeida.github.com/unveil
 *
 * Licensed under the MIT license.
 * Copyright 2013 Luís Almeida
 * https://github.com/luis-almeida
 */

;(function($) {

  $.fn.unveil = function(threshold, callback) {

    var $w = $(window),
        th = threshold || 0,
        retina = window.devicePixelRatio > 1,
        attrib = retina? "data-src-retina" : "data-src",
        images = this,
        loaded;

    this.one("unveil", function() {
      var source = this.getAttribute(attrib);
      source = source || this.getAttribute("data-src");
      if (source) {
        this.setAttribute("src", source);
        if (typeof callback === "function") callback.call(this);
      }
    });

    function unveil() {
      var inview = images.filter(function() {
        var $e = $(this);
        if ($e.is(":hidden")) return;

        var wt = $w.scrollTop(),
            wb = wt + $w.height(),
            et = $e.offset().top,
            eb = et + $e.height();

        return eb >= wt - th && et <= wb + th;
      });

      loaded = inview.trigger("unveil");
      images = images.not(loaded);
    }

    $w.on("scroll.unveil resize.unveil lookup.unveil", unveil);

    unveil();

    return this;

  };

})(window.jQuery || window.Zepto);
var smg = smg || {
  global: {},
  store: {},
  gnb: {},
  category: {},
  accessories: {},
  product: {},
  account:{},
  compare: {},
  showcase:{},
  pageConfig:{}
};

//SMG uses Freemarker templates which have a conflict with Underscore's
//use of % in templates so Underscore is modified to use <@ @> instead.
_.templateSettings = {
interpolate : /\<\@\=(.+?)\@\>/gim,
evaluate : /\<\@(.+?)\@\>/gim,
escape : /\<\@\-(.+?)\@\>/gim
};

/*!
 * jQuery Cookie Plugin v1.3.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function ($, document, undefined) {

  var pluses = /\+/g;

  function raw(s) {
    return s;
  }

  function decoded(s) {
    return unRfc2068(decodeURIComponent(s.replace(pluses, ' ')));
  }

  function unRfc2068(value) {
    if (value.indexOf('"') === 0) {
      // This is a quoted cookie as according to RFC2068, unescape
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return value;
  }

  function fromJSON(value) {
    return config.json ? JSON.parse(value) : value;
  }

  var config = $.cookie = function (key, value, options) {

    // write
    if (value !== undefined) {
      options = $.extend({}, config.defaults, options);

      if (value === null) {
        options.expires = -1;
      }

      if (typeof options.expires === 'number') {
        var days = options.expires, t = options.expires = new Date();
        t.setDate(t.getDate() + days);
      }

      value = config.json ? JSON.stringify(value) : String(value);

      return (document.cookie = [
        encodeURIComponent(key), '=', config.raw ? value : encodeURIComponent(value),
        options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
        options.path    ? '; path=' + options.path : '',
        options.domain  ? '; domain=' + options.domain : '',
        options.secure  ? '; secure' : ''
      ].join(''));
    }

    // read
    var decode = config.raw ? raw : decoded;
    var cookies = document.cookie.split('; ');
    var result = key ? null : {};
    for (var i = 0, l = cookies.length; i < l; i++) {
      var parts = cookies[i].split('=');
      var name = decode(parts.shift());
      var cookie = decode(parts.join('='));

      if (key && key === name) {
        result = fromJSON(cookie);
        break;
      }

      if (!key) {
        result[name] = fromJSON(cookie);
      }
    }

    return result;
  };

  config.defaults = {};

  $.removeCookie = function (key, options) {
    if ($.cookie(key) !== null) {
      $.cookie(key, null, options);
      return true;
    }
    return false;
  };

})(jQuery, document);


(function (window) {
    var last = +new Date();
    var delay = 100; // default delay

    // Manage event queue
    var stack = [];

    function callback() {
        var now = +new Date();
        if (now - last > delay) {
            for (var i = 0; i < stack.length; i++) {
                stack[i]();
            }
            last = now;
        }
    }

    // Public interface
    var onDomChange = function (fn, newdelay) {
        if (newdelay) delay = newdelay;
        stack.push(fn);
    };

    // Naive approach for compatibility
    function naive() {

        var last = document.getElementsByTagName('*');
        var lastlen = last.length;
        var timer = setTimeout(function check() {

            // get current state of the document
            var current = document.getElementsByTagName('*');
            var len = current.length;

            // if the length is different
            // it's fairly obvious
            if (len != lastlen) {
                // just make sure the loop finishes early
                last = [];
            }

            // go check every element in order
            for (var i = 0; i < len; i++) {
                if (current[i] !== last[i]) {
                    callback();
                    last = current;
                    lastlen = len;
                    break;
                }
            }

            // over, and over, and over again
            setTimeout(check, delay);

        }, delay);
    }

    //
    //  Check for mutation events support
    //

    var support = {};

    var el = document.documentElement;
    var remain = 3;

    // callback for the tests
    function decide() {
        if (support.DOMNodeInserted) {
            window.addEventListener("DOMContentLoaded", function () {
                if (support.DOMSubtreeModified) { // for FF 3+, Chrome
                    el.addEventListener('DOMSubtreeModified', callback, false);
                } else { // for FF 2, Safari, Opera 9.6+
                    el.addEventListener('DOMNodeInserted', callback, false);
                    el.addEventListener('DOMNodeRemoved', callback, false);
                }
            }, false);
        } else if (document.onpropertychange) { // for IE 5.5+
            document.onpropertychange = callback;
        } else { // fallback
            naive();
        }
    }

    // checks a particular event
    function test(event) {
        el.addEventListener(event, function fn() {
            support[event] = true;
            el.removeEventListener(event, fn, false);
            if (--remain === 0) decide();
        }, false);
    }

    // attach test events
    if (window.addEventListener) {
        test('DOMSubtreeModified');
        test('DOMNodeInserted');
        test('DOMNodeRemoved');
    } else {
        decide();
    }

    // expose
    window.onDomChange = onDomChange;
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
			//		(1). Remove all trailing U+002C COMMA characters from url. If this removed
			//         more than one character, that is a parse error.
			if (url.slice(-1) === ",") {
				url = url.replace(regexTrailingCommas, "");
				// (Jump ahead to step 9 to skip tokenization and just push the candidate).
				parseDescriptors();

				//	Otherwise, follow these substeps:
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
/*global FastClick*/
$(function() {
  'use strict';
  FastClick.attach(document.body);
});

window.AEMapp = {
  ui: {},
  koViewModel: {},
  eppPending: 0
};

(function(assetLoader, $, undefined) {
  'use strict';
  assetLoader.loadJS = function(src, callback) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onreadystatechange = s.onload = function() {
      var state = s.readyState;
      if (!callback.done && (!state || /loaded|complete/.test(state))) {
        callback.done = true;
        callback();
      }
    };
    document.getElementsByTagName('head')[0].appendChild(s);
  };

}(window.assetLoader = window.assetLoader || {}, jQuery));

/*global AEMapp*/

(function(window, document, $, undefined) {
  'use strict';

  var addToCompare = function(mdc, cat) {
    var defaults = {
      modelCodes: []
    };
    var ret = [];
    var isFirst = true;
    var isDiff = false;
    var isExist = false;
    if (Cookies.getJSON('compareTray')) {
      ret = Cookies.getJSON('compareTray');
      if (ret.length) {
        isFirst = false;
      } else {
        isFirst = true;
      }
      ret.forEach(function(ct) {
        if (ct.mdlCd === mdc) {
          isExist = true;
        }
        if (ct.catId !== cat) {
          isDiff = true;
        }
      });
    } else {
      isFirst = true;
    }
    if (ret.length === 4) {
      $.event.trigger({
        type: 'addToCompare',
        message: 'full',
        time: new Date()
      });
      return false;
    } else if (isDiff) {
      $.event.trigger({
        type: 'addToCompare',
        message: 'diff',
        time: new Date()
      });
      return false;
    } else if (!isExist) {
      ret.push({mdlCd: mdc, catId: cat});
      Cookies.set('compareTray', ret, {expires: 30});
      defaults.modelCodes = [];
      ret.forEach(function(ct) {
        defaults.modelCodes.push(ct.mdlCd);
      });
      $.event.trigger({
        type: 'addToCompare',
        message: defaults.modelCodes,
        first: isFirst,
        time: new Date()
      });
      return true;
    } else {
      return false;
    }
  };

  // add to compare
  $('body').on('click', '.cta-compare', function() {
    console.log('click');
    if (addToCompare($(this).attr('data-mdlCd'), $(this).attr('data-catId'))) {
      $(this).addClass('selected');
      $(this).find('.fa-btn-radio').addClass('selected');
      if ($(this).find('.text').length) {
        $(this).find('.text').text('added to compare');
      } else {
        $(this).text('added to compare');
      }
    }
  });

  window.AEMapp.reloadCompareTray = function() {
    var content = Cookies.getJSON('compareTray');
    if (content) {
      setTimeout(function() {
        $('.cta-compare').each(function() {
          var self = $(this);
          content.forEach(function(o) {
            if (self.attr('data-mdlCd') === o.mdlCd) {
              self.addClass('selected');
              self.find('.fa-btn-radio').addClass('selected');
              if (self.find('.text').length) {
                self.find('.text').text('added to compare');
              } else {
                self.text('added to compare');
              }
            }
          });
        });
      }, 100);
    }
  };
  window.AEMapp.reloadCompareTray();

  window.AEMapp.reloadCompareButton = function(mlc) {
    var content = Cookies.getJSON('compareTray');
    if (content) {
      setTimeout(function() {
        var tar = $('.cta-compare[data-mdlcd="' + mlc + '"]');
        if (tar) {
          var f = true;
          content.forEach(function(o) {
            if (mlc === o.mdlCd) {
              f = false;
              tar.addClass('selected');
              tar.find('.fa-btn-radio').addClass('selected');
              if (tar.find('.text').length) {
                tar.find('.text').text('added to compare');
              } else {
                tar.text('added to compare');
              }
            }
          });
          if (f) {
            tar.removeClass('selected');
            tar.find('.fa-btn-radio').removeClass('selected');
            if (tar.find('.text').length) {
              tar.find('.text').text('add to compare');
            } else {
              tar.text('add to compare');
            }
          }
        }
      }, 50);
    }
  };

  $(document).on('removeFromCompare', function(data) {
    $('.cta-compare').each(function() {
      var self = $(this);
      data.message.forEach(function(mc) {
        if (mc === self.attr('data-mdlCd')) {
          self.removeClass('selected');
          self.find('.fa-btn-radio').removeClass('selected');
          if (self.find('.text').length) {
            self.find('.text').text('add to compare');
          } else {
            self.text('add to compare');
          }
        }
      });
    });
  });
})(window, document, jQuery);

/*global AEMapp*/

(function(window, document, $, undefined) {
  'use strict';

  var EPPApp = function() {
    var self = this;
    var dRCount = 0;
    var defaults = {
      container: '.epp-product',
      mcAttr: 'data-eppMdlCd',
      mcAttrLowercase: 'data-eppmdlcd',
      ecomAttr: 'data-ecom',
      holidayPage: false,
      defaultCallback: true,
      successCallback: function() {

      },done: function() {
      }
    };
    var cookieOptions = {
      path: '/',
      domain: 'samsung.com'
    };
    var drStoreDomain = '//shop.us.samsung.com';

    self.tryInit = function() {
      window.AEMapp.eppPending--;
      if (window.AEMapp.eppPending === 0) {
        self.loadPrice();
      }
    };

    self.loadPrice = function(opts) {
      if (window.location.href.indexOf('http://samsung.com/us/shop/black-friday') > -1 ||
          window.location.href.indexOf('http://samsung.com/us/shop/home-appliance-holiday-offers') > -1) {
        return;
      }else {
        var options = $.extend({}, defaults, opts);
        var planId = $.cookie('tppid');
        var modelCodes = [];

        if (self.isEppUser()) {
          $(options.container).each(function() {
            if ('Y' == $(this).data('ecom') || $(this).data('ecom')) {
              modelCodes.push($(this).attr(defaults.mcAttr) || $(this).attr(defaults.mcAttrLowercase));
            }
          });

          if (modelCodes.length > 0 || window.AEMapp.hasOwnProperty('eppProductDetails')) {
            self.getPriceForEcomProductsEpp(modelCodes,options, planId);
          }
        } else {
          $(options.container).each(function() {
            if ('Y' == $(this).data('ecom') || $(this).data('ecom')) {
              modelCodes[modelCodes.length] = $(this).attr(defaults.mcAttr) || $(this).attr(defaults.mcAttrLowercase);
            }
          });

          if (modelCodes.length > 0 || window.AEMapp.hasOwnProperty('eppProductDetails')) {
            self.getPriceForEcomProducts(modelCodes,options);
          }
        }
      }
    };

    self.getPriceForEcomProductsEpp = function(modelCodes, options, planId) {
      var requestData = {
        referralUrl: document.referrer,
        planId: planId,
        modelCodes: modelCodes.toString(),
        holidayPage: options.holidayPage
      };
      console.log(requestData);
      $.ajax({
        url: 'http://samsung.com/us/shop/price.us',
        data: requestData,
        type: 'POST',
        dataType: 'json',
        error: function() {
          console.log('error loading /us/shop/price.us.');
          if (options.done && typeof options.done === 'function') {
            options.done();
          }
        },
        success: function(priceList) {
          if (options.defaultCallback) {
            for (var i = 0; i < priceList.length; i++) {
              if (window.AEMapp.hasOwnProperty('eppProductDetails')) {
                var epd = window.AEMapp.eppProductDetails;
                if (epd.hasOwnProperty(priceList[i].prdMdlCd) && epd[priceList[i].prdMdlCd].buyFlag == 'Y') {
                  epd[priceList[i].prdMdlCd].mrspPrice = self.removeDollar(priceList[i].prdPriceInf);
                  if (priceList[i].prdSavePriceInf !== '') {
                    epd[priceList[i].prdMdlCd].samsungPrice = self.removeDollar(priceList[i].prdSavePriceInf);
                  }
                }
              }
              if (priceList[i] !== null && $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\']').data('ecom') == 'Y') {
                if(priceList[i].prdPromoPriceInf !== '') {
                  if(priceList[i].prdPromoPriceInf) {
                    $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-price').html(self.removeDollar(priceList[i].prdPromoPriceInf));
                  }
                  if(priceList[i].prdSavePriceInf) {
                    $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-savings').html(self.removeDollar(priceList[i].prdSavePriceInf));
                  }
                  if(priceList[i].prdPriceInf) {
                    $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-suggested').html(self.removeDollar(priceList[i].prdPriceInf));
                  }
                } else {
                  $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-price').html(self.removeDollar(priceList[i].prdPriceInf));
                }
              }
            }

            if (window.AEMapp.hasOwnProperty('eppProductRelations') && window.AEMapp.hasOwnProperty('eppProductDetails')) {
              self.checkLowPrice(window.AEMapp.eppProductRelations, window.AEMapp.eppProductDetails);
              $('.product-details').find('.epp-suggested').html(window.AEMapp.eppProductRelations[0].lowestPrice);
            }
          }

          if (options.successCallback && typeof options.successCallback === 'function') {
            options.successCallback(priceList);
          }

          if (options.done && typeof options.done === 'function') {
            options.done();
          }
        }
      });
    };

    self.getPriceForEcomProducts = function(modelCodes, options) {
      console.log(modelCodes);
      console.log('getPriceForEcomProducts');
      $.ajax({//switch to getJSON
        url: 'http://samsung.com/us/price/samsungB2CEcomPrice.json',
        dataType: 'json',
        error: function() {
          console.log('error loading /us/price/samsungB2CEcomPrice.json');
          if (options.done && typeof options.done === 'function') {
            options.done();
          }
        },
        success: function(priceList) {
          //alert("success");
          console.log('success');
          if (options.defaultCallback) {
            console.log('priceList.length ' + priceList.length);
            for (var i = 0; i < priceList.length; i++) {
              if (window.AEMapp.hasOwnProperty('eppProductDetails')) {
                var epd = window.AEMapp.eppProductDetails;
                if (epd.hasOwnProperty(priceList[i].prdMdlCd) && epd[priceList[i].prdMdlCd].buyFlag == 'Y') {
                  epd[priceList[i].prdMdlCd].mrspPrice = self.removeDollar(priceList[i].prdPriceInf);
                  if (priceList[i].prdSavePriceInf !== '') {
                    epd[priceList[i].prdMdlCd].samsungPrice = self.removeDollar(priceList[i].prdSavePriceInf);
                  }
                }
              }
              if (priceList[i] !== null && $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\']').data('ecom') == 'Y') {
                if(priceList[i].prdPromoPriceInf !== '') {
                  if(priceList[i].prdPromoPriceInf) {
                    $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-price').html(self.removeDollar(priceList[i].prdPromoPriceInf));
                  }
                  if(priceList[i].prdSavePriceInf) {
                    $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-savings').html(self.removeDollar(priceList[i].prdSavePriceInf));
                  }
                  if(priceList[i].prdPriceInf) {
                    $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-suggested').html(self.removeDollar(priceList[i].prdPriceInf));
                  }
                } else {
                  $(defaults.container + '[data-eppMdlCd = \'' + priceList[i].prdMdlCd + '\'] .epp-price').html(self.removeDollar(priceList[i].prdPriceInf));
                }
              }
            }

            if (window.AEMapp.hasOwnProperty('eppProductRelations') && window.AEMapp.hasOwnProperty('eppProductDetails')) {
              self.checkLowPrice(window.AEMapp.eppProductRelations, window.AEMapp.eppProductDetails);
              $('.product-details').find('.epp-suggested').html(window.AEMapp.eppProductRelations[0].lowestPrice);
            }
          }

          if (options.successCallback && typeof options.successCallback === 'function') {
            options.successCallback(priceList);
          }

          if (options.done && typeof options.done === 'function') {
            options.done();
          }
        }
      });
    };

    self.removeDollar = function(price) {
      function roundPrice(n) {
        if(isNumber(n)){
          return Math.round(n * 100) / 100;
        }
        return n;
      }

      function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      }

      if (price.charAt(0) === '$') {
        return roundPrice(price.substr(1));
      } else {
        return roundPrice(price);
      }
    };

    self.setHTML = function(price) {
      return '<p>' + price + '</p>';
    };

    self.isEppUser = function() {
      var planId = $.cookie('tppid');
      if (!!planId) {
        return true;
      } else {
        return false;
      }
    };

    self.checkLowPrice = function(arr, mcs) {
      arr.forEach(function(it) {
        var low = Number.MAX_SAFE_INTEGER;
        it.modelCodes.forEach(function(mc) {
          if (mcs[mc].mrspPrice < low) {
            low = parseInt(mcs[mc].mrspPrice);
          }
        });
        it.lowestPrice = low;
        if (it.hasOwnProperty('next')) {
          self.checkLowPrice(it.next, mcs);
        }
      });
    };
  };
  AEMapp.EPP = new EPPApp();
})(window, document, jQuery);

/*global AEMapp*/

(function(window, document, $, undefined) {
  'use strict';

  AEMapp.getPageType = function() {
    var pageType = '';
    if ($('#page-template-path').length){
      var typePath = $('#page-template-path').attr('value');
      var typeArray = typePath.split('/');
      var typrText = typeArray[typeArray.length - 1];
      switch (typrText) {
        case 'family-showcase':
          pageType = "b2c|showcase";
          break;
        case 'category-detail':
          pageType = "b2c|category";
          break;
        case 'product-finder':
          pageType = "b2c|category filter";
          break;
        case 'product-detail-generic':
          pageType = "b2c|product page generic";
          break;
        case 'product-detail':
          pageType = "b2c|product page";
          break;
        case 'content-library':
          pageType = "b2c|content library";
                 
      }
    }
    return pageType;
  };
  
})(window, document, jQuery);

/*global window*/
/*global onDomChange*/
/*global jQuery*/

// select the target node

(function($, window, document, undefined) {
  'use strict';
  function AdobeTargetedData() {
    this.attempts = [];
    this.checkattempts = 0;
    this.internval = null;
  }

  AdobeTargetedData.prototype.checkForTargetedData = function() {
    var href;
    var _this = this;
    _this.checkattempts++;
    if (_this.checkattempts < 100) {
      $('.adobe-target-data').each(function(num, el) {
        if (!_this.attempts[$(this).attr('id')] || _this.attempts[$(this).attr('id')] < 2) {
          if (!_this.attempts[$(this).attr('id')]) {
            _this.attempts[$(this).attr('id')] = 1;
          } else {
            _this.attempts[$(this).attr('id')] = 2;
          }
          href = $(this).attr('data-href');
          $.ajax({url: href}).done(function(data) {
            if ($(el).parent().hasClass('animate') && $(el).parent().hasClass('hp-story')) {
              $(el).parent().removeClass('animate');
              $(el).parent().html(data);
              setTimeout(function() {
                $(el).parent().addClass('animate');
              },10);

            } else {
              $(el).parent().html(data);
            }

          });
        } else {
          console.log('too many attempts!!');
        }
      });
    } else {
      clearInterval(_this.internval);
    }
  };

  AdobeTargetedData.prototype.isIframe = function() {
    try {
      return window.frameElement !== null;
    } catch (e) {

    }
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  AdobeTargetedData.prototype.init = function() {
    var _this = this;
    var f = this.checkForTargetedData;
    f.tt = this;
    if (!_this.isIframe() &&
      location.hostname != 'samsungelectronicsamericainc.marketing.adobe.com' &&
      location.hostname != 'us-proxy.adobemc.com') {
      onDomChange(function() {
        if (_this.checkattempts < 20) {
          setTimeout(function() {
            _this.checkForTargetedData();
          },0);
        }
      });
      _this.checkForTargetedData();
      //_this.checkForTargetedData(_this);
      //_this.internval = setInterval(_this.checkForTargetedData.bind(_this), 500);
    }
  };

  $(document).ready(function() {
    var adTarget = new AdobeTargetedData();
    adTarget.init();
  });

})(jQuery, window, document);


(function($, app) {
  'use strict';

  var eppReqSeqGlobal = null;
  var tryCount = 0;
  var dRCount = 0;
  var _that;
  function AddToCart(el, options) {
    this.options = options;
    this.el = el;

    _that = this;
  }

  AddToCart.prototype.init = function(el) {
    _that.createCart(_that.el);
  };

  AddToCart.prototype.start = function(el) {
    $.cookie('DR_CART_CONTENT', 1, {path: '/'});  // TODO: change to samsung domain in production.
    $('#add-to-cart-modal-container .add-to-cart-modal .modal-box .product-summary .preloader .spinner').css({opacity: 1});
    var accessToken;
    if (app.EPP.isEppUser() && $.cookie('dr_a_token') != null) {
      accessToken = $.cookie('dr_a_token');
      eppCheckOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token=' + $.cookie('dr_a_token');
      $('.product-option-shopping').attr('style', 'visibility:hidden');
    } else {
      $('.product-option-shopping').attr('style', 'visibility:visible');
      accessToken = $.cookie('DR_SESSION_TOKEN');
      checkOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token=' + $.cookie('DR_SESSION_TOKEN');
    }
    var prdMdlCd = _that.options.modelCode || $(el).attr('model-cd') ;
    if (ieVersion < 10) {
      window.location.href = 'http://samsung.com/us/shop/checkout/' + prdMdlCd;
    } else {
      _that.cleanCartContainer();
      console.log('https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId=' + prdMdlCd + '&token=' + accessToken);
      $.ajax({
        url: 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId=' + prdMdlCd + '&token=' + accessToken,
        type: 'POST',
        dataType: 'text', // TODO:
        error: function(error) {
          console.log('Error to post product to DR.');
          if ($.cookie('dr_a_token') != null) {
            _that.requestEPPTokenAndTryAgain(prdMdlCd);
          } else {
            _that.requestTokenAndTryAgain(prdMdlCd);
          }
        },
        success: function(response) {
          console.log(response);
          _that.loadCart();
        }
      });
      $('#add-to-cart-modal-container .hidden-phone .product-option a').css({'pointer-events': 'none', 'color': 'grey'});
      $('#add-to-cart-modal-container .hidden-phone .product-option button').attr('disabled', true);
      $('#add-to-cart-modal-container .hidden-phone .product-option button').css('background-color', 'grey');
    }
  };

  AddToCart.prototype.requestEPPTokenAndTryAgain = function() {
    tryCount++;
    $.ajax({
      type: 'GET',
      url: 'http://samsung.com/us/shop/refreshtoken.us',
      dataType: 'json',
      data: {
        eppReqSeq: eppReqSeqGlobal
      },
      success: function(tdata) {
        if (tdata[0].response == 200) {
          _that.setToken(tdata[0]);
          eppCheckOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token=' + $.cookie('dr_a_token');
          if (tryCount > 2) {
            console.log('Please log in and try again.');
          } else {
            console.log('https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId=' + prdMdlCd + '&token=' + tdata[0].accessToken);
            $.ajax({
              url: 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId=' + prdMdlCd + '&token=' + tdata[0].accessToken,
              type: 'POST',
              dataType: 'text', // TODO:
              error: function(error) {
                console.log('Error to post product to DR.');
              },
              success: function(response) {
                console.log(response);
                _that.loadCart();
              }
            });
          }
        }
      }
    });
  };

  AddToCart.prototype.requestTokenAndTryAgain = function(prdMdlCd) {
    tryCount++;
    $.ajax({
      url: 'https://shop.us.samsung.com/store/samsung/SessionToken?apiKey=5de150dc29228095f9811cdf15ea5938&format=json',
      type: 'GET',
      async: false,
      contentType: 'application/json',
      dataType: 'jsonp',
      error: function() {
        console.log('error to get token');
      },
      success: function(data) {
        $.cookie('DR_SESSION_TOKEN', data.access_token, {path: '/'}); // TODO: change to samsung domain in production.
        checkOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token=' + $.cookie('DR_SESSION_TOKEN');
        if (tryCount > 2) {
          console.log('Please close browser and try again.');
        } else {
          console.log('https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId=' + prdMdlCd + '&token=' + data.access_token);
          $.ajax({
            url: 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId=' + prdMdlCd + '&token=' + data.access_token,
            type: 'POST',
            dataType: 'text', // TODO:
            error: function(error) {
              console.log('Error to post product to DR.');
            },
            success: function(response) {
              console.log(response);
              _that.loadCart();
            }
          });
        }
      }
    });
  };

  AddToCart.prototype.loadCart = function() {
    if (/Edge\/|Trident\/|MSIE/.test(window.navigator.userAgent)){
      if ($.cookie('tppid') != null) {
        sessionStorage.setItem('eppPlanId', $.cookie('tppid'));
      }
      if (sessionStorage.getItem('eppPlanId') != null) {
        $.cookie('tppid', sessionStorage.getItem('eppPlanId'), {path: '/'});  // TODO: change to samsung domain in production.
      }
      if ($.cookie('tmktid') != null) {
        sessionStorage.setItem('eppMarketId', $.cookie('tmktid'));
      }
      if (sessionStorage.getItem('eppMarketId') != null) {
        $.cookie('tmktid', sessionStorage.getItem('eppMarketId'), {path: '/'});  // TODO: change to samsung domain in production.
      }
    }
    if (ieVersion < 10) {
      _that.loadIECartSummary();
    }
    if (app.EPP.isEppUser()) {
      var accessToken = $.cookie('dr_a_token');
      if (!!accessToken) {
        _that.loadEPPCartSummary();
      } else {
        _that.getEppInfo();
      }
    } else {
      if ($.cookie('DR_CART_CONTENT') === 0) {
        $('#inner-wrap > header > div.big-header.visible-tablet.visible-desktop > div.header-top > div > ul > li.cart.top > a > b').text('0');
        _that.showEmpty();
      } else {
        _that.loadDRCartSummary();
      }
    }
  };

  AddToCart.prototype.getEppInfo = function() {
    var planId = $.cookie('tppid');
    var referralUrl = $.cookie('trefurl');
    var marketId  = $.cookie('tmktid');
    var eppReqSeq = $.cookie('eppReqSeq');
    eppReqSeqGlobal = eppReqSeq;

    $.ajax({
      url: 'http://samsung.com/us/shop/eppInfo.us',
      dataType: 'json',
      data: {
        planId: planId,
        referralUrl: referralUrl,
        marketId: marketId,
        eppReqSeq: eppReqSeq
      },
      success: function(data) {
        _that.setToken(data[0]);
        _that.loadEPPCartSummary();
      }
    });
  };

  AddToCart.prototype.setToken = function(tokenTO) {
    $.cookie('dr_a_token', tokenTO.accessToken, {path: '/'});  // TODO: change to samsung domain in production.
    $.cookie('dr_r_token', tokenTO.refreshToken, {expires: 1, path: '/'});  // TODO: change to samsung domain in production.
  };

  var dRStoreDomain = '//shop.us.samsung.com';
  AddToCart.prototype.loadIECartSummary = function() {
    $.getJSON(dRStoreDomain + '/store/samsung/DisplayDRCartSummary/Version.2/output.json?jsonp=?', {
      format: 'json'
    }).done(function(cartSummaryData) {
      var cartNum = cartSummaryData.lineItems;
      if(cartNum == 0) {
        cartNum = '';
      }
      $('.cart-basket').text(cartNum);

      if(cartNum > 9) {
        $('.cart-basket').addClass('sm');
      } else {
        $('.cart-basket').removeClass('sm');
      }

      if (cartSummaryData && cartNum > 0) {
        $.cookie('DR_CART_CONTENT', 1, {path: '/'}); // TODO: change to samsung domain in production.
        var timestamp = new Date().getTime();
        $.ajax({
          url: dRStoreDomain + '/integration/job/request/ShoppingCartService/defaults/site/?%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3CGet%20siteID%3D%22samsung%22%20locale%3D%22en_US%22%3E%3CbaseFields%3E%3CdisplayName/%3E%3C/baseFields%3E%3Cattributes%3E%3Cthumbnail/%3E%3C/attributes%3E%3C/Get%3E%3C%21--jsonp=smg.global.digitalRiver.cartSummaryCallback--%3E%3C%21--' + timestamp + '--%3E',
          dataType: 'jsonp',
          jsonp: false,
          cache: true
        });
      } else {
        _that.showEmpty();
        $.cookie('DR_CART_CONTENT', 0, {path: '/'}); // TODO: change to samsung domain in production.
      }
    });
  };

  AddToCart.prototype.loadEPPCartSummary = function() {
    var access_token = $.cookie('dr_a_token');
    $.ajax({
      type: 'GET',
      url: 'https://api.digitalriver.com/v1/shoppers/me/carts/active?expand=lineitems.lineitem.product.externalreferenceid%2Clineitems.lineitem.product.id&callback=?&format=json&token=' + access_token,
      dataType: 'jsonp',
      jsonpCallback: 'AEMapp.addToCart.eppCartCallback',
      jsonp: 'callback'
    });
  };

  AddToCart.prototype.eppCartCallback = function(data) {
    if (typeof(data.errors) != 'undefined') {
      console.log('refreshtoken');
      var code = data.errors.error.code || data.errors.error[0].code;
      if (code == 'invalid_token' || code == 'invalid token') {
        $.ajax({
          type: 'GET',
          url: 'http://samsung.com/us/shop/refreshtoken.us',
          dataType: 'json',
          data: {
            eppReqSeq: eppReqSeqGlobal
          },
          success: function(tdata) {
            if (tdata[0].response == 200) {
              _that.setToken(tdata[0]);
              _that.loadEPPCartSummary();
            }
          }
        });
      }
    } else {
      _that.showCart(data);
    }
  };

  AddToCart.prototype.loadDRCartSummary = function() {
    $.ajax({
      type: 'GET',
      url: 'https://api.digitalriver.com/v1/shoppers/me/carts/active?expand=lineitems.lineitem.product.externalreferenceid%2Clineitems.lineitem.product.id&callback=?&format=json&token=' + $.cookie('DR_SESSION_TOKEN'),
      dataType: 'jsonp',
      jsonpCallback: 'AEMapp.addToCart.dRCartCallback',
      jsonp: 'callback'
    });
  };

  AddToCart.prototype.dRCartCallback = function(data) {
    if (typeof(data.errors) != 'undefined') {
      if (data.errors.error[0].code == 'invalid token' || data.errors.error[0].code == 'invalid_token') {
        dRCount++;
        $.ajax({
          url: 'https://shop.us.samsung.com/store/samsung/SessionToken?apiKey=5de150dc29228095f9811cdf15ea5938&format=json',
          type: 'GET',
          async: false,
          contentType: 'application/json',
          dataType: 'jsonp',
          error: function() {
            console.log('error to get token');
          },
          success: function(data) {
            console.log(data.access_token);
            $.cookie('DR_SESSION_TOKEN', data.access_token, {path: '/'});  // TODO: change to samsung domain in production.
            if (dRCount > 3) {
              console.log('Please check whether your domain is under samsung.com');
            } else {
              _that.loadDRCartSummary();
            }
          }
        });
      }
    } else {
      dRCount = 0;
      _that.showCart(data);
    }
  };

  AddToCart.prototype.showEmpty = function() {
    var itemContainer = $('.item-container');
    $('.purchase-options').css('display', 'none');
    if (itemContainer.length > 0) {
      if (itemContainer.children().length == 0) {
        itemContainer.prepend('<p class="gnb-empty-cart">Your shopping cart is empty.</p>');
      }
    } else {
      $('.cart-container').prepend('<div class="item-container"><p class="gnb-empty-cart">Your shopping cart is empty.</p></div>');
    }
  };

  AddToCart.prototype.showCart = function(data) {
    $('.cart-basket').text(data.cart.totalItemsInCart);
    if(data.cart.totalItemsInCart > 9) {
      $('.cart-basket').addClass('sm');
    } else {
      $('.cart-basket').removeClass('sm');
    }
    if (isIE()) {
      $('.gnb-b2c-icons-cart a').remove('svg').prepend('<svg viewBox="0 0 100 100" id="cart-open"><circle cx="28" cy="90" r="10"/><circle cx="86" cy="90" r="10"/>' +
        '<path d="M86 14v42H28V13.86C28 6.205 21.794 0 14.14 0H0v14h14v42c0 7.732 6.268 14 14 14h58c7.732 0 14-6.268 14-14V14H86z"/></svg>');
    } else {
      if (!$('.gnb-b2c-icons-cart a svg use').attr('xlink:href','img/sprite.symbol.svg#cart-open')) {
        $('.gnb-b2c-icons-cart a svg use').attr('xlink:href','img/sprite.symbol.svg#cart-open');
      }
    }
    if (data.cart.totalItemsInCart > 0) {
      _that.cleanCartContainer();
      $('.purchase-options').css('display', 'block');
      var items = data.cart.lineItems.lineItem;
      var itemsCount = items.length;
      var $CART_CONTAINER = $('.cart-container');
      var outputHtml = '<div class="item-container">';
      var itemsEndHtml = '</div>';
      var productString = '';
      var showItems = itemsCount;
      if (itemsCount > 4) {
        showItems = 4;
      }
      for (var i = 0; i < showItems; i++) {
        var scItem = items[i];
        var productID = scItem.product.id;
        var lineItemId = scItem.id;
        var externalReferenceID = scItem.product.externalReferenceId;
        productString = productString + externalReferenceID + ' ';
        var qty = scItem.quantity;
        var displayName = scItem.product.displayName;
        var tagDisplayName = displayName.replace(/["]+/g, '&quot;');
        var price = scItem.pricing.formattedSalePriceWithQuantity;
        var priceConvert = price.replace(/[$,]+/g, '');
        var rawPrice = parseFloat(priceConvert);
        var imageSrc = scItem.product.thumbnailImage;
        var imageShow;
        if(imageSrc != null && imageSrc.indexOf('thumbnail/') > -1){
          imageShow = imageSrc.split('thumbnail/')[1];
        }else{
          imageShow = imageSrc;
        }
        var row = '<div class="mini-cart-item" data-cart-price="' + rawPrice + '" data-cart-qty="'+qty+'">' +
          '<div class="product-image"><img data-link_cat="mini cart click" data-link_id="minicart_view_product_'+productID+'" data-link_meta="link_name: view product>'+tagDisplayName+'" data-link_position="minicart" width="70" height="70" href="#" onclick="replaceUrl('+productID+');" src="' + imageShow + '"/></div>' +
          '<div class="product-info"><div class="product-details"><span class="product-name"><a data-link_cat="mini cart click" data-link_id="minicart_view_product_'+productID+'" data-link_meta="link_name: view product>'+tagDisplayName+'" data-link_position="minicart" href="#" onclick="replaceUrl('+productID+');">' + displayName +'</a></span>' +
          '<span class="remove-button"><a data-link_cat="remove from cart" data-link_id="gnb_cart_'+productID+'_removefromcart" data-link_meta="link_name: remove from cart" data-link_position="GNB '+productID+'" data-product_info="id:'+productID+'|cat_id:'+externalReferenceID+'|name:'+tagDisplayName+'|price:'+price+'" href="javascript:window.AEMapp.addToCart.removeItem('+lineItemId+')"><span class="icon-cross"></span></a></span></div>' +
          '<div class="purchase-details"><span class="quantity">QTY: ' + qty + '</span><span class="product-price">' + price + '</span></div></div></div>';
        outputHtml += row;
      }
      outputHtml += itemsEndHtml;
      var subTotal = data.cart.pricing.formattedSubtotal;
      var checkoutHref = $('.gnb-checkout-link').attr('href');
      var token = '';

      if($.cookie("dr_a_token") != null){
        token = $.cookie('dr_a_token');
      }else{
        token = $.cookie('DR_SESSION_TOKEN');
      }
      $('.gnb-checkout-link').add('.gnb-view-cart').attr('href',checkoutHref + token);
      $CART_CONTAINER.prepend(outputHtml);
      //
      $('.add-to-cart-modal.hidden-phone .product-summary-number').text('SUBTOTAL (' + data.cart.totalItemsInCart + ' Items)');
      $('.add-to-cart-modal.hidden-phone .product-summary-total').text(subTotal);
      $('#add-to-cart-modal-container .hidden-phone .product-option a').css({'pointer-events': 'auto','color': '#20a2ff'});
      $('#add-to-cart-modal-container .hidden-phone .product-option button').attr('disabled', false);
      $('#add-to-cart-modal-container .hidden-phone .product-option button').css('background-color', '#308EEA');
      $('#add-to-cart-modal-container .add-to-cart-modal .modal-box .product-summary .preloader .spinner').css({opacity: 0});

      var subQty = 0; // reset subTotal on recalc
      $('.mini-cart-item').each(function() {
        var price = parseFloat($(this).data('cart-price'));
        var qty = parseInt($(this).data('cart-qty'));
        subQty += qty;
      });

      $('.sum-price').text(subTotal);
      $('.subQty').attr('data-cart-subQty', subQty);
      if (subQty == 1) {
        $('.subQty').text('(' + subQty + ' item)');
      } else {
        $('.subQty').text('(' + subQty + ' items)');
      }
      if (app.EPP.isEppUser()) {
        $('.gnb-checkout a').text('Checkout').attr('href', eppCheckOut);
      } else {
        $('.gnb-checkout a').text('Checkout').attr('href', checkOut);
      }
    } else {
      if (isIE()) {
        $('.gnb-b2c-icons-cart a').remove('svg').prepend('<svg viewBox="0 0 18.862 17.834" id="cart"><circle cx="5.83" cy="15.964" r="1.87"/><circle cx="16.222" cy="15.964" r="1.87"/>' +
          '<path d="M5.638 2.534v-.548C5.638.83 4.728 0 3.37 0H0v2.534h3.12v7.4c0 1.358 1.102 2.458 2.46 2.458h10.823c1.358 0 2.458-1.1 2.458-2.458v-7.4H5.64zm10.706 7.34H5.638V5.037h10.705v4.84z"/>' +
          '<rect class="btn" fill="transparent" x="0" y="0" width="100%" height="100%" /></svg>');
      } else {
        if (!$('.gnb-b2c-icons-cart a svg use').attr('xlink:href','img/sprite.symbol.svg#cart')) {
          $('.gnb-b2c-icons-cart a svg use').attr('xlink:href','img/sprite.symbol.svg#cart');
        }
      }
      $('.cart-basket').text('');
      if ($('.item-container').is(':empty')) {
        $('.item-container').append('<p class="gnb-empty-cart">Your shopping cart is empty.</p>');
      }
      $('.gnb-checkout a').text('Go To Shop').attr('href', 'shop-landing-page.html');
      _that.showEmpty();
      $.cookie('DR_CART_CONTENT', 0, {path: '/'});  // TODO: change to samsung domain in production.
    }
  };

  AddToCart.prototype.createCart = function(el) {
    if ($('#add-to-cart-modal-container')) {
      $('#add-to-cart-modal-container').remove();
    }
    var outputHtml = '<div id="add-to-cart-modal-container">';
    var endHtml = '</div>';
    var checkOut = '<div class="add-to-cart-modal hidden-phone">' +
      '<div class="modal-box"><h3 class="add-to-cart-label">Item Added</h3><div class="product-block">' +
      '<div class="product-img"><img src="' + _that.options.image + '"></div>' +
      '<div class="product-info"><div class="product-info-name">' + _that.options.info + '</div>' +
      '<div class="product-info-price">' + _that.options.price + '</div><div class="product-info-quantity">QTY:' +
      _that.options.quantity + '</div></div></div>' +
      '</div><div class="modal-box"><h3 class="add-to-cart-label">Shopping Cart</h3>' +
      '<div class="product-summary"><div class="preloader"><div class="spinner">' +
      '<div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div><div class="bounce4"></div>' +
      '</div></div><span class="product-summary-number">subtotal</span><span class="product-summary-total"></span></div>' +
      '<div class="product-option"><a class="product-option-shopping">VIEW SHOPPING CART</a>' +
      '<button class="product-option-checkout">checkout</button></div></div><span class="icon-x" id="add-to-cart-close"></span></div>' +
      '<div class="add-to-cart-modal hidden-desktop"><h3>Item Added to Cart</h3><div class="product-option">' +
      '<button class="product-option-shopping">view cart</button><button class="product-option-checkout">checkout</button>' +
      '</div><icon class="icon-x" id="add-to-cart-close-mobile"></icon></div>';

    outputHtml += checkOut;
    outputHtml += endHtml;
    $('body').append(outputHtml);

    _that.eventHandler();
    _that.start(_that.el);
  };

  AddToCart.prototype.cleanCartContainer = function() {
    var div = $('div');
    div.remove('.item-container');
    $('.sum-price').text('').data('cart-subtotal','');
    $('.subQty').text('').data('cart-subqty','');
    div.remove('.mobile-cart-total');
    div.remove('.chevron-up');
  };

  AddToCart.prototype.eventHandler = function() {
    $('#add-to-cart-modal-container').focusout(function() {
      $('#add-to-cart-modal-container').remove();
    });

    $('#add-to-cart-close').click(function() {
      $('#add-to-cart-modal-container').remove();
    });

    $('#add-to-cart-close-mobile').click(function() {
      $('#add-to-cart-modal-container').remove();
    });

    $('#add-to-cart-modal-container').find('.product-option-shopping').click(function() {
      $('#add-to-cart-modal-container').remove();
      if ($.cookie('dr_a_token') != null) {
        window.location.href = eppCheckOut;
      } else {
        window.location.href = checkOut;
      }
    });

    $('#add-to-cart-modal-container').find('.product-option-checkout').click(function() {
      if ($.cookie('dr_a_token') != null) {
        window.location.href = eppCheckOut;
      } else {
        window.location.href = checkOut;
      }
    });
  };

  try {
    var accessToken;
    if ($.cookie('dr_a_token') != null) {
      accessToken = $.cookie('dr_a_token');
    } else {
      accessToken = $.cookie('DR_SESSION_TOKEN');
    }
    var eppCheckOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token=' + $.cookie('dr_a_token');
    var checkOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token=' + $.cookie('DR_SESSION_TOKEN');
  } catch (err) {
    console.log(err);
  }
  var ieVersion = (function() {
    var undef,
      v = 3,
      div = document.createElement('div'),
      all = div.getElementsByTagName('i');

    while (
      div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
        all[0]
      );
    return v > 4 ? v : undef;
  }());

  function isIE() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
      return true;
    } else {
      return false;
    }
  }

  function fortune(cookie) {
    return String($.cookie(cookie))
      .replace(/<script>/g,'')
      .replace(/<\/script>/g,'')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function replaceUrl(id){
    $.ajax({
      url : 'https://api.digitalriver.com/v1/shoppers/me/products?expand=product.customAttributes.pdPageURL&apiKey=5de150dc29228095f9811cdf15ea5938&productId='+id,
      dataType: 'xml',
      error : function() {
        console.log("Error to get pdp page of product "+id);
      },
      success : function(products) {
        console.log(products);
        var pdp_link = $(products).find('customAttributes').find('attribute[name="pdPageURL"]').text();
        window.location.href = pdp_link;
      }
    });
  }

  AddToCart.prototype.removeItem = function(id) {
    _that.cleanCartContainer();
    var loading='<div class="preloader"><div class="spinner" style="display: none;">' +
      '<div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div><div class="bounce4"></div></div></div>';
    $('.cart-container').prepend(loading);
    $('.spinner').fadeIn();
    var accToken;
    if($.cookie("dr_a_token") != null){
      accToken = $.cookie('dr_a_token');
    }else{
      accToken = $.cookie('DR_SESSION_TOKEN');
    }
    $.ajax({
      url: 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items/'+id,
      type: 'DELETE',
      data: {token:accToken},
      error : function() {
        console.log('Error delete item' + id);
      },
      success : function() {
        console.log('Delete item done' + id);
        _that.loadCart();
        $('.preloader').fadeOut(function() {
          $(this).remove();
        });
      }
    });
  };

  $.fn.addToCart = function(options) {
    try {
      var defaults = {};
      var setting = $.extend({}, defaults, options);
      var addToCart = new AddToCart(this, setting);
      addToCart.init(this);
      app.addToCart = addToCart;
    } catch (err) {
      console.log('cant run cart');
    }

  };

  app.addToCart = new AddToCart();
  app.addToCart.loadCart();
})(jQuery, window.AEMapp);

