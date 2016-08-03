/*!
 * samsung.com - Phase2 - Common GNB
 * src : js/src/smg/aem/components/common/gnb/common-gnb.js
 *
 * @version 1.0.0
 * @since 2016.06.03
 */
;(function (win, $) {
  'use strict';

  if('undefined' === typeof win.smg) {
    win.smg = {};
  }

  if('undefined' === typeof win.smg.aem) {
    win.smg.aem = {};
  }

  if('undefined' === typeof win.smg.aem.common) {
    win.smg.aem.common = {};
  }

  var namespace = win.smg.aem.common;

  // V_STATIC Values
  var V_STATIC = win.smg.aem.varStatic,
  // Custom Events
  CST_EVENT = win.smg.aem.customEvent;

  namespace.gnb = (function()
  {
    var custom = {
      body : 'body',
      header : '#header'
    }

    var device = {
      type : V_STATIC.RESPONSIVE.DESKTOP.NAME
    }

    var nodeNmMgr = { //node name manager
      addClsGnbOpen : function()
      {
        var name = 'gb-gnb-open';
        $(custom.body).addClass(name);
      },
      removeClsGnbOpen : function()
      {
        var name = 'gb-gnb-open';
        $(custom.body).removeClass(name);
      },
      addClsGnbFixed : function()
      {
        var name = 'gb-gnb-fixed';
        $(custom.body).addClass(name);
      },
      removeClsGnbFixed : function()
      {
        var name = 'gb-gnb-fixed';
        $(custom.body).removeClass(name);
      },
      dropLayerOpen  : function() { nodeNmMgr.addClsGnbOpen(); },
      dropLayerClose : function() { nodeNmMgr.removeClsGnbOpen(); },
      cartLayerOpen    : function() { nodeNmMgr.addClsGnbFixed(); },
      cartLayerClose   : function() { nodeNmMgr.removeClsGnbFixed(); },
      mypageLayerOpen  : function() { nodeNmMgr.addClsGnbFixed(); },
      mypageLayerClose : function() { nodeNmMgr.removeClsGnbFixed(); },
      searchLayerOpen  : function() { nodeNmMgr.addClsGnbFixed(); },
      searchLayerClose : function() { nodeNmMgr.removeClsGnbFixed(); }
    }

    var ui = {
      cartLayerClose : function()
      {
        $(custom.header).find('.gb-gnb__cart-layer').fadeOut(0);
        nodeNmMgr.cartLayerClose();
      },
      destroyMobile : function()
      {
        drilldown.destroy();

        var header = $(custom.header),
        evtLyr = header.find('.gb-gnb__search');

        if($(custom.body).hasClass('gb-gnb-open'))
        {
          header.find('.gb-gnb__bar .js-mo-close').trigger('click');
        }

        evtLyr.find('.gb-gnb__search__suggest').fadeOut(0);
        // evtLyr.css({'display': 'none', 'margin-top' : -200});
        evtLyr.removeClass('gb-gnb-search--open');

        header.find('.gb-gnb__drop-mobile').css('display', 'none');
        header.find('.gb-gnb__cart-layer').fadeOut(0);
        header.find('.gb-gnb__my-layer').fadeOut(0);

        nodeNmMgr.removeClsGnbFixed();
      },
      destroyDesktop : function()
      {
        drilldown.init();

        var header = $(custom.header),
        evtLyr = header.find('.gb-gnb__search');

        var selectedElmt = header.find('[aria-selected=true]');
        selectedElmt.attr('aria-selected', 'false')
        .end().find('.gb-gnb__drop-desktop').removeAttr('style');

        nodeNmMgr.dropLayerClose();

        evtLyr.find('.gb-gnb__search__suggest').fadeOut(0);
        // evtLyr.css({'margin-top': 0, 'display': 'none'});
        evtLyr.removeClass('gb-gnb-search--open');

        nodeNmMgr.removeClsGnbFixed();

        ui.cartLayerClose();

      }//destroyDesktop
    }

    var evt = function()
    {
      $(custom.body).on(CST_EVENT.RESPONSIVE.CHANGE, $.proxy(onResponsiveChange, this));
      $(custom.body).trigger(CST_EVENT.RESPONSIVE.GET_STATUS);
    }//evt

    var header = $(custom.header);

    var gnbMain = {
      init : function(){
        this.opts();
        this.setElements();
        this.bindEventHandlers();
      },
      opts : function(){
        this.delay = 100;
        this.gnbSub = '.gb-gnb__drop-desktop';
        this.gnbSubClose = '.s-ico-close';
      },
      setElements : function(){
        this.menuWrap = header.find('.gb-gnb__bar__main');
        this.menuChild = this.menuWrap.children();
      },
      bindEventHandlers : function(){
        this.menuChild.on('mouseenter mouseleave', $.proxy(this.onMouseLayer, this));
        this.menuChild.on('keydown', $.proxy(this.onKeyboardLayer, this));
      },
      onMouseLayer : function(e){
        var _this = this;
        this.onChild = $(e.currentTarget);
        if(e.type == 'mouseenter'){
          if(!this.onChild.find(this.gnbSub).is(':visible') && this.onChild.attr('aria-selected')){
            this.onChild.attr('aria-selected','true').find(this.gnbSub).stop().fadeIn(_this.delay);
          }
        }else if(e.type == 'mouseleave'){
          if(this.onChild.find(this.gnbSub).is(':visible')){
            this.onChild.attr('aria-selected','false').find(this.gnbSub).stop().fadeOut(_this.delay);
          }
        }
        this.onChild.find(this.gnbSub).find(this.gnbSubClose).on('click', $.proxy(this.mouseCloseLayer, this));
      },
      mouseCloseLayer : function(e){
        e.preventDefault();
        var _this = this,
        $this = $(e.currentTarget).closest(this.gnbSub);
        $this.stop().fadeOut(_this.delay);
      },
      onKeyboardLayer : function(e){
        if(e.keyCode === 13){
          var _this = this;
          this.onChild = $(e.currentTarget);
          this.onChildTarget = $(e.target);
          if(this.onChildTarget.hasClass('js-toggler')){
            if(!this.onChild.find(this.gnbSub).is(':visible') && this.onChild.attr('aria-selected')){
              this.onChild.attr('aria-selected','true').find(this.gnbSub).stop().fadeIn(_this.delay);
              this.onChild.find(this.gnbSub).find(this.gnbSubClose).on('keydown', $.proxy(this.keyboardCloseLayer, this));
              this.onChild.on('clickoutside', $.proxy(this.onClickOutside, this));
            }else{
              this.onChild.attr('aria-selected','false').find(this.gnbSub).stop().fadeOut(_this.delay);
              this.onChild.find(this.gnbSub).find(this.gnbSubClose).off('keydown', $.proxy(this.keyboardCloseLayer, this));
              this.onChild.off('clickoutside', $.proxy(this.onClickOutside, this));
            }
          }
        }
      },
      keyboardCloseLayer : function(e){
        if(e.keyCode === 13){
          e.preventDefault();
          var _this = this,
          $this = $(e.currentTarget).closest(this.gnbSub);
          this.onChild.find('.js-toggler:eq(0)').focus();
          $this.stop().fadeOut(_this.delay);
        }
      },
      onClickOutside : function(e){
        var _this = this,
        $this = $(e.currentTarget);
        $this.attr('aria-selected','false').find(this.gnbSub).stop().fadeOut(_this.delay);
        $this.off('clickoutside', $.proxy(this.onClickOutside, this));
      }
    }

    var gnbTogger = {
      init : function()
      {
        this.opts();
        this.setElmt();
        this.bindEvent();
      },
      opts : function()
      {
        this.delay = 200;
      },
      setElmt : function()
      {
        this.toggler = header.find('.s-gnb-toggler'),
        this.layer = header.find('.gb-gnb__drop-mobile'),
        this.closeBtn = header.find('.gb-gnb__bar .js-mo-close');
      },
      bindEvent : function()
      {
        this.toggler.on('click', $.proxy(this.fadeToggleLayer, this));
        this.closeBtn.on('click', $.proxy(this.fadeToggleLayer, this));
      },
      fadeToggleLayer : function(e)
      {
        this.outsideCallback(false);
        var _this = this;
        if(!$(custom.body).hasClass('gb-gnb-open')) drilldown.reset();

        $(custom.body).toggleClass('gb-gnb-open');
        if($(custom.body).hasClass('gb-gnb-open'))
        {
          this.layer.fadeIn(this.delay, $.proxy(this.fadeInComplete, this));
        } else {
          this.toggler.focus();
          this.layer.fadeOut(this.delay);
          this.layer.off('clickoutside', $.proxy(this.onClickOutside, this));
        }
      },
      fadeInComplete : function(e){
        this.layer.find('.s-depth1-link').eq(0).focus();
        this.layer.on('clickoutside', $.proxy(this.onClickOutside, this));
      },
      onClickOutside : function(e){
        $(custom.body).removeClass('gb-gnb-open');
        this.layer.fadeOut(this.delay);
        this.layer.off('clickoutside', $.proxy(this.onClickOutside, this));
      },
      outsideCallback : function(_type){
        if(_type){
          this.layer.on('clickoutside', $.proxy(this.onClickOutside, this));
        }else{
          this.layer.off('clickoutside', $.proxy(this.onClickOutside, this));
        }
      }
    }

    var myMenu = {
      init : function(){
        this.opts();
        this.setElements();
        this.bindEventHandlers();
      },
      opts : function(){
        this.delay = 100;
      },
      setElements : function(){
        this.menuWrap = header.find('.gb-gnb__bar .s-ico-mymenu').closest('.s-mymenu');
        this.menuLayer = header.find('.gb-gnb__my-layer');
      },
      bindEventHandlers : function(){
        this.menuWrap.on('mouseenter mouseleave', $.proxy(this.onMouseLayer, this));
        this.menuWrap.on('keydown', $.proxy(this.onKeyboardLayer, this));
      },
      onMouseLayer : function(e){
        var _this = this;
        if(e.type == 'mouseenter'){
          this.menuLayer.stop().fadeIn(_this.delay);
        }else if(e.type == 'mouseleave'){
          this.menuLayer.stop().fadeOut(_this.delay);
        }
      },
      onKeyboardLayer : function(e){
        if(e.keyCode === 13){
          var _this = this;
          this.onChildTarget = $(e.target);
          if(this.onChildTarget.hasClass('s-ico-mymenu')){
            if(!this.menuLayer.is(':visible')){
              this.menuLayer.stop().fadeIn(_this.delay);
              this.menuWrap.on('clickoutside', $.proxy(this.onClickOutside, this));
            }else{
              this.menuLayer.stop().fadeOut(_this.delay);
              this.menuWrap.off('clickoutside', $.proxy(this.onClickOutside, this));
            }
          }
        }
      },
      onClickOutside : function(e){
        var _this = this,
        $this = $(e.currentTarget);
        this.menuLayer.stop().fadeOut(_this.delay);
        $this.off('clickoutside', $.proxy(this.onClickOutside, this));
      }
    }

    var popAlign = {
      init : function()
      {
        this.setElmts();
        this.bindEvents();
      },
      setElmts : function()
      {
        this.layer = $('#loginLayerPopup .popAlign');
      },
      bindEvents : function()
      {
        $(win).on('resize', $.proxy(this.resizeListener, this));
        $(win).trigger('resize');
      },
      resizeListener : function()
      {
        var winWidth = $(win).width(),
        winHeight = win.innerHeight || document.documentElement.clientHeight ||document.body.clientHeight;

        var popWidth = this.layer.outerWidth(),
        popHeight = this.layer.outerHeight();

        var left = (winWidth - popWidth) / 2,
        top = 0;

        if(popHeight < winHeight)
        {
          top = (winHeight - popHeight) / 2;
        }
        this.layer.css({'left': left, 'top': top });
      }
    }

    var signIn = {
      init : function(){
        this.setElements();
        this.bindEventHandlers();
      },
      setElements : function(){
        this.pcBtn = header.find('.gb-gnb__bar .s-ico-login').closest('.s-mymenu');
        this.moBtn = header.find('.gb-gnb__drop-mobile .s-signin');
        this.popWrap = $(custom.body).find('#loginLayerPopup');
        this.popLayer = $(custom.body).find('#loginLayerPopup .popAlign');
        this.skrimLayer = $(custom.body).find('#dimContainer .lightbox-skrim');
      },
      bindEventHandlers : function(){
        this.pcBtn.on('click', $.proxy(this.onClickLayer, this));
        this.moBtn.on('click', $.proxy(this.onClickLayer, this));
        this.skrimLayer.on('touchstart', function(e){e.preventDefault();});
      },
      onClickLayer : function(e){
        e.preventDefault();
        var _this = this;
        if(this.popLayer.is(':visible'))
        {
          gnbTogger.outsideCallback(true);
          $(custom.body).removeClass('gb-login-open');
          this.popWrap.hide();
          this.skrimLayer.hide();
          this.popLayer.off('clickoutside touchstartoutside', $.proxy(this.onClickOutside, this));
        } else {
          gnbTogger.outsideCallback(false);
          $(custom.body).addClass('gb-login-open');
          this.popWrap.show();
          this.skrimLayer.show({
            duration : 1,
            complete : function() {
              _this.popLayer.on('clickoutside touchstartoutside', $.proxy(_this.onClickOutside, _this));
            }
          });
          popAlign.init();
        }
      },
      onClickOutside : function(e){
        gnbTogger.outsideCallback(true);
        $(custom.body).removeClass('gb-login-open');
        this.popWrap.hide();
        this.skrimLayer.hide();
        this.popLayer.off('clickoutside touchstartoutside', $.proxy(this.onClickOutside, this));
      }
    }

    var myCart = {
      init : function(){
        this.opts();
        this.setElements();
        this.bindEventHandlers();
      },
      restore : function()
      {
        this.menuLayer.removeAttr('style');
      },
      opts : function(){
        this.delay = 100;
      },
      setElements : function(){
        this.menuWrap = header.find('.gb-gnb__bar .s-ico-cart').closest('li');
        this.menuLayer = header.find('.gb-gnb__cart-layer');
      },
      bindEventHandlers : function(){
        if(device.type === V_STATIC.RESPONSIVE.GNB.NAME){
          this.menuWrap.off('mouseenter mouseleave', $.proxy(this.onMouseLayer, this));
          this.menuWrap.off('keydown', $.proxy(this.onKeyboardLayer, this));
          this.menuWrap.on('click', $.proxy(this.onKeyboardLayer, this));
        }else{
          this.menuWrap.off('click', $.proxy(this.onKeyboardLayer, this));
          this.menuWrap.on('mouseenter mouseleave', $.proxy(this.onMouseLayer, this));
          this.menuWrap.on('keydown', $.proxy(this.onKeyboardLayer, this));
        }
      },
      onMouseLayer : function(e){
        var _this = this;
        if(e.type == 'mouseenter'){
          this.menuLayer.stop().fadeIn(_this.delay);
          nodeNmMgr.cartLayerOpen();
        }else if(e.type == 'mouseleave'){
          this.menuLayer.stop().fadeOut(_this.delay);
          nodeNmMgr.cartLayerClose();
        }
      },
      onKeyboardLayer : function(e){
        if((e.keyCode === 13 && e.type == 'keydown') || e.type == 'click'){
          var _this = this;
          this.onChildTarget = $(e.target);

          if(this.onChildTarget.hasClass('s-ico-cart')){
            if(!this.menuLayer.is(':visible')){
              this.menuLayer.stop().fadeIn(_this.delay);
              nodeNmMgr.cartLayerOpen();
              this.menuWrap.on('clickoutside', $.proxy(this.onClickOutside, this));
            }else{
              this.menuLayer.stop().fadeOut(_this.delay);
              nodeNmMgr.cartLayerClose();
              this.menuWrap.off('clickoutside', $.proxy(this.onClickOutside, this));
            }
          }
        }
      },
      onClickOutside : function(e){
        var _this = this,
        $this = $(e.currentTarget);
        this.menuLayer.stop().fadeOut(_this.delay);
        nodeNmMgr.cartLayerClose();
        $this.off('clickoutside', $.proxy(this.onClickOutside, this));
      }
    }

    var gnbSearch = {
      init : function(){
        this.opts();
        this.setElements();
        this.bindEventHandlers();
      },
      opts : function(){
        this.delay = 0,
        this.speed = 200;
        this.keyFocusType = false;
      },
      setElements : function(){
        this.wrap = header.find('.js-ico-search').closest('li'),
        this.closeBtn = header.find('.gb-gnb__search .s-ico-close'),
        this.layer = header.find('.gb-gnb__search');
        this.inputArea = header.find('#inp_srch');
      },
      bindEventHandlers : function(){
        if(device.type === V_STATIC.RESPONSIVE.GNB.NAME){
          this.wrap.off('mouseenter mouseleave', $.proxy(this.onMouseLayer, this));
          this.wrap.off('keydown', $.proxy(this.onKeyboardLayer, this));
          this.wrap.on('click', $.proxy(this.onKeyboardLayer, this));
          this.layer.hide().css('marginTop','');
        }else{
          this.wrap.off('click', $.proxy(this.onKeyboardLayer, this));
          this.wrap.on('mouseenter mouseleave', $.proxy(this.onMouseLayer, this));
          this.wrap.on('keydown', $.proxy(this.onKeyboardLayer, this));
          this.layer.hide().css('marginTop',-200);
        }
      },
      onMouseLayer : function(e){
        var _this = this;
        if(!this.keyFocusType){
          if(e.type == 'mouseenter'){
            this.layer.show().stop().animate({'margin-top' : 0}, _this.speed,
              function(){
                _this.inputArea.focus();
              }
            );
          }else if(e.type == 'mouseleave'){
            this.layer.stop().animate({'margin-top' : -200}, _this.speed,
              function(){
                $(this).css('display', 'none');
                _this.keyFocusType = false;
              }
            );
          }
        }
        this.closeBtn.on('click', $.proxy(this.mouseCloseLayer, this));
      },
      mouseCloseLayer : function(e){
        e.preventDefault();
        var _this = this;
        this.layer.stop().animate({'margin-top' : -200}, _this.speed,
          function(){
            $(this).css('display', 'none');
            _this.keyFocusType = false;
          }
        );
      },
      onKeyboardLayer : function(e){
        var _this = this;
        this.onChildTarget = $(e.target);
        if(e.keyCode === 13 && e.type == 'keydown'){
          this.keyFocusType = true;

          if(this.onChildTarget.hasClass('js-ico-search')){
            if(!this.layer.is(':visible')){
              this.layer.show().stop().animate({'margin-top' : 0}, _this.speed,
                function(){
                  _this.inputArea.focus();
                }
              );
              // this.inputArea.focus();
              this.closeBtn.on('keydown', $.proxy(this.keyboardCloseLayer, this));
              this.wrap.on('clickoutside', $.proxy(this.onClickOutside, this));
            }else{
              this.layer.stop().animate({'margin-top' : -200}, _this.speed,
                function(){
                  $(this).css('display', 'none');
                  _this.keyFocusType = false;
                }
              );
              this.closeBtn.off('keydown', $.proxy(this.keyboardCloseLayer, this));
              this.wrap.off('clickoutside', $.proxy(this.onClickOutside, this));
            }
          }
        }else if(e.type == 'click'){
          if(this.onChildTarget.hasClass('js-ico-search')){
            header.find('.gb-gnb__bar .s-ico-cart').closest('li').trigger('clickoutside');

            this.layer.stop().fadeIn(_this.delay);
            this.layer.addClass('gb-gnb-search--open');
            nodeNmMgr.searchLayerOpen();
            //focus
            _this.inputArea.focus();
          }else if(this.onChildTarget.hasClass('s-ico-close')){
            this.wrap.find('.js-ico-search').focus();
            this.layer.stop().fadeOut(_this.delay);
            this.layer.removeClass('gb-gnb-search--open');
            nodeNmMgr.searchLayerClose();
          }
        }
      },
      keyboardCloseLayer : function(e){
        if(e.keyCode === 13){
          e.preventDefault();
          var _this = this;
          this.wrap.find('.js-ico-search').focus();
          this.layer.stop().animate({'margin-top' : -200}, _this.speed,
            function(){
              $(this).css('display', 'none');
              _this.keyFocusType = false;
            }
          );
        }
      },
      onClickOutside : function(e){
        var _this = this,
        $this = $(e.currentTarget);
        this.layer.stop().animate({'margin-top' : -200}, _this.speed,
          function(){
            $(this).css('display', 'none');
            _this.keyFocusType = false;
          }
        );
        $this.off('clickoutside', $.proxy(this.onClickOutside, this));
      }
    }

    var onResponsiveChange = function(e, data)
    {
      if(device.type === '' && data.RESPONSIVE_GNB_NAME === '' || device.type === V_STATIC.RESPONSIVE.GNB.NAME && data.RESPONSIVE_GNB_NAME === V_STATIC.RESPONSIVE.GNB.NAME) return;

      device.type = data.RESPONSIVE_GNB_NAME;

      myCart.init();
      gnbSearch.init();

      if(device.type === V_STATIC.RESPONSIVE.GNB.NAME)
      {
        ui.destroyDesktop();
      } else {
        ui.destroyMobile();
      }
    }

    var drilldown = (function()
    {
      var elmt = { wrap : '.drilldown'}

      var opt = {speed: 150}

      var init = function()
      {
        $(elmt.wrap).drilldown(opt);
      }

      var reset = function()
      {
        $(elmt.wrap).drilldown('reset');
      }

      var destroy = function()
      {
        $(elmt.wrap).drilldown('destroy');
      }

      return {
        init    : init,
        reset   : reset,
        destroy : destroy
      }

    })();

    var init = function(container)
    {
      if (!(this.container = container).size()) return;
      evt();

      gnbMain.init();
      myMenu.init();
      gnbTogger.init();
      signIn.init();
    }

    return {
      init : init
    }

  })();

  $(function() {
    namespace.gnb.init($('body'));
  });

})(window, window.jQuery);
