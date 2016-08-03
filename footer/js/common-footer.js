/*!
 * samsung.com - Phase2 - Common Footer Component
 * src : js/src/smg/aem/components/common/footer/common-footer.js
 *
 * @version 1.0.0
 * @since 2016.06.10
 */
;(function (win, $) {
    'use strict';

    if('undefined' === typeof win.smg) {
        win.smg = {};
    }

    if('undefined' === typeof win.smg.aem) {
        win.smg.aem = {};
    }

    if('undefined' === typeof win.smg.aem.components) {
        win.smg.aem.components = {};
    }

    if('undefined' === typeof win.smg.aem.components.common) {
        win.smg.aem.components.common = {};
    }

    // Static Values
    var V_STATIC = win.smg.aem.varStatic,
    // Utility Script
    UTIL = win.smg.aem.util;

    var namespace = win.smg.aem.components.common;

    /**
     * @name window.smg.aem.components.common.footer
     * @namespace
     * @requires jQuery
     * @requires namespace.js
     * @requires window.smg.static.js
     * @requires window.smg.util.js
     */
    namespace.footer = (function() {
        /**
         * @description Default Options
         * @private
         * @type {Object}
         */
        var defParams = {
            wrap: '.gb-footer',
            popSelector: '.popWin', 
            backToTopSelecotr: '.gb-footer__btn-top', 
            backToTopSpeed : 1000
        };
        return {
            init : function(container, args) {
                if (!(this.container = container).size()) return;
                this.opts = UTIL.def(defParams, (args || {}));
                this.setElements();
                this.setBindEvents();
            }, 
            setElements : function() {
                var agent = navigator.userAgent.toLowerCase();
                this.screenW = screen.availWidth;
                this.screenH = 0;
                if(agent.indexOf("chrome") != -1){ //chrome
                    this.screenH = screen.availHeight - 63;
                }else if(agent.indexOf("firefox") != -1){//firefox
                    this.screenH = screen.availHeight - 63;
                }else{//etc
                    this.screenH = screen.availHeight - 70;
                }
                this.htmlBody = $("html, body");
                this.wrap = $(this.opts.wrap);
                this.popSelector = this.wrap.find(this.opts.popSelector);
                this.backToTopSelecotr = this.wrap.find(this.opts.backToTopSelecotr).find("a");
            },
            setBindEvents : function() {
                var _this = this;
                this.popSelector.each(function(){
                    $(this).on(
                        "click", $.proxy(_this.windowPopup, _this)
                    );
                });

                this.backToTopSelecotr.on(
                    "click", $.proxy(_this.backToTopAnimate, _this)
                );
            },
            windowPopup : function(e) {
                e.preventDefault();
                var target = $(e.currentTarget);
                var popupLink = target.attr("href");
                var popupOptions = target.data("pop-options");
                var popupPosition = [];
                var popupWidth = this.getPopupWidth(popupOptions.width);
                var popupHeight = this.getPopupHeight(popupOptions.height);

                popupPosition = this.getPopupPosition(popupWidth, popupHeight);
                popupPosition[0] = (popupOptions.width > popupWidth) ? 0 : popupPosition[0];
                popupPosition[1] = (popupOptions.height > popupHeight) ? 0 : popupPosition[1];

                var winPopParams = "left="+popupPosition[0];
                winPopParams += ", top="+popupPosition[1];
                winPopParams += ", width="+popupWidth;
                winPopParams += ", height="+popupHeight;
                winPopParams += ",scrollbars=yes";
                winPopParams += ",location=no";
                winPopParams += ",menubar=no";
                winPopParams += ",titlebar=no";
                winPopParams += ",toolbar=no";
                winPopParams += ",status=no";

                var winPop = window.open(popupLink, "", winPopParams);
                if($(win).focus()){
                    winPop.focus();
                }

            },
            getPopupHeight : function(h){
                var popupHeight = h;
                if(popupHeight >= this.screenH){
                    popupHeight = this.screenH;
                }
                return popupHeight;
            },
            getPopupWidth : function(w){
                var popupWidth = w;
                if(popupWidth >= this.screenW){
                    popupWidth = this.screenW;
                }
                return popupWidth;
            },
            getPopupPosition : function(w, h) {
                var returnArray = [];
                returnArray[0] = Math.round((this.screenW - w) / 2);
                returnArray[1] = Math.round((this.screenH - h) / 2);
                return returnArray;
            },
            backToTopAnimate : function(){
                var _this = this;
                this.htmlBody.animate({scrollTop : 0}, _this.opts.backToTopSpeed);
                return false;
            }

        };
    })();

    $(function() {
        namespace.footer.init($('body'));
    });
})(window, window.jQuery);