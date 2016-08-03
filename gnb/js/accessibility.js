/*!
 * samsung.com - Phase2 - Common Global Accessibility
 * src : js/src/smg/aem/common/components/accessibility.js
 *
 * @version 1.0.0
 * @since 2016.05.20
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

  if('undefined' === typeof win.smg.aem.common.accessibility) {
    win.smg.aem.common.accessibility = {};
  }

  var namespace = win.smg.aem.common.accessibility;

  namespace.naviFocus = (function()
  { // Focus Navigation
    var custom = {
      body : 'body'
    }

    var evt = function()
    {
      $(custom.body).on('keydown', '[data-focus-tab-for]', function(e)
      {
        var keyCode = e.keyCode || e.which;

        if(keyCode === 9)
        { /* Tab */
          var val = $(this).data('focus-tab-for');
          if($(custom.body).find('[data-focus-tab-target=' + val + ']').size())
          {
            $(custom.body).find('[data-focus-tab-target=' + val + ']').focus();
          }
        }
      });

      $(custom.body).on('keydown click', '[data-focus-etr-for]', function(e)
      {
        var keyCode = e.keyCode || e.which;

        if(keyCode === 13 || e.type === 'click')
        { /* Enter */
          var val = $(this).data('focus-etr-for');
          if($(custom.body).find('[data-focus-etr-target=' + val + ']').size())
          {
            $(custom.body).find('[data-focus-etr-target=' + val + ']').focus();
          }
        }
      });

      $(custom.body).on('keydown click', '[data-focus-drill-for]', function(e)
      { /* drilldown plugin, focus event */
        var keyCode = e.keyCode || e.which;
        if(keyCode === 13 || e.type === 'click')
        { /* Enter */
          var val = $(this).data('focus-drill-for');
          $(custom.body).on('DRILLDOWN_ANIMATE_CHANGE', function()
          {
            if($(custom.body).find('[data-focus-drill-target=' + val + ']').size())
            {
              $(custom.body).find('[data-focus-drill-target=' + val + ']').focus();
            }
          });
        }
      });
    }

    var init = function(container)
    {
      if (!(this.container = container).size()) return;
      evt();
    }

    return {
      init : init
    }

  })();

  $(function()
  {
    namespace.naviFocus.init($('body'));
  });

})(window, window.jQuery);
